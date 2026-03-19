import { Env, SendBody } from '../types';
import { getActiveSubscribers } from '../db';
import { sendEmail } from '../email/send';
import { newsletterEmail } from '../email/templates';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handleSend(
  request: Request,
  env: Env
): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${env.API_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SendBody;

  try {
    body = await request.json<SendBody>();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.subject || !body.html) {
    return Response.json(
      { error: 'subject and html are required' },
      { status: 400 }
    );
  }

  try {
    const subscribers = await getActiveSubscribers(env.DB);
    let sent = 0;

    for (let i = 0; i < subscribers.length; i++) {
      const subscriber = subscribers[i];
      const unsubscribeUrl = `${env.BASE_URL}/api/unsubscribe?token=${subscriber.token}`;

      const html = newsletterEmail({
        subject: body.subject,
        html: body.html,
        url: body.url,
        unsubscribeUrl,
      });

      const status = await sendEmail(env, {
        to: subscriber.email,
        subject: body.subject,
        html,
        text: body.text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });

      if (status >= 200 && status < 300) {
        sent++;
      } else {
        console.error(
          `Failed to send to ${subscriber.email}: status ${status}`
        );
      }

      // Small delay between sends to respect rate limits
      if (i < subscribers.length - 1) {
        await sleep(100);
      }
    }

    return Response.json({ sent });
  } catch (error) {
    console.error('Send error:', error);
    return Response.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
