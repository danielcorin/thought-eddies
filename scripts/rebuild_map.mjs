#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { OLLAMA_MODEL, OLLAMA_ORIGIN } from './map-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const controller = new AbortController();
const { signal } = controller;
const env = { ...process.env, OLLAMA_HOST: OLLAMA_ORIGIN };
let interrupted = null;
let server = null;
let serverExited = null;

for (const name of ['SIGINT', 'SIGTERM']) {
  process.once(name, () => {
    interrupted = name;
    controller.abort();
  });
}

async function api(path, options = {}) {
  return fetch(new URL(path, OLLAMA_ORIGIN), {
    ...options,
    signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]),
  });
}

async function isRunning() {
  try {
    const response = await api('/api/version');
    return response.ok && typeof (await response.json()).version === 'string';
  } catch (error) {
    if (signal.aborted) throw error;
    return false;
  }
}

async function run(command, args, quiet = false) {
  await new Promise((resolve, reject) => {
    let commandError = null;
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: quiet ? 'ignore' : 'inherit',
      signal,
    });
    child.once('error', (error) => {
      commandError =
        error.code === 'ENOENT'
          ? new Error(`${command} is not installed or is not on PATH.`)
          : error;
    });
    child.once('close', (code, stoppedBy) => {
      if (commandError) reject(commandError);
      else if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} ${args.join(' ')} failed (${stoppedBy ?? `exit ${code}`}).`
          )
        );
    });
  });
}

async function ensureServer() {
  if (await isRunning()) {
    console.log('Using the running Ollama server.');
    return;
  }

  const logPath = join(
    mkdtempSync(join(tmpdir(), 'thought-eddies-map-')),
    'ollama.log'
  );
  const log = openSync(logPath, 'w');
  console.log(`Starting Ollama. Server log: ${logPath}`);
  try {
    server = spawn('ollama', ['serve'], {
      cwd: root,
      env,
      stdio: ['ignore', log, log],
    });
  } finally {
    closeSync(log);
  }
  let startupError = null;
  serverExited = new Promise((resolve) => {
    server.once('error', (error) => {
      startupError = error;
      resolve();
    });
    server.once('close', resolve);
  });

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    if (startupError)
      throw new Error(`Could not start Ollama: ${startupError.message}`);
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`Ollama exited before it was ready. See ${logPath}`);
    }
    if (await isRunning()) return;
    await delay(250, undefined, { signal });
  }
  throw new Error(
    `Ollama did not become ready within 30 seconds. See ${logPath}`
  );
}

async function stopOwnedServer() {
  if (!server?.pid || server.exitCode !== null || server.signalCode !== null)
    return;
  console.log('Stopping the Ollama server started for this rebuild.');
  server.kill('SIGTERM');
  const timeout = setTimeout(() => server.kill('SIGKILL'), 5000);
  try {
    await serverExited;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(
      'Usage: mise run rebuild-map\n\nStarts Ollama if needed, downloads the embedding model if missing, and rebuilds\nsrc/data/embeddings.json from non-draft content. Reuses the local embedding cache.'
    );
    return;
  }
  if (process.argv.length > 2)
    throw new Error('Unexpected arguments. Use --help for usage.');
  if (!existsSync(join(root, 'node_modules', '.bin', 'tsx'))) {
    throw new Error(
      'Project dependencies are missing. Run pnpm install first.'
    );
  }
  await run('pnpm', ['--version'], true);

  try {
    await ensureServer();
    const response = await api('/api/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL }),
    });
    if (response.status === 404) {
      console.log(`Downloading ${OLLAMA_MODEL}…`);
      await run('ollama', ['pull', OLLAMA_MODEL]);
    } else if (!response.ok) {
      throw new Error(
        `Could not check the embedding model: Ollama HTTP ${response.status}.`
      );
    } else {
      console.log(`Embedding model ${OLLAMA_MODEL} is already available.`);
    }

    console.log('Rebuilding the map from non-draft content…');
    await run('pnpm', ['embed']);
    console.log(
      'Map rebuilt: src/data/embeddings.json. Refresh /map to see it.'
    );
  } finally {
    await stopOwnedServer();
  }
}

main().catch((error) => {
  console.error(interrupted ? 'Map rebuild interrupted.' : error.message);
  process.exitCode =
    interrupted === 'SIGINT' ? 130 : interrupted === 'SIGTERM' ? 143 : 1;
});
