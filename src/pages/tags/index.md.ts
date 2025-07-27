import type { APIRoute } from 'astro';
import { createRedirectResponse } from '@utils/markdownEndpoints';

export const prerender = true;

// This endpoint serves as an alias for tags.md
// It redirects to the canonical tags.md endpoint
export const GET: APIRoute = async () => {
  return createRedirectResponse('/tags.md');
};
