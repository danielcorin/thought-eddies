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

export const createContentEndpoint = <
  T extends 'posts' | 'logs' | 'til' | 'rss',
>(
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

/**
 * Parse a log ID (file path) to extract year, month, day
 * e.g., "2025/12/10.mdx" or "2025/12/10" -> { year: 2025, month: 12, day: 10 }
 */
export const parseLogId = (
  id: string
): { year: number; month: number; day: number } | null => {
  const match = id.match(/^(\d{4})\/(\d{2})\/(\d{2})(\.mdx?)?$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    day: parseInt(match[3], 10),
  };
};

/**
 * Format a log ID as YYYY-MM-DD date string
 * e.g., "2025/12/10.mdx" -> "2025-12-10"
 */
export const formatLogIdAsDate = (id: string): string => {
  const parsed = parseLogId(id);
  if (!parsed) return '';
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
};

/**
 * Build log URL from log ID
 * e.g., "2025/12/10.mdx" -> "/logs/2025/12/10"
 */
export const buildLogUrl = (id: string): string => {
  const parsed = parseLogId(id);
  if (!parsed) return `/logs/${id.replace(/\.mdx?$/, '')}`;
  return `/logs/${parsed.year}/${String(parsed.month).padStart(2, '0')}/${String(parsed.day).padStart(2, '0')}`;
};

// Date constants for consistent formatting across the site
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const WEEKDAY_NAMES = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

/**
 * Get date components from a log entry, using the log ID for timezone-safe parsing
 * Falls back to UTC methods if log ID can't be parsed
 */
export const getLogDateComponents = (
  logId: string,
  fallbackDate: Date
): { year: number; month: number; day: number } => {
  const parsed = parseLogId(logId);
  if (parsed) return parsed;
  return {
    year: fallbackDate.getUTCFullYear(),
    month: fallbackDate.getUTCMonth() + 1,
    day: fallbackDate.getUTCDate(),
  };
};

/**
 * Format a log date as "Wed, Dec 10, 2025" using parsed components
 */
export const formatLogFullDate = (
  year: number,
  month: number,
  day: number
): string => {
  const dateUTC = new Date(Date.UTC(year, month - 1, day));
  return `${WEEKDAY_NAMES[dateUTC.getUTCDay()]}, ${SHORT_MONTH_NAMES[month - 1]} ${String(day).padStart(2, '0')}, ${year}`;
};
