import type { APIRoute } from 'astro';
import { createRedirectResponse } from '@utils/markdownEndpoints';

export const prerender = true;

// This endpoint serves as an alias for posts.md
// It redirects to the canonical posts.md endpoint
export const GET: APIRoute = async () => {
  return createRedirectResponse('/posts.md');
};
