// Generate RSS feed for specific content sections

import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx';
import reactRenderer from '@astrojs/react/server.js';
import svelteRenderer from '@astrojs/svelte/server.js';
import { loadRenderers } from 'astro:container';
import { addRSSFooter } from './rss';

type ContentSection = 'posts' | 'logs' | 'til' | 'garden' | 'projects';

export async function generateSectionRSSFeed(
  context: { site: string },
  section: ContentSection
) {
  // Set up MDX renderer
  const renderers = await loadRenderers([getMDXRenderer()]);
  const container = await AstroContainer.create({ renderers });

  container.addServerRenderer({
    name: '@astrojs/react',
    renderer: reactRenderer,
  });
  container.addServerRenderer({
    name: '@astrojs/svelte',
    renderer: svelteRenderer,
  });

  // Get content for the specific section that is not draft
  const items = await getCollection(section, ({ data }) => !data.draft);

  // Helper to extract date from any collection entry
  const getDate = (data: Record<string, any>): Date => {
    return data.createdAt || data.publishedAt || data.date || new Date(0);
  };

  // Helper to extract description from any collection entry
  const getDescription = (data: Record<string, any>): string => {
    return data.description || '';
  };

  // Sort items by creation date
  const sortedItems = items.sort((a, b) => {
    const dateA = getDate(a.data as Record<string, any>);
    const dateB = getDate(b.data as Record<string, any>);
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Map items to RSS format with full content
  const rssItems = await Promise.all(
    sortedItems.map(async (item) => {
      // Render MDX content to HTML
      let htmlContent = '';
      try {
        const { Content } = await render(item);
        htmlContent = await container.renderToString(Content);
      } catch (error) {
        console.warn(`Failed to render MDX for ${item.id}:`, error);
        htmlContent = `<p>${'description' in item.data ? item.data.description || '' : ''}</p>`;
      }

      // Add RSS footer with thank you message
      htmlContent = addRSSFooter(htmlContent);

      // Determine the correct link path based on section
      let linkPath: string;
      switch (section) {
        case 'posts':
          linkPath = `/posts/${item.id}/`;
          break;
        case 'logs':
          linkPath = `/logs/${item.id}/`;
          break;
        case 'til':
          linkPath = `/til/${item.id}/`;
          break;
        case 'garden':
          linkPath = `/garden/${item.id}/`;
          break;
        case 'projects':
          linkPath = `/projects/${item.id}/`;
          break;
      }

      // Use appropriate date field
      const itemData = item.data as Record<string, any>;
      const pubDate = getDate(itemData);

      return {
        title: item.data.title,
        pubDate,
        description: getDescription(itemData) || item.data.title,
        link: `${linkPath}?ref=feed`,
        customData: `<content:encoded><![CDATA[${htmlContent}]]></content:encoded>`,
      };
    })
  );

  // Generate section-specific metadata
  const sectionTitles: Record<ContentSection, string> = {
    posts: 'Thought Eddies - Posts',
    logs: 'Thought Eddies - Logs',
    til: 'Thought Eddies - Today I Learned',
    garden: 'Thought Eddies - Garden',
    projects: 'Thought Eddies - Projects',
  };

  const sectionDescriptions: Record<ContentSection, string> = {
    posts: 'Long-form blog posts and articles',
    logs: 'Daily logs entries and field notes',
    til: 'Today I Learned notes and discoveries',
    garden: 'Digital garden entries and evergreen notes',
    projects: 'Project showcases',
  };

  const response = await rss({
    title: sectionTitles[section],
    description: sectionDescriptions[section],
    site: context.site,
    items: rssItems,
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
    stylesheet: '/rss-section-style.xsl',
  });

  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
