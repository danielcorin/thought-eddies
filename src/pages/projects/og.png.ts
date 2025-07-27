import { getCollection } from 'astro:content';
import { generateOGImage } from '@utils/og';

const projects = await getCollection('projects', ({ data }) => !data.draft);

export async function GET() {
  const projectsCount = projects.filter(
    (project) => !project.id.includes('level')
  ).length;

  return generateOGImage({
    title: 'Projects',
    description: `${projectsCount} projects and experiments`,
    category: 'Archive',
  });
}
