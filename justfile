default:
    @just --list

dev:
    pnpm dev

run: dev

embed:
    pnpm embed

post name:
    python3 scripts/new_post.py "{{name}}"

log:
    python3 scripts/new_log.py

til category name:
    python3 scripts/new_til.py "{{category}}" "{{name}}"


# Publish posts to standard.site via Sequoia
sequoia-publish *args:
    npx sequoia publish {{args}}

# Dry-run publish to preview changes
sequoia-dry-run:
    npx sequoia publish --dry-run

# Inject AT URI link tags into built HTML
sequoia-inject:
    npx sequoia inject

# Sync drafts from Drafts.app
drafts-sync:
    python3 scripts/sync_drafts.py

# Watch for new drafts and sync them
drafts-watch:
    python3 scripts/sync_drafts.py --watch

# List drafts that would be synced
drafts-list:
    python3 scripts/sync_drafts.py --list

# Send newsletter for a post (use --dry-run to preview)
nl-send file *args:
    node scripts/send_newsletter.mjs {{file}} {{args}}

# Open newsletter subscriber admin UI
nl-admin:
    node newsletter/admin.js
