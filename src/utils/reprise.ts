// TypeScript port of Reprise's v1 reference reducer (Examples/Web/replay.js).
// Positions are UTF-16 code units, which match JavaScript string offsets.

export interface RepriseRange {
  location: number;
  length: number;
}

export type RepriseEventKind = 'edit' | 'selection' | 'key' | 'session';

export type RepriseEditSource =
  | 'typing'
  | 'paste'
  | 'cut'
  | 'undo'
  | 'redo'
  | 'composition'
  | 'drag'
  | 'command'
  | 'cli';

export interface RepriseKey {
  code: number;
  characters: string;
  modifiers: string[];
  isRepeat: boolean;
}

export interface RepriseEvent {
  sequence: number;
  atMs: number;
  kind: RepriseEventKind;
  selection: RepriseRange;
  range?: RepriseRange;
  removed?: string;
  inserted?: string;
  source?: RepriseEditSource;
  key?: RepriseKey;
  session?: 'started' | 'resumed';
}

export interface RepriseRecording {
  format: 'reprise';
  schemaVersion: 1;
  positionEncoding: 'utf-16';
  timeUnit: 'milliseconds';
  document: {
    id: string;
    title: string;
    createdAt: string;
    isSample: boolean;
  };
  initialText: string;
  events: RepriseEvent[];
  finalText: string;
  finalSelection: RepriseRange;
}

/**
 * The `reprise-compact` v1 encoding written by `reprise export --compact`.
 * Same history as RepriseRecording as positional arrays with delta timestamps.
 * See Reprise's Docs/RecordingFormat.md, "Compact encoding".
 */
export interface RepriseCompactRecording {
  f: 'reprise-compact';
  v: 1;
  d: { i: string; t: string; c: string; s?: true };
  /** finalText */
  x: string;
  /** finalSelection as [location, length] */
  xs: [number, number];
  e: unknown[][];
}

export interface RepriseState {
  text: string;
  selection: RepriseRange;
}

/** Pauses longer than this are compressed when idle skipping is on. */
export const IDLE_THRESHOLD_MS = 2000;
/** Each compressed pause plays back for this long. */
export const IDLE_REPLACEMENT_MS = 750;

const CHECKPOINT_INTERVAL = 256;

const EDIT_SOURCES = new Set<string>([
  'typing',
  'paste',
  'cut',
  'undo',
  'redo',
  'composition',
  'drag',
  'command',
  'cli',
]);
const MODIFIERS = new Set<string>([
  'command',
  'shift',
  'option',
  'control',
  'capsLock',
  'function',
]);

const fail = (message: string): never => {
  throw new Error(message);
};

const safe = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

export function rangeValid(
  range: RepriseRange | undefined,
  text: string
): range is RepriseRange {
  if (
    !range ||
    !safe(range.location) ||
    !safe(range.length) ||
    range.location > text.length ||
    range.length > text.length - range.location
  ) {
    return false;
  }
  // Offsets must not split a surrogate pair.
  const boundary = (n: number) =>
    n === 0 ||
    n === text.length ||
    !(text.charCodeAt(n) >= 0xdc00 && text.charCodeAt(n) <= 0xdfff);
  return boundary(range.location) && boundary(range.location + range.length);
}

export function apply(state: RepriseState, event: RepriseEvent): RepriseState {
  let text = state.text;
  if (event.kind === 'edit') {
    const { range, removed, inserted } = event;
    if (
      !rangeValid(range, text) ||
      typeof removed !== 'string' ||
      typeof inserted !== 'string' ||
      text.slice(range.location, range.location + range.length) !== removed
    ) {
      fail(`Edit ${event.sequence} does not match the preceding text.`);
    }
    text =
      text.slice(0, range!.location) +
      inserted +
      text.slice(range!.location + range!.length);
  }
  if (!rangeValid(event.selection, text)) {
    fail(`Invalid selection at event ${event.sequence}.`);
  }
  return { text, selection: { ...event.selection } };
}

