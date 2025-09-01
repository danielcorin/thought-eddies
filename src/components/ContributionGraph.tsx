import React, { useState } from 'react';

interface ContentItem {
  id: string;
  collection: string;
  publishedAt?: string | Date;
  createdAt?: string | Date;
  date?: string | Date;
  contentLength?: number;
  title?: string;
}

interface DayData {
  date: Date;
  contentLength: number;
  items: ContentItem[];
}

interface Props {
  allContent: ContentItem[];
  endDate?: Date;
}

export default function ContributionGraph({
  allContent,
  endDate = new Date(),
}: Props) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Constants for layout
  const DAYS_IN_WEEK = 7;
  const WEEKS_IN_YEAR = 53;
  const CELL_SIZE = 11;
  const CELL_GAP = 2;
  const MONTH_LABEL_HEIGHT = 20;
  const DAY_LABEL_WIDTH = 30;

  // Get date from content item
  const getContentDate = (item: ContentItem): Date | null => {
    if (item.publishedAt) return new Date(item.publishedAt);
    if (item.createdAt) return new Date(item.createdAt);
    if (item.date) return new Date(item.date);
    return null;
  };

  // Calculate contribution data for the last year
  const calculateContributions = (): Map<string, DayData> => {
    const contributions = new Map<string, DayData>();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 365);

    // Initialize all days in the last year
    for (let i = 0; i <= 365; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      contributions.set(dateKey, {
        date,
        contentLength: 0,
        items: [],
      });
    }

    // Aggregate content by date
    allContent.forEach((item) => {
      const date = getContentDate(item);
      if (date && date >= startDate && date <= endDate) {
        const dateKey = formatDateKey(date);
        const dayData = contributions.get(dateKey);
        if (dayData) {
          dayData.contentLength += item.contentLength || 1000;
          dayData.items.push(item);
        }
      }
    });

    return contributions;
  };

  // Format date as YYYY-MM-DD
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Get color intensity based on content length with outlier handling
  const getColorIntensity = (
    contentLength: number,
    percentile95: number
  ): string => {
    if (contentLength === 0) return 'var(--contribution-level-0)';

    // Clamp to 95th percentile to handle outliers
    const clampedLength = Math.min(contentLength, percentile95);
    const ratio = clampedLength / percentile95;

    if (ratio > 0.75) return 'var(--contribution-level-4)';
    if (ratio > 0.5) return 'var(--contribution-level-3)';
    if (ratio > 0.25) return 'var(--contribution-level-2)';
    return 'var(--contribution-level-1)';
  };

  // Calculate percentile
  const calculatePercentile = (
    values: number[],
    percentile: number
  ): number => {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  // Get all days for the grid
  const getDaysGrid = () => {
    const contributions = calculateContributions();

    // Get all non-zero content lengths for percentile calculation
    const contentLengths = Array.from(contributions.values())
      .map((d) => d.contentLength)
      .filter((length) => length > 0);

    // Calculate 95th percentile to handle outliers
    const percentile95 = calculatePercentile(contentLengths, 95) || 1;

    // Start from the first Sunday before or on the start date
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 364); // Go back 364 days from end date
    const startDayOfWeek = startDate.getDay();
    if (startDayOfWeek !== 0) {
      startDate.setDate(startDate.getDate() - startDayOfWeek);
    }

    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];

    for (let i = 0; i < WEEKS_IN_YEAR * DAYS_IN_WEEK; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);

      const dateKey = formatDateKey(currentDate);
      const dayData = contributions.get(dateKey) || {
        date: currentDate,
        contentLength: 0,
        items: [],
      };

      currentWeek.push(dayData);

      if (currentWeek.length === DAYS_IN_WEEK) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return { weeks, percentile95 };
  };

  // Get month labels
  const getMonthLabels = () => {
    const labels: { month: string; x: number }[] = [];
    const { weeks } = getDaysGrid();
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date;
      const month = firstDayOfWeek.getMonth();

      if (month !== lastMonth) {
        const monthName = firstDayOfWeek.toLocaleDateString('en-US', {
          month: 'short',
        });
        labels.push({
          month: monthName,
          x: weekIndex * (CELL_SIZE + CELL_GAP),
        });
        lastMonth = month;
      }
    });

    return labels;
  };

  const { weeks, percentile95 } = getDaysGrid();
  const monthLabels = getMonthLabels();
  const totalContributions = allContent.filter((item) => {
    const date = getContentDate(item);
    return (
      date &&
      date >= new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000) &&
      date <= endDate
    );
  }).length;

  // Get collection route
  const getCollectionRoute = (collection: string): string => {
    switch (collection) {
      case 'posts':
        return '/posts';
      case 'til':
        return '/til';
      case 'logs':
        return '/logs';
      case 'projects':
        return '/projects';
      case 'garden':
        return '/garden';
      default:
        return '#';
    }
  };

  // Get item link
  const getItemLink = (item: ContentItem): string => {
    const route = getCollectionRoute(item.collection);
    if (item.collection === 'posts') {
      return `${route}/${item.id}`;
    }
    if (item.collection === 'til') {
      const [category, ...rest] = item.id.split('/');
      return `${route}/${category}/${rest.join('/')}`;
    }
    if (item.collection === 'logs') {
      return `${route}/${item.id}`;
    }
    return `${route}/${item.id}`;
  };

  return (
    <div className="contribution-graph-container">
      <div className="contribution-header">
        <h2>Contribution Activity</h2>
        <p className="contribution-count">
          {totalContributions.toLocaleString()} contributions in the last year
        </p>
      </div>

      <div className="contribution-wrapper">
        <svg
          width={WEEKS_IN_YEAR * (CELL_SIZE + CELL_GAP) + DAY_LABEL_WIDTH}
          height={DAYS_IN_WEEK * (CELL_SIZE + CELL_GAP) + MONTH_LABEL_HEIGHT}
          className="contribution-graph"
        >
          {/* Month labels */}
          {monthLabels.map((label, i) => (
            <text
              key={i}
              x={label.x + DAY_LABEL_WIDTH}
              y={MONTH_LABEL_HEIGHT - 5}
              className="month-label"
            >
              {label.month}
            </text>
          ))}

          {/* Day labels */}
          <text
            x={0}
            y={MONTH_LABEL_HEIGHT + CELL_SIZE + 14}
            className="day-label"
          >
            Mon
          </text>
          <text
            x={0}
            y={MONTH_LABEL_HEIGHT + CELL_SIZE + 14 + 2 * (CELL_SIZE + CELL_GAP)}
            className="day-label"
          >
            Wed
          </text>
          <text
            x={0}
            y={MONTH_LABEL_HEIGHT + CELL_SIZE + 14 + 4 * (CELL_SIZE + CELL_GAP)}
            className="day-label"
          >
            Fri
          </text>

          {/* Contribution cells */}
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const x = weekIndex * (CELL_SIZE + CELL_GAP) + DAY_LABEL_WIDTH;
              const y = dayIndex * (CELL_SIZE + CELL_GAP) + MONTH_LABEL_HEIGHT;
              const color = getColorIntensity(day.contentLength, percentile95);
              const hasContent = day.items.length > 0;

              return (
                <rect
                  key={`${weekIndex}-${dayIndex}`}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={color}
                  className={`contribution-cell ${hasContent ? 'has-content' : ''} ${selectedDay?.date.getTime() === day.date.getTime() ? 'selected' : ''}`}
                  onClick={() => hasContent && setSelectedDay(day)}
                  data-date={formatDateKey(day.date)}
                  data-content-length={day.contentLength}
                  data-items={day.items.length}
                >
                  <title>
                    {formatDateDisplay(day.date)}
                    {day.items.length > 0 &&
                      `: ${day.items.length} item${day.items.length > 1 ? 's' : ''} (${day.contentLength.toLocaleString()} chars)`}
                  </title>
                </rect>
              );
            })
          )}
        </svg>

        {/* Legend */}
        <div className="contribution-legend">
          <span className="legend-text">Less</span>
          <div className="legend-cells">
            <div
              className="legend-cell"
              style={{ backgroundColor: 'var(--contribution-level-0)' }}
            ></div>
            <div
              className="legend-cell"
              style={{ backgroundColor: 'var(--contribution-level-1)' }}
            ></div>
            <div
              className="legend-cell"
              style={{ backgroundColor: 'var(--contribution-level-2)' }}
            ></div>
            <div
              className="legend-cell"
              style={{ backgroundColor: 'var(--contribution-level-3)' }}
            ></div>
            <div
              className="legend-cell"
              style={{ backgroundColor: 'var(--contribution-level-4)' }}
            ></div>
          </div>
          <span className="legend-text">More</span>
        </div>
      </div>

      {/* Selected day content */}
      {selectedDay && selectedDay.items.length > 0 && (
        <div className="selected-day-content">
          <h3>{formatDateDisplay(selectedDay.date)}</h3>
          <p className="selected-day-summary">
            {selectedDay.items.length} item
            {selectedDay.items.length > 1 ? 's' : ''} •{' '}
            {selectedDay.contentLength.toLocaleString()} characters
          </p>
          <div className="content-links">
            {selectedDay.items.map((item, index) => (
              <a key={index} href={getItemLink(item)} className="content-link">
                <span className="content-type">
                  {item.collection.charAt(0).toUpperCase() +
                    item.collection.slice(1)}
                </span>
                <span className="content-title">{item.title || item.id}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
