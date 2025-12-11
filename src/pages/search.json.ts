import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatLogIdAsDate, buildLogUrl } from '@utils/markdownEndpoints';

export const GET: APIRoute = async () => {
  // Get all content
  const allPosts = await getCollection('posts', ({ data }) => {
    return data.draft !== true;
  });

  const allLogs = await getCollection('logs');
  const allTils = await getCollection('til');
  const allProjects = await getCollection('projects', ({ data }) => {
    return data.draft !== true;
  });
  const allGarden = await getCollection('garden', ({ data }) => {
    return data.draft !== true;
  });

  // Process posts
  const posts = allPosts.map((post) => ({
    type: 'post',
    id: post.id,
    title: post.data.title,
    description: post.data.description || '',
    tags: post.data.tags || [],
    date: post.data.publishedAt || post.data.createdAt,
    url: `/posts/${post.id}`,
    content: post.body,
  }));

  // Process logs - use log ID to derive date to avoid timezone issues
  const logs = allLogs.map((log) => ({
    type: 'log',
    id: log.id,
    title: log.data.title,
    description: '',
    tags: log.data.tags || [],
    date: formatLogIdAsDate(log.id) || log.data.date,
    url: buildLogUrl(log.id),
    content: log.body,
  }));

  // Process TILs
  const tils = allTils.map((til) => {
    const [category, ...slugParts] = til.id.split('/');
    const slug = slugParts.join('/').replace(/\.(md|mdx)$/, '');
    return {
      type: 'til',
      id: til.id,
      title: til.data.title,
      description: til.data.description || '',
      tags: til.data.tags || [],
      category,
      date: til.data.createdAt,
      url: `/til/${category}/${slug}`,
      content: til.body,
    };
  });

  // Process projects
  const projects = allProjects.map((project) => ({
    type: 'project',
    id: project.id,
    title: project.data.title,
    description: project.data.description || '',
    tags: project.data.tags || [],
    date:
      project.data.date ||
      project.data.publishedAt ||
      project.data.createdAt ||
      new Date(),
    url: `/projects/${project.id}`,
    content: project.body,
  }));

  // Process garden posts
  const garden = allGarden.map((post) => ({
    type: 'garden',
    id: post.id,
    title: post.data.title,
    description: '',
    tags: [],
    date: post.data.date || new Date(),
    url: `/garden/${post.id}`,
    content: post.body,
  }));

  // Combine and sort by date
  const allContent = [...posts, ...logs, ...tils, ...projects, ...garden].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return new Response(JSON.stringify(allContent), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=3600', // Cache for 1 hour
    },
  });
};
