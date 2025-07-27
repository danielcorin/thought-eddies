import React, { useState } from 'react';

interface CategoryItem {
  name: string;
  count: number;
}

interface CollapsibleCategoryGridProps {
  items: CategoryItem[];
  baseUrl: string;
  title?: string;
  defaultCollapsed?: boolean;
}

export default function CollapsibleCategoryGrid({
  items,
  baseUrl,
  title,
  defaultCollapsed = true,
}: CollapsibleCategoryGridProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <>
      <style>{`
        .categories {
          margin-bottom: var(--spacing-xl);
          padding: var(--spacing-lg);
          background: var(--color-bg-code);
          border-radius: 0.5rem;
        }

        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          color: inherit;
          font: inherit;
        }

        .category-header h3 {
          margin: 0;
          font-size: var(--text-lg);
        }

        .toggle-icon {
          font-size: 0.875rem;
          color: var(--color-ink-light);
          transition: transform 0.2s;
        }

        .category-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
        }

        .category-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 0.25rem;
          text-decoration: none;
          color: var(--color-ink);
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          transition: all 0.2s;
        }

        .category-link:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .category-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.5rem;
          height: 1.5rem;
          padding: 0 0.375rem;
          background: var(--color-bg-code);
          border-radius: 9999px;
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--color-ink-light);
        }

        .category-link:hover .category-count {
          background: var(--color-accent);
          color: var(--color-bg);
        }
      `}</style>
      <div className="categories">
        {title && (
          <button
            className="category-header"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-expanded={!isCollapsed}
            aria-controls="category-list"
          >
            <h3>{title}</h3>
            <span className="toggle-icon">{isCollapsed ? '▶' : '▼'}</span>
          </button>
        )}
        {!isCollapsed && (
          <div id="category-list" className="category-list">
            {items.map((item) => (
              <a
                key={item.name}
                href={`${baseUrl}/${encodeURIComponent(item.name)}`}
                className="category-link"
              >
                <span className="category-name">{item.name}</span>
                <span className="category-count">{item.count}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
