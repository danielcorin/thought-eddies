import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createContentEndpoint } from '@utils/markdownEndpoints';

export const prerender = true;

export async function getStaticPaths() {
  const rssEntries = await getCollection('rss');
  return rssEntries.map((entry) => {
    const slug = entry.id.replace(/\.(md|mdx)$/, '');
    
    return {
      params: { slug },
      props: { entryId: entry.id },
    };
  });
}

export const GET = createContentEndpoint('rss');