# Visitor Tracker - Cloudflare Worker

Real-time visitor counter using Cloudflare Durable Objects and WebSockets.

## Features

- Real-time WebSocket connections per page
- Privacy-focused (anonymous UUIDs only)
- Cost-efficient with WebSocket Hibernation API
- Auto-cleanup of stale connections (45s timeout)
- Heartbeat every 20 seconds
- Automatic reconnection on disconnect
- Respects Page Visibility API (pauses when tab is inactive)

## Local Development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start development server:

   ```bash
   pnpm dev
   ```

   This starts the Worker on `http://localhost:8787`

3. Test WebSocket connection:

   ```bash
   # In another terminal
   wscat -c "ws://localhost:8787/ws?page=/test&userId=test-user-123"
   ```

   Send a heartbeat:

   ```json
   {
     "type": "heartbeat",
     "userId": "test-user-123",
     "pageUrl": "/test",
     "timestamp": 1234567890
   }
   ```

## Deployment

1. Login to Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Deploy to Cloudflare:
   ```bash
   pnpm deploy
   ```

## API Endpoints

### WebSocket: `/ws`

Connect to receive real-time visitor count updates.

**Query Parameters:**

- `page` (required): The page URL to track (e.g., `/posts/my-post`)
- `userId` (required): Anonymous user identifier (UUID)

**Example:**

```
ws://localhost:8787/ws?page=/posts/hello&userId=550e8400-e29b-41d4-a716-446655440000
```

**Client Messages:**

```json
{
  "type": "heartbeat",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "pageUrl": "/posts/hello",
  "timestamp": 1234567890
}
```

**Server Messages:**

```json
{
  "type": "count",
  "count": 3,
  "timestamp": 1234567890
}
```

### Health Check: `/health`

Returns server status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

## Architecture

### Durable Objects

Each unique page URL gets its own Durable Object instance, which maintains:

- WebSocket connections for all visitors on that page
- Session metadata (userId, connection time, last heartbeat)
- Real-time count updates broadcast to all clients

### Worker

The main Worker handles:

- WebSocket upgrade requests
- Routing to appropriate Durable Object by page URL
- CORS headers for cross-origin requests

### Client Component

React component that:

- Generates/retrieves anonymous user ID from localStorage
- Opens WebSocket connection to Worker
- Sends heartbeat every 20 seconds
- Displays live visitor count
- Auto-reconnects on disconnect
- Pauses when tab is hidden

## Cost Considerations

- WebSocket Hibernation minimizes duration charges
- Only charged for active message processing
- Durable Objects billed at $0.15 per million requests
- Requires Cloudflare Workers paid plan ($5/mo minimum)

## Privacy

- No IP addresses or identifying information stored
- Only anonymous UUIDs generated client-side
- Count totals only (not "who" is viewing)
- Respects Do Not Track (optional enhancement)
