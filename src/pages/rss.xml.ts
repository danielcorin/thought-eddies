import { generateRSSFeed } from '@utils/rss';

export async function GET(context: { site: string }) {
  return generateRSSFeed(context);
}