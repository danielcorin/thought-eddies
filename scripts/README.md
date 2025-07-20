# Post Frontmatter Converter

This script converts post frontmatter from various legacy formats to match the schema defined in `src/content/config.ts`.

## Prerequisites

Install the required dependency:

```bash
npm install --save-dev gray-matter
```

## Usage

```bash
# Dry run - see what would change without modifying files
node scripts/convert-posts-frontmatter.js --dry-run

# Dry run with verbose output - see detailed changes
node scripts/convert-posts-frontmatter.js --dry-run --verbose

# Convert all posts (modifies files)
node scripts/convert-posts-frontmatter.js

# Convert with verbose output
node scripts/convert-posts-frontmatter.js --verbose
```

## What it does

The script converts frontmatter to match this schema:

```typescript
{
  title: string
  description?: string
  location?: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  tags?: string[] | null
  image?: string
  draft?: boolean (defaults to true)
  aliases?: string[]
  githubUrl?: string
  series?: string
}
```

### Conversions performed:

1. **Date handling**:
   - Converts `date` field to `createdAt`
   - Sets `updatedAt` to the same as `createdAt` if not present
   - Sets `publishedAt` if `draft: false`
   - Handles various date formats (ISO 8601, YYYY-MM-DD, etc.)

2. **Tags normalization**:
   - Merges `tags` and `categories` into a single `tags` array
   - Handles both array and string formats

3. **Draft status**:
   - Defaults to `draft: true` unless explicitly set to `false`
   - Posts with `draft: false` get a `publishedAt` date

4. **Aliases preservation**:
   - Preserves `aliases` array for URL redirects
   - Old URLs listed in aliases will redirect to the new post URL

5. **Field cleanup**:
   - Removes legacy fields like `categories` (merged into tags)
   - Removes undefined fields from output

## Example

Before:

```yaml
---
aliases:
  - /code/2018/04/06/go-context.html
  - /posts/2018-04-06-go-context
categories: code
date: '2018-04-06T21:00:00Z'
tags:
  - go
title: Tracking a call stack in Go with context
---
```

After:

```yaml
---
title: Tracking a call stack in Go with context
createdAt: 2018-04-06T21:00:00.000Z
updatedAt: 2018-04-06T21:00:00.000Z
tags:
  - go
  - code
draft: true
aliases:
  - /code/2018/04/06/go-context.html
  - /posts/2018-04-06-go-context
---
```
