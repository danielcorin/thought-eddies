import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all TILs
    const tils = await getCollection('til');
    const publishedTils = tils.filter((til) => !til.data.draft);

    // Group by category
    const tilsByCategory = new Map<string, typeof tils>();

    publishedTils.forEach((til) => {
      const category = til.id.split('/')[0];
      if (!tilsByCategory.has(category)) {
        tilsByCategory.set(category, []);
      }
      tilsByCategory.get(category)!.push(til);
    });

    // Sort categories alphabetically and TILs by date within each category
    const sortedCategories = Array.from(tilsByCategory.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, tils]) => ({
        category,
        tils: tils.sort(
          (a, b) =>
            new Date(b.data.createdAt).getTime() -
            new Date(a.data.createdAt).getTime()
        ),
      }));

    let content = `# TIL (Today I Learned)

Short-form posts about things I've learned.

## Categories

`;

    // List all categories with counts
    sortedCategories.forEach(({ category, tils }) => {
      content += `- [${category}](/til/${category}/index.md) (${tils.length})\n`;
    });

    content += `\n## All TILs\n\n`;

    // Show all TILs grouped by category
    sortedCategories.forEach(({ category, tils }) => {
      content += `\n### ${category}\n\n`;
      tils.forEach((til) => {
        const date = formatDate(til.data.createdAt);

        const slug = til.id.replace(/\.mdx?$/, '');
        const category = til.id.split('/')[0];

        content += `- [${til.data.title}](/til/${slug}/index.md) - ${date}\n`;
      });
    });

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating til.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
