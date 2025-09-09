import React, { useState, useEffect } from 'react';
import ActivityGraphClient from './ActivityGraphClient';
import ContributionGraph from './ContributionGraph';

interface ContentItem {
  id: string;
  collection: string;
  publishedAt?: string | Date;
  createdAt?: string | Date;
  date?: string | Date;
  draft?: boolean;
  body?: string;
  contentLength?: number;
  title?: string;
}

interface Props {
  allContent: ContentItem[];
  initialDate: string;
}

export default function ActivityPageClient({ allContent, initialDate }: Props) {
  // Format date as YYYY-MM-DD for input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Ensure we use today's date if no date parameter is in the URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const dateParam = url.searchParams.get('date');

    // If there's no date parameter, set to today
    if (!dateParam) {
      const today = formatDateForInput(new Date());
      setSelectedDate(today);
    }
  }, []);

  // Format date as MM/DD/YYYY for display
  const formatDateForDisplay = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      setSelectedDate(newDate);

      // Update URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.set('date', newDate);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleTodayClick = () => {
    const today = formatDateForInput(new Date());
    setSelectedDate(today);

    // Update URL to remove date parameter (default is today)
    const url = new URL(window.location.href);
    url.searchParams.delete('date');
    window.history.pushState({}, '', url.toString());
  };

  // Helper function to get date from content item
  const getContentDate = (item: ContentItem): Date | null => {
    if (item.publishedAt) return new Date(item.publishedAt);
    if (item.createdAt) return new Date(item.createdAt);
    if (item.date) return new Date(item.date);
    return null;
  };

  // Get content length
  const getContentLength = (item: ContentItem): number => {
    return item.contentLength || item.body?.length || 1000;
  };

  // Generate daily content lengths for a period
  const getDailyContentLengths = (startDate: Date, endDate: Date): number[] => {
    if (
      !startDate ||
      !endDate ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      return [];
    }

    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (days <= 0 || days > 1000) return [];

    const lengths = new Array(days).fill(0);

    allContent.forEach((item) => {
      const date = getContentDate(item);
      if (date && date >= startDate && date <= endDate) {
        const dayIndex = Math.floor(
          (date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (dayIndex >= 0 && dayIndex < days) {
          lengths[dayIndex] += getContentLength(item);
        }
      }
    });

    return lengths;
  };

  // Calculate stats for a period
  const getStatsForPeriod = (startDate: Date, endDate: Date) => {
    const contentInPeriod = allContent.filter((item) => {
      const date = getContentDate(item);
      return date && date >= startDate && date <= endDate;
    });

    const stats = {
      total: contentInPeriod.length,
      posts: 0,
      tils: 0,
      logs: 0,
      projects: 0,
      garden: 0,
    };

    contentInPeriod.forEach((item) => {
      switch (item.collection) {
        case 'posts':
          stats.posts++;
          break;
        case 'til':
          stats.tils++;
          break;
        case 'logs':
          stats.logs++;
          break;
        case 'projects':
          stats.projects++;
          break;
        case 'garden':
          stats.garden++;
          break;
      }
    });

    return stats;
  };

  // Calculate all time stats
  const allTimeStats = {
    total: allContent.length,
    posts: allContent.filter((item) => item.collection === 'posts').length,
    tils: allContent.filter((item) => item.collection === 'til').length,
    logs: allContent.filter((item) => item.collection === 'logs').length,
    projects: allContent.filter((item) => item.collection === 'projects')
      .length,
    garden: allContent.filter((item) => item.collection === 'garden').length,
  };

  const currentDate = new Date(selectedDate);

  // Calculate date ranges
  const sevenDaysAgo = new Date(
    currentDate.getTime() - 7 * 24 * 60 * 60 * 1000
  );
  const fourteenDaysAgo = new Date(
    currentDate.getTime() - 14 * 24 * 60 * 60 * 1000
  );
  const thirtyDaysAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
  );
  const sixtyDaysAgo = new Date(
    currentDate.getTime() - 60 * 24 * 60 * 60 * 1000
  );
  const oneYearAgo = new Date(
    currentDate.getTime() - 365 * 24 * 60 * 60 * 1000
  );
  const twoYearsAgo = new Date(
    currentDate.getTime() - 2 * 365 * 24 * 60 * 60 * 1000
  );
  const yearStart = new Date(currentDate.getFullYear(), 0, 1);
  const previousYearStart = new Date(currentDate.getFullYear() - 1, 0, 1);
  const sameDayLastYear = new Date(
    currentDate.getFullYear() - 1,
    currentDate.getMonth(),
    Math.min(
      currentDate.getDate(),
      new Date(
        currentDate.getFullYear() - 1,
        currentDate.getMonth() + 1,
        0
      ).getDate()
    )
  );

  // Calculate data for each period
  const last7DaysData = getDailyContentLengths(sevenDaysAgo, currentDate);
  const previous7DaysData = getDailyContentLengths(
    fourteenDaysAgo,
    sevenDaysAgo
  );
  const last7DaysStats = getStatsForPeriod(sevenDaysAgo, currentDate);
  const previous7DaysStats = getStatsForPeriod(fourteenDaysAgo, sevenDaysAgo);
  const last7DaysChange =
    previous7DaysStats.total === 0
      ? last7DaysStats.total > 0
        ? 100
        : 0
      : Math.round(
          ((last7DaysStats.total - previous7DaysStats.total) /
            previous7DaysStats.total) *
            100
        );

  const last30DaysData = getDailyContentLengths(thirtyDaysAgo, currentDate);
  const previous30DaysData = getDailyContentLengths(
    sixtyDaysAgo,
    thirtyDaysAgo
  );
  const last30DaysStats = getStatsForPeriod(thirtyDaysAgo, currentDate);
  const previous30DaysStats = getStatsForPeriod(sixtyDaysAgo, thirtyDaysAgo);
  const last30DaysChange =
    previous30DaysStats.total === 0
      ? last30DaysStats.total > 0
        ? 100
        : 0
      : Math.round(
          ((last30DaysStats.total - previous30DaysStats.total) /
            previous30DaysStats.total) *
            100
        );

  const lastYearData = getDailyContentLengths(oneYearAgo, currentDate);
  const previousYearData = getDailyContentLengths(twoYearsAgo, oneYearAgo);
  const lastYearStats = getStatsForPeriod(oneYearAgo, currentDate);
  const previousYearStats = getStatsForPeriod(twoYearsAgo, oneYearAgo);
  const lastYearChange =
    previousYearStats.total === 0
      ? lastYearStats.total > 0
        ? 100
        : 0
      : Math.round(
          ((lastYearStats.total - previousYearStats.total) /
            previousYearStats.total) *
            100
        );

  const yearToDateData = getDailyContentLengths(yearStart, currentDate);
  const previousYearToDateData = getDailyContentLengths(
    previousYearStart,
    sameDayLastYear
  );
  const yearToDateStats = getStatsForPeriod(yearStart, currentDate);
  const previousYearToDateStats = getStatsForPeriod(
    previousYearStart,
    sameDayLastYear
  );
  const yearToDateChange =
    previousYearToDateStats.total === 0
      ? yearToDateStats.total > 0
        ? 100
        : 0
      : Math.round(
          ((yearToDateStats.total - previousYearToDateStats.total) /
            previousYearToDateStats.total) *
            100
        );

  return (
    <>
      <div className="date-picker-container">
        <label htmlFor="activity-date">View activity for</label>
        <input
          type="date"
          id="activity-date"
          value={selectedDate}
          onChange={handleDateChange}
          className="date-picker"
        />
        <button
          onClick={handleTodayClick}
          className="today-button"
          aria-label="Jump to today"
        >
          Today
        </button>
      </div>

      <ContributionGraph allContent={allContent} endDate={currentDate} />

      <div className="stats-grid">
        <ActivityGraphClient
          title="Last 7 Days"
          currentData={last7DaysData}
          previousData={previous7DaysData}
          currentTotal={last7DaysStats.total}
          previousTotal={previous7DaysStats.total}
          percentageChange={last7DaysChange}
          breakdown={last7DaysStats}
          smoothingWindow={3}
        />

        <ActivityGraphClient
          title="Last 30 Days"
          currentData={last30DaysData}
          previousData={previous30DaysData}
          currentTotal={last30DaysStats.total}
          previousTotal={previous30DaysStats.total}
          percentageChange={last30DaysChange}
          breakdown={last30DaysStats}
          smoothingWindow={5}
        />

        <ActivityGraphClient
          title="Last Year"
          currentData={lastYearData}
          previousData={previousYearData}
          currentTotal={lastYearStats.total}
          previousTotal={previousYearStats.total}
          percentageChange={lastYearChange}
          breakdown={lastYearStats}
          smoothingWindow={15}
        />

        <ActivityGraphClient
          title="Year to Date"
          currentData={yearToDateData}
          previousData={previousYearToDateData}
          currentTotal={yearToDateStats.total}
          previousTotal={previousYearToDateStats.total}
          percentageChange={yearToDateChange}
          breakdown={yearToDateStats}
          smoothingWindow={10}
        />
      </div>

      <div className="all-time-section">
        <h2>All Time</h2>
        <div className="all-time-stats">
          <div className="all-time-total">
            <span className="label">Total Content:</span>
            <span className="value">{allTimeStats.total.toLocaleString()}</span>
          </div>
          <div className="all-time-breakdown">
            <a href="/posts" className="all-time-item">
              <span className="all-time-label">Posts</span>
              <span className="all-time-count">
                {allTimeStats.posts.toLocaleString()}
              </span>
            </a>
            <a href="/til" className="all-time-item">
              <span className="all-time-label">TILs</span>
              <span className="all-time-count">
                {allTimeStats.tils.toLocaleString()}
              </span>
            </a>
            <a href="/logs" className="all-time-item">
              <span className="all-time-label">Logs</span>
              <span className="all-time-count">
                {allTimeStats.logs.toLocaleString()}
              </span>
            </a>
            <a href="/projects" className="all-time-item">
              <span className="all-time-label">Projects</span>
              <span className="all-time-count">
                {allTimeStats.projects.toLocaleString()}
              </span>
            </a>
            <a href="/garden" className="all-time-item">
              <span className="all-time-label">Garden</span>
              <span className="all-time-count">
                {allTimeStats.garden.toLocaleString()}
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
