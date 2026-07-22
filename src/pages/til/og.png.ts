import { generateOGImage } from '@utils/og';

export async function GET() {
  return generateOGImage({
    title: 'Today I Learned',
    category: 'Archive',
  });
}
