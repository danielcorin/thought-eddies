import { getCollection } from 'astro:content';
import { createContentEndpoint } from '@utils/markdownEndpoints';

export const prerender = true;

export async function getStaticPaths() {
  const entries = await getCollection('breadcrumbs');
  return entries.map((entry) => ({
    params: { slug: entry.id.replace(/\.(md|mdx)$/, '') },
  }));
}

export const GET = createContentEndpoint('breadcrumbs');
