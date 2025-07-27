// @ts-check
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';
import { defineConfig } from 'astro/config';
import markdownIntegration from '@astropub/md';

import sitemap from '@astrojs/sitemap';

import expressiveCode from 'astro-expressive-code';
import remarkExternalLinks from './plugins/remark-external-links.mjs';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.danielcorin.com',
  server: {
    host: true,
    allowedHosts: ['local.danielcorin.com'],
  },
  build: {
    concurrency: 5,
  },
  integrations: [
    react(),
    expressiveCode(),
    mdx(),
    tailwind(),
    icon(),
    sitemap(),
    markdownIntegration(),
  ],
  markdown: {
    remarkPlugins: [remarkExternalLinks],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'wrap',
          properties: {
            className: ['heading-link-wrapper'],
          },
        },
      ],
    ],
    shikiConfig: {
      theme: 'monokai',
      wrap: true,
    },
  },
  adapter: vercel(),
});
