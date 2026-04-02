import { Env } from './types';
import { handleSubscribe } from './routes/subscribe';
import { handleConfirm } from './routes/confirm';
import {
  handleUnsubscribeGet,
  handleUnsubscribePost,
} from './routes/unsubscribe';
import { handleSend } from './routes/send';
import { handleAdminSubscribers } from './routes/admin';
import { subscribePage } from './email/templates';

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  // Allow both www and non-www variants, plus localhost for dev
  const allowed = [allowedOrigin, 'http://localhost:4321'];
  if (allowedOrigin.startsWith('https://www.')) {
    allowed.push(allowedOrigin.replace('https://www.', 'https://'));
  } else if (allowedOrigin.startsWith('https://')) {
    allowed.push(allowedOrigin.replace('https://', 'https://www.'));
  }

  if (!allowed.includes(origin)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (method === 'OPTIONS' && pathname === '/api/subscribe') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env.ALLOWED_ORIGIN),
      });
    }

    let response: Response;

    try {
      if (pathname === '/' && method === 'GET') {
        return new Response(subscribePage(env.TURNSTILE_SITE_KEY), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      if (pathname === '/api/subscribe' && method === 'POST') {
        response = await handleSubscribe(request, env);
        // Add CORS headers to subscribe responses
        const headers = new Headers(response.headers);
        const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);
        for (const [key, value] of Object.entries(cors)) {
          headers.set(key, value);
        }
        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }

      if (pathname === '/api/confirm' && method === 'GET') {
        response = await handleConfirm(request, env);
        return response;
      }

      if (pathname === '/api/unsubscribe' && method === 'GET') {
        response = await handleUnsubscribeGet(request, env);
        return response;
      }

      if (pathname === '/api/unsubscribe' && method === 'POST') {
        response = await handleUnsubscribePost(request, env);
        return response;
      }

      if (pathname === '/api/send' && method === 'POST') {
        response = await handleSend(request, env);
        return response;
      }

      if (pathname === '/api/admin/subscribers') {
        if (method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          });
        }
        const adminResponse = await handleAdminSubscribers(request, env);
        const headers = new Headers(adminResponse.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(adminResponse.body, {
          status: adminResponse.status,
          headers,
        });
      }

      return Response.redirect(new URL('/', request.url).toString(), 302);
    } catch (error) {
      console.error('Unhandled error:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
