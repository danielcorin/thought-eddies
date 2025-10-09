import { getCollection, type CollectionEntry } from 'astro:content';
import { generateOGImage } from '@utils/og';

export const prerender = true;

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects.map((project: CollectionEntry<'projects'>) => ({
    params: { slug: project.id },
    props: { project },
  }));
}

interface Props {
  project: CollectionEntry<'projects'>;
}

export async function GET({ props }: { props: Props }) {
  const { project } = props;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return generateOGImage({
    title: project.data.title,
    description: project.data.description,
    category: 'Project',
    date: project.data.publishedAt
      ? formatDate(project.data.publishedAt)
      : undefined,
  });
}
