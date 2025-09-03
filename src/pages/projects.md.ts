import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all projects and sort by date
    const projects = await getCollection('projects', ({ data }) => !data.draft);
    const sortedProjects = projects.sort((a, b) => {
      const dateA = new Date(a.data.createdAt || a.data.date).getTime();
      const dateB = new Date(b.data.createdAt || b.data.date).getTime();
      return dateB - dateA;
    });

    let content = `# Projects

Personal projects and experiments.

## All Projects

`;

    sortedProjects.forEach((project) => {
      const date = formatDate(project.data.createdAt || project.data.date);
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
