import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  // Get all collections
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const tils = await getCollection('til', ({ data }) => !data.draft);
  
  // Sort each collection by creation date
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
  );
  
  const sortedTils = tils.sort(
    (a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
  );

  // Build the markdown content
  let content = `# Thought Eddies

> An experimental digital garden

## Content

### Posts

${sortedPosts.map(post => 
  `- [${post.data.title}](/posts/${post.id}/index.md): Published ${new Date(post.data.createdAt).toISOString().split('T')[0]}`
).join('\n')}

### TIL (Today I Learned)

${sortedTils.map(til => 
  `- [${til.data.title}](/til/${til.id}/index.md): Published ${new Date(til.data.createdAt).toISOString().split('T')[0]}`
).join('\n')}
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};