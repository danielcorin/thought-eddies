// Fetches webmentions from webmention.io at build time.
// Uses the per-domain token endpoint when WEBMENTION_IO_TOKEN is set (server-only,
// never exposed to the client) so we can match mentions by canonical path,
// stripping any query strings that sources may include in wm-target.
// Falls back to the public per-target endpoint when no token is available.

export type WebmentionProperty =
  | 'in-reply-to'
  | 'like-of'
  | 'repost-of'
  | 'mention-of'
  | 'bookmark-of';

export interface WebmentionAuthor {
  type?: string;
  name?: string;
  photo?: string;
  url?: string;
}

export interface Webmention {
  type: 'entry';
  author?: WebmentionAuthor;
  url?: string;
  published?: string;
  name?: string;
  content?: { text?: string; html?: string };
  'wm-id': number;
  'wm-source': string;
  'wm-target': string;
  'wm-property': WebmentionProperty;
  'wm-received': string;
}

const TOKEN = import.meta.env.WEBMENTION_IO_TOKEN;
const PER_PAGE = 200;

let allCache: Promise<Webmention[]> | null = null;
const targetCache = new Map<string, Promise<Webmention[]>>();

function pathKey(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '');
    const path = u.pathname.replace(/\/$/, '') || '/';
    return `${host}${path}`;
  } catch {
    return null;
  }
}

async function fetchAll(): Promise<Webmention[]> {
  if (allCache) return allCache;
  allCache = (async () => {
    const all: Webmention[] = [];
    let page = 0;
    while (true) {
      const url = `https://webmention.io/api/mentions.jf2?token=${TOKEN}&per-page=${PER_PAGE}&page=${page}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(
            `[webmentions] domain feed page ${page} → ${res.status}`
          );
          break;
        }
        const data = (await res.json()) as { children?: Webmention[] };
        const children = data.children ?? [];
        all.push(...children);
        if (children.length < PER_PAGE) break;
        page++;
      } catch (err) {
        console.warn('[webmentions] domain feed error:', err);
        break;
      }
    }
    return all;
  })();
  return allCache;
}

async function fetchByTarget(target: string): Promise<Webmention[]> {
  const cached = targetCache.get(target);
  if (cached) return cached;
  const promise = (async () => {
    const url = `https://webmention.io/api/mentions.jf2?target=${encodeURIComponent(target)}&per-page=${PER_PAGE}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[webmentions] ${target} → ${res.status}`);
        return [];
      }
      const data = (await res.json()) as { children?: Webmention[] };
      return data.children ?? [];
    } catch (err) {
      console.warn(`[webmentions] error fetching ${target}:`, err);
      return [];
    }
  })();
  targetCache.set(target, promise);
  return promise;
}

export async function getWebmentionsForTarget(
  target: string
): Promise<Webmention[]> {
  const targetKey = pathKey(target);
  if (!targetKey) return [];

  const all = TOKEN ? await fetchAll() : await fetchByTarget(target);

  return all
    .filter((m) => pathKey(m['wm-target']) === targetKey)
    .sort(
      (a, b) =>
        new Date(a['wm-received']).getTime() -
        new Date(b['wm-received']).getTime()
    );
}
