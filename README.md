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
