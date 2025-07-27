import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { createContentEndpoint } from '@utils/markdownEndpoints';

export const prerender = true;

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects.map((project) => ({
    params: { slug: project.id.replace(/\.mdx?$/, '') },
  }));
}

export const GET = createContentEndpoint('projects');
