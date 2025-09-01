import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({
    pattern: ['**/*.{md,mdx}', '!**/_*'],
    base: './src/content/posts',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date().optional(),
    publishedAt: z.date().optional(),
    tags: z.array(z.string()).nullable().optional(),
    image: z.string().optional(),
    draft: z.boolean().optional().default(true),
    aliases: z.array(z.string()).optional(),
    githubUrl: z.string().url().optional(),
    projectUrl: z.string().url().optional(),
    zoomLevels: z
      .array(
        z.object({
          level: z.number().int(),
          content: z.string(),
        })
      )
      .optional()
      .default([]),
    series: z.string().optional(),
  }),
});

const about = defineCollection({
  loader: glob({ pattern: 'index.mdx', base: './src/content/about' }),
  schema: z.object({
    title: z.string(),
  }),
});

const logs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/logs' }),
  schema: z.object({
    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    title: z.string(),
    tags: z.array(z.string()).nullable().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const feeds = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/feeds' }),
  schema: z.object({
    title: z.string(),
    feed_url: z.string(),
    aliases: z.array(z.string()).optional(),
    order: z.number().optional(),
  }),
});

const uses = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/uses' }),
  schema: z.object({
    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
  }),
});

const now = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/now' }),
  schema: z.object({
    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
  }),
});

const til = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/til' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date().optional(),
    publishedAt: z.date().optional(),
    tags: z.array(z.string()).nullable().optional(),
    image: z.string().optional(),
    draft: z.boolean().optional().default(false),
    aliases: z.array(z.string()).optional(),
    githubUrl: z.string().url().optional(),
    projectUrl: z.string().url().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({
    pattern: ['**/index.{md,mdx}'],
    base: './src/content/projects',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    publishedAt: z.date().optional(),
    tags: z.array(z.string()).nullable().optional(),
    image: z.string().optional(),
    draft: z.boolean().optional().default(false),
    aliases: z.array(z.string()).optional(),
    githubUrl: z.string().url().optional(),
    projectUrl: z.string().url().optional(),
    zoomLevels: z
      .array(
        z.object({
          level: z.number().int(),
          content: z.string(),
        })
      )
      .optional()
      .default([]),
    series: z.string().optional(),
  }),
});

const rss = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/rss' }),
  schema: z.object({
    title: z.string(),
    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    draft: z.boolean().optional().default(false),
  }),
});

const garden = defineCollection({
  loader: glob({
    pattern: ['**/*.{md,mdx}', '!**/_*'],
    base: './src/content/garden',
  }),
  schema: z.object({
    title: z.string(),
    createdAt: z.date().optional(),
    draft: z.boolean().optional().default(false),
    noteworthy: z.boolean().optional().default(false),
  }),
});

export const collections = {
  posts,
  about,
  logs,
  feeds,
  uses,
  now,
  til,
  projects,
  rss,
  garden,
};
