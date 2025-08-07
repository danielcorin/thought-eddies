// h/t
// https://blog.damato.design/posts/astro-rss-mdx/
// https://github.com/SapphoSys/sapphic.moe/blob/bba42568f0371838ac4de9a2434ff84ca919ad1e/src/pages/rss.xml.ts

import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx';
import reactRenderer from '@astrojs/react/server.js';
import { loadRenderers } from 'astro:container';

export async function generateRSSFeed(context: { site: string }) {
  // Set up MDX renderer
  const renderers = await loadRenderers([getMDXRenderer()]);
  const container = await AstroContainer.create({ renderers });

  container.addServerRenderer({
    name: '@astrojs/react',
    renderer: reactRenderer,
  });

  // Get posts, TILs, and RSS content that are not drafts
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const tils = await getCollection('til', ({ data }) => !data.draft);
  const rssContent = await getCollection('rss', ({ data }) => !data.draft);

  // Combine and sort all items by creation date
  const allItems = [...posts, ...tils, ...rssContent];
  const sortedItems = allItems.sort((a, b) => {
    // RSS content uses 'date' field, others use 'createdAt'
    const dateA = a.collection === 'rss' ? a.data.date : a.data.createdAt;
    const dateB = b.collection === 'rss' ? b.data.date : b.data.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Map items to RSS format with full content
  const items = await Promise.all(
    sortedItems.map(async (item) => {
      // Render MDX content to HTML
      let htmlContent = '';
      try {
        const { Content } = await render(item);
        htmlContent = await container.renderToString(Content);

        // Add ?ref=feed to all links in the RSS feed content
        htmlContent = htmlContent.replace(/href="([^"]+)"/g, (match, url) => {
          // Skip if it's an anchor link or already has query params
          if (url.startsWith('#') || url.includes('?')) {
            return match;
          }
          // Add ?ref=feed to the URL
          return `href="${url}?ref=feed"`;
        });
      } catch (error) {
        console.warn(`Failed to render MDX for ${item.id}:`, error);
        htmlContent = `<p>${item.data.description || ''}</p>`;
      }

      // Determine the correct link path based on collection
      let linkPath: string;
      if (item.collection === 'posts') {
        linkPath = `/posts/${item.id}/`;
      } else if (item.collection === 'til') {
        linkPath = `/til/${item.id}/`;
      } else if (item.collection === 'rss') {
        linkPath = `/rss/${item.id}/`;
      }

      // Use appropriate date field based on collection
      const pubDate =
        item.collection === 'rss' ? item.data.date : item.data.createdAt;

      return {
        title: item.data.title,
        pubDate,
        description: item.data.description || item.data.title,
        link: linkPath,
        customData: `<content:encoded><![CDATA[${htmlContent}]]></content:encoded>`,
      };
    })
  );

  return rss({
    title: 'Thought Eddies',
    description: 'An experimental digital garden',
    site: context.site,
    items,
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
    stylesheet: '/rss-style.xsl',
  });
}
