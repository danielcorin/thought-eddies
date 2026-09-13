# Thought Eddies

A digital garden and blog platform built with Astro, featuring multiple content types, progressive disclosure, and full-text search.

## Features

- **Multiple Content Types**: Blog posts, daily logs, TIL entries, projects, and more
- **Full-Text Search**: Client-side search functionality
- **Dark Mode Support**: Automatic theme switching
- **RSS Feeds**: Auto-generated feeds for all content

## Development

This project uses [mise](https://mise.jdx.dev/) to load local environment
variables from `.env`. With mise activated in your shell, trust the project
configuration the first time you enter the repository:

```sh
mise trust
```

Then install the project dependencies:

```sh
pnpm install

# Start development server on localhost:4321
pnpm dev

# Format code with Prettier
pnpm format

# Check formatting
pnpm format:check
```

## Building for Production

```sh
# Build the site
pnpm build

# Preview production build locally
pnpm preview
```

## Project Tasks

Common tasks are defined in `mise.toml`. Run `mise run` with no task to list
them. The project also defines `just` as a shell alias for `mise`, so the
old task commands continue to work when mise is activated.

```sh
# List all available commands
mise run

# Create a new blog post
mise run post "My New Post Title"

# Create a new daily log entry
mise run log

# Create a new TIL entry
mise run til "category" "TIL Title"
```

## Content Management

### Rebuilding the map

With Ollama installed and `pnpm install` completed, run:

```sh
mise run rebuild-map
```

This starts a temporary local Ollama server when needed, downloads
`qwen3-embedding:8b` if missing, and rebuilds `src/data/embeddings.json`.
It reuses cached embeddings for unchanged content. A server started by the
script is stopped afterward; an existing server stays running.

Drafts are excluded. Blog posts must explicitly set `draft: false`; other
included collections are logs, TILs, garden, projects, now, and uses.
Refresh `/map` locally to see the result. Commit the generated JSON to include
the refreshed map in the next deployment; a regular site build does not
regenerate it.

The script can also be run directly with `node scripts/rebuild_map.mjs`.
`mise run embed` remains the generator-only command for an already configured
Ollama server. The server address and model are shared in `scripts/map-config.mjs`.

### Collections

Content is organized in `src/content/` with the following collections:

- `posts/`: Long-form blog posts
- `logs/`: Daily logs
- `til/`: Today I Learned entries
- `projects/`: Project showcases
- `feeds/`: RSS feed configuration
- `uses/`: "What I Use" page
- `now/`: "What I'm Doing Now" page

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

## License

MIT
