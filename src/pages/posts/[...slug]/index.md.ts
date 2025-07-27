import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createContentEndpoint } from '@utils/markdownEndpoints';

export const prerender = true;

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((post) => ({
    params: { slug: post.id.replace(/\.mdx?$/, '') },
  }));
}

export const GET = createContentEndpoint('posts');
