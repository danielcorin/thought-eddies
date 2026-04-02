import { Env, SubscribeBody } from '../types';
import { getSubscriberByEmail, createSubscriber, resetSubscriber } from '../db';
import { sendEmail } from '../email/send';
import { confirmationEmail, subscribePendingPage } from '../email/templates';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

async function verifyTurnstile(
  token: string,
  secret: string,
  remoteip?: string | null
): Promise<boolean> {
  const body: Record<string, string> = {
    secret,
    response: token,
  };
  if (remoteip) {
    body.remoteip = remoteip;
  }

  const result = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  const outcome = await result.json<TurnstileVerifyResponse>();
  return outcome.success;
}

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
  let turnstileToken: string | undefined;
  let honeypot: string | undefined;

  if (isFormSubmit) {
    const formData = await request.formData();
    email = (formData.get('email') as string)?.trim().toLowerCase();
    name = (formData.get('name') as string)?.trim() || null;
    turnstileToken =
      (formData.get('cf-turnstile-response') as string) || undefined;
    honeypot = (formData.get('website') as string) || undefined;
  } else {
    let body: SubscribeBody & {
      'cf-turnstile-response'?: string;
      website?: string;
    };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    email = body.email?.trim().toLowerCase();
    name = body.name?.trim() || null;
    turnstileToken = body['cf-turnstile-response'];
    honeypot = body.website;
  }

  // Honeypot check — bots fill hidden fields, humans don't
  if (honeypot) {
    // Return success to not tip off bots
    if (isFormSubmit) {
      return new Response(subscribePendingPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return Response.json({
      message: 'Check your email to confirm your subscription',
    });
  }

  // Turnstile verification
  if (!turnstileToken) {
    if (isFormSubmit) {
      return new Response('Verification failed. Please try again.', {
        status: 400,
      });
    }
    return Response.json(
      { error: 'Verification failed. Please try again.' },
      { status: 400 }
    );
  }

  const remoteip = request.headers.get('CF-Connecting-IP');
  const turnstileOk = await verifyTurnstile(
    turnstileToken,
    env.TURNSTILE_SECRET,
    remoteip
  );
  if (!turnstileOk) {
    if (isFormSubmit) {
      return new Response('Verification failed. Please try again.', {
        status: 400,
      });
    }
    return Response.json(
      { error: 'Verification failed. Please try again.' },
      { status: 400 }
    );
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
