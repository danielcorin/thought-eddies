#!/usr/bin/env node

import { readFileSync } from "fs";
import { resolve, relative } from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const SITE_URL = "https://www.danielcorin.com";
const NEWSLETTER_URL =
  process.env.NEWSLETTER_URL || "https://newsletter.danielcorin.com";
const API_SECRET = process.env.NEWSLETTER_API_SECRET;

async function mdToHtml(md) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);
  return String(result);
}

function fileToPostUrl(filePath) {
  // src/content/posts/2026/stateful-agent-collaboration/index.mdx
  // -> /posts/2026/stateful-agent-collaboration/
  const rel = relative("src/content", filePath);
  const urlPath = rel.replace(/\/index\.mdx?$/, "").replace(/\.mdx?$/, "");
  return `${SITE_URL}/${urlPath}/`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node scripts/send_newsletter.mjs <post-file> [--dry-run]");
    console.error("");
    console.error("Examples:");
    console.error("  node scripts/send_newsletter.mjs src/content/posts/2026/stateful-agent-collaboration/index.mdx --dry-run");
    console.error("  node scripts/send_newsletter.mjs src/content/posts/2026/stateful-agent-collaboration/index.mdx");
    process.exit(1);
  }

  const filePath = resolve(args[0]);
  const dryRun = args.includes("--dry-run");

  if (!API_SECRET && !dryRun) {
    console.error("NEWSLETTER_API_SECRET env var is required (or use --dry-run)");
    process.exit(1);
  }

  // Parse frontmatter and content
  const raw = readFileSync(filePath, "utf-8");
  const { data: fm, content } = matter(raw);

  if (fm.draft) {
    console.error(`Skipping draft: ${filePath}`);
    process.exit(0);
  }

  const title = fm.title;
  if (!title) {
    console.error(`No title found in frontmatter: ${filePath}`);
    process.exit(1);
  }

  const postUrl = fileToPostUrl(relative(process.cwd(), filePath));

  // Strip MDX imports and JSX components (they won't render in email)
  const cleanedContent = content
    .replace(/^import\s+.*$/gm, "")
    .replace(/<[A-Z][a-zA-Z]*\s*[^>]*\/>/g, "")
    .replace(/<[A-Z][a-zA-Z]*\s*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, "")
    .trim();

  // Convert markdown to HTML
  const bodyHtml = await mdToHtml(cleanedContent);

  // Build email HTML with excerpt + read more link
  const subject = `New post: ${title}`;
  const html = [
    `<h1>${title}</h1>`,
    fm.description ? `<p>${fm.description}</p>` : "",
    bodyHtml,
    `<p style="margin-top: 30px;"><a href="${postUrl}">Read on the web →</a></p>`,
  ]
    .filter(Boolean)
    .join("\n");

  const payload = { subject, html, url: postUrl };

  if (dryRun) {
    console.log("--- DRY RUN ---");
    console.log(`Subject: ${subject}`);
    console.log(`URL: ${postUrl}`);
    console.log(`HTML length: ${html.length} chars`);
    console.log("");
    console.log(html);
    process.exit(0);
  }

  console.log(`Sending newsletter: ${subject}`);
  console.log(`Post URL: ${postUrl}`);

  const res = await fetch(`${NEWSLETTER_URL}/api/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (res.ok) {
    console.log(`Sent to ${result.sent} subscriber(s)`);
  } else {
    console.error(`Failed: ${result.error || res.statusText}`);
    process.exit(1);
  }
}

main();
