import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const homeEntries = await getCollection('home');
    const home = homeEntries[0];

    if (!home) {
      return new Response('Not found', { status: 404 });
    }

    const { Content } = await render(home);

    // The home content is already in markdown format
    const content = `# ${home.data.title}

${home.body}`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating about.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
