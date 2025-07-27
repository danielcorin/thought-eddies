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
    shikiConfig: {
      theme: 'monokai',
      wrap: true,
    },
  },
  adapter: vercel(),
});
