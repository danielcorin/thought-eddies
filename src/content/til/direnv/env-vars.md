---
title: 'Direnv env var additions, overrides, and removals'
createdAt: 2026-05-04T16:17:03.426960
updatedAt: 2026-05-04T16:17:03.426960
publishedAt: 2026-05-04T16:17:03.426960
tags: null
draft: false
---

I use [`direnv`](https://direnv.net/) to overlay folder specific configurations in projects when I `cd` into them.

My default way to set it up is a

```sh title=".envrc"
dotenv
```

```sh title=".env"
VAR1=hey
```

Then you run

```sh
❯ direnv allow
direnv: loading ~/dev/thought-eddies/src/content/til/direnv/.envrc
direnv: export +VAR1
```

I was used to always seeing `+`s but today I saw `~`.

I learned `~` is a modification and `-` is a removal, so with a setup like the following (on my machine), the following file setup elicits all three.

```sh title=".envrc"
dotenv
unset PAGER
```

```sh title=".env"
VAR1=hey
EDITOR=code
```

```sh
❯ direnv allow
direnv: loading ~/dev/thought-eddies/src/content/til/direnv/.envrc
direnv: export +VAR1 -PAGER ~EDITOR
```
