import { Pause, Play } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Timeline,
  formatClock,
  normalizeRecording,
  type RepriseRecording,
  type RepriseState,
} from '@utils/reprise';
import '../styles/reprise.css';

const SPEEDS = [0.5, 1, 2, 4, 8, 16];

function speedLabel(speed: number): string {
  return speed === 0.5 ? '½×' : `${speed}×`;
}

interface RepriseReplayPlayerProps {
  /** URL of a Reprise `.reprise.json` export. Fetched when the reader opts to watch. */
  src: string;
  /** Pre-rendered HTML for the finished text. */
  children?: ReactNode;
  defaultSpeed?: number;
  skipIdleByDefault?: boolean;
}

const BLANK: RepriseState = { text: '', selection: { location: 0, length: 0 } };

export default function RepriseReplayPlayer({
  src,
  children,
  defaultSpeed = 1,
  skipIdleByDefault = true,
}: RepriseReplayPlayerProps) {
  const [reading, setReading] = useState(true);
  const [recording, setRecording] = useState<RepriseRecording | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipIdle, setSkipIdle] = useState(skipIdleByDefault);
  const [speed, setSpeed] = useState(defaultSpeed);
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(0);
  const [position, setPosition] = useState(0);

  // Refs mirror count/position so the animation loop never reads stale state.
  const countRef = useRef(0);
  const positionRef = useRef(0);
  const markerRef = useRef<HTMLElement>(null);

  // Load the recording the first time the reader switches to watching.
  useEffect(() => {
    if (reading || recording) return;
    let cancelled = false;
    setError(null);
    fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load recording (${response.status}).`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setRecording(normalizeRecording(data));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src, reading, recording]);

  // (Re)build the playback clock whenever the recording or idle setting changes,
  // keeping the current event count so toggling idle skipping doesn't jump.
  useEffect(() => {
    if (!recording) return;
    try {
      const next = new Timeline(recording, skipIdle);
      const c = Math.min(countRef.current, next.eventCount);
      const p = c ? next.times[c - 1] : 0;
      countRef.current = c;
      positionRef.current = p;
      setCount(c);
      setPosition(p);
      setTimeline(next);
      setError(null);
    } catch (err: unknown) {
      setTimeline(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [recording, skipIdle]);

  // Animation loop.
  useEffect(() => {
    if (!playing || !timeline) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(
        timeline.duration,
        positionRef.current + (now - last) * speed
      );
      last = now;
      positionRef.current = next;
      countRef.current = timeline.countAt(next);
      setPosition(next);
      setCount(countRef.current);
      if (next >= timeline.duration) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, timeline]);

  const seekCount = useCallback(
    (value: number) => {
      if (!timeline) return;
      setPlaying(false);
      const c = Math.max(0, Math.min(timeline.eventCount, Math.floor(value)));
      const p = c ? timeline.times[c - 1] : 0;
      countRef.current = c;
      positionRef.current = p;
      setCount(c);
      setPosition(p);
    },
    [timeline]
  );

  const seekPosition = useCallback(
    (ms: number) => {
      if (!timeline) return;
      setPlaying(false);
      const p = Math.max(0, Math.min(timeline.duration, ms));
      positionRef.current = p;
      countRef.current = timeline.countAt(p);
      setPosition(p);
      setCount(countRef.current);
    },
    [timeline]
  );

  const togglePlay = useCallback(() => {
    if (!timeline) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (countRef.current >= timeline.eventCount) seekCount(0);
    if (!timeline.duration) return;
    setPlaying(true);
  }, [timeline, playing, seekCount]);

  // While playing, keep the caret or highlight on screen. Manual stepping and
  // scrubbing leave the reader's scroll alone.
  useEffect(() => {
    if (!playing) return;
    const marker = markerRef.current;
    if (!marker) return;
    const bounds = marker.getBoundingClientRect();
    if (bounds.bottom > window.innerHeight || bounds.top < 0) {
      marker.scrollIntoView({ block: 'center' });
    }
  }, [count, playing]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement).tagName;
    if (['INPUT', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
    if (event.code === 'Space') {
      event.preventDefault();
      togglePlay();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seekCount(countRef.current - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      seekCount(countRef.current + 1);
    }
  };

  const readPost = () => {
    setPlaying(false);
    setReading(true);
  };

  if (reading) {
    return (
      <div className="reprise">
        <div className="reprise-bar" data-feed="hide">
          <button
            type="button"
            className="reprise-watch"
            onClick={() => setReading(false)}
          >
            <Play size={16} aria-hidden="true" />
            Watch me write it
          </button>
        </div>
        <div className="reprise-rendered">{children}</div>
      </div>
    );
  }

  const readButton = (
    <button type="button" className="reprise-read" onClick={readPost}>
      Just read the post
    </button>
  );

  if (error) {
    return (
      <div className="reprise">
        <div className="reprise-error" role="alert">
          Could not replay this recording: {error}
        </div>
        <div className="reprise-bar">{readButton}</div>
      </div>
    );
  }

  if (!recording || !timeline) {
    return (
      <div className="reprise">
        <div className="reprise-loading" aria-busy="true">
          Loading the writing process…
        </div>
      </div>
    );
  }

  const total = timeline.eventCount;
  const startedAt = Date.parse(recording.document.createdAt);
  // Wall-clock moment of the event just applied (the first event before play).
  const currentAt =
    count > 0
      ? (recording.events[count - 1]?.atMs ?? 0)
      : (recording.events[0]?.atMs ?? 0);
  const current = new Date(startedAt + currentAt);
  const wallClock = current.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const finished = total > 0 && count >= total;
  const speedIndex = SPEEDS.indexOf(speed);
  const state = finished ? BLANK : timeline.stateAfter(count);
  const { location, length } = state.selection;

  return (
    <div className="reprise" onKeyDown={onKeyDown}>
      <div className="reprise-dock">
        <div className="reprise-pill">
          <button
            type="button"
            className="reprise-round reprise-play"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : finished ? 'Replay' : 'Play'}
            title="Space"
            aria-pressed={playing}
          >
            {playing ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} aria-hidden="true" />
            )}
          </button>
          <div className="reprise-timeline">
            <input
              className="reprise-scrub"
              type="range"
              min={0}
              max={Math.max(1, timeline.duration)}
              step={1}
              value={position}
              aria-label="Replay timeline"
              aria-valuetext={formatClock(position)}
              onChange={(e) => seekPosition(Number(e.target.value))}
            />
            <span className="reprise-clock">
              {formatClock(position)} / {formatClock(timeline.duration)}
            </span>
          </div>
          <button
            type="button"
            className="reprise-speed"
            onClick={() => setSpeed(SPEEDS[(speedIndex + 1) % SPEEDS.length])}
            aria-label={`Playback speed, ${speedLabel(speed)}. Press to change.`}
            title="Playback speed"
          >
            {speedLabel(speed)}
          </button>
          {readButton}
        </div>
      </div>
      <div className="reprise-info">
        <time className="reprise-wall" dateTime={current.toISOString()}>
          {wallClock}
        </time>
        <label className="reprise-option">
          <input
            type="checkbox"
            checked={skipIdle}
            onChange={(e) => setSkipIdle(e.target.checked)}
          />
          Skip pauses
        </label>
      </div>

      {finished ? (
        <div className="reprise-rendered">{children}</div>
      ) : count === 0 && !playing ? (
        <div className="reprise-hint">
          <p className="reprise-hint-text">
            Press play to watch the post being typed, or drag the slider to any
            point. Arrow keys step one change at a time.
          </p>
        </div>
      ) : (
        <div
          className="reprise-page"
          role="region"
          aria-label="Replayed document"
          tabIndex={0}
        >
          {/* Manuscript text is always rendered as text nodes, never HTML. */}
          {state.text.slice(0, location)}
          {length ? (
            <mark ref={markerRef as React.RefObject<HTMLElement>}>
              {state.text.slice(location, location + length)}
            </mark>
          ) : (
            <span
              ref={markerRef as React.RefObject<HTMLSpanElement>}
              className="reprise-caret"
              aria-hidden="true"
            />
          )}
          {state.text.slice(location + length)}
        </div>
      )}
    </div>
  );
}
