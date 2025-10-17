import { getCollection } from 'astro:content';
import { generateOGImage } from '@utils/og';

const feeds = await getCollection('feeds');

export async function GET() {
  const feedsCount = feeds.length;

  return generateOGImage({
    title: 'Feeds',
    description: `${feedsCount} curated feeds from around the web`,
    category: 'Archive',
  });
}
