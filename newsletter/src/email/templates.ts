const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const linkStyle = `color: #2563eb; text-decoration: underline;`;

const footerStyle = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e5e5e5;
  font-size: 13px;
  color: #6b7280;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #1a1a1a;
  color: #ffffff;
  text-decoration: none;
  border-radius: 4px;
  font-size: 16px;
`;

const signoffs = [
  'Drop me a line at',
  'Hit me up at',
  'Say hello at',
  "I'd love to hear from you at",
  'Thoughts? Reach me at',
];

function randomSignoff(lnkStyle: string): string {
  const phrase = signoffs[Math.floor(Math.random() * signoffs.length)];
  return `Thanks for reading. ${phrase} <a href="mailto:hey@danielcorin.com" style="${lnkStyle}">hey@danielcorin.com</a>`;
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <div style="${baseStyle}">
    ${content}
  </div>
</body>
</html>`;
}

function pageWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter — danielcorin.com</title>
  <script>
    (function () {
      var savedTheme = localStorage.getItem('theme');
      var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.className = savedTheme || (systemDark ? 'dark' : 'light');
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --spacing-xs: 0.5rem;
      --spacing-sm: 0.75rem;
      --spacing-md: 1rem;
      --spacing-lg: 2rem;
      --spacing-xl: 3rem;
      --color-bg: #f4f1e4;
      --color-bg-code: #e8e5d8;
      --color-bg-hover: color-mix(in srgb, #e8e5d8 70%, #0984e3 30%);
      --color-ink: #2d3436;
      --color-ink-light: #636e72;
      --color-accent: #0984e3;
      --color-border: #b4b4b4;
      --font-primary: 'Futura', sans-serif;
      --font-prose: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      color-scheme: light;
    }
    :root.dark {
      --color-bg: #1c1b17;
      --color-bg-code: #2a2925;
      --color-bg-hover: color-mix(in srgb, #2a2925 70%, #4dabf7 30%);
      --color-ink: #cccccc;
      --color-ink-light: #a8a8a8;
      --color-accent: #4dabf7;
      --color-border: #4a4a4a;
      color-scheme: dark;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      transition: color 300ms, background-color 300ms;
      transition-behavior: allow-discrete;
    }
    body {
      font-family: var(--font-prose);
      color: var(--color-ink);
      line-height: 1.6;
      min-height: 100vh;
      background-color: var(--color-bg);
      transition: color 300ms, background-color 300ms;
      transition-behavior: allow-discrete;
    }
    .page-container {
      max-width: 75ch;
      margin: 0 auto;
      padding: var(--spacing-md) var(--spacing-lg) var(--spacing-xl);
    }
    h1 {
      font-family: var(--font-primary);
      font-weight: 600;
      font-size: 2.25rem;
      line-height: 1.4;
      color: var(--color-ink);
      margin-bottom: var(--spacing-sm);
    }
    p {
      font-size: 1rem;
      margin-bottom: var(--spacing-md);
      color: var(--color-ink);
    }
    a {
      color: var(--color-ink);
      text-decoration: underline;
      transition: color 0.2s, opacity 0.2s;
    }
    a:hover { color: var(--color-accent); opacity: 0.8; }
    a:focus-visible,
    button:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
    .site-link {
      font-family: var(--font-primary);
      font-weight: bold;
      font-size: 1.125rem;
      color: var(--color-ink);
      text-decoration: none;
      display: inline-block;
      margin-bottom: var(--spacing-lg);
    }
    .site-link:hover { color: var(--color-accent); }
    .muted { color: var(--color-ink-light); font-size: 0.875rem; }
    .muted a { color: inherit; }
    .subscription-form,
    .unsubscribe-form {
      margin: var(--spacing-lg) 0;
    }
    .subscription-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      align-items: flex-start;
    }
    .subscription-controls {
      display: flex;
      gap: var(--spacing-xs);
      width: 100%;
      max-width: 400px;
    }
    .subscription-input {
      flex: 1;
      min-width: 0;
      padding: 0.5rem 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-ink);
      background: var(--color-bg-code);
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .subscription-input::placeholder {
      color: var(--color-ink-light);
      opacity: 0.6;
    }
    .subscription-input:focus { border-color: var(--color-accent); }
    .subscription-button {
      padding: 0.5rem 1rem;
      font-family: var(--font-mono);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-ink);
      background: var(--color-bg-code);
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .subscription-button:hover {
      background: var(--color-bg-hover);
      color: var(--color-ink);
    }
    @media (max-width: 640px) {
      .page-container {
        padding-right: var(--spacing-lg);
        padding-left: var(--spacing-lg);
      }
      h1 { font-size: 1.875rem; }
      .subscription-controls { flex-direction: column; max-width: 100%; }
      .subscription-button { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <a href="https://www.danielcorin.com" class="site-link">danielcorin.com</a>
    ${content}
  </div>
</body>
</html>`;
}

export function confirmationEmail(confirmUrl: string): string {
  return emailWrapper(`
    <h2 style="margin-top: 0;">Confirm your subscription to danielcorin.com</h2>
    <p>Thanks for signing up. You'll only receive emails when new posts are published to <a href="https://www.danielcorin.com" style="${linkStyle}">danielcorin.com</a>.</p>
    <p>Please confirm your email address by clicking the link below:</p>
    <p style="margin: 30px 0;">
      <a href="${confirmUrl}" style="${buttonStyle}">Confirm subscription</a>
    </p>
    <p style="font-size: 14px; color: #6b7280;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${confirmUrl}" style="${linkStyle}">${confirmUrl}</a>
    </p>
    <p style="font-size: 14px; color: #6b7280;">If you didn't request this, you can safely ignore this email.</p>
    <p style="font-size: 14px; color: #6b7280;">If you have any questions, feel free to email me at <a href="mailto:hey@danielcorin.com" style="${linkStyle}">hey@danielcorin.com</a>.</p>
  `);
}

export function welcomeEmail(unsubscribeUrl: string): string {
  return emailWrapper(`
    <h2 style="margin-top: 0;">You're subscribed to danielcorin.com!</h2>
    <p>Your subscription is confirmed. You'll only receive emails when I publish new posts to <a href="https://www.danielcorin.com" style="${linkStyle}">danielcorin.com</a> — nothing else.</p>
    <p>Thanks for subscribing. If you ever want to chat or share feedback, I'm at <a href="mailto:hey@danielcorin.com" style="${linkStyle}">hey@danielcorin.com</a>.</p>
    <div style="${footerStyle}">
      <a href="${unsubscribeUrl}" style="${linkStyle}">Unsubscribe</a>
    </div>
  `);
}

function addNewsletterRef(href: string): string {
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return href;
    url.searchParams.set('ref', 'newsletter');
    return url.toString();
  } catch {
    return href;
  }
}

function addRefToLinks(html: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_, href) => {
    return `href="${addNewsletterRef(href)}"`;
  });
}

export function newsletterEmail({
  subject,
  html,
  url,
  unsubscribeUrl,
}: {
  subject: string;
  html: string;
  url?: string;
  unsubscribeUrl: string;
}): string {
  const trackedUrl = url ? addNewsletterRef(url) : undefined;
  const webLink = trackedUrl
    ? `<p style="margin-bottom: 30px;"><a href="${trackedUrl}" style="${linkStyle}">Read on the web</a></p>`
    : '';

  return emailWrapper(`
    <h1 style="margin-top: 0; font-size: 24px;">${subject}</h1>
    ${webLink}
    <div>${addRefToLinks(html)}</div>
    <div style="${footerStyle}">
      <p style="margin-bottom: 8px;">${randomSignoff(linkStyle)}</p>
      <a href="${unsubscribeUrl}" style="${linkStyle}">Unsubscribe</a>
    </div>
  `);
}

export function unsubscribeConfirmationPage(): string {
  return pageWrapper(`
    <h1>Unsubscribed</h1>
    <p>You've been unsubscribed and won't receive any more emails.</p>
    <p>Sorry to see you go. If there's anything I could do better, I'd love to hear from you — <a href="mailto:hey@danielcorin.com">hey@danielcorin.com</a>.</p>
  `);
}

export function confirmationPage(): string {
  return pageWrapper(`
    <h1>Subscription confirmed</h1>
    <p>Thanks for confirming your email. You'll only receive emails when new posts are published to <a href="https://www.danielcorin.com">danielcorin.com</a>.</p>
    <p>Glad to have you. If you ever want to reach out, I'm at <a href="mailto:hey@danielcorin.com">hey@danielcorin.com</a>.</p>
  `);
}

export function subscribePendingPage(): string {
  return pageWrapper(`
    <h1>Check your email</h1>
    <p>We've sent you a confirmation link. Click it to complete your subscription.</p>
    <p>If you're having trouble, drop me a line at <a href="mailto:hey@danielcorin.com">hey@danielcorin.com</a>.</p>
  `);
}

export function subscribePage(turnstileSiteKey: string): string {
  return pageWrapper(`
    <h1>Subscribe</h1>
    <p>You'll only receive emails when new posts are published to <a href="https://www.danielcorin.com">danielcorin.com</a>, nothing else.</p>
    <p>Enter your email below and we'll send you a confirmation link.</p>
    <form method="POST" action="/api/subscribe" class="subscription-form">
      <div class="subscription-controls">
        <input type="email" name="email" placeholder="you@example.com" aria-label="Email address" autocomplete="email" required class="subscription-input">
        <button type="submit" class="subscription-button">Subscribe</button>
      </div>
      <div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;">
        <input type="text" name="website" tabindex="-1" autocomplete="off">
      </div>
      <div class="cf-turnstile" data-sitekey="${turnstileSiteKey}" data-theme="auto"></div>
    </form>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>
    <p class="muted">If you have any questions, feel free to email me at <a href="mailto:hey@danielcorin.com">hey@danielcorin.com</a>.</p>
  `);
}

export function unsubscribePage(token: string): string {
  return pageWrapper(`
    <h1>Unsubscribe</h1>
    <p>Are you sure you want to unsubscribe?</p>
    <p>If something's off, I'd love to hear about it — <a href="mailto:hey@danielcorin.com">hey@danielcorin.com</a>.</p>
    <form method="POST" action="/api/unsubscribe?token=${token}" class="unsubscribe-form">
      <button type="submit" class="subscription-button">Yes, unsubscribe me</button>
    </form>
  `);
}
