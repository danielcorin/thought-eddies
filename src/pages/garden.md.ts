import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all garden entries
    const gardenEntries = await getCollection('garden');

    // Group entries by category (directory name)
    const categoriesMap = new Map<string, typeof gardenEntries>();

    gardenEntries.forEach((entry) => {
      const parts = entry.id.split('/');
      const category = parts[0];

      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, []);
      }
      categoriesMap.get(category)!.push(entry);
    });

    // Sort categories and their entries
    const categories = Array.from(categoriesMap.entries())
      .map(([name, entries]) => ({
        name,
        displayName: name
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        entries: entries.sort((a, b) =>
          a.data.title.localeCompare(b.data.title)
        ),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    let content = `# Garden

A place for thoughts, ideas and essays I tend to.

## All Entries by Category

`;

    // List all categories with entries
    categories.forEach(({ displayName, name, entries }) => {
      content += `### ${displayName} (${entries.length})\n\n`;

      entries.forEach((entry) => {
        const slug = entry.id.replace(/\.(md|mdx)$/, '');
        const noteworthy = entry.data.noteworthy ? '★ ' : '';

        content += `- ${noteworthy}[${entry.data.title}](/garden/${slug})\n`;
      });

      content += '\n';
    });

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating garden.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
