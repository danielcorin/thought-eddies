import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const tils = await getCollection('til');
  const publishedTils = tils.filter((til) => !til.data.draft);

  // Get all unique categories
  const categories = [
    ...new Set(publishedTils.map((til) => til.id.split('/')[0])),
  ];

  return categories.map((category) => ({
    params: { category },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { category } = params;
  if (!category) {
    return new Response('Not found', { status: 404 });
  }

  try {
    // Get all TILs for this category
    const allTils = await getCollection('til');
    const categoryTils = allTils
      .filter((til) => !til.data.draft && til.id.split('/')[0] === category)
      .sort((a, b) => b.data.createdAt.valueOf() - a.data.createdAt.valueOf());

    let content = `# TIL - ${category}

${categoryTils.length} ${categoryTils.length === 1 ? 'entry' : 'entries'}

[← All TILs](/til.md)

## Entries

`;

    categoryTils.forEach((til) => {
      const date = formatDate(til.data.createdAt);

      const slug = til.id.replace(/\.mdx?$/, '');
      content += `### [${til.data.title}](/til/${slug}/index.md)\n`;
      content += `*${date}*\n\n`;

      // Add description if available
      if (til.data.description) {
        content += `${til.data.description}\n\n`;
      }

      // Add tags if present
      if (til.data.tags && til.data.tags.length > 0) {
        content += `Tags: ${til.data.tags.join(', ')}\n\n`;
      }
    });

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating TIL category markdown:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
