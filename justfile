default:
    @just --list

install:
    npm install

run:
    npm run dev

dev:
    npm run dev

build:
    npm run build

preview:
    npm run preview

post name:
    python3 scripts/new_post.py "{{name}}"

log:
    python3 scripts/new_log.py

til category name:
    python3 scripts/new_til.py "{{category}}" "{{name}}"
