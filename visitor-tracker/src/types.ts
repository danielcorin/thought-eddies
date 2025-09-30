export interface Env {
  PRESENCE_TRACKER: DurableObjectNamespace;
}

export interface ClientMessage {
  type: 'heartbeat' | 'ping' | 'inactive' | 'active';
  userId: string;
  pageUrl: string;
  timestamp: number;
}

export interface ServerMessage {
  type: 'count' | 'pong';
  count?: number;
  timestamp: number;
}

export interface SessionMetadata {
  userId: string;
  pageUrl: string;
  connectedAt: number;
  lastHeartbeat: number;
  isActive: boolean;
}
