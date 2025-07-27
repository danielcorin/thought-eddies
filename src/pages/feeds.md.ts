import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const feeds = await getCollection('feeds');

    // Sort feeds alphabetically by title
    const sortedFeeds = feeds.sort((a, b) =>
      a.data.title.localeCompare(b.data.title)
    );

    const content = `# Feeds

A collection of external RSS/Atom feeds that I follow and share.

## Feed Sources

${sortedFeeds
  .map(
    (feed) =>
      `### ${feed.data.title}

${feed.body || 'No description available.'}

- Feed URL: [${feed.data.feed_url}](${feed.data.feed_url})
- View entries: [/feeds/${feed.id}/index.md](/feeds/${feed.id}/index.md)
`
  )
  .join('\n')}

---

[View all feeds](/feeds.md)
`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating feeds.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
