import { globSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Workers static assets answer `/posts/x` with a 307 to `/posts/x/`, so every
// internal link without a trailing slash costs crawlers a temporary redirect.
// Links come from dozens of templates and from Markdown content, so rewrite
// them once in the built HTML: any `href="/path"` whose `/path/index.html`
// exists gains the slash. Links built in the browser are left alone.
/** @returns {import('astro').AstroIntegration} */
export default function trailingSlashLinks() {
  return {
    name: 'trailing-slash-links',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        // Some alias directories end in `.html` (e.g. `/code/.../qc.html/`).
        const files = globSync('**/*.html', { cwd: root }).filter((file) =>
          statSync(`${root}/${file}`).isFile()
        );
        const directories = new Set(
          files
            .filter((file) => file.endsWith('index.html'))
            .map((file) => `/${file.slice(0, -'index.html'.length)}`)
        );

        let rewritten = 0;
        for (const file of files) {
          const path = `${root}/${file}`;
          const html = readFileSync(path, 'utf8');
          const updated = html.replace(
            /href="(\/[^"#?]*[^"#?/])([?#][^"]*)?"/g,
            (match, pathname, suffix = '') => {
              if (!directories.has(`${pathname}/`)) return match;
              rewritten++;
              return `href="${pathname}/${suffix}"`;
            }
          );
          if (updated !== html) writeFileSync(path, updated);
        }
        logger.info(`Added trailing slashes to ${rewritten} internal links.`);
      },
    },
  };
}
