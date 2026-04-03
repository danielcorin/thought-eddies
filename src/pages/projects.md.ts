import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all projects and sort by date
    const projects = await getCollection('projects', ({ data }) => !data.draft);
    const sortedProjects = projects.sort((a, b) => {
      const dateA = new Date(a.data.createdAt || 0).getTime();
      const dateB = new Date(b.data.createdAt || 0).getTime();
      return dateB - dateA;
    });

    let content = `# Projects

Personal projects and experiments.

## All Projects

`;

    sortedProjects.forEach((project) => {
      const date = formatDate(project.data.createdAt || new Date(0));
      const slug = project.id.replace(/\.mdx?$/, '');

      content += `### [${project.data.title}](/projects/${slug}/index.md)\n`;
      content += `*${date}*\n\n`;

      if (project.data.description) {
        content += `${project.data.description}\n\n`;
      }
    });

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating projects.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
