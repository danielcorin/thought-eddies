import { getCollection, type CollectionEntry } from 'astro:content';
import { generateOGImage } from '@utils/og';

export const prerender = true;

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((post: CollectionEntry<'posts'>) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

interface Props {
  post: CollectionEntry<'posts'>;
}

export async function GET({ props }: { props: Props }) {
  const { post } = props;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return generateOGImage({
    title: post.data.title,
    description: post.data.description,
    category: 'Post',
    date: formatDate(post.data.createdAt),
  });
}
