import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all posts, logs, and tils
    const posts = await getCollection('posts');
    const logs = await getCollection('logs');
    const tils = await getCollection('til');

    // Count tags across all collections
    const tagCounts = new Map<string, number>();

    [...posts, ...logs, ...tils].forEach((item) => {
      if (!item.data.draft && item.data.tags && Array.isArray(item.data.tags)) {
        item.data.tags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });

    // Sort tags by count (descending) then alphabetically
    const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    // Take top 20 tags for the summary
    const topTags = sortedTags.slice(0, 20);

    let content = `# Tags

Explore content by topic across posts, logs, and TILs.

## Most Popular Tags

`;

    topTags.forEach(([tag, count]) => {
      content += `- [${tag}](/tags/${tag}/index.md) (${count})\n`;
    });

    content += `\nView all ${tagCounts.size} tags at [/tags](/tags.md)`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating tags.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
