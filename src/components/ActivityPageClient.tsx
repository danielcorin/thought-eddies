import { useEffect, useState } from 'react';
import ActivityGraphClient from './ActivityGraphClient';
import ContributionGraph from './ContributionGraph';
import {
  activityCollections,
  formatActivityDate,
  getActivityPeriods,
  getActivityStats,
  isActivityDate,
  type ActivityCollection,
  type ActivityItem,
} from '../utils/activity';

interface Props {
  allContent: ActivityItem[];
  initialDate: string;
}

export default function ActivityPageClient({ allContent, initialDate }: Props) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedCollection, setSelectedCollection] = useState<
    ActivityCollection | 'all'
  >('all');
  const [today, setToday] = useState(initialDate);

  useEffect(() => {
    const currentDay = new Date().toISOString().slice(0, 10);
    setToday(currentDay);
    const readView = () => {
      const params = new URL(window.location.href).searchParams;
      const date = params.get('date');
      setSelectedDate(
        isActivityDate(date) && date <= currentDay ? date : currentDay
      );
      const collection = activityCollections.find(
        ({ key }) => key === params.get('type')
      );
      setSelectedCollection(collection?.key ?? 'all');
    };
    readView();
    window.addEventListener('popstate', readView);
    return () => window.removeEventListener('popstate', readView);
  }, []);

  const changeDate = (date: string) => {
    if (!isActivityDate(date) || date > today) return;
    setSelectedDate(date);
    const url = new URL(window.location.href);
    if (date === today) url.searchParams.delete('date');
    else url.searchParams.set('date', date);
    if (url.href !== window.location.href)
      window.history.pushState({}, '', url);
  };

  const changeCollection = (collection: ActivityCollection | 'all') => {
    setSelectedCollection(collection);
    const url = new URL(window.location.href);
    if (collection === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', collection);
    if (url.href !== window.location.href)
      window.history.pushState({}, '', url);
  };

  const periods = getActivityPeriods(selectedDate);
  const matchingContent =
    selectedCollection === 'all'
      ? allContent
      : allContent.filter((item) => item.collection === selectedCollection);
  const archive = matchingContent.filter(
    (item) => new Date(item.publishedAt) < periods[0].end
  );
  const recentEntries = [...archive]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 5);
  const visibleCollections = activityCollections.filter(
    ({ key }) => selectedCollection === 'all' || key === selectedCollection
  );
  const firstDate = archive.reduce(
    (earliest, item) =>
      item.publishedAt < earliest ? item.publishedAt : earliest,
    `${selectedDate}T23:59:59.999Z`
  );

  return (
    <div className="activity-dashboard">
      <div className="activity-toolbar">
        <label htmlFor="activity-date">Activity through</label>
        <div className="activity-date-controls">
          <input
            type="date"
            id="activity-date"
            value={selectedDate}
            max={today}
            onChange={(event) => changeDate(event.target.value)}
          />
          <button
            type="button"
            onClick={() => changeDate(today)}
            disabled={selectedDate === today}
          >
            Today
          </button>
        </div>
      </div>

      <fieldset className="activity-filters">
        <legend>Content type</legend>
        <div className="activity-filter-options">
          {[{ key: 'all' as const, label: 'All' }, ...activityCollections].map(
            ({ key, label }) => (
              <button
                type="button"
                key={key}
                aria-pressed={selectedCollection === key}
                onClick={() => changeCollection(key)}
              >
                {label}
              </button>
            )
          )}
        </div>
      </fieldset>
      <p className="activity-sr-only" role="status">
        {selectedCollection === 'all'
          ? 'All content types'
          : visibleCollections[0].label}
        : {archive.length} entries through{' '}
        {formatActivityDate(new Date(`${selectedDate}T00:00:00Z`))}.
      </p>

      <ContributionGraph
        key={`${selectedDate}:${selectedCollection}`}
        allContent={matchingContent}
        endDate={selectedDate}
      />

      <section
        className="activity-recent"
        aria-labelledby="activity-recent-heading"
      >
        <div className="activity-section-heading">
          <h2 id="activity-recent-heading">Recent entries</h2>
        </div>
        <p className="activity-section-description">
          Latest published through{' '}
          {formatActivityDate(new Date(`${selectedDate}T00:00:00Z`))}.
        </p>
        {recentEntries.length > 0 ? (
          <ul className="activity-recent-list">
            {recentEntries.map((item) => (
              <li key={`${item.collection}/${item.id}`}>
                <a href={`/${item.collection}/${item.id}`}>
                  <span className="activity-recent-entry">
                    <span className="activity-recent-meta">
                      <time dateTime={item.publishedAt}>
                        {formatActivityDate(new Date(item.publishedAt))}
                      </time>
                      <span>
                        {
                          activityCollections.find(
                            ({ key }) => key === item.collection
                          )?.singular
                        }
                      </span>
                    </span>
                    <span className="activity-recent-title">{item.title}</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="activity-recent-empty">
            <p className="activity-empty">
              {selectedCollection === 'all'
                ? 'No entries published by this date.'
                : 'No entries of this type published by this date.'}
            </p>
            {selectedCollection !== 'all' && (
              <button type="button" onClick={() => changeCollection('all')}>
                Show all types
              </button>
            )}
          </div>
        )}
      </section>

      <section
        className="activity-comparisons"
        aria-labelledby="activity-periods-heading"
      >
        <div className="activity-section-heading">
          <h2 id="activity-periods-heading">By the numbers</h2>
          <div className="activity-chart-legend" aria-label="Chart legend">
            <span>
              <i className="current" aria-hidden="true" />
              Current
            </span>
            <span>
              <i className="previous" aria-hidden="true" />
              Previous
            </span>
          </div>
        </div>
        <p className="activity-section-description">
          Entries published, with daily writing volume. Hover or tap a graph to
          inspect a day.
        </p>
        <div className="activity-stats-grid">
          {periods.map((period) => (
            <ActivityGraphClient
              key={`${period.title}:${selectedDate}:${selectedCollection}`}
              period={period}
              current={getActivityStats(
                matchingContent,
                period.start,
                period.end
              )}
              previous={getActivityStats(
                matchingContent,
                period.previousStart,
                period.previousEnd
              )}
            />
          ))}
        </div>
      </section>

      <section
        className="activity-archive"
        aria-labelledby="activity-archive-heading"
      >
        <div className="activity-section-heading">
          <h2 id="activity-archive-heading">The archive</h2>
          <span className="activity-archive-total">
            {archive.length.toLocaleString('en-US')} entries
          </span>
        </div>
        <p className="activity-section-description">
          {archive.length > 0
            ? `${formatActivityDate(new Date(firstDate))} – ${formatActivityDate(new Date(`${selectedDate}T00:00:00Z`))}`
            : 'No entries published by this date.'}
        </p>
        <div className="activity-archive-links">
          {visibleCollections.map(({ key, label, href }) => (
            <a href={href} key={key}>
              <span className="activity-archive-count">
                {archive
                  .filter((item) => item.collection === key)
                  .length.toLocaleString('en-US')}
              </span>
              <span>
                {label}
                <span aria-hidden="true"> →</span>
              </span>
            </a>
          ))}
        </div>
      </section>
      <p className="activity-method-note">
        Dates use UTC. Writing volume is measured in characters. Includes posts,
        TILs, logs, projects, and garden entries.
      </p>
    </div>
  );
}
