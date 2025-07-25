import { getCollection } from 'astro:content';
import type { InferGetStaticParamsType } from 'astro';
import { generateOGImage } from '@utils/og';

const tils = await getCollection('til');
type Params = InferGetStaticParamsType<typeof getStaticPaths>;

export async function GET({ params }: { params: Params }) {
  const category = params.category;
  const categoryTils = tils.filter((til) => {
    const [tilCategory] = til.id.split('/');
    return tilCategory === category;
  });

  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

  return generateOGImage({
    title: `TIL: ${categoryTitle}`,
    description: `${categoryTils.length} ${categoryTils.length === 1 ? 'entry' : 'entries'} about ${categoryTitle}`,
    category: 'Today I Learned',
  });
}

export async function getStaticPaths() {
  const categories = [...new Set(tils.map((til) => til.id.split('/')[0]))];

  return categories.map((category) => ({
    params: { category },
  }));
}
