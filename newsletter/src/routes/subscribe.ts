import { Env, SubscribeBody } from '../types';
import { getSubscriberByEmail, createSubscriber, resetSubscriber } from '../db';
import { sendEmail } from '../email/send';
import { confirmationEmail, subscribePendingPage } from '../email/templates';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleSubscribe(
  request: Request,
  env: Env
): Promise<Response> {
  const contentType = request.headers.get('Content-Type') || '';
  const isFormSubmit = contentType.includes(
    'application/x-www-form-urlencoded'
  );

  let email: string | undefined;
  let name: string | null = null;

  if (isFormSubmit) {
    const formData = await request.formData();
    email = (formData.get('email') as string)?.trim().toLowerCase();
    name = (formData.get('name') as string)?.trim() || null;
  } else {
    let body: SubscribeBody;
    try {
      body = await request.json<SubscribeBody>();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    email = body.email?.trim().toLowerCase();
    name = body.name?.trim() || null;
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    if (isFormSubmit) {
      return new Response('A valid email is required', { status: 400 });
    }
    return Response.json(
      { error: 'A valid email is required' },
      { status: 400 }
    );
  }

  try {
    const existing = await getSubscriberByEmail(env.DB, email);

    if (existing) {
      if (existing.status === 'active') {
        // Don't leak subscription status - return same message
        if (isFormSubmit) {
          return new Response(subscribePendingPage(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        return Response.json({
          message: 'Check your email to confirm your subscription',
        });
      }

      let token = existing.token;

      if (existing.status === 'unsubscribed') {
        token = crypto.randomUUID();
        await resetSubscriber(env.DB, email, token);
      }

      // For pending status, resend the confirmation email
      const confirmUrl = `${env.BASE_URL}/api/confirm?token=${token}`;
      await sendEmail(env, {
        to: email,
        subject: 'Confirm your subscription',
        html: confirmationEmail(confirmUrl),
      });

      if (isFormSubmit) {
        return new Response(subscribePendingPage(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return Response.json({
        message: 'Check your email to confirm your subscription',
      });
    }

    // New subscriber
    const token = crypto.randomUUID();
    await createSubscriber(env.DB, email, name, token);

    const confirmUrl = `${env.BASE_URL}/api/confirm?token=${token}`;
    await sendEmail(env, {
      to: email,
      subject: 'Confirm your subscription',
      html: confirmationEmail(confirmUrl),
    });

    if (isFormSubmit) {
      return new Response(subscribePendingPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return Response.json({
      message: 'Check your email to confirm your subscription',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    if (isFormSubmit) {
      return new Response('An unexpected error occurred', { status: 500 });
    }
    return Response.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
