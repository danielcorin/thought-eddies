import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: ["**/*.{md,mdx}", "!**/source.md"],
    base: "./src/content/posts",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    publishedAt: z.date().optional(),
    tags: z.array(z.string()).nullable().optional(),
    image: z.string().optional(),
    draft: z.boolean().optional().default(true),
    aliases: z.array(z.string()).optional(),
    githubUrl: z.string().url().optional(),
    zoomLevels: z
      .array(
        z.object({
          level: z.number().int(),
          content: z.string(),
        }),
      )
      .optional()
      .default([]),
    series: z.string().optional(),
  }),
});

const home = defineCollection({
  loader: glob({ pattern: "index.mdx", base: "./src/content/home" }),
  schema: z.object({
    title: z.string(),
  }),
});

const logs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/logs" }),
  schema: z.object({
    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    title: z.string(),
    tags: z.array(z.string()).nullable().optional(),
    draft: z.boolean().optional().default(true),
  }),
});

const feeds = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/feeds" }),
  schema: z.object({
    title: z.string(),
    feed_url: z.string(),
  }),
});

const uses = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/uses" }),
  schema: z.object({
    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
  }),
});

const now = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/now" }),
  schema: z.object({
    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
  }),
});

export const collections = { posts, home, logs, feeds, uses, now };
