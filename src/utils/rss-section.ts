// Generate RSS feed for specific content sections

import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx';
import reactRenderer from '@astrojs/react/server.js';
import { loadRenderers } from 'astro:container';

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

  // Get content for the specific section that is not draft
  const items = await getCollection(section, ({ data }) => !data.draft);

  // Sort items by creation date
  const sortedItems = items.sort((a, b) => {
    const dateA = a.data.createdAt || a.data.publishedAt || a.data.date;
    const dateB = b.data.createdAt || b.data.publishedAt || b.data.date;
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
        htmlContent = `<p>${item.data.description || ''}</p>`;
      }

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
      const pubDate =
        item.data.createdAt || item.data.publishedAt || item.data.date;

      return {
        title: item.data.title,
        pubDate,
        description: item.data.description || item.data.title,
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

  return rss({
    title: sectionTitles[section],
    description: sectionDescriptions[section],
    site: context.site,
    items: rssItems,
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
    stylesheet: '/rss-section-style.xsl',
  });
}
