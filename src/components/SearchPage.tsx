import { useState, useEffect, useRef } from 'react';
import type { CollectionEntry } from 'astro:content';

interface SearchPageProps {
  posts: CollectionEntry<'posts'>[];
  logs: CollectionEntry<'logs'>[];
  tils: CollectionEntry<'til'>[];
}

interface SearchResult {
  type: 'post' | 'log' | 'til';
  item:
    | CollectionEntry<'posts'>
    | CollectionEntry<'logs'>
    | CollectionEntry<'til'>;
  score: number;
}

export default function SearchPage({ posts, logs, tils }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Focus search input on mount and when navigating from cmd+k
  useEffect(() => {
    searchInputRef.current?.focus();

    // Check if we navigated here via cmd+k (could set a flag in sessionStorage)
    const navigatedViaShortcut = sessionStorage.getItem('searchViaShortcut');
    if (navigatedViaShortcut) {
      sessionStorage.removeItem('searchViaShortcut');
      searchInputRef.current?.focus();
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow navigation
      if (results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + results.length) % results.length
          );
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = results[selectedIndex];
          if (selected) {
            window.location.href = getUrl(selected);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [results, selectedIndex]);

  // Auto-scroll to selected item
  useEffect(() => {
    const selectedItem = itemRefs.current[selectedIndex];
    if (selectedItem && resultsRef.current) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Search logic
  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search posts
    posts.forEach((post) => {
      let score = 0;
      const title = post.data.title.toLowerCase();
      const content = post.body?.toLowerCase() || '';
      const description = post.data.description?.toLowerCase() || '';
      const tags = post.data.tags?.join(' ').toLowerCase() || '';

      if (title.includes(searchQuery)) score += 10;
      if (description.includes(searchQuery)) score += 5;
      if (tags.includes(searchQuery)) score += 3;
      if (content.includes(searchQuery)) score += 1;

      if (score > 0) {
        searchResults.push({ type: 'post', item: post, score });
      }
    });

    // Search logs
    logs.forEach((log) => {
      let score = 0;
      const title = log.data.title.toLowerCase();
      const content = log.body?.toLowerCase() || '';
      const tags = log.data.tags?.join(' ').toLowerCase() || '';

      if (title.includes(searchQuery)) score += 10;
      if (tags.includes(searchQuery)) score += 3;
      if (content.includes(searchQuery)) score += 1;

      if (score > 0) {
        searchResults.push({ type: 'log', item: log, score });
      }
    });

    // Search tils
    tils.forEach((til) => {
      let score = 0;
      const title = til.data.title.toLowerCase();
      const content = til.body?.toLowerCase() || '';
      const description = til.data.description?.toLowerCase() || '';
      const tags = til.data.tags?.join(' ').toLowerCase() || '';
      const category = til.id.split('/')[0].toLowerCase();

      if (title.includes(searchQuery)) score += 10;
      if (description.includes(searchQuery)) score += 5;
      if (category.includes(searchQuery)) score += 4;
      if (tags.includes(searchQuery)) score += 3;
      if (content.includes(searchQuery)) score += 1;

      if (score > 0) {
        searchResults.push({ type: 'til', item: til, score });
      }
    });

    // Sort by score
    searchResults.sort((a, b) => b.score - a.score);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, posts, logs, tils]);

  const formatDate = (
    item:
      | CollectionEntry<'posts'>
      | CollectionEntry<'logs'>
      | CollectionEntry<'til'>
  ) => {
    if ('publishedAt' in item.data && item.data.publishedAt) {
      return new Date(item.data.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    if ('date' in item.data) {
      return new Date(item.data.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    if ('createdAt' in item.data) {
      return new Date(item.data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return '';
  };

  const getUrl = (result: SearchResult) => {
    if (result.type === 'post') {
      const post = result.item as CollectionEntry<'posts'>;
      return `/posts/${post.id}?ref=search`;
    } else if (result.type === 'log') {
      const log = result.item as CollectionEntry<'logs'>;
      const date = new Date(log.data.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `/logs/${year}/${month}/${day}?ref=search`;
    } else {
      const til = result.item as CollectionEntry<'til'>;
      const [category, ...slugParts] = til.id.split('/');
      const slug = slugParts.join('/').replace(/\.(md|mdx)$/, '');
      return `/til/${category}/${slug}?ref=search`;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, logs, and TILs..."
            aria-label="Search site"
            className="w-full pl-12 pr-4 py-3 text-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              ↑↓
            </kbd>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Navigate
            </span>
            <kbd className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              Enter
            </kbd>
            <span className="text-xs text-gray-500 dark:text-gray-400">Go</span>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div ref={resultsRef} className="space-y-2">
          {results.map((result, index) => {
            const url = getUrl(result);
            const item = result.item;
            const tags = 'tags' in item.data ? item.data.tags : [];
            const isSelected = index === selectedIndex;

            return (
              <a
                key={index}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                href={url}
                className={`block p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-gray-700 border-blue-300 dark:border-gray-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {item.data.title}
                    </h3>
                    {'description' in item.data && item.data.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {item.data.description}
                      </p>
                    )}
                    {tags && tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag, i) => (
                          <a
                            key={i}
                            href={`/tags/${encodeURIComponent(tag)}?ref=search`}
                            className="inline-block px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tag}
                          </a>
                        ))}
                        {tags.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <a
                      href={
                        result.type === 'post'
                          ? '/posts?ref=search'
                          : result.type === 'log'
                            ? '/logs?ref=search'
                            : '/til?ref=search'
                      }
                      className="inline-block px-3 py-1 text-xs rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium hover:bg-blue-100 dark:hover:bg-blue-800 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {result.type === 'post'
                        ? 'Post'
                        : result.type === 'log'
                          ? 'Log'
                          : 'TIL'}
                    </a>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(item)}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : query.trim() !== '' ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No results found for "{query}"
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Start typing to search the site
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Try searching for topics, tags, or keywords
          </p>
        </div>
      )}
    </div>
  );
}
