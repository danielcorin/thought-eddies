import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { GetStaticPaths } from 'astro';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  // Get all posts, logs, and tils
  const posts = await getCollection('posts');
  const logs = await getCollection('logs');
  const tils = await getCollection('til');

  // Extract all unique tags
  const allTags = new Set<string>();

  [...posts, ...logs, ...tils].forEach((item) => {
    if (item.data.tags && Array.isArray(item.data.tags)) {
      item.data.tags.forEach((tag) => allTags.add(tag));
    }
  });

  // Generate paths for each tag
  return Array.from(allTags).map((tag) => ({
    params: { tag },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { tag } = params;
  if (!tag) {
    return new Response('Not found', { status: 404 });
  }

  try {
    // Get all content with this tag
    const posts = await getCollection('posts');
    const logs = await getCollection('logs');
    const tils = await getCollection('til');

    // Filter and combine content
    const taggedPosts = posts
      .filter((post) => !post.data.draft && post.data.tags?.includes(tag))
      .map((post) => ({
        ...post,
        type: 'post' as const,
        date: post.data.createdAt,
      }));

    const taggedLogs = logs
      .filter((log) => !log.data.draft && log.data.tags?.includes(tag))
      .map((log) => ({
        ...log,
        type: 'log' as const,
        date: log.data.date,
      }));

    const taggedTils = tils
      .filter((til) => !til.data.draft && til.data.tags?.includes(tag))
      .map((til) => ({
        ...til,
        type: 'til' as const,
        date: til.data.createdAt,
      }));

    // Combine and sort by date
    const allTaggedContent = [
      ...taggedPosts,
      ...taggedLogs,
      ...taggedTils,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let content = `# Tag: ${tag}

${allTaggedContent.length} ${allTaggedContent.length === 1 ? 'entry' : 'entries'}

[← All tags](/tags.md)

`;

    // Group content by type
    const postContent = allTaggedContent.filter((item) => item.type === 'post');
    const logContent = allTaggedContent.filter((item) => item.type === 'log');
    const tilContent = allTaggedContent.filter((item) => item.type === 'til');

    if (postContent.length > 0) {
      content += `## Posts\n\n`;
      postContent.forEach((post) => {
        const date = formatDate(post.date);
        const slug = post.id.replace(/\.mdx?$/, '');
        content += `- [${post.data.title}](/posts/${slug}/index.md) - ${date}\n`;
      });
      content += '\n';
    }

    if (logContent.length > 0) {
      content += `## Logs\n\n`;
      logContent.forEach((log) => {
        const date = formatDate(log.date);
        const slug = log.id.replace(/\.mdx?$/, '');
        content += `- [${log.data.title}](/logs/${slug}/index.md) - ${date}\n`;
      });
      content += '\n';
    }

    if (tilContent.length > 0) {
      content += `## TIL\n\n`;
      tilContent.forEach((til) => {
        const date = formatDate(til.date);
        const slug = til.id.replace(/\.mdx?$/, '');
        content += `- [${til.data.title}](/til/${slug}/index.md) - ${date}\n`;
      });
    }

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating tag markdown:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
