import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const prerender = true;

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((post) => ({
    params: { slug: post.id.replace(/\.mdx?$/, '') },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const posts = await getCollection('posts');
    const entry = posts.find(p => p.id.replace(/\.(md|mdx)$/, '') === slug);
    
    if (!entry) {
      return new Response('Not found', { status: 404 });
    }

    const filePath = join(process.cwd(), 'src', 'content', 'posts', entry.id);
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