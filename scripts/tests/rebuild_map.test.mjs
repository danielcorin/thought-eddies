import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { OLLAMA_MODEL, OLLAMA_ORIGIN } from '../map-config.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

// Run the real command with stand-in executables and a local API fixture.
// This exercises process startup and cleanup without downloading a model.
function launch(t, options = {}, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'map-rebuild-test-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(
    join(dir, 'api.mjs'),
    `import { existsSync } from 'node:fs';
    const dir = process.env.MAP_TEST_DIR;
    const options = JSON.parse(process.env.MAP_TEST_OPTIONS);
    globalThis.fetch = async (url, init) => {
      init.signal.throwIfAborted();
      if (url.origin !== ${JSON.stringify(OLLAMA_ORIGIN)}) throw new Error('Unexpected server');
      if (url.pathname === '/api/version') {
        if (!options.existing && !existsSync(dir + '/ready')) throw new Error('Offline');
        return Response.json({ version: 'test' });
      }
      if (url.pathname === '/api/show') {
        if (JSON.parse(init.body).model !== ${JSON.stringify(OLLAMA_MODEL)}) throw new Error('Wrong model');
        return Response.json({}, { status: options.modelStatus ?? (options.model ? 200 : 404) });
      }
      throw new Error('Unexpected API path');
    };`
  );
  const fixture = String.raw`#!/usr/bin/env node
    const { appendFileSync, writeFileSync, rmSync } = require('node:fs');
    const { basename } = require('node:path');
    const dir = process.env.MAP_TEST_DIR;
    const options = JSON.parse(process.env.MAP_TEST_OPTIONS);
    const command = basename(process.argv[1]);
    const args = process.argv.slice(2);
    const log = (action) => appendFileSync(dir + '/events', JSON.stringify({
      action, cwd: process.cwd(), host: process.env.OLLAMA_HOST, args,
    }) + '\n');
    if (command === 'pnpm' && args[0] === '--version') process.exit(0);
    if (command === 'ollama' && args[0] === 'serve') {
      log('serve');
      if (options.startFail) process.exit(7);
      writeFileSync(dir + '/ready', String(process.pid));
      setInterval(() => {}, 1000);
      process.on('SIGTERM', () => {
        log('stop');
        rmSync(dir + '/ready');
        process.exit(0);
      });
    } else if (command === 'ollama' && args[0] === 'pull') {
      log('pull');
      process.exit(options.pullFail ? 9 : 0);
    } else if (command === 'pnpm' && args[0] === 'embed') {
      log('embed');
      if (options.waitForSignal) {
        setInterval(() => {}, 1000);
        process.on('SIGTERM', () => setTimeout(() => {
          log('embed-stop');
          process.exit(143);
        }, 50));
      } else process.exit(options.embedFail ? 8 : 0);
    } else process.exit(99);
  `;
  for (const name of ['ollama', 'pnpm']) {
    writeFileSync(join(bin, name), fixture, { mode: 0o755 });
  }
  const child = spawn(
    process.execPath,
    [join(root, 'scripts/rebuild_map.mjs'), ...args],
    {
      // Deliberately start outside the repository to check path resolution.
      cwd: dir,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        NODE_OPTIONS: `--import=${join(dir, 'api.mjs')}`,
        MAP_TEST_DIR: dir,
        MAP_TEST_OPTIONS: JSON.stringify(options),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const done = once(child, 'close').then(([code]) => ({ code, output }));
  const events = () =>
    existsSync(join(dir, 'events'))
      ? readFileSync(join(dir, 'events'), 'utf8')
          .trim()
          .split('\n')
          .map(JSON.parse)
      : [];
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGTERM');
    await done;
    if (existsSync(join(dir, 'ready'))) {
      const pid = Number(readFileSync(join(dir, 'ready'), 'utf8'));
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
    rmSync(dir, { recursive: true, force: true });
  });
  return { child, done, events };
}

const cases = [
  [
    'reuses an existing server and installed model',
    { existing: true, model: true },
    0,
    ['embed'],
  ],
  [
    'starts Ollama, fetches a missing model, and stops its server',
    {},
    0,
    ['serve', 'pull', 'embed', 'stop'],
  ],
  [
    'keeps an existing server after a failed rebuild',
    { existing: true, model: true, embedFail: true },
    1,
    ['embed'],
  ],
  [
    'stops its server after a failed rebuild',
    { model: true, embedFail: true },
    1,
    ['serve', 'embed', 'stop'],
  ],
  [
    'stops its server after a failed model download',
    { pullFail: true },
    1,
    ['serve', 'pull', 'stop'],
  ],
  ['reports an early server exit', { startFail: true }, 1, ['serve']],
  [
    'does not download on an unexpected model API error',
    { modelStatus: 500 },
    1,
    ['serve', 'stop'],
  ],
];

for (const [name, options, code, actions] of cases) {
  test(name, { timeout: 10000 }, async (t) => {
    const run = launch(t, options);
    const result = await run.done;
    assert.equal(result.code, code, result.output);
    assert.deepEqual(
      run.events().map((event) => event.action),
      actions
    );
    for (const event of run.events()) {
      assert.equal(event.cwd, root);
      assert.equal(event.host, OLLAMA_ORIGIN);
      if (event.action === 'pull')
        assert.deepEqual(event.args, ['pull', OLLAMA_MODEL]);
    }
    assert.equal(result.output.includes('Map rebuilt:'), code === 0);
  });
}

test(
  'interrupting a rebuild waits for the command and stops its server',
  { timeout: 10000 },
  async (t) => {
    const run = launch(t, { model: true, waitForSignal: true });
    const deadline = Date.now() + 5000;
    while (!run.events().some((event) => event.action === 'embed')) {
      assert.ok(Date.now() < deadline, 'Embedding command did not start');
      await delay(25);
    }
    run.child.kill('SIGTERM');
    const result = await run.done;
    assert.equal(result.code, 143, result.output);
    assert.match(result.output, /Map rebuild interrupted/);
    assert.deepEqual(
      run.events().map((event) => event.action),
      ['serve', 'embed', 'embed-stop', 'stop']
    );
  }
);

test('help does not start services or rebuild data', async (t) => {
  const run = launch(t, {}, ['--help']);
  const result = await run.done;
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /mise run rebuild-map/);
  assert.deepEqual(run.events(), []);
});
