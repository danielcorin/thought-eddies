// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import markdownIntegration from '@astropub/md'

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    site: 'https://www.thoughteddies.com',
    integrations: [react(), mdx({
        syntaxHighlight: 'shiki',
        shikiConfig: {
            theme: 'monokai',
            wrap: true
        },
    }), tailwind(), icon(), sitemap(), markdownIntegration()],
    markdown: {
        shikiConfig: {
            theme: "monokai",
            wrap: true,
        },
    },
    adapter: vercel(),
});
