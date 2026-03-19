import { Env } from '../types';
import { getSubscriberByToken, updateSubscriberStatus } from '../db';
import { sendEmail } from '../email/send';
import { welcomeEmail, confirmationPage } from '../email/templates';

export async function handleConfirm(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(confirmationPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const subscriber = await getSubscriberByToken(env.DB, token);

    if (!subscriber || subscriber.status === 'active') {
      // Don't leak info - still show success page
      return new Response(confirmationPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    await updateSubscriberStatus(env.DB, token, 'active');

    const unsubscribeUrl = `${env.BASE_URL}/api/unsubscribe?token=${token}`;
    await sendEmail(env, {
      to: subscriber.email,
      subject: "You're subscribed!",
      html: welcomeEmail(unsubscribeUrl),
    });

    return new Response(confirmationPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Confirm error:', error);
    return new Response(confirmationPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
