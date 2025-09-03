import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  // Get all collections
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const tils = await getCollection('til', ({ data }) => !data.draft);
  const logs = await getCollection('logs', ({ data }) => !data.draft);
  const projects = await getCollection('projects', ({ data }) => !data.draft);
  const garden = await getCollection('garden');

  // Sort each collection by creation date
  const sortedPosts = posts.sort(
    (a, b) =>
      new Date(b.data.createdAt).getTime() -
      new Date(a.data.createdAt).getTime()
  );

  const sortedTils = tils.sort(
    (a, b) =>
      new Date(b.data.createdAt).getTime() -
      new Date(a.data.createdAt).getTime()
  );

  const sortedLogs = logs.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  const sortedProjects = projects.sort((a, b) => {
    const dateA = new Date(a.data.createdAt || a.data.date).getTime();
    const dateB = new Date(b.data.createdAt || b.data.date).getTime();
    return dateB - dateA;
  });

  const sortedGarden = garden.sort((a, b) =>
    a.data.title.localeCompare(b.data.title)
  );

  // Build the markdown content
  let content = `# Thought Eddies

> An experimental digital garden

## Main Pages

- [About](/about.md): About me and this site
- [Now](/now.md): What I'm focused on at this point in my life
- [Posts](/posts.md): Long-form articles and essays
- [TIL](/til.md): Today I Learned entries overview
- [Logs](/logs.md): Daily logs and thoughts
- [Projects](/projects.md): Personal projects and experiments
- [Garden](/garden.md): Thoughts, ideas and essays I tend to
- [Tags](/tags.md): Browse content by topic
- [Feeds](/feeds.md): External RSS/Atom feeds I follow

## Content

### Posts

${sortedPosts
  .map(
    (post) =>
      `- [${post.data.title}](/posts/${post.id}/index.md): Published ${new Date(post.data.createdAt).toISOString().split('T')[0]}`
  )
  .join('\n')}

### TIL (Today I Learned)

${sortedTils
  .map(
    (til) =>
      `- [${til.data.title}](/til/${til.id}/index.md): Published ${new Date(til.data.createdAt).toISOString().split('T')[0]}`
  )
  .join('\n')}

### Logs

${sortedLogs
  .slice(0, 30)
  .map(
    (log) =>
      `- [${log.data.title}](/logs/${log.id}/index.md): ${new Date(log.data.date).toISOString().split('T')[0]}`
  )
  .join('\n')}

### Projects

${sortedProjects
  .map(
    (project) =>
      `- [${project.data.title}](/projects/${project.id}/index.md): ${project.data.description || ''}`
  )
  .join('\n')}

### Garden

${sortedGarden
  .map(
    (entry) =>
      `- [${entry.data.title}](/garden/${entry.id}): ${entry.data.noteworthy ? '★ ' : ''}${entry.id.split('/')[0]}`
  )
  .join('\n')}
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
