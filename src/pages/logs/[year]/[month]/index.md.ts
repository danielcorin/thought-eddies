import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const logs = await getCollection('logs');

  // Get all unique year-month combinations
  const yearMonths = new Set<string>();
  logs.forEach((log) => {
    const date = new Date(log.data.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    yearMonths.add(`${year}-${month}`);
  });

  return Array.from(yearMonths).map((yearMonth) => {
    const [year, month] = yearMonth.split('-');
    return {
      params: { year, month },
    };
  });
};

export const GET: APIRoute = async ({ params }) => {
  const { year, month } = params;
  if (!year || !month) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const logs = await getCollection('logs');

    const monthNumber = parseInt(month);
    const yearNumber = parseInt(year);

    const monthLogs = logs
      .filter((log) => {
        const date = new Date(log.data.date);
        return (
          date.getFullYear() === yearNumber &&
          date.getMonth() + 1 === monthNumber
        );
      })
      .sort(
        (a, b) =>
          new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
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

    const monthName = monthNames[monthNumber - 1];

    let content = `# ${monthName} ${year}

${monthLogs.length} ${monthLogs.length === 1 ? 'entry' : 'entries'}

[← ${year} logs](/logs/${year}/index.md) | [← All logs](/logs.md)

## Entries

`;

    // Group by day
    const logsByDay = monthLogs.reduce(
      (acc, log) => {
        const day = new Date(log.data.date).getDate();
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(log);
        return acc;
      },
      {} as Record<number, typeof logs>
    );

    // List all entries organized by day
    Object.entries(logsByDay)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .forEach(([day, dayLogs]) => {
        const dayNumber = parseInt(day);
        const dateStr = new Date(
          yearNumber,
          monthNumber - 1,
          dayNumber
        ).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });

        content += `### ${dateStr}\n\n`;

        dayLogs.forEach((log) => {
          const slug = log.id.replace(/\.mdx?$/, '');
          content += `- [${log.data.title}](/logs/${slug}/index.md)`;

          // Add tags if present
          if (log.data.tags && log.data.tags.length > 0) {
            content += ` - Tags: ${log.data.tags.join(', ')}`;
          }

          content += '\n';
        });

        content += '\n';
      });

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating log month markdown:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
