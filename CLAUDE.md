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

- **Content Collections** in `src/content/`:
  - `posts/`: Long-form blog posts organized by year
  - `logs/`: Daily logs organized by year/month
  - `til/`: "Today I Learned" entries organized by category
  - `feeds/`: External feed configuration for link blog
- All content types have strict Zod schemas defined in `src/content/config.ts`

### Component Architecture

- **Astro components** (`.astro`): Used for static content and layouts
- **React components** (`.tsx`): Used for interactive features (search, theme toggle)
- **Custom Prose Components**: Enhanced markdown rendering (Sidenote, Chat, CodeBlock, DocumentCitations)

### Key Patterns

1. **File-based routing**: Pages in `src/pages/` map directly to URLs
2. **OG Image Generation**: Dynamic social preview images in `og.png.ts` files using Satori
3. **Search**: Client-side search implemented in `src/components/SearchOverlay.tsx`
4. **Theme Support**: Light/dark mode toggle with localStorage persistence

### Important Files

- `astro.config.mjs`: Main Astro configuration (includes Vercel adapter, MDX setup)
- `tsconfig.json`: TypeScript config with path aliases (@components, @layouts, @styles, @utils)
- `src/utils/`: Utility functions for content processing, OG image generation, and data fetching

### Build Considerations

- Uses pnpm as package manager (not npm)
- Deployed to Vercel with SSR adapter
- Concurrent build limit set to 5 for OG image generation
- No test suite currently configured

### Directory Creation

When creating directories with special characters (brackets, dots, etc.) in bash:

- Always wrap the path in quotes: `mkdir -p "/path/with/[brackets]"`
- Without quotes, the shell will try to interpret brackets as glob patterns and fail

### Content Features

- Draft posts support (frontmatter: `draft: true`)
- Tag system with dedicated tag pages
- RSS feed generation
- Sitemap generation
- External analytics with GoatCounter

When modifying this codebase:

1. Follow the existing component patterns (Astro for static, React for interactive)
2. Maintain content schema compliance when adding new content
3. Use path aliases for imports (@components, @layouts, etc.)
4. Run `pnpm format` before committing changes
