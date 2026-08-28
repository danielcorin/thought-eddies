// @ts-check
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import astroD2 from 'astro-d2';
import icon from 'astro-icon';
import { defineConfig, passthroughImageService } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import expressiveCode from 'astro-expressive-code';
import {
  markdownPlugins,
  markdownSyntaxOptions,
} from './plugins/markdown-options.mjs';

// `imageService: 'compile'` makes the Cloudflare adapter point /_image at its
// image-transform endpoint, which imports `cloudflare:workers` and needs an
// IMAGES binding we don't have. In dev that endpoint 500s every optimized
// image with FailedToLoadModuleSSR. Sharp isn't an option either — dev runs
// the app in workerd, which can't load its native binary — so serve images
// untransformed locally. Production images are still pre-optimized at build.
/** @type {import('astro').AstroIntegration} */
const devImageService = {
  name: 'dev-passthrough-image-service',
  hooks: {
    'astro:config:setup': ({ command, updateConfig }) => {
      if (command !== 'dev') return;
      updateConfig({
        // Keep the dev optimizer graph separate from `astro check` and
        // production builds. Sharing Vite's default cache while those run in
        // parallel can leave React and React DOM pointing at different graph
        // generations. That produces invalid-hook and hydration failures.
        vite: {
          cacheDir: 'node_modules/.vite-dev',
        },
        image: {
          service: passthroughImageService(),
          endpoint: { entrypoint: 'astro/assets/endpoint/generic' },
        },
      });
    },
  },
};

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
    devImageService,
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
