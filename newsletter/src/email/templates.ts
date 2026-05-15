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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter — danielcorin.com</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      color: #2d3436;
      line-height: 1.6;
      min-height: 100vh;
      background-color: #f4f1e4;
      background-image: radial-gradient(
        color-mix(in srgb, #b4b4b4 60%, transparent) 1px,
        transparent 1px
      );
      background-size: 20px 20px;
    }
    .page-container {
      max-width: 75ch;
      margin: 0 auto;
      padding: 3rem 2rem;
    }
    h1 {
      font-family: 'Futura', sans-serif;
      font-weight: 600;
      font-size: 2.25rem;
      line-height: 1.4;
      color: #2d3436;
      margin-bottom: 0.75rem;
    }
    p {
      font-size: 1rem;
      margin-bottom: 1rem;
      color: #2d3436;
    }
    a { color: #0984e3; text-decoration: underline; transition: opacity 0.2s; }
    a:hover { opacity: 0.8; }
    a:focus-visible { outline: 2px solid #0984e3; outline-offset: 2px; }
    .site-link {
      font-family: 'Futura', sans-serif;
      font-weight: bold;
      font-size: 1.125rem;
      color: #2d3436;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 2rem;
    }
    .site-link:hover { color: #0984e3; }
    .muted { color: #636e72; font-size: 0.875rem; }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1c1b17;
        color: #cccccc;
        background-image: radial-gradient(
          color-mix(in srgb, #4a4a4a 60%, transparent) 1px,
          transparent 1px
        );
      }
      h1 { color: #cccccc; }
      p { color: #cccccc; }
      a { color: #4dabf7; }
      a:focus-visible { outline-color: #4dabf7; }
      .site-link { color: #cccccc; }
      .site-link:hover { color: #4dabf7; }
      .muted { color: #a8a8a8; }
      input[type="email"] {
        background: #2a2925 !important;
        color: #cccccc !important;
        border-color: #4a4a4a !important;
      }
      button[type="submit"] {
        background-color: #2a2925 !important;
        color: #cccccc !important;
        border-color: #4a4a4a !important;
      }
    }
    @media (max-width: 640px) {
      .page-container { padding: 2rem 1.5rem; }
      h1 { font-size: 1.875rem; }
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
    <form method="POST" action="/api/subscribe" style="margin: 2rem 0; display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
      <input type="email" name="email" placeholder="you@example.com" required style="
        font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        border: 1px solid #b4b4b4;
        border-radius: 4px;
        width: 100%;
        max-width: 300px;
        background: #e8e5d8;
        color: #2d3436;
      ">
      <div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;">
        <input type="text" name="website" tabindex="-1" autocomplete="off">
      </div>
      <div class="cf-turnstile" data-sitekey="${turnstileSiteKey}"></div>
      <button type="submit" style="
        font-family: 'Futura', sans-serif;
        display: block;
        padding: 0.75rem 1.5rem;
        background-color: #e8e5d8;
        color: #2d3436;
        border: 1px solid #b4b4b4;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s, color 0.2s;
      " onmouseover="var d=window.matchMedia('(prefers-color-scheme:dark)').matches;this.style.backgroundColor=d?'#4dabf7':'#0984e3';this.style.color='#fff';this.style.borderColor=d?'#4dabf7':'#0984e3'" onmouseout="var d=window.matchMedia('(prefers-color-scheme:dark)').matches;this.style.backgroundColor=d?'#2a2925':'#e8e5d8';this.style.color=d?'#cccccc':'#2d3436';this.style.borderColor=d?'#4a4a4a':'#b4b4b4'">Subscribe</button>
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
    <form method="POST" action="/api/unsubscribe?token=${token}">
      <button type="submit" style="
        font-family: 'Futura', sans-serif;
        padding: 0.75rem 1.5rem;
        background-color: #e8e5d8;
        color: #2d3436;
        border: 1px solid #b4b4b4;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s, color 0.2s;
      " onmouseover="var d=window.matchMedia('(prefers-color-scheme:dark)').matches;this.style.backgroundColor=d?'#4dabf7':'#0984e3';this.style.color='#fff';this.style.borderColor=d?'#4dabf7':'#0984e3'" onmouseout="var d=window.matchMedia('(prefers-color-scheme:dark)').matches;this.style.backgroundColor=d?'#2a2925':'#e8e5d8';this.style.color=d?'#cccccc':'#2d3436';this.style.borderColor=d?'#4a4a4a':'#b4b4b4'">Yes, unsubscribe me</button>
    </form>
  `);
}
