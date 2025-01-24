import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

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
        zoomLevels: z.array(z.object({
            level: z.number().int(),
            content: z.string(),
        })).optional().default([]),
        series: z.string().optional(),
    }),
});

const posts = defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/content/posts" }),
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
        series: z.string().optional(),
    }),
});

const home = defineCollection({
    loader: glob({ pattern: "index.mdx", base: "./src/content/home" }),
    schema: z.object({
        title: z.string(),
    }),
});

export const collections = { notes, posts, home };
