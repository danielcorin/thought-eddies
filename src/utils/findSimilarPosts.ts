import type { CollectionEntry } from 'astro:content';

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

export function findSimilarPosts(
  currentPost: CollectionEntry<'posts'>,
  allPosts: CollectionEntry<'posts'>[],
  limit = 3,
  excludePosts: CollectionEntry<'posts'>[] = []
): CollectionEntry<'posts'>[] {
  const currentTags = currentPost.data.tags || [];
  const currentSeries = currentPost.data.series;
  const currentTitle = currentPost.data.title;
  const currentKeywords = extractKeywords(currentPost.body || '');

  // Filter out the current post, draft posts, and excluded posts (prev/next)
  const excludeIds = excludePosts.map((p) => p.id);
  const eligiblePosts = allPosts.filter(
    (post) =>
      post.id !== currentPost.id &&
      !post.data.draft &&
      !post.id.includes('[zoom_') &&
      !excludeIds.includes(post.id)
  );

  // Calculate similarity scores
  const postsWithScores = eligiblePosts.map((post) => {
    let score = 0;

    // High score for same series
    if (currentSeries && post.data.series === currentSeries) {
      score += 10;
    }

    // Score based on shared tags
    const postTags = post.data.tags || [];
    const sharedTags = currentTags.filter((tag) => postTags.includes(tag));
    score += sharedTags.length * 3;

    // Title similarity
    const titleCommonWords = getCommonWords(currentTitle, post.data.title);
    score += titleCommonWords * 2;

    // Content keyword similarity
    const postKeywords = extractKeywords(post.body || '');
    const sharedKeywords = currentKeywords.filter((kw) =>
      postKeywords.includes(kw)
    );
    score += sharedKeywords.length * 1.5;

    // Description similarity (if both have descriptions)
    if (currentPost.data.description && post.data.description) {
      const descCommonWords = getCommonWords(
        currentPost.data.description,
        post.data.description
      );
      score += descCommonWords * 1.5;
    }

    // Small boost for recency (posts closer in time)
    const timeDiff = Math.abs(
      new Date(currentPost.data.createdAt).getTime() -
        new Date(post.data.createdAt).getTime()
    );
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) score += 2;
    else if (daysDiff < 90) score += 1;

    return { post, score };
  });

  // Sort by score (descending) and then by date (newest first)
  postsWithScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.post.data.createdAt).getTime() -
      new Date(a.post.data.createdAt).getTime()
    );
  });

  // Set minimum score threshold - posts need significant similarity
  const MIN_SCORE_THRESHOLD = 6; // Requires multiple similarity factors (e.g., 2 shared tags, or 1 tag + title similarity)

  // Return only posts with a score above threshold, limited to the requested number
  return postsWithScores
    .filter((item) => item.score >= MIN_SCORE_THRESHOLD)
    .slice(0, limit)
    .map((item) => item.post);
}
