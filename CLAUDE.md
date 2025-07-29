# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev         # Start development server on localhost:4321

# Build
pnpm build       # Build for production (verbose output)
pnpm preview     # Preview production build locally

# Code Quality
pnpm format      # Format all files with Prettier
pnpm format:check # Check if files are formatted correctly
```

## High-Level Architecture

This is an Astro-based digital garden/blog platform with the following key architectural elements:

### Content Organization

- **Content Collections** in `src/content/` (using Astro's glob loader):
  - `posts/`: Long-form blog posts organized by year
  - `logs/`: Daily logs organized by year/month
  - `til/`: "Today I Learned" entries organized by category
  - `feeds/`: External feed configuration for link blog
  - `projects/`: Project showcases with dedicated pages
  - `uses/`: "What I Use" pages with date-based entries
  - `now/`: "Now" pages tracking current activities
  - `home/`: Homepage content
- All content types have strict Zod schemas defined in `src/content/config.ts`
- Content supports both `.md` and `.mdx` files
- Posts can have multiple zoom levels for progressive disclosure

### Component Architecture

- **Astro components** (`.astro`): Used for static content and layouts
  - Layout components: `Navigation`, `Footer`, `TableOfContents`, `ReadingProgress`
  - Content components: `PostCard`, `CategoryGrid`, `Pagination`, `Breadcrumbs`
  - UI components: `Tag`, `TypeLabel`, `YearPill`, `SearchResult`
- **React components** (`.tsx`): Used for interactive features
  - `SearchPage`: Full-text search functionality
  - `ZoomableDocument`: Progressive content disclosure
  - `RSSFeedLinksClient`: Dynamic RSS feed links
- **Custom Prose Components**: Enhanced markdown rendering
  - `Sidenote`: Margin notes for additional context
  - `Chat`: Conversation-style content display
  - `CodeBlock`: Enhanced code highlighting
  - `DocumentCitations`: Academic-style citations
  - `Aside`: Callout boxes
  - `Spoiler`: Collapsible content sections

### Routing and Pages

- **File-based routing** in `src/pages/`:
  - Dynamic routes using brackets: `[...slug]`, `[year]`, `[category]`, etc.
  - Catch-all alias route for redirects: `[...alias].astro`
  - Markdown endpoints (`.md.ts` files) for enhanced content pages
  - OG image generation endpoints (`og.png.ts`)
  - API endpoints in `/api/` directory
- **Special pages**:
  - `/search`: Client-side search interface
  - `/feeds`: External feed aggregation
  - `/llms.txt`: LLM-friendly site summary
  - RSS feeds: `/rss.xml`, `/index.xml`

### Key Configuration

- **astro.config.mjs**:
  - Site URL: `https://www.danielcorin.com`
  - Local dev host: `local.danielcorin.com`
  - Build concurrency: 5 (for OG image generation)
  - Integrations: React, MDX, Tailwind, Expressive Code, Sitemap
  - Markdown: Custom remark/rehype plugins, Monokai syntax theme
- **tsconfig.json**:
  - Path aliases: `@components`, `@layouts`, `@styles`, `@utils`
  - React JSX configuration
  - Strict TypeScript mode
- **tailwind.config.mjs**: Dark mode via class strategy
- **vercel.json**: Sitemap redirect configuration

### Content Features

- **Draft system**: Posts default to `draft: true`
- **Publishing workflow**: `draft: false` sets `publishedAt` date
- **Aliases**: URL redirects for legacy paths
- **Tags**: Unified tagging system across content types
- **Series**: Group related posts together
- **Image support**: Local images in content directories
- **External links**: Auto-marked with remark plugin
- **RSS/Atom feeds**: Auto-generated from content
- **Sitemap**: Auto-generated with @astrojs/sitemap
- **Analytics**: External tracking (GoatCounter)

### Utility Scripts

- `new_post.py`: Create new blog post with frontmatter
- `new_til.py`: Create new TIL entry
- `new_log.py`: Create new daily log
- Post frontmatter converter for legacy content migration

### Development Patterns

1. **Component Usage**:
   - Use Astro components for static, server-rendered content
   - Use React components only when client-side interactivity is needed
   - Leverage Astro's partial hydration for optimal performance

2. **Content Management**:
   - Place content in appropriate collection directories
   - Follow existing frontmatter schemas strictly
   - Use MDX for interactive content, MD for simple posts
   - Organize by date/category as per existing patterns

3. **Styling**:
   - Use Tailwind utility classes
   - Dark mode support via `dark:` prefix
   - Custom CSS in `src/styles/` for global styles

4. **Code Quality**:
   - Format with Prettier before commits
   - Use TypeScript path aliases for imports
   - Follow existing file naming conventions

### Build and Deployment

- **Package Manager**: pnpm (NOT npm or yarn)
- **Deployment**: Vercel with SSR adapter
- **Build Process**:
  - Concurrent OG image generation (limit: 5)
  - Markdown processing with custom plugins
  - Static asset optimization
- **Environment**: No test suite configured

### Important Notes

- Directory paths with special characters must be quoted in bash
- The site uses a custom particles background (astro-particles)
- Multiple content visualization options (standard, zoomable)
- Extensive use of dynamic imports for performance
- No database - all content is file-based
