export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  API_SECRET: string;
  ALLOWED_ORIGIN: string;
  BASE_URL: string;
  FROM_EMAIL: string;
  TURNSTILE_SECRET: string;
  TURNSTILE_SITE_KEY: string;
}

export interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  token: string;
  status: 'pending' | 'active' | 'unsubscribed';
  created_at: string;
  confirmed_at: string | null;
}

export interface SubscribeBody {
  email: string;
  name?: string;
}

export interface SendBody {
  subject: string;
  html: string;
  text?: string;
  url?: string;
}
