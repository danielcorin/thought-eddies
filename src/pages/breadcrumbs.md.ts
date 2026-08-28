import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';
import { shouldShowPost } from '@utils/posts';

export const prerender = true;

export const GET: APIRoute = async () => {
  const breadcrumbs = (await getCollection('breadcrumbs'))
    .filter(shouldShowPost)
    .sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() -
        new Date(a.data.createdAt).getTime()
    );

  let content = `# Breadcrumbs

Resolutions published in the hope that others who run into the same issues can find them.

The investigations and write-ups may be mostly agent-generated from problems I encounter, describe, and use an agent to help resolve.

`;

  breadcrumbs.forEach((breadcrumb) => {
    const slug = breadcrumb.id.replace(/\.mdx?$/, '');
    content += `### [${breadcrumb.data.title}](/breadcrumbs/${slug}/index.md)\n`;
    content += `*${formatDate(breadcrumb.data.createdAt)}*\n\n`;
    if (breadcrumb.data.description) {
      content += `${breadcrumb.data.description}\n\n`;
    }
  });

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
