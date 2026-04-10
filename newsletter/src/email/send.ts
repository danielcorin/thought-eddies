import { Env } from '../types';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(
  env: Env,
  { to, subject, html, text, headers }: SendEmailParams
): Promise<number> {
  const body: Record<string, unknown> = {
    from: `Thought Eddies <${env.FROM_EMAIL}>`,
    to: [to],
    subject,
    html,
  };

  if (text) {
    body.text = text;
  }

  if (headers) {
    body.headers = headers;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response.status;
}
