import { getCollection, type CollectionEntry } from 'astro:content';
import { generateOGImage } from '@utils/og';

export const prerender = true;

export async function getStaticPaths() {
  const tils = await getCollection('til');
  return tils.map((til: CollectionEntry<'til'>) => {
    const [category, ...slugParts] = til.id.split('/');
    const slug = slugParts.join('/').replace(/\.(md|mdx)$/, '');

    return {
      params: {
        category,
        slug,
      },
      props: { til },
    };
  });
}

interface Props {
  til: CollectionEntry<'til'>;
}

export async function GET({ props }: { props: Props }) {
  const { til } = props;
  const category = til.id.split('/')[0];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return generateOGImage({
    title: til.data.title,
    description: til.data.description,
    category: category.toUpperCase(),
    date: til.data.publishedAt ? formatDate(til.data.publishedAt) : undefined,
  });
}
