import type { Env } from './types';
import { PresenceTracker } from './presence-tracker';

export { PresenceTracker };

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // WebSocket endpoint
    if (url.pathname === '/ws') {
      const pageUrl = url.searchParams.get('page');
      const userId = url.searchParams.get('userId');

      if (!pageUrl || !userId) {
        return new Response(
          JSON.stringify({ error: 'Missing page or userId parameter' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Check for WebSocket upgrade
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response(
          JSON.stringify({ error: 'Expected WebSocket upgrade' }),
          {
            status: 426,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Get Durable Object ID for this page
      // Using the page URL as the unique identifier ensures all visitors to the same page
      // connect to the same Durable Object instance
      const id = env.PRESENCE_TRACKER.idFromName(pageUrl);
      const stub = env.PRESENCE_TRACKER.get(id);

      // Forward request to Durable Object
      return stub.fetch(request);
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: Date.now() }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Default response
    return new Response(
      JSON.stringify({
        message: 'Visitor Tracker API',
        endpoints: {
          websocket: '/ws?page=<pageUrl>&userId=<userId>',
          health: '/health',
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  },
};
