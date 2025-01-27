// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import icon from "astro-icon";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx(), tailwind(), icon()],
  markdown: {
    shikiConfig: {
      theme: "monokai",
    },
  },
  adapter: vercel(),
});
