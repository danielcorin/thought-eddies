import { DurableObject } from 'cloudflare:workers';
import type { ClientMessage, ServerMessage, SessionMetadata } from './types';

const HEARTBEAT_TIMEOUT_MS = 45000; // 45 seconds
const CLEANUP_INTERVAL_MS = 30000; // 30 seconds

export class PresenceTracker extends DurableObject {
  private sessions: Map<WebSocket, SessionMetadata>;
  private cleanupInterval: number | null;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.sessions = new Map();
    this.cleanupInterval = null;
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const url = new URL(request.url);
    const pageUrl = url.searchParams.get('page');
    const userId = url.searchParams.get('userId');

    if (!pageUrl || !userId) {
      return new Response('Missing page or userId parameter', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket with hibernation support
    this.ctx.acceptWebSocket(server, [pageUrl]);

    // Store session metadata
    const metadata: SessionMetadata = {
      userId,
      pageUrl,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isActive: true,
    };
    this.sessions.set(server, metadata);

    // Start cleanup interval if not already running
    if (!this.cleanupInterval) {
      this.startCleanupInterval();
    }

    // Broadcast updated count to all clients
    this.broadcastCount();

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    try {
      const data: ClientMessage = JSON.parse(message.toString());
      const session = this.sessions.get(ws);

      if (!session) {
        return;
      }

      switch (data.type) {
        case 'heartbeat':
          // Update last heartbeat timestamp
          session.lastHeartbeat = Date.now();
          session.isActive = true;
          this.sessions.set(ws, session);

          // Send current count back
          this.sendCount(ws);
          break;

        case 'inactive':
          // Mark session as inactive
          session.isActive = false;
          this.sessions.set(ws, session);

          // Broadcast updated count immediately
          this.broadcastCount();
          break;

        case 'active':
          // Mark session as active
          session.isActive = true;
          session.lastHeartbeat = Date.now();
          this.sessions.set(ws, session);

          // Broadcast updated count immediately
          this.broadcastCount();
          break;

        case 'ping':
          // Respond to ping
          this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    // Remove session
    this.sessions.delete(ws);

    // Broadcast updated count
    this.broadcastCount();

    // Stop cleanup interval if no more sessions
    if (this.sessions.size === 0 && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    this.sessions.delete(ws);
    this.broadcastCount();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, CLEANUP_INTERVAL_MS) as unknown as number;
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    let removed = false;

    for (const [ws, session] of this.sessions.entries()) {
      if (now - session.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        // Close stale connection
        try {
          ws.close(1000, 'Heartbeat timeout');
        } catch (error) {
          console.error('Error closing stale connection:', error);
        }
        this.sessions.delete(ws);
        removed = true;
      }
    }

    if (removed) {
      this.broadcastCount();
    }
  }

  private getActiveCount(): number {
    const now = Date.now();
    let count = 0;

    for (const [_, session] of this.sessions.entries()) {
      // Count as active if: isActive flag is true AND last heartbeat is recent
      if (
        session.isActive &&
        now - session.lastHeartbeat < HEARTBEAT_TIMEOUT_MS
      ) {
        count++;
      }
    }

    return count;
  }

  private broadcastCount(): void {
    const count = this.getActiveCount();
    const message: ServerMessage = {
      type: 'count',
      count,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);

    for (const ws of this.sessions.keys()) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  }

  private sendCount(ws: WebSocket): void {
    const count = this.getActiveCount();
    this.sendMessage(ws, {
      type: 'count',
      count,
      timestamp: Date.now(),
    });
  }

  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}
