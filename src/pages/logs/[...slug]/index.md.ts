import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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
    const logs = await getCollection('logs');
    const entry = logs.find(l => l.id.replace(/\.(md|mdx)$/, '') === slug);
    
    if (!entry) {
      return new Response('Not found', { status: 404 });
    }

    const filePath = join(process.cwd(), 'src', 'content', 'logs', entry.id);
    const content = await readFile(filePath, 'utf-8');
    
    return new Response(content, {
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