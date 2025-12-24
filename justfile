default:
    @just --list

dev:
    pnpm dev

run: dev

post name:
    python3 scripts/new_post.py "{{name}}"

log:
    python3 scripts/new_log.py

til category name:
    python3 scripts/new_til.py "{{category}}" "{{name}}"


# Sync drafts from Drafts.app
drafts-sync:
    python3 scripts/sync_drafts.py

# Watch for new drafts and sync them
drafts-watch:
    python3 scripts/sync_drafts.py --watch

# List drafts that would be synced
drafts-list:
    python3 scripts/sync_drafts.py --list
