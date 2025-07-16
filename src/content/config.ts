import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const notes = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    publishedAt: z.date().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    draft: z.boolean().optional().default(true),
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
    date: z.string().or(z.date()).transform((val) => new Date(val)),
    title: z.string(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(true),
  }),
});

export const collections = { notes, home, logs };
