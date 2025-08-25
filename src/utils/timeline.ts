import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';

export interface TimelineEntry {
  date: string;
  imageModule: any;
  imageAlt: string;
  description: string;
}

export async function getTimelineEntries(
  contentPath: string,
  collection: string,
  slug: string
): Promise<TimelineEntry[]> {
  const timelinePath = path.join(contentPath, 'timeline');

  try {
    await fs.access(timelinePath);
  } catch {
    return [];
  }

  const entries = await fs.readdir(timelinePath);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  const timelineEntries: TimelineEntry[] = [];

  for (const entry of entries) {
    if (!datePattern.test(entry)) continue;

    const entryPath = path.join(timelinePath, entry);
    const stat = await fs.stat(entryPath);

    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(entryPath);
    const imageFile = files.find((f) => /^image\.(png|jpg|jpeg|gif)$/i.test(f));
    const descriptionFile = files.find((f) => f === '_description.md');

    if (!imageFile || !descriptionFile) continue;

    const descriptionPath = path.join(entryPath, descriptionFile);
    const descriptionContent = await fs.readFile(descriptionPath, 'utf-8');
    const descriptionHtml = await marked(descriptionContent);

    timelineEntries.push({
      date: entry,
      imageModule: null, // Will be populated by the page component
      imageAlt: `Timeline entry for ${entry}`,
      description: descriptionHtml,
      imageFile,
    } as any);
  }

  return timelineEntries.sort((a, b) => a.date.localeCompare(b.date));
}
