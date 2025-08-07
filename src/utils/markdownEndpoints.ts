import type { APIRoute } from 'astro';
import { getEntry, type CollectionEntry } from 'astro:content';

export interface MarkdownResponse {
  content: string;
  status: number;
  headers: Record<string, string>;
}

export const createMarkdownResponse = (
  content: string,
  status = 200,
  cacheControl = 'public, max-age=3600'
): Response => {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  });
};

export const createNotFoundResponse = (): Response => {
  return new Response('Not found', { status: 404 });
};

export const createErrorResponse = (error: unknown): Response => {
  console.error('Error in markdown endpoint:', error);
  return new Response('Internal server error', { status: 500 });
};

export const createRedirectResponse = (
  location: string,
  permanent = true
): Response => {
  return new Response(null, {
    status: permanent ? 301 : 302,
    headers: {
      Location: location,
      'Cache-Control': permanent ? 'public, max-age=31536000' : 'no-cache',
    },
  });
};

export const serializeFrontmatter = (data: Record<string, any>): string => {
  return Object.entries(data)
    .filter(
      ([_, value]) =>
        value !== null && !(Array.isArray(value) && value.length === 0)
    )
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');
};

export const createMarkdownWithFrontmatter = (
  frontmatterData: Record<string, any>,
  body: string
): string => {
  const frontmatter = serializeFrontmatter(frontmatterData);
  return `---\n${frontmatter}\n---\n\n${body}`;
};

export const createContentEndpoint = <T extends 'posts' | 'logs' | 'til' | 'rss'>(
  collection: T,
  getSlugFromParams?: (
    params: Record<string, string | undefined>
  ) => string | undefined
): APIRoute => {
  return async ({ params }) => {
    const slug = getSlugFromParams ? getSlugFromParams(params) : params.slug;
    if (!slug) {
      return createNotFoundResponse();
    }

    try {
      const entry = await getEntry(collection, slug);

      if (!entry) {
        return createNotFoundResponse();
      }

      const fullContent = createMarkdownWithFrontmatter(entry.data, entry.body);
      return createMarkdownResponse(fullContent);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
};
