import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';

export const prerender = true;

export async function getStaticPaths() {
  const tilEntries = await getCollection('til');
  return tilEntries.map((entry) => {
    const [category, ...slugParts] = entry.id.split('/');
    const slug = slugParts.join('/').replace(/\.(md|mdx)$/, '');
    
    return {
      params: { category, slug },
      props: { entryId: entry.id }
    };
  });
}

export const GET: APIRoute = async ({ params }) => {
  const { category, slug } = params;
  if (!category || !slug) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const entryId = `${category}/${slug}`;
    const entry = await getEntry('til', entryId);
    
    if (!entry) {
      return new Response('Not found', { status: 404 });
    }

    // Reconstruct the full markdown with frontmatter
    const frontmatter = Object.entries(entry.data)
      .filter(([_, value]) => value !== null && !(Array.isArray(value) && value.length === 0))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');
    
    const fullContent = `---\n${frontmatter}\n---\n\n${entry.body}`;

    return new Response(fullContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error reading markdown file:', error);
    return new Response('Internal server error', { status: 500 });
  }
};