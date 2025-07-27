import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createContentEndpoint } from '@utils/markdownEndpoints';

export const prerender = true;

export async function getStaticPaths() {
  const tilEntries = await getCollection('til');
  return tilEntries.map((entry) => {
    const [category, ...slugParts] = entry.id.split('/');
    const slug = slugParts.join('/').replace(/\.(md|mdx)$/, '');

    return {
      params: { category, slug },
      props: { entryId: entry.id },
    };
  });
}

export const GET = createContentEndpoint('til', (params) => {
  const { category, slug } = params;
  return category && slug ? `${category}/${slug}` : undefined;
});
