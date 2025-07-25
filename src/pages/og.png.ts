import { generateOGImage } from '@utils/og';

export async function GET() {
  return generateOGImage({
    title: 'Thought Eddies',
    description: 'An Experimental Digital Garden',
  });
}
