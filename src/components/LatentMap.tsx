import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import {
  History,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
  Search,
  SlidersHorizontal,
  Compass,
  Plus,
  Minus,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import embeddingsData from '../data/embeddings.json';
import '../styles/map.css';

type Point = {
  slug: string;
  url: string;
  type: string;
  title: string;
  date: string;
  wordCount: number;
  x: number;
  y: number;
};

type EdgeRaw = { s: number; t: number; w: number };

type Topic = {
  label: string;
  x: number;
  y: number;
  neighbors: { idx: number; sim: number }[];
};

type EmbeddingsFile = {
  generatedAt: string;
  knn: number;
  points: Point[];
  edges: EdgeRaw[];
  topics?: Topic[];
};

type RenderNode = Point & {
  idx: number;
  cx: number;
  cy: number;
  r: number;
  fill: string;
};

type RenderEdge = EdgeRaw & {
  idx: number;
};

type ViewTransform = {
  x: number;
  y: number;
  k: number;
};

type DragGesture = {
  kind: 'drag';
  pointerId: number;
  startX: number;
  startY: number;
  transform: ViewTransform;
  moved: boolean;
};

type PinchGesture = {
  kind: 'pinch';
  pointerIds: [number, number];
  startDist: number;
  startWorldX: number;
  startWorldY: number;
  startK: number;
};

type Gesture = DragGesture | PinchGesture;

type ActivePointer = { x: number; y: number };

type ThemeColors = {
  ink: string;
  inkLight: string;
  accent: string;
  bg: string;
};

type HighlightState = {
  activeIdxs: Set<number>;
  edgeIdxs: number[];
  nodeIdxs: number[];
  topic: Topic | null;
  topicEdges: { idx: number; sim: number }[];
  topicNeighborIdxs: Set<number> | null;
  topicOutlineIdxs: number[];
  hasHighlight: boolean;
};

const PADDING = 60;
const MIN_RADIUS = 3;
const MAX_RADIUS = 11;
const MOBILE_MIN_RADIUS = 1.5;
const MOBILE_MAX_RADIUS = 5;
const MOBILE_BREAKPOINT_PX = 600;
const MOBILE_HIT_PADDING = 12;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
const NODE_HIT_PADDING = 6;
const DRAG_THRESHOLD = 3;
const MOBILE_DRAG_THRESHOLD = 8;
const HOVER_COMMIT_DELAY_MS = 45;
const HOVER_CLEAR_DELAY_MS = 90;
const PINNED_CARD_OFFSET = 12;
const PINNED_CARD_MARGIN = 12;

const TYPE_COLORS: Record<string, string> = {
  posts: '#3b6fb5',
  logs: '#7a5af8',
  til: '#d97706',
  garden: '#15803d',
  projects: '#be185d',
  now: '#525252',
  uses: '#737373',
};

const TYPE_LABELS: Record<string, string> = {
  posts: 'Posts',
  logs: 'Logs',
  til: 'TIL',
  garden: 'Garden',
  projects: 'Projects',
  now: 'Now',
  uses: 'Uses',
};

const LIGHT_THEME: ThemeColors = {
  ink: '#2d3436',
  inkLight: '#636e72',
  accent: '#0984e3',
  bg: '#f4f1e4',
};

const DARK_THEME: ThemeColors = {
  ink: '#cccccc',
  inkLight: '#a8a8a8',
  accent: '#4dabf7',
  bg: '#1c1b17',
};

interface TooltipState {
  point: Point;
  screenX: number;
  screenY: number;
}

interface InnerProps {
  width: number;
  height: number;
  data: EmbeddingsFile;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampFloatingPosition(
  x: number,
  y: number,
  rect: Pick<DOMRect, 'width' | 'height'>
) {
  const maxX = Math.max(
    PINNED_CARD_MARGIN,
    window.innerWidth - rect.width - PINNED_CARD_MARGIN
  );
  const maxY = Math.max(
    PINNED_CARD_MARGIN,
    window.innerHeight - rect.height - PINNED_CARD_MARGIN
  );

  return {
    x: clamp(x, PINNED_CARD_MARGIN, maxX),
    y: clamp(y, PINNED_CARD_MARGIN, maxY),
  };
}

function getPointYear(point: Point) {
  const year = point.date.slice(0, 4);
  return year || 'Unknown';
}

function formatYear(year: string) {
  return year === '1970' ? 'Undated' : year;
}

function formatPointDate(point: Point) {
  if (!point.date || point.date.startsWith('1970-01-01')) return null;
  return point.date.slice(0, 10);
}

function formatPointMetadata(point: Point) {
  const parts = [formatPointDate(point), TYPE_LABELS[point.type] ?? point.type];
  return parts.filter(Boolean).join(' · ');
}

function formatTimestamp(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function getDragThreshold(pointerType: string) {
  return pointerType === 'touch' || pointerType === 'pen'
    ? MOBILE_DRAG_THRESHOLD
    : DRAG_THRESHOLD;
}

function getTouchById(touches: TouchList, id: number) {
  for (let i = 0; i < touches.length; i++) {
    const touch = touches.item(i);
    if (touch?.identifier === id) return touch;
  }
  return null;
}

const DAY_MS = 86400 * 1000;
const PLAY_BASE_DAYS_PER_SEC = 90;
const PLAY_GAP_THRESHOLD_DAYS = 14;
const PLAY_GAP_BUFFER_DAYS = 4;
const FRESH_RECENT_DAYS = 30;
const FRESH_FADE_DAYS = 90;
const FADED_OPACITY = 0.5;

function getThemeColors(): ThemeColors {
  if (document.documentElement.classList.contains('dark')) return DARK_THEME;
  return LIGHT_THEME;
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.floor(width * dpr));
  const pixelHeight = Math.max(1, Math.floor(height * dpr));

  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  return dpr;
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: RenderNode,
  opacity: number,
  stroke: string | null,
  strokeWidth = 1.5,
  radiusOffset = 0
) {
  drawCircle(ctx, node.cx, node.cy, node.r + radiusOffset);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = node.fill;
  ctx.fill();

  if (stroke) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function drawTopic(
  ctx: CanvasRenderingContext2D,
  topic: Topic,
  theme: ThemeColors,
  xScale: (value: number) => number,
  yScale: (value: number) => number
) {
  const x = xScale(topic.x);
  const y = yScale(topic.y);

  drawCircle(ctx, x, y, 14);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.accent;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = theme.bg;
  ctx.lineWidth = 4;
  ctx.strokeText(topic.label, x, y - 22);
  ctx.fillStyle = theme.ink;
  ctx.fillText(topic.label, x, y - 22);
}

function drawMap({
  canvas,
  width,
  height,
  nodes,
  visibleNodes,
  visibleEdges,
  edgesByIdx,
  highlightState,
  transform,
  xScale,
  yScale,
  nodeOpacityById,
}: {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  nodes: RenderNode[];
  visibleNodes: RenderNode[];
  visibleEdges: RenderEdge[];
  edgesByIdx: RenderEdge[];
  highlightState: HighlightState;
  transform: ViewTransform;
  xScale: (value: number) => number;
  yScale: (value: number) => number;
  nodeOpacityById: Map<number, number> | null;
}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = resizeCanvas(canvas, width, height);
  const theme = getThemeColors();
  const baseOpacity = highlightState.hasHighlight ? 0.18 : 1;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.k, transform.k);
  ctx.lineCap = 'round';

  ctx.beginPath();
  for (const edge of visibleEdges) {
    const a = nodes[edge.s];
    const b = nodes[edge.t];
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
  }
  ctx.globalAlpha = 0.18 * baseOpacity;
  ctx.strokeStyle = theme.inkLight;
  ctx.lineWidth = 0.4;
  ctx.stroke();

  for (const node of visibleNodes) {
    const mult = nodeOpacityById?.get(node.idx) ?? 1;
    drawNode(ctx, node, 0.9 * baseOpacity * mult, null);
  }

  if (highlightState.topic && highlightState.topicEdges.length > 0) {
    for (const topicEdge of highlightState.topicEdges) {
      const node = nodes[topicEdge.idx];
      ctx.beginPath();
      ctx.moveTo(
        xScale(highlightState.topic.x),
        yScale(highlightState.topic.y)
      );
      ctx.lineTo(node.cx, node.cy);
      ctx.globalAlpha = 0.3 + topicEdge.sim * 0.5;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1 + topicEdge.sim * 1.5;
      ctx.stroke();
    }
  }

  if (highlightState.edgeIdxs.length > 0) {
    ctx.beginPath();
    for (const edgeIdx of highlightState.edgeIdxs) {
      const edge = edgesByIdx[edgeIdx];
      if (!edge) continue;
      const a = nodes[edge.s];
      const b = nodes[edge.t];
      ctx.moveTo(a.cx, a.cy);
      ctx.lineTo(b.cx, b.cy);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const idx of highlightState.topicOutlineIdxs) {
    const node = nodes[idx];
    drawCircle(ctx, node.cx, node.cy, node.r + 1);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  for (const idx of highlightState.nodeIdxs) {
    const node = nodes[idx];
    const isActive = highlightState.activeIdxs.has(idx);
    const inTopic = highlightState.topicNeighborIdxs?.has(idx) ?? false;
    const mult = nodeOpacityById?.get(idx) ?? 1;
    drawNode(
      ctx,
      node,
      0.94 * mult,
      isActive ? theme.ink : inTopic ? theme.accent : null,
      1.5,
      isActive ? 2 : 0
    );
  }

  if (highlightState.topic) {
    drawTopic(ctx, highlightState.topic, theme, xScale, yScale);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function findNodeAt({
  nodes,
  transform,
  clientX,
  clientY,
  rect,
  hitPadding,
}: {
  nodes: RenderNode[];
  transform: ViewTransform;
  clientX: number;
  clientY: number;
  rect: DOMRect;
  hitPadding: number;
}) {
  const worldX = (clientX - rect.left - transform.x) / transform.k;
  const worldY = (clientY - rect.top - transform.y) / transform.k;
  let hit: RenderNode | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const dx = worldX - node.cx;
    const dy = worldY - node.cy;
    const distance = dx * dx + dy * dy;
    const hitRadius = node.r + hitPadding / transform.k;

    if (distance <= hitRadius * hitRadius && distance < bestDistance) {
      bestDistance = distance;
      hit = node;
    }
  }

  return hit;
}

function MapInner({ width, height, data }: InnerProps) {
  const points = data.points;
  const edges = data.edges;
  const topics = data.topics ?? [];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<ViewTransform>({ x: 0, y: 0, k: 1 });
  const drawFrameRef = useRef<number | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const activePointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const lastTouchTimeRef = useRef(0);
  const hoverIdxRef = useRef<number | null>(null);
  const hoverCommitTimeoutRef = useRef<number | null>(null);
  const hoverClearTimeoutRef = useRef<number | null>(null);
  const hoverCandidateRef = useRef<{
    idx: number;
    point: RenderNode;
    screenX: number;
    screenY: number;
  } | null>(null);
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipFrameRef = useRef<number | null>(null);
  const tooltipPositionRef = useRef({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedAt, setSelectedAt] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selectedCardPosition, setSelectedCardPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [topicIdx, setTopicIdx] = useState<number | null>(null);
  const [explorePanel, setExplorePanel] = useState<
    'search' | 'topics' | 'filters' | null
  >(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomPercent, setZoomPercent] = useState(100);
  const exploreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(() => new Set());
  const [hiddenYears, setHiddenYears] = useState<Set<string>>(() => new Set());
  const [timelineActive, setTimelineActive] = useState(false);
  const [cursorTime, setCursorTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1);
  const playFrameRef = useRef<number | null>(null);
  const lastPlayFrameTimeRef = useRef<number | null>(null);

  const { xScale, yScale, nodes, renderEdges, presentTypes, presentYears } =
    useMemo(() => {
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const lws = points.map((p) => Math.log(p.wordCount + 1));
      const xScale = scaleLinear<number>({
        domain: [Math.min(...xs), Math.max(...xs)],
        range: [PADDING, width - PADDING],
      });
      const yScale = scaleLinear<number>({
        domain: [Math.min(...ys), Math.max(...ys)],
        range: [
          PADDING,
          Math.max(
            PADDING + 1,
            height - (width < MOBILE_BREAKPOINT_PX ? 160 : PADDING)
          ),
        ],
      });
      const isMobile = width < MOBILE_BREAKPOINT_PX;
      const sizeScale = scaleLinear<number>({
        domain: [Math.min(...lws), Math.max(...lws)],
        range: isMobile
          ? [MOBILE_MIN_RADIUS, MOBILE_MAX_RADIUS]
          : [MIN_RADIUS, MAX_RADIUS],
      });
      const nodes = points.map((point, idx): RenderNode => ({
        ...point,
        idx,
        cx: xScale(point.x),
        cy: yScale(point.y),
        r: sizeScale(Math.log(point.wordCount + 1)),
        fill: TYPE_COLORS[point.type] ?? '#555',
      }));
      const renderEdges = edges.map((edge, idx): RenderEdge => ({
        ...edge,
        idx,
      }));
      const presentTypes = Array.from(
        new Set(points.map((point) => point.type))
      ).sort((a, b) =>
        (TYPE_LABELS[a] ?? a).localeCompare(TYPE_LABELS[b] ?? b)
      );
      const presentYears = Array.from(new Set(points.map(getPointYear))).sort(
        (a, b) => {
          const yearA = Number(a);
          const yearB = Number(b);
          if (Number.isNaN(yearA) && Number.isNaN(yearB)) {
            return a.localeCompare(b);
          }
          if (Number.isNaN(yearA)) return 1;
          if (Number.isNaN(yearB)) return -1;
          return yearB - yearA;
        }
      );

      return {
        xScale,
        yScale,
        nodes,
        renderEdges,
        presentTypes,
        presentYears,
      };
    }, [points, edges, width, height]);

  const { timelineStart, timelineEnd, sortedPostTimes, nodeTimes } =
    useMemo(() => {
      const dated: { idx: number; time: number }[] = [];
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (!point.date || point.date.startsWith('1970-01-01')) continue;
        const t = new Date(point.date).getTime();
        if (Number.isFinite(t))
          dated.push({ idx: i, time: Math.floor(t / DAY_MS) * DAY_MS });
      }
      dated.sort((a, b) => a.time - b.time);
      const sortedTimes = dated.map((d) => d.time);
      const map = new Map<number, number>();
      for (const d of dated) map.set(d.idx, d.time);
      const lastPost = sortedTimes[sortedTimes.length - 1];
      const now = Date.now();
      return {
        timelineStart: sortedTimes[0] ?? now,
        timelineEnd: lastPost ?? now,
        sortedPostTimes: sortedTimes,
        nodeTimes: map,
      };
    }, [points]);

  const {
    visibleNodes,
    visibleEdges,
    visibleNodeIdxs,
    visibleEdgeIdxs,
    visibleIncidentEdges,
  } = useMemo(() => {
    const visibleNodeIdxs = new Set<number>();
    const visibleNodes: RenderNode[] = [];

    const useTimelineFilter = timelineActive && cursorTime != null;
    for (const node of nodes) {
      if (hiddenTypes.has(node.type)) continue;
      if (hiddenYears.has(getPointYear(node))) continue;
      if (useTimelineFilter) {
        const t = nodeTimes.get(node.idx);
        if (t == null || t > cursorTime) continue;
      }
      visibleNodeIdxs.add(node.idx);
      visibleNodes.push(node);
    }

    const visibleEdgeIdxs = new Set<number>();
    const visibleEdges: RenderEdge[] = [];
    const visibleIncidentEdges = points.map(() => [] as number[]);

    for (const edge of renderEdges) {
      if (!visibleNodeIdxs.has(edge.s) || !visibleNodeIdxs.has(edge.t)) {
        continue;
      }
      visibleEdgeIdxs.add(edge.idx);
      visibleEdges.push(edge);
      visibleIncidentEdges[edge.s]?.push(edge.idx);
      visibleIncidentEdges[edge.t]?.push(edge.idx);
    }

    return {
      visibleNodes,
      visibleEdges,
      visibleNodeIdxs,
      visibleEdgeIdxs,
      visibleIncidentEdges,
    };
  }, [
    hiddenTypes,
    hiddenYears,
    nodes,
    points,
    renderEdges,
    timelineActive,
    cursorTime,
    nodeTimes,
  ]);

  const filteredPostTimes = useMemo(
    () =>
      points
        .flatMap((point, idx) => {
          const time = nodeTimes.get(idx);
          return time != null &&
            !hiddenTypes.has(point.type) &&
            !hiddenYears.has(getPointYear(point))
            ? [time]
            : [];
        })
        .sort((a, b) => a - b),
    [points, nodeTimes, hiddenTypes, hiddenYears]
  );

  const nodeOpacityById = useMemo(() => {
    if (!timelineActive || cursorTime == null) return null;
    const recentMs = FRESH_RECENT_DAYS * DAY_MS;
    const fadeMs = FRESH_FADE_DAYS * DAY_MS;
    const map = new Map<number, number>();
    for (const node of visibleNodes) {
      const t = nodeTimes.get(node.idx);
      if (t == null) continue;
      const age = cursorTime - t;
      let opacity = 1;
      if (age >= fadeMs) opacity = FADED_OPACITY;
      else if (age > recentMs) {
        const u = (age - recentMs) / (fadeMs - recentMs);
        opacity = 1 - u * (1 - FADED_OPACITY);
      }
      map.set(node.idx, opacity);
    }
    return map;
  }, [timelineActive, cursorTime, visibleNodes, nodeTimes]);

  const focusIdxs = useMemo(() => {
    const idxs: number[] = [];
    if (selectedIdx != null && visibleNodeIdxs.has(selectedIdx)) {
      idxs.push(selectedIdx);
    }
    if (
      hoverIdx != null &&
      hoverIdx !== selectedIdx &&
      visibleNodeIdxs.has(hoverIdx)
    ) {
      idxs.push(hoverIdx);
    }
    return idxs;
  }, [selectedIdx, hoverIdx, visibleNodeIdxs]);

  const highlightState = useMemo((): HighlightState => {
    const activeIdxs = new Set(focusIdxs);
    const nodeIdxSet = new Set<number>();
    const edgeIdxSet = new Set<number>();
    const topic = topicIdx != null ? (topics[topicIdx] ?? null) : null;
    const topicNeighborIdxs = topic
      ? new Set(
          topic.neighbors
            .filter((neighbor) => visibleNodeIdxs.has(neighbor.idx))
            .map((neighbor) => neighbor.idx)
        )
      : null;
    const topicEdges = topic
      ? topic.neighbors
          .filter((neighbor) => visibleNodeIdxs.has(neighbor.idx))
          .map((neighbor) => ({
            idx: neighbor.idx,
            sim: neighbor.sim,
          }))
      : [];

    if (focusIdxs.length > 0) {
      for (const idx of focusIdxs) {
        nodeIdxSet.add(idx);
        for (const edgeIdx of visibleIncidentEdges[idx] ?? []) {
          const edge = renderEdges[edgeIdx];
          if (!edge || !visibleEdgeIdxs.has(edgeIdx)) continue;
          edgeIdxSet.add(edgeIdx);
          if (visibleNodeIdxs.has(edge.s)) nodeIdxSet.add(edge.s);
          if (visibleNodeIdxs.has(edge.t)) nodeIdxSet.add(edge.t);
        }
      }
    } else if (topicNeighborIdxs) {
      for (const idx of topicNeighborIdxs) nodeIdxSet.add(idx);
    }

    const nodeIdxs = Array.from(nodeIdxSet);
    const topicOutlineIdxs = topicNeighborIdxs
      ? Array.from(topicNeighborIdxs).filter((idx) => !nodeIdxSet.has(idx))
      : [];

    return {
      activeIdxs,
      edgeIdxs: Array.from(edgeIdxSet),
      nodeIdxs,
      topic,
      topicEdges,
      topicNeighborIdxs,
      topicOutlineIdxs,
      hasHighlight: nodeIdxs.length > 0 || topic != null,
    };
  }, [
    focusIdxs,
    renderEdges,
    topicIdx,
    topics,
    visibleEdgeIdxs,
    visibleIncidentEdges,
    visibleNodeIdxs,
  ]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawMap({
      canvas,
      width,
      height,
      nodes,
      visibleNodes,
      visibleEdges,
      edgesByIdx: renderEdges,
      highlightState,
      transform: transformRef.current,
      xScale,
      yScale,
      nodeOpacityById,
    });
    setZoomPercent(Math.round(transformRef.current.k * 100));
  }, [
    height,
    highlightState,
    nodes,
    nodeOpacityById,
    renderEdges,
    visibleEdges,
    visibleNodes,
    width,
    xScale,
    yScale,
  ]);

  const drawRef = useRef(draw);
  useLayoutEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  const scheduleDraw = useCallback(() => {
    if (drawFrameRef.current != null) return;

    drawFrameRef.current = window.requestAnimationFrame(() => {
      drawFrameRef.current = null;
      drawRef.current();
    });
  }, []);

  const moveTooltip = useCallback((screenX: number, screenY: number) => {
    tooltipPositionRef.current = { x: screenX + 12, y: screenY + 12 };
    if (tooltipFrameRef.current != null) return;

    tooltipFrameRef.current = window.requestAnimationFrame(() => {
      tooltipFrameRef.current = null;
      const tooltipEl = tooltipRef.current;
      if (!tooltipEl) return;
      const { x, y } = tooltipPositionRef.current;
      const position = clampFloatingPosition(
        x,
        y,
        tooltipEl.getBoundingClientRect()
      );
      tooltipEl.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    });
  }, []);

  const cancelHoverCommit = useCallback(() => {
    if (hoverCommitTimeoutRef.current == null) return;
    window.clearTimeout(hoverCommitTimeoutRef.current);
    hoverCommitTimeoutRef.current = null;
  }, []);

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimeoutRef.current == null) return;
    window.clearTimeout(hoverClearTimeoutRef.current);
    hoverClearTimeoutRef.current = null;
  }, []);

  const clearHover = useCallback(() => {
    cancelHoverCommit();
    cancelHoverClear();
    hoverCandidateRef.current = null;
    hoverIdxRef.current = null;
    setHoverIdx(null);
    setTooltip(null);
  }, [cancelHoverClear, cancelHoverCommit]);

  const commitHover = useCallback(
    (point: RenderNode, screenX: number, screenY: number) => {
      cancelHoverClear();
      hoverCandidateRef.current = null;
      hoverIdxRef.current = point.idx;
      setHoverIdx(point.idx);
      setTooltip({ point, screenX, screenY });
      moveTooltip(screenX, screenY);
    },
    [cancelHoverClear, moveTooltip]
  );

  const scheduleHoverClear = useCallback(() => {
    hoverCandidateRef.current = null;
    cancelHoverCommit();
    if (hoverIdxRef.current == null || hoverClearTimeoutRef.current != null) {
      return;
    }

    hoverClearTimeoutRef.current = window.setTimeout(() => {
      hoverClearTimeoutRef.current = null;
      hoverIdxRef.current = null;
      setHoverIdx(null);
      setTooltip(null);
    }, HOVER_CLEAR_DELAY_MS);
  }, [cancelHoverCommit]);

  const scheduleHoverCommit = useCallback(
    (point: RenderNode, screenX: number, screenY: number) => {
      cancelHoverClear();
      moveTooltip(screenX, screenY);

      if (hoverIdxRef.current === point.idx) {
        cancelHoverCommit();
        hoverCandidateRef.current = null;
        return;
      }

      const previousCandidate = hoverCandidateRef.current;
      hoverCandidateRef.current = {
        idx: point.idx,
        point,
        screenX,
        screenY,
      };

      if (
        hoverCommitTimeoutRef.current != null &&
        previousCandidate?.idx === point.idx
      ) {
        return;
      }

      cancelHoverCommit();

      hoverCommitTimeoutRef.current = window.setTimeout(() => {
        hoverCommitTimeoutRef.current = null;
        const candidate = hoverCandidateRef.current;
        if (!candidate) return;
        commitHover(candidate.point, candidate.screenX, candidate.screenY);
      }, HOVER_COMMIT_DELAY_MS);
    },
    [cancelHoverClear, cancelHoverCommit, commitHover, moveTooltip]
  );

  const hitPadding =
    width < MOBILE_BREAKPOINT_PX ? MOBILE_HIT_PADDING : NODE_HIT_PADDING;

  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const hit = findNodeAt({
        nodes: visibleNodes,
        transform: transformRef.current,
        clientX,
        clientY,
        rect: canvas.getBoundingClientRect(),
        hitPadding,
      });

      if (!hit) {
        scheduleHoverClear();
        return;
      }

      scheduleHoverCommit(hit, clientX, clientY);
    },
    [hitPadding, scheduleHoverClear, scheduleHoverCommit, visibleNodes]
  );

  const clearSelection = useCallback(() => {
    setSelectedIdx(null);
    setSelectedAt(null);
    setSelectedCardPosition(null);
    setTopicIdx(null);
  }, []);

  const clearHighlight = useCallback(() => {
    setSelectedIdx(null);
    setSelectedAt(null);
    setSelectedCardPosition(null);
    setTopicIdx(null);
    clearHover();
  }, [clearHover]);

  const toggleHiddenType = useCallback((type: string) => {
    setPlaying(false);
    setHiddenTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleHiddenYear = useCallback((year: string) => {
    setPlaying(false);
    setHiddenYears((current) => {
      const next = new Set(current);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }, []);

  const showAllTypes = useCallback(() => {
    setPlaying(false);
    setHiddenTypes(new Set());
  }, []);

  const showAllYears = useCallback(() => {
    setPlaying(false);
    setHiddenYears(new Set());
  }, []);

  const hideAllTypes = useCallback(() => {
    setPlaying(false);
    setHiddenTypes(new Set(presentTypes));
  }, [presentTypes]);

  const hideAllYears = useCallback(() => {
    setPlaying(false);
    setHiddenYears(new Set(presentYears));
  }, [presentYears]);

  const selectAt = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const hit = findNodeAt({
        nodes: visibleNodes,
        transform: transformRef.current,
        clientX,
        clientY,
        rect,
        hitPadding,
      });

      if (timelineActive) setPlaying(false);

      if (hit) {
        setSelectedIdx(hit.idx);
        setSelectedAt({ x: clientX, y: clientY });
        setSelectedCardPosition({
          x: clientX + PINNED_CARD_OFFSET,
          y: clientY + PINNED_CARD_OFFSET,
        });
      } else {
        clearSelection();
      }
    },
    [clearSelection, hitPadding, timelineActive, visibleNodes]
  );

  const startPinch = useCallback(
    (pointerIds: [number, number], rect: DOMRect): PinchGesture | null => {
      const pointers = activePointersRef.current;
      const a = pointers.get(pointerIds[0]);
      const b = pointers.get(pointerIds[1]);
      if (!a || !b) return null;
      const midCanvasX = (a.x + b.x) / 2 - rect.left;
      const midCanvasY = (a.y + b.y) / 2 - rect.top;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist === 0) return null;
      const transform = transformRef.current;
      return {
        kind: 'pinch',
        pointerIds,
        startDist: dist,
        startWorldX: (midCanvasX - transform.x) / transform.k,
        startWorldY: (midCanvasY - transform.y) / transform.k,
        startK: transform.k,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === 'touch') return;
      if (
        event.pointerType === 'mouse' &&
        Date.now() - lastTouchTimeRef.current < 700
      ) {
        return;
      }
      if (event.button !== 0 && event.pointerType === 'mouse') return;

      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some Safari builds expose pointer events without reliable capture.
      }

      const pointers = activePointersRef.current;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const ids = Array.from(pointers.keys());

      if (ids.length === 1) {
        gestureRef.current = {
          kind: 'drag',
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          transform: { ...transformRef.current },
          moved: false,
        };
        setIsDragging(true);
        return;
      }

      if (ids.length === 2) {
        const rect = event.currentTarget.getBoundingClientRect();
        const pinch = startPinch(ids.slice(0, 2) as [number, number], rect);
        if (pinch) {
          gestureRef.current = pinch;
          setIsDragging(true);
          clearHover();
        }
      }
    },
    [clearHover, startPinch]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const pointers = activePointersRef.current;

      if (pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      const gesture = gestureRef.current;

      if (gesture?.kind === 'drag' && gesture.pointerId === event.pointerId) {
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;

        if (
          !gesture.moved &&
          Math.hypot(dx, dy) >= getDragThreshold(event.pointerType)
        ) {
          gesture.moved = true;
          clearHover();
        }

        if (!gesture.moved) return;

        transformRef.current = {
          x: gesture.transform.x + dx,
          y: gesture.transform.y + dy,
          k: gesture.transform.k,
        };
        scheduleDraw();
        return;
      }

      if (gesture?.kind === 'pinch') {
        const a = pointers.get(gesture.pointerIds[0]);
        const b = pointers.get(gesture.pointerIds[1]);
        if (!a || !b) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const midCanvasX = (a.x + b.x) / 2 - rect.left;
        const midCanvasY = (a.y + b.y) / 2 - rect.top;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist === 0) return;
        const ratio = dist / gesture.startDist;
        const nextK = clamp(gesture.startK * ratio, MIN_ZOOM, MAX_ZOOM);
        transformRef.current = {
          x: midCanvasX - gesture.startWorldX * nextK,
          y: midCanvasY - gesture.startWorldY * nextK,
          k: nextK,
        };
        scheduleDraw();
        return;
      }

      if (pointers.size === 0) {
        updateHover(event.clientX, event.clientY);
      }
    },
    [clearHover, scheduleDraw, updateHover]
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const pointers = activePointersRef.current;
      if (!pointers.has(event.pointerId)) return;

      pointers.delete(event.pointerId);
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Pointer capture may be unavailable after touch cancellation in Safari.
      }

      const gesture = gestureRef.current;

      if (gesture?.kind === 'pinch') {
        const remainingIds = Array.from(pointers.keys());
        if (remainingIds.length >= 2) {
          const rect = event.currentTarget.getBoundingClientRect();
          const pinch = startPinch(
            remainingIds.slice(0, 2) as [number, number],
            rect
          );
          if (pinch) gestureRef.current = pinch;
          return;
        }
        if (remainingIds.length === 1) {
          const remainingId = remainingIds[0];
          const rem = pointers.get(remainingId);
          if (rem) {
            gestureRef.current = {
              kind: 'drag',
              pointerId: remainingId,
              startX: rem.x,
              startY: rem.y,
              transform: { ...transformRef.current },
              moved: true,
            };
          } else {
            gestureRef.current = null;
          }
          return;
        }
        gestureRef.current = null;
        setIsDragging(false);
        scheduleDraw();
        return;
      }

      if (gesture?.kind === 'drag' && gesture.pointerId === event.pointerId) {
        gestureRef.current = null;
        setIsDragging(false);

        if (gesture.moved) {
          scheduleDraw();
          return;
        }

        selectAt(
          event.clientX,
          event.clientY,
          event.currentTarget.getBoundingClientRect()
        );
      }
    },
    [scheduleDraw, selectAt, startPinch]
  );

  const handlePointerLeave = useCallback(() => {
    if (gestureRef.current) return;
    clearHover();
  }, [clearHover]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchDefault = (event: TouchEvent) => {
      lastTouchTimeRef.current = Date.now();
      if (event.cancelable) event.preventDefault();
    };

    const syncActiveTouches = (touches: TouchList) => {
      const pointers = activePointersRef.current;
      pointers.clear();
      for (let i = 0; i < touches.length; i++) {
        const touch = touches.item(i);
        if (!touch) continue;
        pointers.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
        });
      }
      return pointers;
    };

    const handleTouchStart = (event: TouchEvent) => {
      preventTouchDefault(event);
      const pointers = syncActiveTouches(event.touches);
      const ids = Array.from(pointers.keys());

      if (ids.length === 1) {
        const touch = getTouchById(event.touches, ids[0]);
        if (!touch) return;
        gestureRef.current = {
          kind: 'drag',
          pointerId: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          transform: { ...transformRef.current },
          moved: false,
        };
        setIsDragging(true);
        return;
      }

      if (ids.length >= 2) {
        const pinch = startPinch(
          ids.slice(0, 2) as [number, number],
          canvas.getBoundingClientRect()
        );
        if (pinch) {
          gestureRef.current = pinch;
          setIsDragging(true);
          clearHover();
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      preventTouchDefault(event);
      const pointers = syncActiveTouches(event.touches);
      const gesture = gestureRef.current;

      if (gesture?.kind === 'drag') {
        const touch = getTouchById(event.touches, gesture.pointerId);
        if (!touch) return;

        const dx = touch.clientX - gesture.startX;
        const dy = touch.clientY - gesture.startY;

        if (!gesture.moved && Math.hypot(dx, dy) >= getDragThreshold('touch')) {
          gesture.moved = true;
          clearHover();
        }

        if (!gesture.moved) return;

        transformRef.current = {
          x: gesture.transform.x + dx,
          y: gesture.transform.y + dy,
          k: gesture.transform.k,
        };
        scheduleDraw();
        return;
      }

      if (gesture?.kind === 'pinch') {
        const a = pointers.get(gesture.pointerIds[0]);
        const b = pointers.get(gesture.pointerIds[1]);
        if (!a || !b) return;

        const rect = canvas.getBoundingClientRect();
        const midCanvasX = (a.x + b.x) / 2 - rect.left;
        const midCanvasY = (a.y + b.y) / 2 - rect.top;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist === 0) return;

        const ratio = dist / gesture.startDist;
        const nextK = clamp(gesture.startK * ratio, MIN_ZOOM, MAX_ZOOM);
        transformRef.current = {
          x: midCanvasX - gesture.startWorldX * nextK,
          y: midCanvasY - gesture.startWorldY * nextK,
          k: nextK,
        };
        scheduleDraw();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      preventTouchDefault(event);
      const gesture = gestureRef.current;
      const endedTouch =
        gesture?.kind === 'drag'
          ? getTouchById(event.changedTouches, gesture.pointerId)
          : null;
      const pointers = syncActiveTouches(event.touches);

      if (gesture?.kind === 'pinch') {
        const remainingIds = Array.from(pointers.keys());
        if (remainingIds.length >= 2) {
          const pinch = startPinch(
            remainingIds.slice(0, 2) as [number, number],
            canvas.getBoundingClientRect()
          );
          if (pinch) gestureRef.current = pinch;
          return;
        }

        if (remainingIds.length === 1) {
          const remainingId = remainingIds[0];
          const rem = pointers.get(remainingId);
          if (rem) {
            gestureRef.current = {
              kind: 'drag',
              pointerId: remainingId,
              startX: rem.x,
              startY: rem.y,
              transform: { ...transformRef.current },
              moved: true,
            };
          } else {
            gestureRef.current = null;
          }
          return;
        }

        gestureRef.current = null;
        setIsDragging(false);
        scheduleDraw();
        return;
      }

      if (gesture?.kind === 'drag') {
        gestureRef.current = null;
        setIsDragging(false);

        if (gesture.moved) {
          scheduleDraw();
          return;
        }

        selectAt(
          endedTouch?.clientX ?? gesture.startX,
          endedTouch?.clientY ?? gesture.startY,
          canvas.getBoundingClientRect()
        );
        return;
      }

      if (event.touches.length === 0) {
        gestureRef.current = null;
        setIsDragging(false);
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [clearHover, scheduleDraw, selectAt, startPinch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const current = transformRef.current;
      const nextK = clamp(
        current.k * Math.exp(-event.deltaY * 0.001),
        MIN_ZOOM,
        MAX_ZOOM
      );
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const worldX = (pointerX - current.x) / current.k;
      const worldY = (pointerY - current.y) / current.k;

      transformRef.current = {
        x: pointerX - worldX * nextK,
        y: pointerY - worldY * nextK,
        k: nextK,
      };

      scheduleDraw();
      updateHover(event.clientX, event.clientY);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [scheduleDraw, updateHover]);

  useEffect(() => {
    scheduleDraw();
  }, [draw, scheduleDraw]);

  useEffect(() => {
    const observer = new MutationObserver(scheduleDraw);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [scheduleDraw]);

  useEffect(() => {
    if (!timelineActive || !playing) {
      if (playFrameRef.current != null) {
        cancelAnimationFrame(playFrameRef.current);
        playFrameRef.current = null;
      }
      lastPlayFrameTimeRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const last = lastPlayFrameTimeRef.current ?? now;
      const dt = Math.min(0.1, (now - last) / 1000);
      lastPlayFrameTimeRef.current = now;

      setCursorTime((prev) => {
        const cur = prev ?? timelineStart;
        const advanceMs = PLAY_BASE_DAYS_PER_SEC * playSpeed * dt * DAY_MS;
        let next = cur + advanceMs;

        let lo = 0;
        let hi = filteredPostTimes.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (filteredPostTimes[mid] <= cur) lo = mid + 1;
          else hi = mid;
        }
        const nextPost = filteredPostTimes[lo];
        if (nextPost != null) {
          const gap = nextPost - cur;
          if (gap > PLAY_GAP_THRESHOLD_DAYS * DAY_MS) {
            const target = nextPost - PLAY_GAP_BUFFER_DAYS * DAY_MS;
            if (target > next) next = target;
          }
        }

        if (next >= timelineEnd) {
          setPlaying(false);
          return timelineEnd;
        }
        return next;
      });

      playFrameRef.current = requestAnimationFrame(tick);
    };

    playFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (playFrameRef.current != null) {
        cancelAnimationFrame(playFrameRef.current);
        playFrameRef.current = null;
      }
      lastPlayFrameTimeRef.current = null;
    };
  }, [
    timelineActive,
    playing,
    playSpeed,
    timelineStart,
    timelineEnd,
    filteredPostTimes,
  ]);

  const openTimeline = useCallback(() => {
    setTimelineActive(true);
    setCursorTime((prev) => prev ?? timelineStart);
    setSelectedIdx(null);
    setSelectedAt(null);
    setSelectedCardPosition(null);
    setTopicIdx(null);
    clearHover();
  }, [clearHover, timelineStart]);

  const closeTimeline = useCallback(() => {
    setTimelineActive(false);
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev;
      if (next) {
        setCursorTime((curr) => {
          if (curr == null || curr >= timelineEnd) return timelineStart;
          return curr;
        });
      }
      return next;
    });
  }, [timelineEnd, timelineStart]);

  const stepPrev = useCallback(() => {
    if (filteredPostTimes.length === 0) return;
    setPlaying(false);
    setCursorTime((curr) => {
      const cur = curr ?? timelineStart;
      let lo = 0;
      let hi = filteredPostTimes.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (filteredPostTimes[mid] < cur) lo = mid + 1;
        else hi = mid;
      }
      const idx = lo - 1;
      if (idx < 0) return timelineStart;
      return filteredPostTimes[idx];
    });
  }, [filteredPostTimes, timelineStart]);

  const stepNext = useCallback(() => {
    if (filteredPostTimes.length === 0) return;
    setPlaying(false);
    setCursorTime((curr) => {
      const cur = curr ?? timelineStart;
      let lo = 0;
      let hi = filteredPostTimes.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (filteredPostTimes[mid] <= cur) lo = mid + 1;
        else hi = mid;
      }
      if (lo >= filteredPostTimes.length) return timelineEnd;
      return filteredPostTimes[lo];
    });
  }, [filteredPostTimes, timelineEnd, timelineStart]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedIdx != null) {
          clearSelection();
          canvasRef.current?.focus({ preventScroll: true });
          return;
        }
        if (explorePanel) {
          setExplorePanel(null);
          exploreTriggerRef.current?.focus();
          return;
        }
        if (timelineActive) {
          setTimelineActive(false);
          setPlaying(false);
          return;
        }
        clearHighlight();
        return;
      }

      if (
        !timelineActive ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      if (event.key === 'ArrowLeft') stepPrev();
      else stepNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clearHighlight,
    clearSelection,
    selectedIdx,
    explorePanel,
    stepNext,
    stepPrev,
    timelineActive,
  ]);

  const updateSelectedCardPosition = useCallback(() => {
    if (!selectedAt || !selectedCardRef.current) return;

    const nextPosition = clampFloatingPosition(
      selectedAt.x + PINNED_CARD_OFFSET,
      selectedAt.y + PINNED_CARD_OFFSET,
      selectedCardRef.current.getBoundingClientRect()
    );

    setSelectedCardPosition((current) => {
      if (
        current &&
        Math.abs(current.x - nextPosition.x) < 0.5 &&
        Math.abs(current.y - nextPosition.y) < 0.5
      ) {
        return current;
      }
      return nextPosition;
    });
  }, [selectedAt]);

  useLayoutEffect(() => {
    updateSelectedCardPosition();
    selectedCardRef.current?.focus({ preventScroll: true });
  }, [selectedIdx, updateSelectedCardPosition]);

  useEffect(() => {
    if (!selectedAt) return;

    window.addEventListener('resize', updateSelectedCardPosition);
    return () =>
      window.removeEventListener('resize', updateSelectedCardPosition);
  }, [selectedAt, updateSelectedCardPosition]);

  useEffect(() => {
    if (selectedIdx != null && !visibleNodeIdxs.has(selectedIdx)) {
      setSelectedIdx(null);
      setSelectedAt(null);
      setSelectedCardPosition(null);
    }

    if (
      hoverIdxRef.current != null &&
      !visibleNodeIdxs.has(hoverIdxRef.current)
    ) {
      clearHover();
    }
  }, [clearHover, selectedIdx, visibleNodeIdxs]);

  useEffect(() => {
    return () => {
      if (drawFrameRef.current != null) {
        window.cancelAnimationFrame(drawFrameRef.current);
      }
      if (tooltipFrameRef.current != null) {
        window.cancelAnimationFrame(tooltipFrameRef.current);
      }
      if (playFrameRef.current != null) {
        window.cancelAnimationFrame(playFrameRef.current);
      }
      if (hoverCommitTimeoutRef.current != null) {
        window.clearTimeout(hoverCommitTimeoutRef.current);
      }
      if (hoverClearTimeoutRef.current != null) {
        window.clearTimeout(hoverClearTimeoutRef.current);
      }
    };
  }, []);

  const isMobile = width < MOBILE_BREAKPOINT_PX;
  const selectedPoint = selectedIdx != null ? points[selectedIdx] : null;
  const filterCount = hiddenTypes.size + hiddenYears.size;
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('en-US');
    return query
      ? visibleNodes
          .filter((node) =>
            node.title.toLocaleLowerCase('en-US').includes(query)
          )
          .sort((a, b) => b.date.localeCompare(a.date))
      : [];
  }, [searchQuery, visibleNodes]);

  const zoomBy = (factor: number) => {
    const current = transformRef.current;
    const k = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM);
    transformRef.current = {
      x: width / 2 - ((width / 2 - current.x) / current.k) * k,
      y: height / 2 - ((height / 2 - current.y) / current.k) * k,
      k,
    };
    clearHover();
    scheduleDraw();
  };

  const resetView = () => {
    transformRef.current = { x: 0, y: 0, k: 1 };
    clearHighlight();
    scheduleDraw();
  };

  const resetFilters = () => {
    showAllTypes();
    showAllYears();
  };

  const focusNode = (node: RenderNode) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const k = Math.max(transformRef.current.k, isMobile ? 2 : 1.5);
    transformRef.current = {
      x: width / 2 - node.cx * k,
      y: height / 2 - node.cy * k,
      k,
    };
    const at = { x: rect.left + width / 2, y: rect.top + height / 2 };
    setSelectedIdx(node.idx);
    setSelectedAt(at);
    setSelectedCardPosition({
      x: at.x + PINNED_CARD_OFFSET,
      y: at.y + PINNED_CARD_OFFSET,
    });
    setPlaying(false);
    setExplorePanel(null);
    clearHover();
    scheduleDraw();
  };

  return (
    <div
      ref={containerRef}
      className={`map-view${timelineActive ? ' has-history' : ''}`}
      onMouseLeave={handlePointerLeave}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="map-canvas"
        tabIndex={0}
        aria-label={`Map showing ${visibleNodes.length} entries. Use Find to search titles and open an entry.`}
        aria-describedby="map-gesture-help"
        onKeyDown={(event) => {
          if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            zoomBy(1.3);
          }
          if (event.key === '-') {
            event.preventDefault();
            zoomBy(1 / 1.3);
          }
          if (event.key === '0') {
            event.preventDefault();
            resetView();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerLeave}
        style={{
          width,
          height,
          cursor: isDragging
            ? 'grabbing'
            : hoverIdx != null
              ? 'pointer'
              : 'grab',
        }}
      />

      <div className="map-toolbar">
        <div
          className="map-explore-actions"
          role="group"
          aria-label="Explore the map"
        >
          {(
            [
              { key: 'search', label: 'Find', icon: Search },
              { key: 'topics', label: 'Topics', icon: Compass },
              { key: 'filters', label: 'Filters', icon: SlidersHorizontal },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-expanded={explorePanel === key}
              aria-controls="map-explore-panel"
              onClick={(event) => {
                exploreTriggerRef.current = event.currentTarget;
                setExplorePanel(explorePanel === key ? null : key);
              }}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
              {key === 'filters' && filterCount > 0 && (
                <span className="map-filter-count">{filterCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="map-zoom-controls" role="group" aria-label="Map zoom">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.3)}
            disabled={zoomPercent <= MIN_ZOOM * 100}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="Reset map view"
            title="Reset map view"
          >
            <RotateCcw size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.3)}
            disabled={zoomPercent >= MAX_ZOOM * 100}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus size={17} aria-hidden="true" />
          </button>
          <span className="map-zoom-value">{zoomPercent}%</span>
        </div>
      </div>

      {explorePanel && (
        <section
          className="map-explore-panel map-panel"
          id="map-explore-panel"
          aria-labelledby="map-panel-heading"
        >
          <div className="map-panel-heading">
            <h2 id="map-panel-heading">
              {explorePanel === 'search'
                ? 'Find an entry'
                : explorePanel === 'topics'
                  ? 'Explore a topic'
                  : 'Filter the map'}
            </h2>
            <button
              type="button"
              className="map-icon-button"
              aria-label="Close explore panel"
              onClick={() => {
                setExplorePanel(null);
                exploreTriggerRef.current?.focus();
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {explorePanel === 'search' && (
            <>
              <label className="map-sr-only" htmlFor="map-search">
                Search entry titles
              </label>
              <input
                id="map-search"
                type="search"
                placeholder="Search entry titles…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoFocus
              />
              {searchQuery.trim() ? (
                <>
                  <p className="map-panel-note" role="status">
                    {searchResults.length}{' '}
                    {searchResults.length === 1 ? 'match' : 'matches'}
                    {searchResults.length > 8 ? ' · Showing the first 8' : ''}
                  </p>
                  <ul className="map-search-results">
                    {searchResults.slice(0, 8).map((node) => (
                      <li key={node.idx}>
                        <button type="button" onClick={() => focusNode(node)}>
                          <span>{node.title}</span>
                          <small>{formatPointMetadata(node)}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {searchResults.length === 0 && (
                    <p className="map-panel-note">
                      Try another title
                      {filterCount > 0 ? ' or reset the filters' : ''}.
                      {timelineActive
                        ? ' Search includes entries visible at this point in history.'
                        : ''}
                    </p>
                  )}
                  {searchResults.length === 0 && filterCount > 0 && (
                    <button
                      type="button"
                      className="map-text-button"
                      onClick={resetFilters}
                    >
                      Reset filters
                    </button>
                  )}
                </>
              ) : (
                <p className="map-panel-note">
                  Find a piece of writing and see what connects to it.
                </p>
              )}
            </>
          )}
          {explorePanel === 'topics' && (
            <>
              <p className="map-panel-note">
                Choose a topic to highlight related entries.
              </p>
              <div className="map-topic-list">
                {topics.map((topic, index) => (
                  <button
                    type="button"
                    key={topic.label}
                    aria-pressed={topicIdx === index}
                    onClick={() => {
                      const active = topicIdx === index;
                      clearSelection();
                      clearHover();
                      setTopicIdx(active ? null : index);
                      if (isMobile) setExplorePanel(null);
                    }}
                  >
                    {topic.label}
                    <span aria-hidden="true">
                      {topicIdx === index ? '−' : '+'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {explorePanel === 'filters' && (
            <>
              <div className="map-filter-summary">
                <span>
                  {visibleNodes.length} of {nodes.length} entries shown
                </span>
                {filterCount > 0 && (
                  <button
                    className="map-text-button"
                    type="button"
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                )}
              </div>
              <fieldset>
                <legend>Content type</legend>
                <div className="map-filter-bulk">
                  <button type="button" onClick={showAllTypes}>
                    All types
                  </button>
                  <button type="button" onClick={hideAllTypes}>
                    No types
                  </button>
                </div>
                <div className="map-type-options">
                  {presentTypes.map((type) => (
                    <label key={type}>
                      <input
                        type="checkbox"
                        checked={!hiddenTypes.has(type)}
                        onChange={() => toggleHiddenType(type)}
                      />
                      <i
                        style={{ background: TYPE_COLORS[type] }}
                        aria-hidden="true"
                      />
                      <span>{TYPE_LABELS[type] ?? type}</span>
                      <small>
                        {points.filter((point) => point.type === type).length}
                      </small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Year published</legend>
                <div className="map-filter-bulk">
                  <button type="button" onClick={showAllYears}>
                    All years
                  </button>
                  <button type="button" onClick={hideAllYears}>
                    No years
                  </button>
                </div>
                <div className="map-year-options">
                  {presentYears.map((year) => (
                    <label key={year}>
                      <input
                        type="checkbox"
                        checked={!hiddenYears.has(year)}
                        onChange={() => toggleHiddenYear(year)}
                      />
                      <span>{formatYear(year)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
        </section>
      )}

      {selectedPoint && selectedAt && (
        <div
          ref={selectedCardRef}
          className={`map-selected-card map-panel${isMobile ? ' is-mobile' : ''}`}
          tabIndex={-1}
          aria-labelledby="map-selected-title"
          style={
            isMobile
              ? undefined
              : {
                  left:
                    selectedCardPosition?.x ??
                    selectedAt.x + PINNED_CARD_OFFSET,
                  top:
                    selectedCardPosition?.y ??
                    selectedAt.y + PINNED_CARD_OFFSET,
                }
          }
        >
          <div className="map-panel-heading">
            <span className="map-panel-note">
              {formatPointMetadata(selectedPoint)}
            </span>
            <button
              type="button"
              className="map-icon-button"
              aria-label="Close entry details"
              onClick={() => {
                clearSelection();
                canvasRef.current?.focus({ preventScroll: true });
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <h2 id="map-selected-title">{selectedPoint.title}</h2>
          <p className="map-panel-note">
            {selectedPoint.wordCount.toLocaleString('en-US')} words ·{' '}
            {visibleIncidentEdges[selectedIdx!]?.length ?? 0} connections
          </p>
          <a className="map-read-link" href={selectedPoint.url}>
            Read entry <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      )}

      {tooltip && hoverIdx != null && hoverIdx !== selectedIdx && (
        <div
          ref={tooltipRef}
          className="map-tooltip map-panel"
          style={{
            transform: `translate3d(${tooltip.screenX + 12}px, ${tooltip.screenY + 12}px, 0)`,
          }}
        >
          <strong>{tooltip.point.title}</strong>
          <span>{formatPointMetadata(tooltip.point)}</span>
        </div>
      )}

      {visibleNodes.length === 0 && !explorePanel && (
        <div className="map-empty-state map-panel" role="status">
          <h2>No entries in view</h2>
          <p>
            {filterCount > 0
              ? 'Try a different type or year.'
              : 'Move forward in history to see more entries.'}
          </p>
          {filterCount > 0 && (
            <button
              type="button"
              className="map-text-button"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {!timelineActive && (
        <div className="map-status">
          <p>
            <strong>{visibleNodes.length}</strong> of {nodes.length} entries
            {topicIdx != null && (
              <>
                {' '}
                ·{' '}
                <button
                  type="button"
                  onClick={() => setTopicIdx(null)}
                  aria-label="Clear topic highlight"
                >
                  {topics[topicIdx]?.label} <X size={12} aria-hidden="true" />
                </button>
              </>
            )}
          </p>
          <div className="map-color-legend" aria-label="Content type colors">
            {presentTypes
              .filter((type) => !hiddenTypes.has(type))
              .map((type) => (
                <span key={type}>
                  <i
                    style={{ background: TYPE_COLORS[type] }}
                    aria-hidden="true"
                  />
                  {TYPE_LABELS[type]}
                </span>
              ))}
          </div>
        </div>
      )}

      {sortedPostTimes.length > 0 && (
        <div className={`map-history${timelineActive ? ' is-active' : ''}`}>
          {!timelineActive ? (
            <button
              type="button"
              className="map-history-open"
              onClick={openTimeline}
            >
              <History size={16} aria-hidden="true" />
              Explore history
            </button>
          ) : (
            <section
              className="map-timeline map-panel"
              aria-label="Publishing history"
            >
              <div className="map-timeline-top">
                <div>
                  <span className="map-panel-note">Publishing history</span>
                  <strong>
                    {cursorTime != null ? formatTimestamp(cursorTime) : ''}
                  </strong>
                </div>
                <span className="map-panel-note">
                  {visibleNodes.length}{' '}
                  {visibleNodes.length === 1 ? 'entry' : 'entries'}
                </span>
                <button
                  type="button"
                  className="map-icon-button"
                  onClick={closeTimeline}
                  aria-label="Close timeline"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <input
                type="range"
                min={timelineStart}
                max={timelineEnd}
                step={DAY_MS}
                value={cursorTime ?? timelineStart}
                onChange={(event) => {
                  setPlaying(false);
                  setCursorTime(Number(event.currentTarget.value));
                }}
                aria-label="Timeline date"
                aria-valuetext={formatTimestamp(cursorTime ?? timelineStart)}
              />
              <div className="map-timeline-controls">
                <div className="map-play-controls">
                  <button
                    type="button"
                    onClick={stepPrev}
                    disabled={
                      filteredPostTimes.length === 0 ||
                      (cursorTime != null && cursorTime <= filteredPostTimes[0])
                    }
                    aria-label="Previous publishing day"
                  >
                    <SkipBack size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={filteredPostTimes.length === 0}
                    aria-label={playing ? 'Pause history' : 'Play history'}
                  >
                    {playing ? (
                      <Pause size={16} aria-hidden="true" />
                    ) : (
                      <Play size={16} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={stepNext}
                    disabled={
                      filteredPostTimes.length === 0 ||
                      (cursorTime != null && cursorTime >= timelineEnd)
                    }
                    aria-label="Next publishing day"
                  >
                    <SkipForward size={16} aria-hidden="true" />
                  </button>
                </div>
                <div
                  className="map-speed-controls"
                  role="group"
                  aria-label="Playback speed"
                >
                  {([1, 2, 4] as const).map((speed) => (
                    <button
                      type="button"
                      key={speed}
                      aria-pressed={playSpeed === speed}
                      onClick={() => setPlaySpeed(speed)}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
                <span className="map-timeline-end">
                  {formatTimestamp(timelineEnd)}
                </span>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function LatentMap() {
  const data = embeddingsData as EmbeddingsFile;
  const points = data.points ?? [];

  if (points.length === 0) {
    return (
      <div className="map-unavailable">
        <h1>Map of ideas</h1>
        <p>
          The map is not available yet.{' '}
          <a href="/">Explore the writing instead.</a>
        </p>
      </div>
    );
  }

  return (
    <div className="latent-map">
      <header className="map-intro">
        <div>
          <h1>Map of ideas</h1>
          <p>
            Each dot is an entry. Lines connect similar writing; larger dots are
            longer pieces.
          </p>
        </div>
        <div className="map-intro-meta">
          <span>
            {points.length.toLocaleString('en-US')} entries ·{' '}
            {data.topics?.length ?? 0} topics
          </span>
          <span>
            Mapped{' '}
            {new Date(data.generatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </span>
        </div>
      </header>
      <div className="map-stage">
        <ParentSize debounceTime={50}>
          {({ width, height }) =>
            width > 0 && height > 0 ? (
              <MapInner width={width} height={height} data={data} />
            ) : null
          }
        </ParentSize>
      </div>
      <p className="map-gesture-help" id="map-gesture-help">
        Drag to move · Scroll or pinch to zoom · Select a dot to read
        <span> · Keyboard: + / − to zoom, 0 to reset</span>
      </p>
    </div>
  );
}
