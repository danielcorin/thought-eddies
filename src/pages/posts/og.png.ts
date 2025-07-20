import { getCollection } from 'astro:content';
import { generateOGImage } from '@utils/og';

const posts = await getCollection('posts', ({ data }) => !data.draft);

export async function GET() {
  const postsCount = posts.filter((post) => !post.id.includes('level')).length;

  return generateOGImage({
    title: 'Posts',
    description: `${postsCount} posts and experiments`,
  });
}
