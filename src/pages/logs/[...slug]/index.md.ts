import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createContentEndpoint } from '@utils/markdownEndpoints';

export const prerender = true;

export async function getStaticPaths() {
  const logs = await getCollection('logs');
  return logs.map((log) => ({
    params: { slug: log.id.replace(/\.mdx?$/, '') },
  }));
}

export const GET = createContentEndpoint('logs');
