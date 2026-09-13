export const DAY_MS = 24 * 60 * 60 * 1000;

export const activityCollections = [
  { key: 'posts', label: 'Posts', singular: 'Post', href: '/posts' },
  { key: 'til', label: 'TILs', singular: 'TIL', href: '/til' },
  { key: 'logs', label: 'Logs', singular: 'Log', href: '/logs' },
  {
    key: 'projects',
    label: 'Projects',
    singular: 'Project',
    href: '/projects',
  },
  { key: 'garden', label: 'Garden', singular: 'Garden', href: '/garden' },
] as const;

export type ActivityCollection = (typeof activityCollections)[number]['key'];
export interface ActivityItem {
  id: string;
  collection: ActivityCollection;
  publishedAt: string;
  contentLength: number;
  title: string;
}

export function isActivityDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function formatActivityDate(date: Date, includeYear = true): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  });
}

// Date.UTC treats years below 100 as 1900–1999. Setting the full year
// explicitly also keeps valid early dates from URL parameters safe.
function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date;
}

export function getActivityPeriods(selectedDate: string) {
  // Half-open UTC ranges include the entire selected day, with no overlap
  // between adjacent comparison periods (including at midnight and DST).
  const day = new Date(`${selectedDate}T00:00:00.000Z`);
  const end = new Date(day.getTime() + DAY_MS);
  const rolling = (days: number, title: string) => ({
    title,
    start: new Date(end.getTime() - days * DAY_MS),
    end,
    previousStart: new Date(end.getTime() - 2 * days * DAY_MS),
    previousEnd: new Date(end.getTime() - days * DAY_MS),
    comparisonLabel: `previous ${days} days`,
  });
  const year = day.getUTCFullYear();
  const month = day.getUTCMonth();
  const previousDay = Math.min(
    day.getUTCDate(),
    utcDate(year - 1, month + 1, 0).getUTCDate()
  );
  return [
    rolling(7, 'Last 7 days'),
    rolling(30, 'Last 30 days'),
    rolling(365, 'Last 365 days'),
    {
      title: 'Year to date',
      start: utcDate(year, 0, 1),
      end,
      previousStart: utcDate(year - 1, 0, 1),
      previousEnd: utcDate(year - 1, month, previousDay + 1),
      comparisonLabel: 'same period last year',
    },
  ];
}

export function getActivityStats(
  items: ActivityItem[],
  start: Date,
  end: Date
) {
  const daily = new Array<number>(
    Math.round((end.getTime() - start.getTime()) / DAY_MS)
  ).fill(0);
  const dailyEntries = new Array<number>(daily.length).fill(0);
  const breakdown: Record<ActivityCollection, number> = {
    posts: 0,
    til: 0,
    logs: 0,
    projects: 0,
    garden: 0,
  };
  let total = 0;
  for (const item of items) {
    const timestamp = new Date(item.publishedAt).getTime();
    if (
      timestamp < start.getTime() ||
      timestamp >= end.getTime() ||
      !Number.isFinite(timestamp)
    )
      continue;
    total++;
    breakdown[item.collection]++;
    const dayIndex = Math.floor((timestamp - start.getTime()) / DAY_MS);
    daily[dayIndex] += item.contentLength;
    dailyEntries[dayIndex]++;
  }
  return { total, breakdown, daily, dailyEntries };
}
