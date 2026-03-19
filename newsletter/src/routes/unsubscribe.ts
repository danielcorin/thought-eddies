import { Env } from '../types';
import { getSubscriberByToken, updateSubscriberStatus } from '../db';
import {
  unsubscribePage,
  unsubscribeConfirmationPage,
} from '../email/templates';

export async function handleUnsubscribeGet(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  return new Response(unsubscribePage(token), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function handleUnsubscribePost(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  let token = url.searchParams.get('token');

  // Check form body if token not in URL
  if (!token) {
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      token = formData.get('token') as string | null;
    }
  }

  if (!token) {
    return Response.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const subscriber = await getSubscriberByToken(env.DB, token);

    if (subscriber && subscriber.status === 'active') {
      await updateSubscriberStatus(env.DB, token, 'unsubscribed');
    }

    // Check if this is a one-click unsubscribe (List-Unsubscribe-Post)
    const contentType = request.headers.get('Content-Type') || '';
    if (
      contentType.includes('application/x-www-form-urlencoded') &&
      !request.headers.get('Accept')?.includes('text/html')
    ) {
      // Could be one-click unsubscribe from email client
      const formData = await request
        .clone()
        .formData()
        .catch(() => null);
      if (formData?.get('List-Unsubscribe') === 'One-Click') {
        return Response.json({ message: 'Unsubscribed' });
      }
    }

    // Default: return HTML page
    return new Response(unsubscribeConfirmationPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new Response(unsubscribeConfirmationPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
