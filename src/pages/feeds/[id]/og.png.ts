import { getCollection, type CollectionEntry } from 'astro:content';
import { generateOGImage } from '@utils/og';

export const prerender = true;

export async function getStaticPaths() {
  const feeds = await getCollection('feeds');
  return feeds.map((feed: CollectionEntry<'feeds'>) => ({
    params: { id: feed.id },
    props: { feed },
  }));
}

interface Props {
  feed: CollectionEntry<'feeds'>;
}

export async function GET({ props }: { props: Props }) {
  const { feed } = props;

  return generateOGImage({
    title: feed.data.title,
    description: feed.body,
    category: 'Feed',
  });
}
