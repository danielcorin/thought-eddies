import { getCollection } from 'astro:content';
import type { InferGetStaticParamsType } from 'astro';
import { generateOGImage } from '@utils/og';

const posts = await getCollection('posts');
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export async function GET({ params }: { params: Params }) {
  const post = posts.find((post) => post.id === params.slug);
  if (!post) {
    return new Response('Post not found', { status: 404 });
  }

  const date = post.data.createdAt
    ? new Date(post.data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return generateOGImage({
    title: post.data.title,
    description: post.data.description,
    category: 'Posts',
    date,
  });
}

export async function getStaticPaths() {
  return posts.map((post) => ({
    params: { slug: post.id },
    props: post,
  }));
}
