import type { APIRoute } from 'astro';
import { createRedirectResponse } from '@utils/markdownEndpoints';

export const prerender = true;

// This endpoint serves as an alias for til.md
// It redirects to the canonical til.md endpoint
export const GET: APIRoute = async () => {
  return createRedirectResponse('/til.md');
};
