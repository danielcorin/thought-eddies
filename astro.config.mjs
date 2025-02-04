// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import icon from "astro-icon";
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    site: 'https://www.thoughteddies.com',
    integrations: [react(), mdx(), tailwind(), icon(), sitemap()],
    markdown: {
        shikiConfig: {
            theme: "monokai",
            wrap: true,
            transformers: []
        },
    },
    adapter: vercel(),
});
