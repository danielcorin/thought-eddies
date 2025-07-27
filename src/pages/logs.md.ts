import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    // Get all logs and sort by date
    const logs = await getCollection('logs');
    const sortedLogs = logs
      .filter((log) => !log.data.draft)
      .sort(
        (a, b) =>
          new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
      )
      .slice(0, 30); // Show last 30 logs

    // Get all years with logs
    const yearsWithLogs = [
      ...new Set(logs.map((log) => new Date(log.data.date).getFullYear())),
    ].sort((a, b) => b - a);

    let content = `# Logs

Daily logs and thoughts.

## Browse by Year

`;

    yearsWithLogs.forEach((year) => {
      const yearLogs = logs.filter(
        (log) => new Date(log.data.date).getFullYear() === year
      );
      content += `- [${year}](/logs/${year}/index.md) (${yearLogs.length} entries)\n`;
    });

    content += `
## Recent Logs

`;

    sortedLogs.forEach((log) => {
      const date = formatDate(log.data.date);

      // Extract year and month from the log ID for URL construction
      const [year, month] = log.id.split('/');
      const slug = log.id.replace(/\.mdx?$/, '');

      content += `- [${date}](/logs/${slug}/index.md) - ${log.data.title}\n`;
    });

    content += `\nView all logs at [/logs](/logs.md)`;

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating logs.md:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
