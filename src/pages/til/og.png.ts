import { getCollection } from 'astro:content';
import { generateOGImage } from '@utils/og';

const tils = await getCollection('til', ({ data }) => !data.draft);

export async function GET() {
  const tilsCount = tils.length;
  const categories = [...new Set(tils.map((til) => til.id.split('/')[0]))];

  return generateOGImage({
    title: 'Today I Learned',
    description: `${tilsCount} learnings across ${categories.length} categories`,
    category: 'Archive',
  });
}
