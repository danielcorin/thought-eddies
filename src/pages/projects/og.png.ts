import { generateOGImage } from '@utils/og';

export async function GET() {
  return generateOGImage({
    title: 'Projects',
    category: 'Archive',
  });
}
