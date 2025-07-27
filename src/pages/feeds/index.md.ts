import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = async () => {
  return new Response(null, {
    status: 301,
    headers: {
      Location: '/feeds.md',
    },
  });
};
