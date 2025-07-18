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
