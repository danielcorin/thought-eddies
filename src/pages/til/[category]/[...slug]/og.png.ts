import { getCollection } from 'astro:content';
import type { InferGetStaticParamsType } from 'astro';
import { generateOGImage } from '@utils/og';

const tils = await getCollection('til');
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export async function GET({ params }: { params: Params }) {
  const tilId = `${params.category}/${params.slug}`;
  const til = tils.find((t) => {
    const [category, ...slugParts] = t.id.split('/');
    const slug = slugParts.join('/').replace(/\.(md|mdx)$/, '');
    return category === params.category && slug === params.slug;
  });

  if (!til) {
    return new Response('TIL not found', { status: 404 });
  }

  const date = til.data.createdAt
    ? new Date(til.data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  const category =
    params.category.charAt(0).toUpperCase() + params.category.slice(1);

  return generateOGImage({
    title: til.data.title,
    description: til.data.description,
    category: `TIL / ${category}`,
    date,
  });
}

export async function getStaticPaths() {
  return tils.map((til) => {
    const [category, ...slugParts] = til.id.split('/');
    const slug = slugParts.join('/').replace(/\.(md|mdx)$/, '');

    return {
      params: {
        category,
        slug,
      },
    };
  });
}
