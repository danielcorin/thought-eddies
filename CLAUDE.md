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
pnpm format       # Format with Prettier
```

Local environment variables are loaded from `.env` by mise (configured in
`mise.toml`). Do not add a direnv `.envrc`.

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
