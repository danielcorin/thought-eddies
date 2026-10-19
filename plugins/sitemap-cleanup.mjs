import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// @astrojs/sitemap lists every page and knows nothing about page metadata.
// After it runs, read each listed page's built HTML to:
// - drop pages marked noindex (alias redirect stubs, tags, pagination), so
//   the sitemap lists only URLs we want indexed;
// - add <lastmod> from the page's article modified/published time, so
//   crawlers can tell which entries changed.
// Must be listed after sitemap() in the integrations array.
/** @returns {import('astro').AstroIntegration} */
export default function sitemapCleanup() {
  return {
    name: 'sitemap-cleanup',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        let dropped = 0;
        let dated = 0;

        for (const file of globSync('sitemap-[0-9]*.xml', { cwd: root })) {
          const path = `${root}/${file}`;
          const xml = readFileSync(path, 'utf8').replace(
            /<url><loc>([^<]+)<\/loc>(.*?)<\/url>/g,
            (entry, loc, rest) => {
              const page = `${root}${decodeURIComponent(new URL(loc).pathname)}index.html`;
              if (!existsSync(page)) return entry;
              const html = readFileSync(page, 'utf8');
              if (/<meta name="robots" content="noindex/.test(html)) {
                dropped++;
                return '';
              }
              const time =
                html.match(/property="article:modified_time" content="([^"]+)"/) ??
                html.match(/property="article:published_time" content="([^"]+)"/);
              if (!time) return entry;
              dated++;
              return `<url><loc>${loc}</loc><lastmod>${time[1]}</lastmod>${rest}</url>`;
            }
          );
          writeFileSync(path, xml);
        }
        logger.info(
          `Dropped ${dropped} noindex pages from the sitemap; dated ${dated}.`
        );
      },
    },
  };
}
