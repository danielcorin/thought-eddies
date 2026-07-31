# CLAUDE.md

## What

Astro-based digital garden/blog. File-based content, no database.

## Project Structure

```
src/content/     # Content collections (posts, logs, til, projects, garden, etc.)
src/pages/       # File-based routing with dynamic routes
src/components/  # Astro components (.astro) + React for interactivity (.tsx)
src/layouts/     # Page layouts
src/styles/      # Global CSS
scripts/         # Utility scripts (new_post.py, new_til.py, new_log.py)
```

## Commands

```bash
pnpm dev          # Dev server at localhost:4321
pnpm build        # Production build
pnpm deploy       # Build + deploy to Cloudflare Workers
pnpm format       # Format with Prettier
```

Local environment variables are loaded from `.env` by mise (configured in
`mise.toml`). Do not add a direnv `.envrc`.

## Deployment

The site is a Cloudflare **Worker** (`thought-eddies`), deployed by
`.github/workflows/deploy-site.yml` on push to `main`. `@astrojs/cloudflare` v14
emits `dist/client` (static assets) + `dist/server` (SSR worker) and generates
`dist/server/wrangler.json`, which the root `wrangler.jsonc` feeds into — so
`wrangler deploy` must run _after_ `pnpm build`.

Nearly every route is prerendered; `src/pages/api/feed.ts` is the one SSR route.

Note: this used to be a Cloudflare **Pages** project. Pages expected a flat
`dist/`, so don't point a build at `dist` and expect it to serve — that
mismatch once buried the whole site under `/client/*`.

## Content Creation

Use mise tasks for new content (`just` is a project-local alias for `mise`):

- `mise run post "Title"` - new blog post
- `mise run til category "Title"` - new TIL entry
- `mise run log` - new daily log

Content schemas are defined in `src/content/config.ts`. Key fields:

- Posts: `draft: true` by default, set `draft: false` to publish
- All content uses frontmatter validated by Zod schemas

### Bluesky Comments

To show comments on a post, add the `bsky` frontmatter field with the post ID from the Bluesky URL. For `https://bsky.app/profile/danielcorin.com/post/3lnbcug67ys2d`:

```yaml
bsky: '3lnbcug67ys2d'
```

Full AT URIs (`at://did:plc:.../app.bsky.feed.post/...`) are also supported.

## Key Files

- `src/content/config.ts` - Content collection schemas
- `astro.config.mjs` - Build config, integrations, plugins
- `tsconfig.json` - Path aliases: `@components`, `@layouts`, `@styles`, `@utils`

## Notes

- Package manager: pnpm (not npm/yarn)
- Environment manager: mise (not direnv)
- Quote paths with special characters in bash
- Prefer Astro components; use React only when interactivity requires it
