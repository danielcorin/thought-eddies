import { useState, useEffect, useRef, useMemo } from 'react';
import { getContentPreview } from '@utils/text';

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

interface FilterState {
  types: Set<string>;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchData, setSearchData] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    types: new Set(['post', 'log', 'til', 'project', 'garden']),
    dateRange: {
      start: '',
      end: '',
    },
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLElement | null)[]>([]);

  // Initialize from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Initialize search query
    const queryParam = urlParams.get('q');
    if (queryParam) {
      setQuery(queryParam);
    }

    // Initialize type filters
    const typesParam = urlParams.get('types');
    if (typesParam) {
      const types = typesParam
        .split(',')
        .filter((t) => ['post', 'log', 'til', 'project', 'garden'].includes(t));
      if (types.length > 0) {
        setFilters((prev) => ({ ...prev, types: new Set(types) }));
      }
    }

    // Initialize date range filters
    const startDate = urlParams.get('start');
    const endDate = urlParams.get('end');
    if (startDate || endDate) {
      setFilters((prev) => ({
        ...prev,
        dateRange: {
          start: startDate || '',
          end: endDate || '',
        },
      }));
    }

    // Show filters if any are active from URL
    if (typesParam || startDate || endDate) {
      setShowFilters(true);
    }
  }, []);

  // Load search data on mount
  useEffect(() => {
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
  }, []);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Listen for modal open/close events
  useEffect(() => {
    const handleModalOpened = () => setIsModalOpen(true);
    const handleModalClosed = () => setIsModalOpen(false);

    window.addEventListener('searchModalOpened', handleModalOpened);
    window.addEventListener('searchModalClosed', handleModalClosed);

    return () => {
      window.removeEventListener('searchModalOpened', handleModalOpened);
      window.removeEventListener('searchModalClosed', handleModalClosed);
    };
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
    resultRefs.current = [];
  }, [results]);

  // Keyboard navigation (disabled when modal is open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard navigation if modal is open
      if (isModalOpen) return;
      if (results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev < results.length - 1 ? prev + 1 : prev;
            resultRefs.current[next]?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : -1;
            if (next === -1) {
              searchInputRef.current?.focus();
            } else {
              resultRefs.current[next]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            }
            return next;
          });
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            e.preventDefault();
            const url = results[selectedIndex].item.url + '?ref=search';
            window.location.href = url;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, isModalOpen]);

  // Update URL when query or filters change
  useEffect(() => {
    const urlParams = new URLSearchParams();

    // Add search query
    if (query) {
      urlParams.set('q', query);
    }

    // Add type filters if not all selected
    if (filters.types.size > 0 && filters.types.size < 5) {
      const typesArray = Array.from(filters.types).sort();
      urlParams.set('types', typesArray.join(','));
    }

    // Add date range filters
    if (filters.dateRange.start) {
      urlParams.set('start', filters.dateRange.start);
    }
    if (filters.dateRange.end) {
      urlParams.set('end', filters.dateRange.end);
    }

    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;

    // Use replaceState to avoid adding to browser history on each change
    window.history.replaceState({}, '', newUrl);
  }, [query, filters]);

  // Search and filter logic
  useEffect(() => {
    if (searchData.length === 0) return;

    let filteredData = searchData;

    // Apply type filter
    if (filters.types.size < 5) {
      filteredData = filteredData.filter((item) =>
        filters.types.has(item.type)
      );
    }

    // Apply date range filter
    if (filters.dateRange.start) {
      filteredData = filteredData.filter(
        (item) => item.date >= filters.dateRange.start
      );
    }
    if (filters.dateRange.end) {
      filteredData = filteredData.filter(
        (item) => item.date <= filters.dateRange.end
      );
    }

    // Apply search query
    if (query.trim() === '') {
      // Show no results when no query
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    filteredData.forEach((item) => {
      let score = 0;
      const title = item.title.toLowerCase();
      const content = item.content.toLowerCase();
      const description = item.description.toLowerCase();
      const tags = item.tags.join(' ').toLowerCase();
      const category = item.category?.toLowerCase() || '';

      // Exact matches get highest scores
      if (title === searchQuery) score += 20;
      else if (title.includes(searchQuery)) score += 10;

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
    setResults(searchResults.slice(0, 50));
  }, [query, searchData, filters]);

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

  const toggleType = (type: string) => {
    setFilters((prev) => {
      const newTypes = new Set(prev.types);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { ...prev, types: newTypes };
    });
  };

  const clearFilters = () => {
    setFilters({
      types: new Set(['post', 'log', 'til', 'project', 'garden']),
      dateRange: { start: '', end: '' },
    });
  };

  const hasActiveFilters =
    filters.types.size < 5 || filters.dateRange.start || filters.dateRange.end;

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-input-container">
          <svg
            className="search-icon"
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
            placeholder="Search posts, logs, TILs, projects..."
            className="search-input"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-toggle ${hasActiveFilters ? 'active' : ''}`}
        >
          <svg
            className="filter-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="filter-count">
              {filters.types.size < 5 && `${filters.types.size}`}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-section">
            <h3>Content Type</h3>
            <div className="filter-options">
              {['post', 'log', 'til', 'project', 'garden'].map((type) => (
                <label key={type} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.types.has(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span>
                    {type === 'post'
                      ? 'Posts'
                      : type === 'log'
                        ? 'Logs'
                        : type === 'til'
                          ? 'TIL'
                          : type === 'project'
                            ? 'Projects'
                            : 'Garden'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Date Range</h3>
            <div className="date-filters">
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value },
                  }))
                }
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value },
                  }))
                }
                className="date-input"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="clear-filters">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <p>Loading search index...</p>
        </div>
      ) : (
        <div className="search-results">
          <div className="results-header">
            <p>
              {query.trim() === ''
                ? 'Type to search the site'
                : results.length > 0
                  ? `${results.length} result${results.length !== 1 ? 's' : ''}`
                  : 'No results found'}
            </p>
          </div>

          {results.length > 0 && (
            <div className="results-list">
              {results.map((result, index) => {
                const item = result.item;
                const tags = item.tags || [];
                const isSelected = selectedIndex === index;

                return (
                  <article
                    key={index}
                    ref={(el) => {
                      resultRefs.current[index] = el;
                    }}
                    className={`result-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="result-header">
                      <time className="result-date">
                        <a
                          href={item.url + '?ref=search'}
                          className="result-date-link"
                        >
                          {formatDate(item.date)}
                        </a>
                      </time>
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
                        className="result-type"
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
                    </div>
                    <div className="result-content">
                      <h2 className="result-title">
                        <a
                          href={item.url + '?ref=search'}
                          className="result-title-link"
                        >
                          {item.title}
                        </a>
                      </h2>
                      {item.description && (
                        <p className="result-description">{item.description}</p>
                      )}
                      <p className="result-preview">
                        {getContentPreview(item.content)}
                      </p>
                      <div className="result-footer">
                        <div className="result-tags">
                          {tags.map((tag, i) => (
                            <a
                              key={i}
                              href={`/tags/${encodeURIComponent(tag)}?ref=search`}
                              className="result-tag"
                            >
                              {tag}
                            </a>
                          ))}
                        </div>
                        <a
                          href={item.url + '?ref=search'}
                          className="read-more"
                          aria-label="Read full post"
                        >
                          <svg
                            className="arrow-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
