import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';

export const prerender = true;

export async function getStaticPaths() {
  const logs = await getCollection('logs');
  return logs.map((log) => ({
    params: { slug: log.id.replace(/\.mdx?$/, '') },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const entry = await getEntry('logs', slug);
    
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