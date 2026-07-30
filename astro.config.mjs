// @ts-check
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import astroD2 from 'astro-d2';
import icon from 'astro-icon';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import expressiveCode from 'astro-expressive-code';
import {
  markdownPlugins,
  markdownSyntaxOptions,
} from './plugins/markdown-options.mjs';

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
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@visx/responsive', '@visx/scale'],
    },
  },
  integrations: [
    react(),
    svelte(),
    astroD2({
      experimental: { useD2js: true },
      sketch: true,
      theme: { default: '300', dark: false },
    }),
    expressiveCode(),
    mdx(),
    icon(),
    sitemap({
      filter: (page) => !page.includes('/rss/'),
    }),
  ],
  markdown: {
    processor: unified(markdownPlugins),
    ...markdownSyntaxOptions,
  },
  adapter: cloudflare({
    imageService: 'compile',
    prerenderEnvironment: 'node',
  }),
});
