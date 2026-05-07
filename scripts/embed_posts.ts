/* eslint-disable no-console */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force';
import matter from 'gray-matter';

const OLLAMA_URL = 'http://localhost:11434/api/embeddings';
const OLLAMA_MODEL = 'qwen3-embedding:8b';
const MAX_WORDS = 6000;
const NUM_CTX = 8192;

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src', 'content');
const DATA_DIR = join(ROOT, 'src', 'data');
const CACHE_PATH = join(DATA_DIR, 'embeddings.cache.json');
const OUTPUT_PATH = join(DATA_DIR, 'embeddings.json');

type Collection =
  | 'posts'
  | 'logs'
  | 'til'
  | 'garden'
  | 'projects'
  | 'now'
  | 'uses';

const COLLECTIONS: Collection[] = [
  'posts',
  'logs',
  'til',
  'garden',
  'projects',
  'now',
  'uses',
];

const TOPICS: { label: string; prompt: string }[] = [
  {
    label: 'Language models & AI agents',
    prompt:
      'Working with large language models, AI agents, prompt engineering, tool use, autonomous coding agents, and language-model-driven software workflows.',
  },
  {
    label: 'Building with Claude',
    prompt:
      'Using Claude — the Anthropic language model — for software engineering, including Claude Code, the Anthropic API, citations, structured outputs, and agentic coding.',
  },
  {
    label: 'Model evaluation & reliability',
    prompt:
      'Evaluating language models, benchmarks, model reliability, hallucinations, tests, datasets, eval harnesses, scoring model behavior, and measuring quality.',
  },
  {
    label: 'Embeddings, search & retrieval',
    prompt:
      'Embeddings, semantic search, vector databases, retrieval augmented generation, similarity search, clustering, recommendations, and finding related content.',
  },
  {
    label: 'Local models & open source AI',
    prompt:
      'Running local language models, Ollama, llama.cpp, open source models, local multimodal models, inference on personal hardware, and self-hosted AI tools.',
  },
  {
    label: 'Multimodal AI & vision',
    prompt:
      'Vision language models, image understanding, screenshots, PDFs, OCR, multimodal prompting, visual reasoning, generated images, and model perception.',
  },
  {
    label: 'Personal software & tools',
    prompt:
      'Personal software, side projects, custom tools, building for oneself, indie utilities, hobbyist apps, and small useful programs.',
  },
  {
    label: 'Interfaces & product design',
    prompt:
      'Designing user interfaces, product thinking, prototypes, interaction design, user experience, frontend experiments, and making tools pleasant to use.',
  },
  {
    label: 'Keyboards & key remapping',
    prompt:
      'Keyboard customization, key remapping, Karabiner, Goku, Caps Lock as control, mechanical keyboards, hotkeys, and shortcut systems.',
  },
  {
    label: 'Shells, terminals & automation',
    prompt:
      'Shell scripting, terminal workflows, command line tools, dotfiles, macOS automation, window management, yabai, skhd, alacritty, wezterm, and developer productivity.',
  },
  {
    label: 'Site building & static sites',
    prompt:
      'Static site generators, Astro, Hugo, building a personal website, a digital garden, blog tooling, RSS feeds, and content pipelines.',
  },
  {
    label: 'Feeds, publishing & the open web',
    prompt:
      'RSS feeds, link blogs, webmentions, personal websites, publishing workflows, content syndication, IndieWeb, social previews, and owning a presence on the web.',
  },
  {
    label: 'Programming languages',
    prompt:
      'Learning and using programming languages: Python, Elixir, Go, Clojure, TypeScript, Rust. Language features, runtime, idioms, debugging.',
  },
  {
    label: 'Python & data science learning',
    prompt:
      'Python programming, notebooks, machine learning lessons, fastai, data science exercises, training models, pandas, scikit-learn, and applied ML learning.',
  },
  {
    label: 'Concurrency & async',
    prompt:
      'Concurrency, asynchronous programming, coroutines, channels, goroutines, Erlang/Elixir processes, async/await, and parallelism.',
  },
  {
    label: 'Data & SQL',
    prompt:
      'Data engineering, SQL, querying, Presto, BigQuery, analytics, data pipelines, and working with databases.',
  },
  {
    label: 'Infrastructure & deployment',
    prompt:
      'Cloud infrastructure, deployment, serverless platforms, Cloudflare, Vercel, containers, Kubernetes, observability, production systems, and operational tooling.',
  },
  {
    label: 'Knowledge management & writing',
    prompt:
      'Personal knowledge management, note-taking, second brain, writing as thinking, digital gardens, journaling, and externalizing thought.',
  },
  {
    label: 'Career, equity & startups',
    prompt:
      'Career in software, equity, RSUs, startups, working at tech companies, compensation, leaving jobs, and the tech industry.',
  },
  {
    label: 'Nix & developer environments',
    prompt:
      'Nix, NixOS, nix-darwin, flakes, direnv, reproducible developer environments, and managing tool versions.',
  },
];

