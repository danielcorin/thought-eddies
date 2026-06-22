import type { APIRoute } from 'astro';

// Run on-demand (not prerendered) so the feed stays live without a rebuild.
export const prerender = false;

// Only proxy feeds from hosts we trust, so this can't be used as an open proxy.
const ALLOWED_HOSTS = ['raindrop.io', 'raindrop.page'];

const isAllowed = (url: URL) =>
  ALLOWED_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get('url');

  if (!target) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  let feedUrl: URL;
  try {
    feedUrl = new URL(target);
  } catch {
    return new Response('Invalid "url" query parameter', { status: 400 });
  }

  if (feedUrl.protocol !== 'https:' || !isAllowed(feedUrl)) {
    return new Response('Feed host not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(feedUrl, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: 502,
      });
    }

    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'application/rss+xml',
        // Cache at the edge for an hour; matches Raindrop's own cache-control.
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(
      `Failed to fetch feed: ${err instanceof Error ? err.message : 'unknown error'}`,
      { status: 502 }
    );
  }
};
