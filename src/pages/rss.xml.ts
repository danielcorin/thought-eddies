import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: string }) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const sortedPosts = posts.sort(
    (a, b) =>
      new Date(b.data.createdAt).getTime() -
      new Date(a.data.createdAt).getTime()
  );
  return rss({
    title: 'Thought Eddies',
    description: 'An experimental digital garden',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.createdAt,
      description: post.data.description,
      link: `/posts/${post.id}/`,
    })),
  });
}
