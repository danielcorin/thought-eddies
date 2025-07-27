import type { APIRoute } from 'astro';
import { createRedirectResponse } from '@utils/markdownEndpoints';

export const prerender = true;

// This endpoint serves as an alias for logs.md
// It redirects to the canonical logs.md endpoint
export const GET: APIRoute = async () => {
  return createRedirectResponse('/logs.md');
};
