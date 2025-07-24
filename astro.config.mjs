// @ts-check
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import { defineConfig } from 'astro/config';
import markdownIntegration from '@astropub/md';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import sitemap from '@astrojs/sitemap';

import expressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.thoughteddies.com',
  server: {
    host: true,
    allowedHosts: ['local.danielcorin.com'],
  },
  integrations: [
    react(),
    expressiveCode(),
    mdx({
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'after',
            properties: {
              className: ['anchor-link'],
              ariaHidden: true,
              tabIndex: -1,
            },
            content: {
              type: 'element',
              tagName: 'span',
              properties: {
                className: ['anchor-hash'],
              },
              children: [{ type: 'text', value: '#' }],
            },
          },
        ],
      ],
    }),
    tailwind(),
    icon(),
    sitemap(),
    markdownIntegration(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'monokai',
      wrap: true,
    },
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'after',
          properties: {
            className: ['anchor-link'],
            ariaHidden: true,
            tabIndex: -1,
          },
          content: {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['anchor-hash'],
            },
            children: [{ type: 'text', value: '#' }],
          },
        },
      ],
    ],
  },
  adapter: vercel(),
});
