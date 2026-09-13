import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import ActivityTooltip, { type ActivityTooltipAnchor } from './ActivityTooltip';
import {
  activityCollections,
  DAY_MS,
  formatActivityDate,
  type ActivityItem,
} from '../utils/activity';

interface Props {
  allContent: ActivityItem[];
  endDate: string;
}

export default function ContributionGraph({ allContent, endDate }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [focusedDate, setFocusedDate] = useState(endDate);
  const tooltipId = useId();
  const [hovered, setHovered] = useState<{
    date: string;
    anchor: ActivityTooltipAnchor;
  } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const end = new Date(`${endDate}T00:00:00Z`);
  const start = new Date(end.getTime() - 364 * DAY_MS);
  const gridStart = new Date(start.getTime() - start.getUTCDay() * DAY_MS);
  const days = Array.from({ length: 371 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_MS);
    return {
      date,
      key: date.toISOString().slice(0, 10),
      items: [] as ActivityItem[],
      volume: 0,
    };
  });
  const dayMap = new Map(days.map((day) => [day.key, day]));
  for (const item of allContent) {
    const day = dayMap.get(item.publishedAt.slice(0, 10));
    if (day && day.date >= start && day.date <= end) {
      day.items.push(item);
      day.volume += item.contentLength;
    }
  }
  const activeDays = days.filter((day) => day.items.length > 0);
  const total = activeDays.reduce((sum, day) => sum + day.items.length, 0);
  const volumes = activeDays.map((day) => day.volume).sort((a, b) => a - b);
  const ceiling =
    volumes[Math.max(0, Math.ceil(volumes.length * 0.95) - 1)] || 1;
  const selectedDay = selectedDate ? dayMap.get(selectedDate) : undefined;
  const hoveredDay = hovered ? dayMap.get(hovered.date) : undefined;
  const showTooltip = (date: string, element: SVGRectElement) => {
    setHovered({ date, anchor: element.getBoundingClientRect() });
  };
  const monthLabels = days.flatMap((day, index) => {
    if (index % 7 !== 0) return [];
    const previousWeek = days[index - 7];
    if (
      previousWeek &&
      previousWeek.date.getUTCMonth() === day.date.getUTCMonth()
    )
      return [];
    return [
      {
        label: day.date.toLocaleDateString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        }),
        week: index / 7,
      },
    ];
  });

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.scrollLeft = element.scrollWidth;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [endDate]);

  const navigateDay = (event: KeyboardEvent<SVGRectElement>, date: Date) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setHovered(null);
      setSelectedDate(date.toISOString().slice(0, 10));
      return;
    }
    const offsets: Record<string, number> = {
      ArrowLeft: -7,
      ArrowRight: 7,
      ArrowUp: -1,
      ArrowDown: 1,
    };
    if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End')
      return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? start.getTime()
        : event.key === 'End'
          ? end.getTime()
          : date.getTime() + offsets[event.key] * DAY_MS;
    const nextKey = new Date(
      Math.max(start.getTime(), Math.min(end.getTime(), next))
    )
      .toISOString()
      .slice(0, 10);
    setFocusedDate(nextKey);
    event.currentTarget.ownerSVGElement
      ?.querySelector<SVGRectElement>(`[data-date="${nextKey}"]`)
      ?.focus();
  };

  return (
    <section
      className="activity-calendar"
      aria-labelledby="activity-calendar-heading"
    >
      <div className="activity-section-heading">
        <h2 id="activity-calendar-heading">A year of activity</h2>
        <span className="activity-calendar-period">Last 365 days</span>
      </div>
      <p className="activity-calendar-summary">
        <strong>{total.toLocaleString('en-US')}</strong>{' '}
        {total === 1 ? 'entry' : 'entries'} across{' '}
        <strong>{activeDays.length}</strong> active{' '}
        {activeDays.length === 1 ? 'day' : 'days'}
      </p>
      <p className="activity-calendar-range">
        {formatActivityDate(start)} – {formatActivityDate(end)}
      </p>

      <div className="activity-calendar-scroll" ref={wrapper}>
        <svg
          viewBox="0 0 723 116"
          className="activity-calendar-grid"
          role="group"
          aria-label="Daily publishing activity"
          aria-describedby="activity-calendar-help"
        >
          {monthLabels.map(({ label, week }) => (
            <text
              key={week}
              x={week > 50 ? 719 : 32 + week * 13}
              y={12}
              textAnchor={week > 50 ? 'end' : 'start'}
              className="activity-calendar-label"
            >
              {label}
            </text>
          ))}
          {[
            { label: 'Mon', day: 1 },
            { label: 'Wed', day: 3 },
            { label: 'Fri', day: 5 },
          ].map(({ label, day }) => (
            <text
              key={label}
              x={0}
              y={32 + day * 13}
              className="activity-calendar-label"
            >
              {label}
            </text>
          ))}
          {days.map((day, index) => {
            if (day.date < start || day.date > end) return null;
            const level =
              day.items.length === 0
                ? 0
                : Math.max(
                    1,
                    Math.min(4, Math.ceil((day.volume / ceiling) * 4))
                  );
            const description = `${formatActivityDate(day.date)}: ${day.items.length} ${day.items.length === 1 ? 'entry' : 'entries'}`;
            return (
              <rect
                key={day.key}
                x={32 + Math.floor(index / 7) * 13}
                y={23 + (index % 7) * 13}
                width={11}
                height={11}
                rx={2}
                fill={`var(--activity-level-${level})`}
                className={`activity-calendar-day${selectedDate === day.key ? ' is-selected' : ''}${hovered?.date === day.key ? ' is-hovered' : ''}`}
                role="button"
                tabIndex={focusedDate === day.key ? 0 : -1}
                aria-label={`${description} · ${day.volume.toLocaleString('en-US')} characters`}
                aria-describedby={
                  hovered?.date === day.key ? tooltipId : undefined
                }
                aria-pressed={selectedDate === day.key}
                data-date={day.key}
                data-items={day.items.length}
                onFocus={(event) => {
                  setFocusedDate(day.key);
                  showTooltip(day.key, event.currentTarget);
                }}
                onBlur={() => setHovered(null)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch')
                    showTooltip(day.key, event.currentTarget);
                }}
                onPointerLeave={() => setHovered(null)}
                onClick={() => {
                  setHovered(null);
                  setSelectedDate(day.key);
                }}
                onKeyDown={(event) => navigateDay(event, day.date)}
              />
            );
          })}
        </svg>
      </div>
      {hovered && hoveredDay && (
        <ActivityTooltip
          id={tooltipId}
          anchor={hovered.anchor}
          onDismiss={() => setHovered(null)}
        >
          <p className="activity-tooltip-heading">
            {formatActivityDate(hoveredDay.date)}
          </p>
          <p>
            <strong>{hoveredDay.items.length}</strong>{' '}
            {hoveredDay.items.length === 1 ? 'entry' : 'entries'} ·{' '}
            {hoveredDay.volume.toLocaleString('en-US')} characters
          </p>
          {hoveredDay.items.length > 0 ? (
            <p className="activity-tooltip-muted">
              Select this day to explore.
            </p>
          ) : (
            <p className="activity-tooltip-muted">
              No entries published on this day.
            </p>
          )}
        </ActivityTooltip>
      )}
      <p className="activity-calendar-scroll-hint">
        <span aria-hidden="true">← </span>Scroll to explore the full year
        <span aria-hidden="true"> →</span>
      </p>
      <div className="activity-calendar-footer">
        <p id="activity-calendar-help">
          Select a day to explore.
          <span className="activity-sr-only">
            {' '}
            Use arrow keys to move between days, then Enter to select. Home and
            End jump to the first and last day.
          </span>
        </p>
        <div
          className="activity-volume-legend"
          aria-label="Shading shows writing volume, from less to more"
        >
          <span>Less</span>
          <span className="activity-legend-cells" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((level) => (
              <i
                key={level}
                style={{ background: `var(--activity-level-${level})` }}
              />
            ))}
          </span>
          <span>More</span>
        </div>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {selectedDay && (
          <div className="activity-day-detail">
            <div className="activity-section-heading">
              <h3>{formatActivityDate(selectedDay.date)}</h3>
              <span>
                {selectedDay.items.length}{' '}
                {selectedDay.items.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {selectedDay.items.length > 0 ? (
              <ul className="activity-day-links">
                {selectedDay.items.map((item) => (
                  <li key={`${item.collection}/${item.id}`}>
                    <a href={`/${item.collection}/${item.id}`}>
                      <span className="activity-content-type">
                        {
                          activityCollections.find(
                            ({ key }) => key === item.collection
                          )?.singular
                        }
                      </span>
                      <span>{item.title}</span>
                      <span aria-hidden="true">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="activity-empty">
                No entries published on this day.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
