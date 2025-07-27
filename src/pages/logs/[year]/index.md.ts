import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '@utils/markdownEndpoints';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const logs = await getCollection('logs');
  const years = [
    ...new Set(logs.map((log) => new Date(log.data.date).getFullYear())),
  ];

  return years.map((year) => ({
    params: { year: year.toString() },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { year } = params;
  if (!year) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const logs = await getCollection('logs');

    const yearLogs = logs
      .filter(
        (log) => new Date(log.data.date).getFullYear().toString() === year
      )
      .sort(
        (a, b) =>
          new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
      );

    // Group logs by month
    const logsByMonth = yearLogs.reduce(
      (acc, log) => {
        const month = new Date(log.data.date).getMonth();
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(log);
        return acc;
      },
      {} as Record<number, typeof logs>
    );

    const monthNames = [
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
    ];

    let content = `# Logs from ${year}

${yearLogs.length} total entries

[← All logs](/logs.md)

`;

    // List months with entries
    monthNames.forEach((monthName, index) => {
      const monthLogs = logsByMonth[index];
      if (monthLogs && monthLogs.length > 0) {
        const monthNumber = String(index + 1).padStart(2, '0');
        content += `## [${monthName}](/logs/${year}/${monthNumber}/index.md) (${monthLogs.length} ${monthLogs.length === 1 ? 'entry' : 'entries'})\n\n`;

        // Show first 5 entries from each month
        monthLogs.slice(0, 5).forEach((log) => {
          const date = formatDate(log.data.date);
          const slug = log.id.replace(/\.mdx?$/, '');
          content += `- ${date}: [${log.data.title}](/logs/${slug}/index.md)\n`;
        });

        if (monthLogs.length > 5) {
          content += `- ...[View all ${monthName} logs](/logs/${year}/${monthNumber}/index.md)\n`;
        }
        content += '\n';
      }
    });

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating log year markdown:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
