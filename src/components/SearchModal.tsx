import { useState, useEffect, useRef } from 'react';

interface SearchItem {
  type: 'post' | 'log' | 'til' | 'project' | 'garden';
  id: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  date: string;
  url: string;
  content: string;
}

interface SearchResult {
  type: 'post' | 'log' | 'til' | 'project' | 'garden';
  item: SearchItem;
  score: number;
}

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchData, setSearchData] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Load search data when overlay opens
  useEffect(() => {
    if (isOpen && searchData.length === 0) {
      const loadSearchData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/search.json');
          const data = await response.json();
          setSearchData(data);
        } catch (error) {
          console.error('Failed to load search data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadSearchData();
    }
  }, [isOpen, searchData.length]);

  // Dispatch events when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('searchModalOpened'));
    } else {
      window.dispatchEvent(new CustomEvent('searchModalClosed'));
    }
  }, [isOpen]);

  // Keyboard shortcut handler and custom event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
      }

      // Arrow navigation
      if (isOpen && results.length > 0) {
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
            window.location.href = selected.item.url + '?ref=search';
          }
        }
      }
    };

    const handleOpenSearch = () => {
      setIsOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openSearch', handleOpenSearch);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openSearch', handleOpenSearch);
    };
  }, [isOpen, results, selectedIndex]);

  // Focus management when opened/closed
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the search input
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }

      // Add focus trap
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && overlayRef.current) {
          const focusableElements = overlayRef.current.querySelectorAll(
            'input, a[href], button, [tabindex]:not([tabindex="-1"])'
          );
          const firstFocusable = focusableElements[0] as HTMLElement;
          const lastFocusable = focusableElements[
            focusableElements.length - 1
          ] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);

      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    } else {
      // Return focus to the previously focused element
      if (
        previousActiveElement.current &&
        previousActiveElement.current.focus
      ) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Auto-scroll to selected item
  useEffect(() => {
    const selectedItem = itemRefs.current[selectedIndex];
    if (selectedItem && resultsRef.current) {
      // Use scrollIntoView with block: 'nearest' for smooth scrolling
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search through loaded data
    searchData.forEach((item) => {
      let score = 0;
      const title = item.title.toLowerCase();
      const content = item.content.toLowerCase();
      const description = item.description.toLowerCase();
      const tags = item.tags.join(' ').toLowerCase();
      const category = item.category?.toLowerCase() || '';

      if (title.includes(searchQuery)) score += 10;
      if (description.includes(searchQuery)) score += 5;
      if (category.includes(searchQuery)) score += 4;
      if (tags.includes(searchQuery)) score += 3;
      if (content.includes(searchQuery)) score += 1;

      if (score > 0) {
        searchResults.push({ type: item.type, item, score });
      }
    });

    // Sort by score and limit results
    searchResults.sort((a, b) => b.score - a.score);
    setResults(searchResults.slice(0, 10));
    setSelectedIndex(0);
  }, [query, searchData]);

  const formatDate = (dateStr: string) => {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Otherwise parse as Date and format using UTC to avoid timezone shifts
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center px-4 pt-20">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />

        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site search"
          className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-2xl transition-all"
        >
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center p-4">
              <svg
                className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500"
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
                placeholder="Search site..."
                aria-label="Search site"
                className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
              />
              <kbd className="ml-3 hidden sm:inline-block rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                ESC
              </kbd>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading search data...
              </p>
            </div>
          ) : results.length > 0 ? (
            <div ref={resultsRef} className="max-h-96 overflow-y-auto">
              {results.map((result, index) => {
                const item = result.item;
                const tags = item.tags || [];
                const isSelected = index === selectedIndex;

                return (
                  <a
                    key={index}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    href={item.url + '?ref=search'}
                    className={`block px-4 py-3 transition-colors ${
                      isSelected
                        ? 'bg-gray-100 dark:bg-gray-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 3).map((tag, i) => (
                              <a
                                key={i}
                                href={`/tags/${encodeURIComponent(tag)}?ref=search`}
                                className="inline-block px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 no-underline hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
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
                                : result.type === 'til'
                                  ? '/til?ref=search'
                                  : result.type === 'project'
                                    ? '/projects?ref=search'
                                    : '/garden?ref=search'
                          }
                          className="inline-block px-3 py-1 text-xs rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 transition-all hover:bg-blue-100 hover:border-blue-300 dark:hover:bg-blue-800 no-underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {result.type === 'post'
                            ? 'Posts'
                            : result.type === 'log'
                              ? 'Logs'
                              : result.type === 'til'
                                ? 'TIL'
                                : result.type === 'project'
                                  ? 'Projects'
                                  : 'Garden'}
                        </a>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                          {formatDate(item.date)}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : query.trim() !== '' ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Type to search the site
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
