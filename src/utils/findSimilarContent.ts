import type { CollectionEntry } from 'astro:content';

type ContentEntry = CollectionEntry<'posts'> | CollectionEntry<'til'>;

// Simple function to calculate common words between two strings
function getCommonWords(str1: string, str2: string): number {
  const words1 = str1
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const words2 = str2
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  let common = 0;
  for (const word of set1) {
    if (set2.has(word)) common++;
  }
  return common;
}

// Extract important keywords from content (simple approach)
function extractKeywords(content: string, limit = 10): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'that',
    'this',
    'with',
    'from',
    'have',
    'been',
    'are',
    'was',
    'were',
    'been',
  ]);

  const words = content
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4 && !stopWords.has(w));

  // Count word frequency
  const wordCount = new Map<string, number>();
  words.forEach((word) => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  // Sort by frequency and return top words
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function findSimilarContent(
  currentContent: ContentEntry,
  allPosts: CollectionEntry<'posts'>[],
  allTils: CollectionEntry<'til'>[],
  limit = 3,
  excludeContent: ContentEntry[] = []
): ContentEntry[] {
  const currentTags = currentContent.data.tags || [];
  const currentSeries =
    'series' in currentContent.data ? currentContent.data.series : undefined;
  const currentTitle = currentContent.data.title;
  const currentKeywords = extractKeywords(currentContent.body || '');

  // Combine all content
  const allContent: ContentEntry[] = [...allPosts, ...allTils];

  // Filter out the current content, draft content, and excluded content
  const excludeIds = excludeContent.map((c) => `${c.collection}/${c.id}`);
  const currentId = `${currentContent.collection}/${currentContent.id}`;

  const eligibleContent = allContent.filter((content) => {
    const contentId = `${content.collection}/${content.id}`;
    return (
      contentId !== currentId &&
      !content.data.draft &&
      !content.id.includes('[zoom_') &&
      !excludeIds.includes(contentId)
    );
  });

  // Calculate similarity scores
  const contentWithScores = eligibleContent.map((content) => {
    let score = 0;

    // High score for same series (only for posts)
    if (
      currentSeries &&
      'series' in content.data &&
      content.data.series === currentSeries
    ) {
      score += 10;
    }

    // Score based on shared tags
    const contentTags = content.data.tags || [];
    const sharedTags = currentTags.filter((tag) => contentTags.includes(tag));
    score += sharedTags.length * 3;

    // Title similarity
    const titleCommonWords = getCommonWords(currentTitle, content.data.title);
    score += titleCommonWords * 2;

    // Content keyword similarity
    const contentKeywords = extractKeywords(content.body || '');
    const sharedKeywords = currentKeywords.filter((kw) =>
      contentKeywords.includes(kw)
    );
    score += sharedKeywords.length * 1.5;

    // Description similarity (if both have descriptions)
    if (
      'description' in currentContent.data &&
      currentContent.data.description &&
      'description' in content.data &&
      content.data.description
    ) {
      const descCommonWords = getCommonWords(
        currentContent.data.description,
        content.data.description
      );
      score += descCommonWords * 1.5;
    }

    // Small boost for recency (content closer in time)
    const timeDiff = Math.abs(
      new Date(currentContent.data.createdAt).getTime() -
        new Date(content.data.createdAt).getTime()
    );
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) score += 2;
    else if (daysDiff < 90) score += 1;

    // Small boost for same content type
    if (content.collection === currentContent.collection) {
      score += 0.5;
    }

    return { content, score };
  });

  // Sort by score (descending) and then by date (newest first)
  contentWithScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.content.data.createdAt).getTime() -
      new Date(a.content.data.createdAt).getTime()
    );
  });

  // Set minimum score threshold - content needs significant similarity
  const MIN_SCORE_THRESHOLD = 6; // Requires multiple similarity factors

  // Return only content with a score above threshold, limited to the requested number
  return contentWithScores
    .filter((item) => item.score >= MIN_SCORE_THRESHOLD)
    .slice(0, limit)
    .map((item) => item.content);
}
