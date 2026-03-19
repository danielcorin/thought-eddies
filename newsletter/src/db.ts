import { Subscriber } from './types';

export async function getSubscriberByEmail(
  db: D1Database,
  email: string
): Promise<Subscriber | null> {
  return db
    .prepare('SELECT * FROM subscribers WHERE email = ?')
    .bind(email)
    .first<Subscriber>();
}

export async function getSubscriberByToken(
  db: D1Database,
  token: string
): Promise<Subscriber | null> {
  return db
    .prepare('SELECT * FROM subscribers WHERE token = ?')
    .bind(token)
    .first<Subscriber>();
}

export async function createSubscriber(
  db: D1Database,
  email: string,
  name: string | null,
  token: string
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO subscribers (email, name, token, status) VALUES (?, ?, ?, ?)'
    )
    .bind(email, name, token, 'pending')
    .run();
}

export async function updateSubscriberStatus(
  db: D1Database,
  token: string,
  status: 'pending' | 'active' | 'unsubscribed'
): Promise<void> {
  if (status === 'active') {
    await db
      .prepare(
        "UPDATE subscribers SET status = ?, confirmed_at = datetime('now') WHERE token = ?"
      )
      .bind(status, token)
      .run();
  } else {
    await db
      .prepare('UPDATE subscribers SET status = ? WHERE token = ?')
      .bind(status, token)
      .run();
  }
}

export async function resetSubscriber(
  db: D1Database,
  email: string,
  token: string
): Promise<void> {
  await db
    .prepare(
      'UPDATE subscribers SET token = ?, status = ?, confirmed_at = NULL WHERE email = ?'
    )
    .bind(token, 'pending', email)
    .run();
}

export async function getActiveSubscribers(
  db: D1Database
): Promise<Subscriber[]> {
  const result = await db
    .prepare("SELECT * FROM subscribers WHERE status = 'active'")
    .all<Subscriber>();
  return result.results;
}
