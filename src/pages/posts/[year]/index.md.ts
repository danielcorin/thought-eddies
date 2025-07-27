import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const years = [
    ...new Set(
      posts.map((post) => new Date(post.data.createdAt).getFullYear())
    ),
  ];

  return years.map((year) => ({
    params: { year: year.toString() },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { year } = params;
  if (!year) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const posts = await getCollection('posts', ({ data }) => !data.draft);

    const yearPosts = posts
      .filter(
        (post) =>
          new Date(post.data.createdAt).getFullYear().toString() === year
      )
      .sort((a, b) => b.data.createdAt.valueOf() - a.data.createdAt.valueOf());

    let content = `# Posts from ${year}

${yearPosts.length} ${yearPosts.length === 1 ? 'post' : 'posts'}

[← All posts](/posts)

`;

    // Group posts by month
    const postsByMonth = yearPosts.reduce(
      (acc, post) => {
        const month = new Date(post.data.createdAt).getMonth();
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(post);
        return acc;
      },
      {} as Record<number, typeof posts>
    );

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // List posts organized by month
    monthNames.forEach((monthName, index) => {
      const monthPosts = postsByMonth[index];
      if (monthPosts && monthPosts.length > 0) {
        content += `## ${monthName}\n\n`;

        monthPosts.forEach((post) => {
          const date = formatDate(post.data.createdAt);
          const slug = post.id.replace(/\.mdx?$/, '');
          content += `- ${date}: [${post.data.title}](/posts/${slug}/index.md)`;

          // Add description if available
          if (post.data.description) {
            content += ` - ${post.data.description}`;
          }

          content += '\n';
        });

        content += '\n';
      }
    });

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating post year markdown:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
