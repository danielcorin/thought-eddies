import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { buildLogUrl } from '@utils/markdownEndpoints';
import { shouldShowPost } from '@utils/posts';

const stripExtension = (id: string) => id.replace(/\.(md|mdx)$/, '');

// URL lists consumed by RandomEntryButton to pick a destination client-side
const builders: Record<string, () => Promise<string[]>> = {
  posts: async () =>
    (await getCollection('posts'))
      .filter((post) => shouldShowPost(post) && !post.id.includes('level'))
      .map((post) => `/posts/${stripExtension(post.id)}`),
  til: async () =>
    (await getCollection('til'))
      .filter((til) => shouldShowPost(til))
      .map((til) => {
        const [category, ...slugParts] = stripExtension(til.id).split('/');
        return `/til/${category}/${slugParts.join('/')}`;
      }),
  logs: async () =>
    (await getCollection('logs'))
      .filter((log) => shouldShowPost(log))
      .map((log) => buildLogUrl(log.id)),
};

export const getStaticPaths: GetStaticPaths = () =>
  Object.keys(builders).map((collection) => ({ params: { collection } }));

export const GET: APIRoute = async ({ params }) => {
  const build = builders[params.collection ?? ''];
  if (!build) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(JSON.stringify(await build()), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=3600',
    },
  });
};
