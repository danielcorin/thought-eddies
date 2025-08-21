# Thought Eddies

A digital garden and blog platform built with Astro, featuring multiple content types, progressive disclosure, and full-text search.

## Features

- **Multiple Content Types**: Blog posts, daily logs, TIL entries, projects, and more
- **Full-Text Search**: Client-side search functionality
- **Dark Mode Support**: Automatic theme switching
- **RSS Feeds**: Auto-generated feeds for all content

## Development

```sh
# Install dependencies
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

## Using Just

This project includes a `justfile` for common tasks:

```sh
# List all available commands
just

# Create a new blog post
just post "My New Post Title"

# Create a new daily log entry
just log

# Create a new TIL entry
just til "category" "TIL Title"
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