const blank = (): RepriseState => ({
  text: '',
  selection: { location: 0, length: 0 },
});

const COMPACT_SOURCES: Record<string, RepriseEditSource> = {
  t: 'typing',
  p: 'paste',
  x: 'cut',
  u: 'undo',
  r: 'redo',
  i: 'composition',
  d: 'drag',
  c: 'command',
  l: 'cli',
};
const COMPACT_MODIFIERS: Record<string, string> = {
  c: 'command',
  s: 'shift',
  o: 'option',
  x: 'control',
  l: 'capsLock',
  f: 'function',
};

export function isCompactRecording(
  data: unknown
): data is RepriseCompactRecording {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { f?: unknown }).f === 'reprise-compact'
  );
}

/** Expands a compact recording into the v1 object form. Shape errors throw. */
export function expandCompact(
  compact: RepriseCompactRecording
): RepriseRecording {
  if (
    compact.v !== 1 ||
    !compact.d ||
    typeof compact.x !== 'string' ||
    !Array.isArray(compact.xs) ||
    compact.xs.length !== 2 ||
    !Array.isArray(compact.e)
  ) {
    fail('Unsupported compact recording format or version.');
  }
  let at = 0;
  const events = compact.e.map((row, index): RepriseEvent => {
    const sequence = index + 1;
    const bad = (): never => fail(`Invalid compact event ${sequence}.`);
    if (!Array.isArray(row) || !safe(row[1])) bad();
    at += row[1] as number;
    const sel = (i: number): RepriseRange =>
      safe(row[i]) && safe(row[i + 1])
        ? { location: row[i] as number, length: row[i + 1] as number }
        : bad();
    const base = { sequence, atMs: at };
    switch (row[0]) {
      case 'e': {
        if (
          row.length < 6 ||
          row.length === 7 ||
          row.length > 9 ||
          typeof row[4] !== 'string' ||
          typeof row[5] !== 'string'
        ) {
          bad();
        }
        const range = sel(2);
        const inserted = row[5] as string;
        const selection =
          row.length >= 8
            ? sel(6)
            : { location: range.location + inserted.length, length: 0 };
        const source =
          row.length === 9 ? COMPACT_SOURCES[row[8] as string] : 'typing';
        if (!source) bad();
        return {
          ...base,
          kind: 'edit',
          range,
          removed: row[4] as string,
          inserted,
          source,
          selection,
        };
      }
      case 's':
        if (row.length !== 4) bad();
        return { ...base, kind: 'selection', selection: sel(2) };
      case 'n': {
        if (row.length !== 5) bad();
        const session =
          row[4] === 's' ? 'started' : row[4] === 'r' ? 'resumed' : bad();
        return { ...base, kind: 'session', selection: sel(2), session };
      }
      case 'k': {
        if (
          row.length < 7 ||
          row.length > 8 ||
          typeof row[5] !== 'string' ||
          typeof row[6] !== 'string' ||
          (row.length === 8 && row[7] !== true)
        ) {
          bad();
        }
        const modifiers = [...(row[6] as string)].map(
          (letter) => COMPACT_MODIFIERS[letter] ?? bad()
        );
        return {
          ...base,
          kind: 'key',
          selection: sel(2),
          key: {
            code: row[4] as number,
            characters: row[5] as string,
            modifiers,
            isRepeat: row.length === 8,
          },
        };
      }
      default:
        return bad();
    }
  });
  return {
    format: 'reprise',
    schemaVersion: 1,
    positionEncoding: 'utf-16',
    timeUnit: 'milliseconds',
    document: {
      id: compact.d.i,
      title: compact.d.t,
      createdAt: compact.d.c,
      isSample: compact.d.s === true,
    },
    initialText: '',
    events,
    finalText: compact.x,
    finalSelection: { location: compact.xs[0], length: compact.xs[1] },
  };
}

