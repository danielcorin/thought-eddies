// h/t
// https://blog.damato.design/posts/astro-rss-mdx/
// https://github.com/SapphoSys/sapphic.moe/blob/bba42568f0371838ac4de9a2434ff84ca919ad1e/src/pages/rss.xml.ts

import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as getMDXRenderer } from '@astrojs/mdx';
import reactRenderer from '@astrojs/react/server.js';
import { loadRenderers } from 'astro:container';

export async function GET(context: { site: string }) {
  // Set up MDX renderer
  const renderers = await loadRenderers([getMDXRenderer()]);
  const container = await AstroContainer.create({ renderers });

  container.addServerRenderer({
    name: '@astrojs/react',
    renderer: reactRenderer,
  });

  // Get both posts and TILs that are not drafts
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const tils = await getCollection('til', ({ data }) => !data.draft);

  // Combine and sort all items by creation date
  const allItems = [...posts, ...tils];
  const sortedItems = allItems.sort(
    (a, b) =>
      new Date(b.data.createdAt).getTime() -
      new Date(a.data.createdAt).getTime()
  );

  // Map items to RSS format with full content
  const items = await Promise.all(
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

      // Determine the correct link path based on collection
      const linkPath =
        item.collection === 'posts' ? `/posts/${item.id}/` : `/til/${item.id}/`;

      return {
        title: item.data.title,
        pubDate: item.data.createdAt,
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
