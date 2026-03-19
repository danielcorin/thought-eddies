import { Env } from '../types';
import { sendEmail } from '../email/send';
import { confirmationEmail } from '../email/templates';

function authorize(request: Request, env: Env): boolean {
  return request.headers.get('Authorization') === `Bearer ${env.API_SECRET}`;
}

export async function handleAdminSubscribers(
  request: Request,
  env: Env
): Promise<Response> {
  if (!authorize(request, env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const method = request.method;

  if (method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT id, email, status, created_at, confirmed_at FROM subscribers ORDER BY created_at DESC'
    ).all();
    return Response.json({ subscribers: result.results });
  }

  if (method === 'POST' && action === 'resend') {
    const { id } = await request.json<{ id: number }>();
    const subscriber = await env.DB.prepare(
      'SELECT email, token, status FROM subscribers WHERE id = ?'
    )
      .bind(id)
      .first<{ email: string; token: string; status: string }>();

    if (!subscriber || subscriber.status !== 'pending') {
      return Response.json(
        { error: 'Subscriber not found or not pending' },
        { status: 400 }
      );
    }

    const confirmUrl = `${env.BASE_URL}/api/confirm?token=${subscriber.token}`;
    await sendEmail(env, {
      to: subscriber.email,
      subject: 'Confirm your subscription',
      html: confirmationEmail(confirmUrl),
    });

    return Response.json({ ok: true });
  }

  if (method === 'POST' && action === 'reconfirm') {
    const { id } = await request.json<{ id: number }>();
    const subscriber = await env.DB.prepare(
      'SELECT email, token, status FROM subscribers WHERE id = ?'
    )
      .bind(id)
      .first<{ email: string; token: string; status: string }>();

    if (!subscriber) {
      return Response.json({ error: 'Subscriber not found' }, { status: 400 });
    }

    const newToken = crypto.randomUUID();
    await env.DB.prepare(
      "UPDATE subscribers SET status = 'pending', token = ?, confirmed_at = NULL WHERE id = ?"
    )
      .bind(newToken, id)
      .run();

    const confirmUrl = `${env.BASE_URL}/api/confirm?token=${newToken}`;
    await sendEmail(env, {
      to: subscriber.email,
      subject: 'Confirm your subscription',
      html: confirmationEmail(confirmUrl),
    });

    return Response.json({ ok: true });
  }

  if (method === 'POST' && action === 'test') {
    const { email } = await request.json<{ email: string }>();
    const status = await sendEmail(env, {
      to: email,
      subject: 'Newsletter test email',
      html: '<h2>Test email</h2><p>If you received this, email delivery is working.</p>',
    });

    if (status >= 200 && status < 300) {
      return Response.json({ ok: true });
    }
    return Response.json(
      { error: `Resend returned status ${status}` },
      { status: 500 }
    );
  }

  if (method === 'POST' && action === 'export') {
    const result = await env.DB.prepare(
      "SELECT email, status, created_at, confirmed_at FROM subscribers WHERE status = 'active' ORDER BY confirmed_at DESC"
    ).all<{
      email: string;
      status: string;
      created_at: string;
      confirmed_at: string | null;
    }>();

    const csv =
      'email,status,created_at,confirmed_at\n' +
      result.results
        .map(
          (r) =>
            `${r.email},${r.status},${r.created_at},${r.confirmed_at || ''}`
        )
        .join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="subscribers.csv"',
      },
    });
  }

  if (method === 'DELETE') {
    const { id } = await request.json<{ id: number }>();
    await env.DB.prepare('DELETE FROM subscribers WHERE id = ?').bind(id).run();
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
