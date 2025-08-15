import { generateSectionRSSFeed } from '@utils/rss-section';

export async function GET(context: { site: string }) {
  return generateSectionRSSFeed(context, 'garden');
}
