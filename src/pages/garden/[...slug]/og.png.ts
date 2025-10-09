import { getCollection, type CollectionEntry } from 'astro:content';
import { generateOGImage } from '@utils/og';

export const prerender = true;

export async function getStaticPaths() {
  const gardenEntries = await getCollection('garden');
  return gardenEntries.map((entry: CollectionEntry<'garden'>) => ({
    params: { slug: entry.id.replace(/\.(md|mdx)$/, '') },
    props: { entry },
  }));
}

interface Props {
  entry: CollectionEntry<'garden'>;
}

export async function GET({ props }: { props: Props }) {
  const { entry } = props;

  // Extract category from the entry id
  const category = entry.id.split('/')[0];
  const categoryDisplay = category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return generateOGImage({
    title: entry.data.title,
    description: entry.data.description,
    category: categoryDisplay,
  });
}
