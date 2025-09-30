var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/presence-tracker.ts
import { DurableObject } from "cloudflare:workers";
var HEARTBEAT_TIMEOUT_MS = 45e3;
var CLEANUP_INTERVAL_MS = 3e4;
var PresenceTracker = class extends DurableObject {
  static {
    __name(this, "PresenceTracker");
  }
  constructor(ctx, env) {
    super(ctx, env);
    this.sessions = /* @__PURE__ */ new Map();
    this.cleanupInterval = null;
  }
  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const url = new URL(request.url);
    const pageUrl = url.searchParams.get("page");
    const userId = url.searchParams.get("userId");
    if (!pageUrl || !userId) {
      return new Response("Missing page or userId parameter", { status: 400 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [pageUrl]);
    const metadata = {
      userId,
      pageUrl,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isActive: true
    };
    this.sessions.set(server, metadata);
    if (!this.cleanupInterval) {
      this.startCleanupInterval();
    }
    this.broadcastCount();
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message.toString());
      const session = this.sessions.get(ws);
      if (!session) {
        return;
      }
      switch (data.type) {
        case "heartbeat":
          session.lastHeartbeat = Date.now();
          session.isActive = true;
          this.sessions.set(ws, session);
          this.sendCount(ws);
          break;
        case "inactive":
          session.isActive = false;
          this.sessions.set(ws, session);
          this.broadcastCount();
          break;
        case "active":
          session.isActive = true;
          session.lastHeartbeat = Date.now();
          this.sessions.set(ws, session);
          this.broadcastCount();
          break;
        case "ping":
          this.sendMessage(ws, { type: "pong", timestamp: Date.now() });
          break;
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }
  async webSocketClose(ws, code, reason, wasClean) {
    this.sessions.delete(ws);
    this.broadcastCount();
    if (this.sessions.size === 0 && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  async webSocketError(ws, error) {
    console.error("WebSocket error:", error);
    this.sessions.delete(ws);
    this.broadcastCount();
  }
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, CLEANUP_INTERVAL_MS);
  }
  cleanupStaleSessions() {
    const now = Date.now();
    let removed = false;
    for (const [ws, session] of this.sessions.entries()) {
      if (now - session.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        try {
          ws.close(1e3, "Heartbeat timeout");
        } catch (error) {
          console.error("Error closing stale connection:", error);
        }
        this.sessions.delete(ws);
        removed = true;
      }
    }
    if (removed) {
      this.broadcastCount();
    }
  }
  getActiveCount() {
    const now = Date.now();
    let count = 0;
    for (const [_, session] of this.sessions.entries()) {
      if (session.isActive && now - session.lastHeartbeat < HEARTBEAT_TIMEOUT_MS) {
        count++;
      }
    }
    return count;
  }
  broadcastCount() {
    const count = this.getActiveCount();
    const message = {
      type: "count",
      count,
      timestamp: Date.now()
    };
    const messageStr = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error("Error broadcasting to client:", error);
      }
    }
  }
  sendCount(ws) {
    const count = this.getActiveCount();
    this.sendMessage(ws, {
      type: "count",
      count,
      timestamp: Date.now()
    });
  }
  sendMessage(ws, message) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
};

// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Upgrade, Connection"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    if (url.pathname === "/ws") {
      const pageUrl = url.searchParams.get("page");
      const userId = url.searchParams.get("userId");
      if (!pageUrl || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing page or userId parameter" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response(
          JSON.stringify({ error: "Expected WebSocket upgrade" }),
          {
            status: 426,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }
      const id = env.PRESENCE_TRACKER.idFromName(pageUrl);
      const stub = env.PRESENCE_TRACKER.get(id);
      return stub.fetch(request);
    }
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: Date.now() }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    return new Response(
      JSON.stringify({
        message: "Visitor Tracker API",
        endpoints: {
          websocket: "/ws?page=<pageUrl>&userId=<userId>",
          health: "/health"
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

// node_modules/.pnpm/wrangler@4.40.2_@cloudflare+workers-types@4.20250927.0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/.pnpm/wrangler@4.40.2_@cloudflare+workers-types@4.20250927.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-OWyGdG/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/.pnpm/wrangler@4.40.2_@cloudflare+workers-types@4.20250927.0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-OWyGdG/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  PresenceTracker,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
