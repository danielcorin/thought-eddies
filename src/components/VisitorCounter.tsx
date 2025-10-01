import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

interface VisitorCounterProps {
  pageUrl: string;
  workerUrl?: string;
}

interface ServerMessage {
  type: 'count' | 'pong';
  count?: number;
  timestamp: number;
}

interface ClientMessage {
  type: 'heartbeat' | 'ping' | 'inactive' | 'active';
  userId: string;
  pageUrl: string;
  timestamp: number;
}

const HEARTBEAT_INTERVAL_MS = 20000; // 20 seconds
const RECONNECT_DELAY_MS = 5000; // 5 seconds
const DEFAULT_WORKER_URL = import.meta.env.DEV
  ? 'http://localhost:8787'
  : 'https://visitor-tracker.dancorin.workers.dev';

function getUserId(): string {
  const key = 'visitor-tracker-user-id';
  let userId = localStorage.getItem(key);

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(key, userId);
  }

  return userId;
}

export default function VisitorCounter({
  pageUrl,
  workerUrl = DEFAULT_WORKER_URL,
}: VisitorCounterProps) {
  const [count, setCount] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);
  const isVisibleRef = useRef(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    userIdRef.current = getUserId();
  }, []);

  // Use refs to store stable function references and break circular dependencies
  const connectFnRef = useRef<(() => void) | null>(null);
  const startHeartbeatFnRef = useRef<(() => void) | null>(null);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (!wsRef.current || !userIdRef.current) return;

    try {
      const message: ClientMessage = {
        type: 'heartbeat',
        userId: userIdRef.current,
        pageUrl,
        timestamp: Date.now(),
      };

      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[VisitorCounter] Error sending heartbeat:', error);
      }
    }
  }, [pageUrl]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    heartbeatIntervalRef.current = window.setInterval(() => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        isVisibleRef.current
      ) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Send initial heartbeat immediately
    sendHeartbeat();
  }, [stopHeartbeat, sendHeartbeat]);

  // Store the latest startHeartbeat in ref
  useEffect(() => {
    startHeartbeatFnRef.current = startHeartbeat;
  }, [startHeartbeat]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || !isMountedRef.current) return;

    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (
        isVisibleRef.current &&
        isMountedRef.current &&
        connectFnRef.current
      ) {
        connectFnRef.current();
      }
    }, RECONNECT_DELAY_MS);
  }, []);

  const connect = useCallback(() => {
    if (!userIdRef.current || !isMountedRef.current) return;

    try {
      // Convert http(s) URL to ws(s) URL
      const wsUrl = workerUrl.replace(/^http/, 'ws');
      const url = `${wsUrl}/ws?page=${encodeURIComponent(pageUrl)}&userId=${encodeURIComponent(userIdRef.current)}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        startHeartbeatFnRef.current?.();
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const message: ServerMessage = JSON.parse(event.data);

          if (message.type === 'count' && message.count !== undefined) {
            setCount(message.count);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[VisitorCounter] Error parsing message:', error);
          }
        }
      };

      ws.onerror = (error) => {
        if (import.meta.env.DEV) {
          console.error('[VisitorCounter] WebSocket error:', error);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        stopHeartbeat();
        scheduleReconnect();
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[VisitorCounter] Error creating WebSocket:', error);
      }
      scheduleReconnect();
    }
  }, [pageUrl, workerUrl, stopHeartbeat, scheduleReconnect]);

  // Store the latest connect in ref
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    stopHeartbeat();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [stopHeartbeat]);

  const sendInactiveMessage = useCallback(() => {
    if (
      !wsRef.current ||
      !userIdRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    )
      return;

    try {
      const message: ClientMessage = {
        type: 'inactive',
        userId: userIdRef.current,
        pageUrl,
        timestamp: Date.now(),
      };

      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(
          '[VisitorCounter] Error sending inactive message:',
          error
        );
      }
    }
  }, [pageUrl]);

  const sendActiveMessage = useCallback(() => {
    if (
      !wsRef.current ||
      !userIdRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    )
      return;

    try {
      const message: ClientMessage = {
        type: 'active',
        userId: userIdRef.current,
        pageUrl,
        timestamp: Date.now(),
      };

      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[VisitorCounter] Error sending active message:', error);
      }
    }
  }, [pageUrl]);

  // Handle visibility change (pause when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;

      if (document.hidden) {
        // Tab is hidden, send inactive message and pause heartbeat
        sendInactiveMessage();
        stopHeartbeat();
      } else {
        // Tab is visible again, send active message and resume heartbeat
        sendActiveMessage();
        if (isConnected) {
          startHeartbeatFnRef.current?.();
        } else {
          // Reconnect if disconnected
          connectFnRef.current?.();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, sendInactiveMessage, stopHeartbeat, sendActiveMessage]);

  // Connect on mount
  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
    // Only run once on mount - we use refs to avoid reconnecting
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize styles to avoid recreation on every render
  const styles = useMemo(
    () => `
    .visitor-counter {
      background: var(--color-bg-code);
      border: 1px solid var(--color-border);
      color: var(--color-ink);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease;
      font-family: var(--font-ui);
      backdrop-filter: blur(8px);
    }

    .visitor-counter:hover {
      background: color-mix(in srgb, var(--color-bg-code) 70%, var(--color-border) 30%);
      border-color: var(--color-border);
    }

    .visitor-indicator {
      width: 0.5rem;
      height: 0.5rem;
      background-color: var(--color-accent);
      border-radius: 9999px;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .visitor-count {
      font-size: var(--text-sm);
      font-weight: 500;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `,
    []
  );

  // Don't render anything if not connected, no count yet, or only one visitor
  if (!isConnected || count === null || count <= 1) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="visitor-counter">
        <div className="flex items-center gap-2">
          <div className="visitor-indicator" />
          <span className="visitor-count">
            {count === 1 ? '1 visitor' : `${count} visitors`}
          </span>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}
