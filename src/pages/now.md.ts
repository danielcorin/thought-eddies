import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all now entries and sort by date to get the most recent
    const nowEntries = await getCollection('now');
    const sortedEntries = nowEntries.sort(
      (a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
    );

    // Get the most recent entry
    const latestEntry = sortedEntries[0];

    if (!latestEntry) {
      return new Response('Not found', { status: 404 });
    }

    const lastUpdated = formatDate(latestEntry.data.date);

    const content = `# Now

*Last updated: ${lastUpdated}*

${latestEntry.body}`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating now.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