/** Accepts either encoding and returns the v1 object form. */
export function normalizeRecording(data: unknown): RepriseRecording {
  return isCompactRecording(data)
    ? expandCompact(data)
    : (data as RepriseRecording);
}

/**
 * Validates a recording and builds a playback clock for it. `times[i]` is the
 * playback time (ms) at which event `i` applies; with `skipIdle` on, each gap
 * longer than IDLE_THRESHOLD_MS is compressed to IDLE_REPLACEMENT_MS.
 */
export class Timeline {
  readonly recording: RepriseRecording;
  readonly times: number[] = [];
  readonly duration: number;
  private readonly checkpoints = new Map<number, RepriseState>([[0, blank()]]);

  constructor(recording: RepriseRecording, skipIdle = true) {
    const r = recording as Partial<RepriseRecording> | null | undefined;
    if (
      !r ||
      r.format !== 'reprise' ||
      r.schemaVersion !== 1 ||
      r.positionEncoding !== 'utf-16' ||
      r.timeUnit !== 'milliseconds' ||
      r.initialText !== ''
    ) {
      fail('Unsupported recording format or version.');
    }
    if (
      !r!.document ||
      typeof r!.document.title !== 'string' ||
      !r!.document.title.trim() ||
      !Number.isFinite(Date.parse(r!.document.createdAt))
    ) {
      fail('Invalid document metadata.');
    }
    if (!Array.isArray(r!.events)) fail('Missing event history.');
    this.recording = recording;

    let state = blank();
    let previous = 0;
    let elapsed = 0;
    recording.events.forEach((event, index) => {
      if (
        event.sequence !== index + 1 ||
        !safe(event.atMs) ||
        event.atMs < previous
      ) {
        fail('Invalid event sequence or timestamp.');
      }
      if (!['edit', 'selection', 'key', 'session'].includes(event.kind)) {
        fail('Unknown event kind.');
      }
      if (event.kind === 'edit' && !EDIT_SOURCES.has(event.source ?? '')) {
        fail('Unknown edit source.');
      }
      if (event.kind === 'key') {
        const k = event.key;
        if (
          !k ||
          !safe(k.code) ||
          k.code > 65535 ||
          typeof k.characters !== 'string' ||
          typeof k.isRepeat !== 'boolean' ||
          !Array.isArray(k.modifiers) ||
          !k.modifiers.every((m) => MODIFIERS.has(m))
        ) {
          fail('Invalid key.');
        }
      }
      if (
        event.kind === 'session' &&
        !['started', 'resumed'].includes(event.session ?? '')
      ) {
        fail('Invalid session.');
      }
      const delta = event.atMs - previous;
      elapsed +=
        skipIdle && delta > IDLE_THRESHOLD_MS ? IDLE_REPLACEMENT_MS : delta;
      this.times.push(elapsed);
      previous = event.atMs;
      state = apply(state, event);
      if ((index + 1) % CHECKPOINT_INTERVAL === 0) {
        this.checkpoints.set(index + 1, state);
      }
    });
    if (
      state.text !== recording.finalText ||
      state.selection.location !== recording.finalSelection?.location ||
      state.selection.length !== recording.finalSelection?.length
    ) {
      fail('Final state does not match the event history.');
    }
    this.duration = elapsed;
  }

  get eventCount(): number {
    return this.times.length;
  }

  /** Number of events whose playback time is <= ms. */
  countAt(ms: number): number {
    let low = 0;
    let high = this.times.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.times[middle] <= ms) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  /** Document state after applying exactly `count` events. */
  stateAfter(count: number): RepriseState {
    count = Math.max(0, Math.min(this.times.length, Math.floor(count)));
    const checkpoint =
      Math.floor(count / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL;
    let state = this.checkpoints.get(checkpoint)!;
    for (let i = checkpoint; i < count; i++) {
      state = apply(state, this.recording.events[i]);
    }
    return state;
  }
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
