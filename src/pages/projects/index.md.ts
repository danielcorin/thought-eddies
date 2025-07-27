import type { APIRoute } from 'astro';
import { createRedirectResponse } from '@utils/markdownEndpoints';

export const prerender = true;

// This endpoint serves as an alias for projects.md
// It redirects to the canonical projects.md endpoint
export const GET: APIRoute = async () => {
  return createRedirectResponse('/projects.md');
};
