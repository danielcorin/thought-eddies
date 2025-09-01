import React from 'react';

interface ActivityGraphProps {
  title: string;
  currentData: number[];
  previousData: number[];
  currentTotal: number;
  previousTotal: number;
  percentageChange: number;
  breakdown: {
    posts: number;
    tils: number;
    logs: number;
    projects: number;
    garden: number;
  };
  smoothingWindow?: number;
}

function smoothData(data: number[], windowSize: number = 5): number[] {
  if (data.length < windowSize) return data;

  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - Math.floor(windowSize / 2));
      j <= Math.min(data.length - 1, i + Math.floor(windowSize / 2));
      j++
    ) {
      sum += data[j];
      count++;
    }
    smoothed.push(sum / count);
  }
  return smoothed;
}

function generateSparklines(
  datasets: number[][],
  smooth: boolean = true,
  windowSize: number = 7
): { current: string; previous: string; max: number } {
  if (datasets.length === 0 || datasets[0].length === 0)
    return { current: '', previous: '', max: 1 };

  const width = 280;
  const height = 80;
  const padding = 10;

  const smoothedDatasets = datasets.map((data) =>
    smooth ? smoothData(data, windowSize) : data
  );
  const allValues = smoothedDatasets.flat();

  const nonZeroValues = allValues.filter((v) => v > 0);
  const max = nonZeroValues.length > 0 ? Math.max(...nonZeroValues) : 1;
  const min = 0;

  const adjustedMax = max * 1.2;
  const yScale = (height - 2 * padding) / adjustedMax;

  function catmullRom(
    p0: number,
    p1: number,
    p2: number,
    p3: number,
    t: number
  ): number {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t * t;
    return (
      (2 * p1 - 2 * p2 + v0 + v1) * t3 +
      (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
      v0 * t +
      p1
    );
  }

  function generatePath(data: number[]): string {
    if (!data || data.length === 0) return '';
    const values = smooth ? smoothData(data, windowSize) : data;
    const xScale = (width - 2 * padding) / (values.length - 1);

    const points = values.map((value, index) => ({
      x: padding + index * xScale,
      y: height - padding - (value - min) * yScale,
    }));

    if (points.length < 2) return '';

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

      const segments = 10;
      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
        path += ` L ${x},${y}`;
      }
    }

    return path;
  }

  return {
    current: generatePath(datasets[0]),
    previous: datasets.length > 1 ? generatePath(datasets[1]) : '',
    max: adjustedMax,
  };
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export default function ActivityGraphClient({
  title,
  currentData,
  previousData,
  currentTotal,
  previousTotal,
  percentageChange,
  breakdown,
  smoothingWindow = 7,
}: ActivityGraphProps) {
  const paths = generateSparklines(
    [currentData, previousData],
    true,
    smoothingWindow
  );

  return (
    <div className="stat-card">
      <h2>{title}</h2>
      <div className="sparkline-container">
        <svg className="sparkline" width="280" height="80" viewBox="0 0 280 80">
          {paths.previous && (
            <path
              d={paths.previous}
              fill="none"
              stroke="var(--color-ink-light)"
              strokeWidth="2"
              opacity="0.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          <path
            d={paths.current}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="sparkline-legend">
          <span className="legend-item">
            <span className="legend-line current"></span>
            <span className="legend-label">Current</span>
          </span>
          <span className="legend-item">
            <span className="legend-line previous"></span>
            <span className="legend-label">Previous</span>
          </span>
        </div>
      </div>
      <div className="stat-header">
        <div className="stat-values">
          <div className="stat-value">{formatNumber(currentTotal)}</div>
          <div className="stat-comparison">
            <div className="stat-previous">{formatNumber(previousTotal)}</div>
            {percentageChange !== 0 && (
              <span
                className={`stat-delta ${percentageChange > 0 ? 'positive' : 'negative'}`}
              >
                ({percentageChange > 0 ? '+' : ''}
                {percentageChange}%)
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="stat-breakdown">
        {breakdown.posts > 0 && (
          <a href="/posts" className="stat-item">
            <span className="stat-label">Posts</span>
            <span className="stat-count">{breakdown.posts}</span>
          </a>
        )}
        {breakdown.tils > 0 && (
          <a href="/til" className="stat-item">
            <span className="stat-label">TILs</span>
            <span className="stat-count">{breakdown.tils}</span>
          </a>
        )}
        {breakdown.logs > 0 && (
          <a href="/logs" className="stat-item">
            <span className="stat-label">Logs</span>
            <span className="stat-count">{breakdown.logs}</span>
          </a>
        )}
        {breakdown.projects > 0 && (
          <a href="/projects" className="stat-item">
            <span className="stat-label">Projects</span>
            <span className="stat-count">{breakdown.projects}</span>
          </a>
        )}
        {breakdown.garden > 0 && (
          <a href="/garden" className="stat-item">
            <span className="stat-label">Garden</span>
            <span className="stat-count">{breakdown.garden}</span>
          </a>
        )}
      </div>
    </div>
  );
}
