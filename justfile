default:
    @just --list

post name:
    python3 scripts/new_post.py "{{name}}"

log:
    python3 scripts/new_log.py

til category name:
    python3 scripts/new_til.py "{{category}}" "{{name}}"
