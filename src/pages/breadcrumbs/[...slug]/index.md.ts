import { getCollection } from 'astro:content';
import { createContentEndpoint } from '@utils/markdownEndpoints';
import { shouldShowPost } from '@utils/posts';

export const prerender = true;

export async function getStaticPaths() {
  const entries = await getCollection('breadcrumbs');
  return entries.filter(shouldShowPost).map((entry) => ({
    params: { slug: entry.id.replace(/\.(md|mdx)$/, '') },
  }));
}

export const GET = createContentEndpoint('breadcrumbs');
