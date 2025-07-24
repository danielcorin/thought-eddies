import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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
    const tilEntries = await getCollection('til');
    console.log(`Looking for category: ${category}, slug: ${slug}`);
    console.log('Available entries:', tilEntries.map(e => e.id));
    
    const entry = tilEntries.find(e => {
      const [entryCategory, ...slugParts] = e.id.split('/');
      const entrySlug = slugParts.join('/').replace(/\.(md|mdx)$/, '');
      console.log(`Checking: ${e.id} -> category: ${entryCategory}, slug: ${entrySlug}`);
      return entryCategory === category && entrySlug === slug;
    });
    
    if (!entry) {
      console.error(`Entry not found for category: ${category}, slug: ${slug}`);
      return new Response('Not found', { status: 404 });
    }

    console.log(`Found entry: ${entry.id}`);
    const filePath = join(process.cwd(), 'src', 'content', 'til', entry.id);
    console.log(`Reading file from: ${filePath}`);
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