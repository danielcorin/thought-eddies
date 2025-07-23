import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  contentSnippet?: string;
  content?: string;
}

interface RSSFeedLinksClientProps {
  feedUrl: string;
  title?: string;
  limit?: number;
}

export default function RSSFeedLinksClient({
  feedUrl,
  title,
  limit = 10,
}: RSSFeedLinksClientProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(feedUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        const items = xmlDoc.querySelectorAll('item');
        const feedItems: FeedItem[] = [];

        items.forEach((item, index) => {
          if (index < limit) {
            const titleElement = item.querySelector('title');
            const linkElement = item.querySelector('link');
            const pubDateElement = item.querySelector('pubDate');
            const descriptionElement = item.querySelector('description');

            if (titleElement && linkElement) {
              feedItems.push({
                title: titleElement.textContent || '',
                link: linkElement.textContent || '',
                pubDate: pubDateElement?.textContent || undefined,
                description: descriptionElement?.textContent || undefined,
              });
            }
          }
        });

        setItems(feedItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch feed');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [feedUrl, limit]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="rss-feed-links">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading feed items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rss-feed-links">
        <div className="error-message">
          <p>Error loading feed: {error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rss-feed-links">
        <div className="no-items">
          <p>No items found in this feed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rss-feed-links">
      {title && <h2>{title}</h2>}
      <div className="feed-list">
        {items.map((item, index) => (
          <article key={index} className="feed-item">
            <div className="feed-header">
              {item.pubDate && (
                <time className="feed-date" dateTime={item.pubDate}>
                  {formatDate(item.pubDate)}
                </time>
              )}
              {item.link && (
                <span className="feed-domain">{getDomain(item.link)}</span>
              )}
            </div>
            <div className="feed-content">
              <h3 className="feed-title">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title}
                  <ExternalLink className="external-icon" size={16} />
                </a>
              </h3>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
