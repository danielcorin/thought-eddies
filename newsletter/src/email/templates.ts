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
  <title>Newsletter</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      background-color: #ffffff;
    }
    a { color: #2563eb; text-decoration: underline; }
  </style>
</head>
<body>
  ${content}
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
  const webLink = url
    ? `<p style="margin-bottom: 30px;"><a href="${url}" style="${linkStyle}">Read on the web</a></p>`
    : '';

  return emailWrapper(`
    <h1 style="margin-top: 0; font-size: 24px;">${subject}</h1>
    ${webLink}
    <div>${html}</div>
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

export function unsubscribePage(token: string): string {
  return pageWrapper(`
    <h1>Unsubscribe</h1>
    <p>Are you sure you want to unsubscribe?</p>
    <p>If something's off, I'd love to hear about it — <a href="mailto:hey@danielcorin.com">hey@danielcorin.com</a>.</p>
    <form method="POST" action="/api/unsubscribe?token=${token}">
      <button type="submit" style="
        padding: 10px 20px;
        background-color: #1a1a1a;
        color: #ffffff;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
      ">Yes, unsubscribe me</button>
    </form>
  `);
}
