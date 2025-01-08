// @ts-check
import { defineConfig } from 'astro/config';

import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
    integrations: [react(), mdx(), tailwind(), icon()],
    markdown: {
        shikiConfig: {
            theme: 'monokai',
        },
    },
    output: 'server',
    adapter: vercel(),
});
