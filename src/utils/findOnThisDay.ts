import { shouldShowPost } from '@utils/posts';

export interface OnThisDayEntry {
  entry: any;
  year: number;
  // Difference in years relative to the entry being viewed.
  // Negative = past, positive = future.
  yearDelta: number;
}

// Extract {year, month, day} for an entry in a timezone-safe way.
// Logs encode their date in the id path (YYYY/MM/DD.mdx); everything else
// uses the relevant date field from frontmatter.
function getYMD(
  entry: any
): { year: number; month: number; day: number } | null {
  if (entry.collection === 'logs') {
    const match = entry.id.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (match) {
      return { year: +match[1], month: +match[2], day: +match[3] };
    }
  }

  const raw = entry.data?.createdAt ?? entry.data?.date;
  if (!raw) return null;
  const date = new Date(raw);
  if (isNaN(date.getTime())) return null;

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/**
 * Find entries from the same collection that were published on the same
 * month/day as the current entry, in any other year (past or future).
 * Results are ordered from most to least recent and annotated with how many
 * years before or after the current entry they were published.
 */
export function findOnThisDay(
  currentEntry: any,
  allEntries: any[]
): OnThisDayEntry[] {
  const current = getYMD(currentEntry);
  if (!current) return [];

  const results: OnThisDayEntry[] = [];

  for (const entry of allEntries) {
    if (entry.id === currentEntry.id) continue;
    if (!shouldShowPost(entry)) continue;

    const ymd = getYMD(entry);
    if (!ymd) continue;

    if (
      ymd.month === current.month &&
      ymd.day === current.day &&
      ymd.year !== current.year
    ) {
      results.push({
        entry,
        year: ymd.year,
        yearDelta: ymd.year - current.year,
      });
    }
  }

  results.sort((a, b) => b.year - a.year);
  return results;
}
