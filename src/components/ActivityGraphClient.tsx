import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import ActivityTooltip, { type ActivityTooltipAnchor } from './ActivityTooltip';
import {
  activityCollections,
  DAY_MS,
  formatActivityDate,
  type getActivityPeriods,
  type getActivityStats,
} from '../utils/activity';

interface Props {
  period: ReturnType<typeof getActivityPeriods>[number];
  current: ReturnType<typeof getActivityStats>;
  previous: ReturnType<typeof getActivityStats>;
}

const CHART_WIDTH = 280;
const PLOT_INSET = 8;
const PLOT_WIDTH = CHART_WIDTH - 2 * PLOT_INSET;

export default function ActivityGraphClient({
  period,
  current,
  previous,
}: Props) {
  const tooltipId = useId();
  const helpId = useId();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<ActivityTooltipAnchor | null>(null);
  const datasets = [current.daily, previous.daily];
  const lastIndex = current.daily.length - 1;
  const index = Math.min(lastIndex, selectedIndex ?? lastIndex);
  const fraction = lastIndex > 0 ? index / lastIndex : 0.5;
  const samples = [current, previous].map((stats, seriesIndex) => {
    const dayIndex = Math.round(fraction * (stats.daily.length - 1));
    const start = seriesIndex === 0 ? period.start : period.previousStart;
    return {
      label: seriesIndex === 0 ? 'Current' : 'Previous',
      date: new Date(start.getTime() + dayIndex * DAY_MS),
      characters: stats.daily[dayIndex],
      entries: stats.dailyEntries[dayIndex],
      x:
        stats.daily.length > 1
          ? PLOT_INSET + (dayIndex / (stats.daily.length - 1)) * PLOT_WIDTH
          : CHART_WIDTH / 2,
    };
  });
  const describe = (sample: (typeof samples)[number]) =>
    `${sample.label}, ${formatActivityDate(sample.date)}: ${sample.entries} ${sample.entries === 1 ? 'entry' : 'entries'}, ${sample.characters.toLocaleString('en-US')} characters`;
  const showIndex = (next: number, element: SVGSVGElement) => {
    const nextIndex = Math.max(0, Math.min(lastIndex, next));
    const box = element.getBoundingClientRect();
    const x = lastIndex > 0 ? nextIndex / lastIndex : 0.5;
    setSelectedIndex(nextIndex);
    setAnchor({
      left:
        box.left + ((PLOT_INSET + x * PLOT_WIDTH) / CHART_WIDTH) * box.width,
      top: box.top,
      width: 0,
      height: box.height,
    });
  };
  const pointAtPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    showIndex(
      Math.round(
        ((((event.clientX - box.left) / box.width) * CHART_WIDTH - PLOT_INSET) /
          PLOT_WIDTH) *
          lastIndex
      ),
      event.currentTarget
    );
  };
  const navigate = (event: KeyboardEvent<SVGSVGElement>) => {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
    };
    if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End')
      return;
    event.preventDefault();
    showIndex(
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : index + offsets[event.key],
      event.currentTarget
    );
  };
  const max = Math.max(1, ...datasets.flat());
  const paths = datasets.map((values) => {
    // A one-day range (January 1) still has a visible, finite line.
    const points = values.length === 1 ? [values[0], values[0]] : values;
    return points
      .map(
        (value, index) =>
          `${index === 0 ? 'M' : 'L'} ${(PLOT_INSET + (index / (points.length - 1)) * PLOT_WIDTH).toFixed(2)},${(70 - (value / max) * 58).toFixed(2)}`
      )
      .join(' ');
  });
  const change =
    previous.total > 0
      ? Math.round(((current.total - previous.total) / previous.total) * 100)
      : null;
  const range = `${formatActivityDate(period.start)} – ${formatActivityDate(new Date(period.end.getTime() - DAY_MS))}`;
  const previousRange = `${formatActivityDate(period.previousStart)} – ${formatActivityDate(new Date(period.previousEnd.getTime() - DAY_MS))}`;

  return (
    <div className="activity-stat">
      <h3>{period.title}</h3>
      <p className="activity-stat-range">{range}</p>
      <div className="activity-stat-value">
        <strong>{current.total.toLocaleString('en-US')}</strong>
        <span>{current.total === 1 ? 'entry' : 'entries'}</span>
        {change !== null && change !== 0 && (
          <span className="activity-stat-delta">
            {change > 0 ? '+' : '−'}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="activity-stat-comparison" title={previousRange}>
        {previous.total.toLocaleString('en-US')} in the {period.comparisonLabel}
      </p>
      <svg
        className="activity-sparkline"
        viewBox="0 0 280 80"
        preserveAspectRatio="none"
        role="slider"
        tabIndex={0}
        aria-label={`Daily writing volume for ${period.title.toLowerCase()}`}
        aria-describedby={helpId}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={index}
        aria-valuetext={samples.map(describe).join('. ')}
        onPointerMove={pointAtPointer}
        onPointerDown={pointAtPointer}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setAnchor(null);
        }}
        onPointerCancel={() => setAnchor(null)}
        onFocus={(event) => showIndex(index, event.currentTarget)}
        onBlur={() => setAnchor(null)}
        onKeyDown={navigate}
      >
        <rect width="280" height="80" fill="transparent" />
        <line
          x1="0"
          y1="70"
          x2="280"
          y2="70"
          className="activity-sparkline-baseline"
        />
        <path d={paths[1]} className="activity-sparkline-previous" />
        <path d={paths[0]} className="activity-sparkline-current" />
        {anchor && (
          <g className="activity-sparkline-marker" aria-hidden="true">
            <line
              x1={PLOT_INSET + fraction * PLOT_WIDTH}
              x2={PLOT_INSET + fraction * PLOT_WIDTH}
              y1="4"
              y2="74"
            />
            {samples.map((sample, seriesIndex) => (
              <circle
                key={sample.label}
                cx={sample.x}
                cy={70 - (sample.characters / max) * 58}
                r="3.5"
                className={seriesIndex === 0 ? 'current' : 'previous'}
              />
            ))}
          </g>
        )}
      </svg>
      <span id={helpId} className="activity-sr-only">
        Use arrow keys to inspect days. Home and End jump to the first and last
        day. Escape closes details. Lines show daily character totals.
      </span>
      {anchor && (
        <ActivityTooltip
          id={tooltipId}
          anchor={anchor}
          onDismiss={() => setAnchor(null)}
        >
          {samples.map((sample) => (
            <div key={sample.label} className="activity-tooltip-period">
              <p className="activity-tooltip-label">
                <i className={sample.label.toLowerCase()} aria-hidden="true" />
                {sample.label === 'Previous' && <span>Previous ·</span>}
                <time dateTime={sample.date.toISOString()}>
                  {formatActivityDate(sample.date)}
                </time>
              </p>
              <p>
                <strong>
                  {sample.entries} {sample.entries === 1 ? 'entry' : 'entries'}
                </strong>{' '}
                · {sample.characters.toLocaleString('en-US')} characters
              </p>
            </div>
          ))}
        </ActivityTooltip>
      )}
      <div className="activity-stat-breakdown">
        {activityCollections
          .filter(({ key }) => current.breakdown[key] > 0)
          .map(({ key, label, href }) => (
            <a key={key} href={href}>
              {label}{' '}
              <span>{current.breakdown[key].toLocaleString('en-US')}</span>
            </a>
          ))}
        {current.total === 0 && (
          <span className="activity-empty">No entries in this period</span>
        )}
      </div>
    </div>
  );
}
