import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all posts and sort by date
    const posts = await getCollection('posts', ({ data }) => !data.draft);
    const sortedPosts = posts.sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() -
        new Date(a.data.createdAt).getTime()
    );

    // Get all years with posts
    const yearsWithPosts = [
      ...new Set(
        posts.map((post) => new Date(post.data.createdAt).getFullYear())
      ),
    ].sort((a, b) => b - a);

    let content = `# Posts

Long-form articles and essays.

## Browse by Year

`;

    yearsWithPosts.forEach((year) => {
      const yearPosts = posts.filter(
        (post) => new Date(post.data.createdAt).getFullYear() === year
      );
      content += `- [${year}](/posts/${year}/index.md) (${yearPosts.length} ${yearPosts.length === 1 ? 'post' : 'posts'})\n`;
    });

    content += `
## Recent Posts

`;

    // Show last 20 posts
    sortedPosts.slice(0, 20).forEach((post) => {
      const date = formatDate(post.data.createdAt);

      const slug = post.id.replace(/\.mdx?$/, '');

      content += `### [${post.data.title}](/posts/${slug}/index.md)\n`;
      content += `*${date}*\n\n`;

      if (post.data.description) {
        content += `${post.data.description}\n\n`;
      }
    });

    content += `\nView all posts at [/posts](/posts.md)`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating posts.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
