import { getCollection, type CollectionEntry } from 'astro:content';
import { generateOGImage } from '@utils/og';

export const prerender = true;

export async function getStaticPaths() {
  const entries = await getCollection('breadcrumbs');
  return entries.map((entry: CollectionEntry<'breadcrumbs'>) => ({
    params: { slug: entry.id.replace(/\.(md|mdx)$/, '') },
    props: { entry },
  }));
}

interface Props {
  entry: CollectionEntry<'breadcrumbs'>;
}

export async function GET({ props }: { props: Props }) {
  const { entry } = props;
  const date = entry.data.publishedAt
    ? new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(entry.data.publishedAt)
    : undefined;

  return generateOGImage({
    title: entry.data.title,
    category: 'BREADCRUMB',
    date,
  });
}
