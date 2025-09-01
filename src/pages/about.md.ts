import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const aboutEntries = await getCollection('about');
    const about = aboutEntries[0];

    if (!about) {
      return new Response('Not found', { status: 404 });
    }

    const { Content } = await render(about);

    // The about content is already in markdown format
    const content = `# ${about.data.title}

${about.body}`;

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