type Frontmatter = Record<string, unknown>;

interface Entry {
  collection: Collection;
  /** id without extension, no trailing /index */
  id: string;
  url: string;
  title: string;
  date: string;
  data: Frontmatter;
  body: string;
  wordCount: number;
}

type EmbeddingsCache = Record<string, number[]>;

async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const entries = await readdir(dir);
  for (const name of entries) {
    if (name.startsWith('_')) continue;
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (/\.(md|mdx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function stripIndex(id: string): string {
  return id.replace(/\/index$/, '');
}

function deriveId(collection: Collection, absPath: string): string {
  const relPath = relative(join(CONTENT_DIR, collection), absPath);
  const noExt = relPath.replace(/\.(md|mdx)$/, '');
  return stripIndex(noExt);
}

function deriveUrl(collection: Collection, id: string): string | null {
  switch (collection) {
    case 'posts':
      return `/posts/${id}`;
    case 'logs': {
      const m = id.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
      if (!m) return null;
      return `/logs/${m[1]}/${m[2]}/${m[3]}`;
    }
    case 'til':
      return `/til/${id}`;
    case 'garden':
      return `/garden/${id}`;
    case 'projects':
      return `/projects/${id}`;
    case 'now':
      return `/now`;
    case 'uses':
      return `/uses`;
    default:
      return null;
  }
}

function isDraft(data: Frontmatter, collection: Collection): boolean {
  if (typeof data.draft === 'boolean') return data.draft;
  // posts default to draft: true per schema
  if (collection === 'posts' && data.draft === undefined) return true;
  return false;
}

function entryDate(data: Frontmatter, id: string): string {
  // logs: derive from id YYYY/MM/DD
  const logMatch = id.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (logMatch) return `${logMatch[1]}-${logMatch[2]}-${logMatch[3]}`;

  const candidates = ['publishedAt', 'createdAt', 'date', 'updatedAt'];
  for (const k of candidates) {
    const v = data[k];
    if (v) {
      const d = new Date(v as string | number | Date);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date(0).toISOString();
}

function entryTitle(data: Frontmatter, id: string): string {
  if (typeof data.title === 'string' && data.title.trim()) return data.title;
  return id;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function truncateWords(s: string, max: number): string {
  const parts = s.split(/(\s+)/);
  let count = 0;
  let i = 0;
  for (; i < parts.length; i++) {
    if (/\S/.test(parts[i])) {
      count++;
      if (count > max) break;
    }
  }
  return parts.slice(0, i).join('');
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function loadCache(): EmbeddingsCache {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as EmbeddingsCache;
  } catch {
    console.warn('Cache file is corrupt, starting fresh');
    return {};
  }
}

function saveCache(cache: EmbeddingsCache): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

async function ollamaEmbedOnce(prompt: string): Promise<number[]> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      options: { num_ctx: NUM_CTX },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { embedding?: number[] };
  if (!json.embedding || !Array.isArray(json.embedding)) {
    throw new Error(
      `Ollama response missing embedding: ${JSON.stringify(json)}`
    );
  }
  return json.embedding;
}

async function ollamaEmbed(prompt: string): Promise<number[]> {
  let attempt = prompt;
  let words = MAX_WORDS;
  for (let i = 0; i < 5; i++) {
    try {
      return await ollamaEmbedOnce(attempt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCtx = /input length exceeds the context|context length/i.test(
        msg
      );
      if (!isCtx || i === 4) throw err;
      words = Math.floor(words * 0.6);
      attempt = truncateWords(attempt, words);
      console.log(`  retry with ${words} words`);
    }
  }
  throw new Error('unreachable');
}

function normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  const out = new Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

interface Edge {
  source: number;
  target: number;
  weight: number;
}

function buildKnnEdges(matrix: number[][], k: number): Edge[] {
  const norms = matrix.map(normalize);
  const dim = norms[0].length;
  const seen = new Map<string, Edge>();
  for (let i = 0; i < norms.length; i++) {
    const a = norms[i];
    const sims: { j: number; sim: number }[] = [];
    for (let j = 0; j < norms.length; j++) {
      if (i === j) continue;
      const b = norms[j];
      let s = 0;
      for (let d = 0; d < dim; d++) s += a[d] * b[d];
      sims.push({ j, sim: s });
    }
    sims.sort((x, y) => y.sim - x.sim);
    for (let t = 0; t < k && t < sims.length; t++) {
      const j = sims[t].j;
      const sim = sims[t].sim;
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const key = `${lo}-${hi}`;
      const existing = seen.get(key);
      if (!existing || sim > existing.weight) {
        seen.set(key, { source: lo, target: hi, weight: sim });
      }
    }
  }
  return [...seen.values()];
}

async function loadEntries(): Promise<Entry[]> {
  const out: Entry[] = [];
  for (const collection of COLLECTIONS) {
    const dir = join(CONTENT_DIR, collection);
    const files = await walk(dir);
    for (const file of files) {
      const raw = readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      const fm = (data ?? {}) as Frontmatter;
      if (isDraft(fm, collection)) continue;
      const id = deriveId(collection, file);
      const url = deriveUrl(collection, id);
      if (!url) {
        console.warn(`[skip] ${collection}/${id}: no URL pattern`);
        continue;
      }
      const title = entryTitle(fm, id);
      const date = entryDate(fm, id);
      const wordCount = countWords(content);
      out.push({
        collection,
        id,
        url,
        title,
        date,
        data: fm,
        body: content,
        wordCount,
      });
    }
  }
  return out;
}

function buildEmbedText(entry: Entry): string {
  const desc =
    typeof entry.data.description === 'string' ? entry.data.description : '';
  return truncateWords(`${entry.title}\n\n${desc}\n\n${entry.body}`, MAX_WORDS);
}

async function main(): Promise<void> {
  console.log('Loading entries...');
  const entries = await loadEntries();
  console.log(`Found ${entries.length} entries.`);

  const cache = loadCache();
  const hashes: string[] = entries.map((e) => sha256(buildEmbedText(e)));

  let hits = 0;
  let misses = 0;
  for (let i = 0; i < entries.length; i++) {
    const hash = hashes[i];
    if (cache[hash]) {
      hits++;
      continue;
    }
    misses++;
    const entry = entries[i];
    process.stdout.write(
      `[${i + 1}/${entries.length}] embedding ${entry.collection}/${entry.id} ... `
    );
    try {
      const embedding = await ollamaEmbed(buildEmbedText(entry));
      cache[hash] = embedding;
      saveCache(cache);
      console.log(`ok (dim=${embedding.length})`);
    } catch (err) {
      console.log('FAILED');
      throw err;
    }
  }
  console.log(`Cache hits: ${hits}, new embeddings: ${misses}`);

  const matrix = entries.map((_, i) => cache[hashes[i]]);
  if (matrix.length < 3) {
    throw new Error(
      `Not enough entries to project (${matrix.length}); need at least 3`
    );
  }

  const KNN = 6;
  console.log(`Building kNN graph (k=${KNN})...`);
  const edges = buildKnnEdges(matrix, KNN);
  console.log(`  ${edges.length} unique edges`);

  type SimNode = { id: number; x: number; y: number };
  const nodes: SimNode[] = matrix.map((_, i) => ({
    id: i,
    // small random init keeps the simulation from collapsing
    x: Math.cos((i * 2 * Math.PI) / matrix.length) * 50,
    y: Math.sin((i * 2 * Math.PI) / matrix.length) * 50,
  }));
  const simLinks = edges.map((e) => ({
    source: e.source,
    target: e.target,
    weight: e.weight,
  }));

  console.log('Running force-directed layout...');
  const sim = forceSimulation(nodes)
    .force(
      'link',
      forceLink(simLinks)
        .id((d) => (d as SimNode).id)
        .distance((l) => 30 + (1 - (l as { weight: number }).weight) * 60)
        .strength(0.4)
    )
    .force('charge', forceManyBody().strength(-40))
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide().radius(8))
    .stop();

  const TICKS = 400;
  for (let i = 0; i < TICKS; i++) sim.tick();

  const points = entries.map((entry, i) => ({
    slug: entry.id,
    url: entry.url,
    type: entry.collection,
    title: entry.title,
    date: entry.date,
    wordCount: entry.wordCount,
    x: nodes[i].x,
    y: nodes[i].y,
  }));

  const edgesOut = edges.map((e) => ({
    s: e.source,
    t: e.target,
    w: Math.round(e.weight * 1000) / 1000,
  }));

  // Topics: embed each topic prompt, find its top-K most similar posts,
  // place the topic at the weighted centroid (in 2D layout space).
  console.log(`\nEmbedding ${TOPICS.length} topics...`);
  const TOPIC_K = 12;
  const normalizedPosts = matrix.map(normalize);
  const topicsOut: Array<{
    label: string;
    x: number;
    y: number;
    neighbors: { idx: number; sim: number }[];
  }> = [];
  for (const topic of TOPICS) {
    const hash = sha256('TOPIC::' + topic.prompt);
    let emb = cache[hash];
    if (!emb) {
      process.stdout.write(`  ${topic.label} ... `);
      emb = await ollamaEmbed(topic.prompt);
      cache[hash] = emb;
      saveCache(cache);
      console.log(`ok`);
    }
    const tn = normalize(emb);
    const sims: { idx: number; sim: number }[] = [];
    for (let i = 0; i < normalizedPosts.length; i++) {
      const a = normalizedPosts[i];
      let s = 0;
      for (let d = 0; d < a.length; d++) s += a[d] * tn[d];
      sims.push({ idx: i, sim: s });
    }
    sims.sort((a, b) => b.sim - a.sim);
    const top = sims.slice(0, TOPIC_K);
    let wx = 0;
    let wy = 0;
    let totalW = 0;
    for (const { idx, sim } of top) {
      // sharpen: use sim^4 so the centroid is pulled toward the most similar
      const w = Math.max(0, sim) ** 4;
      wx += points[idx].x * w;
      wy += points[idx].y * w;
      totalW += w;
    }
    if (totalW === 0) totalW = 1;
    topicsOut.push({
      label: topic.label,
      x: wx / totalW,
      y: wy / totalW,
      neighbors: top.map((t) => ({
        idx: t.idx,
        sim: Math.round(t.sim * 1000) / 1000,
      })),
    });
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        knn: KNN,
        points,
        edges: edgesOut,
        topics: topicsOut,
      },
      null,
      2
    )
  );
  console.log(
    `\nWrote ${points.length} nodes / ${edgesOut.length} edges / ${topicsOut.length} topics to ${OUTPUT_PATH}`
  );
  for (const t of topicsOut) {
    const top3 = t.neighbors
      .slice(0, 3)
      .map((n) => `${points[n.idx].title} (${n.sim.toFixed(2)})`)
      .join('; ');
    console.log(`  "${t.label}" → ${top3}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
