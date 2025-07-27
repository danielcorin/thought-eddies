import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, render } from 'astro:content';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const feeds = await getCollection('feeds');
  return feeds.map((feed) => ({
    params: { id: feed.id },
    props: { feed },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  try {
    const { feed } = props;

    if (!feed) {
      return new Response('Not found', { status: 404 });
    }

    const { Content } = await render(feed);

    // Extract the content body
    const content = `# ${feed.data.title}

## About This Feed

${feed.body}

## Feed Information

- **RSS Feed URL**: [${feed.data.feed_url}](${feed.data.feed_url})

---

[View all feeds](/feeds.md)
`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating feed markdown:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
