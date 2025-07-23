---
title: Fresh Hugo Setup
createdAt: 2024-02-06T20:39:24.000Z
updatedAt: 2024-02-06T20:39:24.000Z
publishedAt: 2024-02-06T20:39:24.000Z
tags:
  - hugo
  - git
  - submodule
draft: false
---

I just did a fresh clone of my site for the first time in (probably) years.
I've been using nix on my new system, so I was writing a flake to setup a development environment for the site with Hugo and Python.
When I ran `hugo serve`, I saw all my content show up

```text
                   | EN
-------------------+------
  Pages            | 528
  Paginator pages  |  20
  Non-page files   |   0
  Static files     | 173
  Processed images |   0
  Aliases          |  53
  Sitemaps         |   1
  Cleaned          |   0
```

but when I went to load the local site at `localhost:1313`, I saw "Page Not Found".
Being new to nix and still not quite understanding everything I'm doing, I assumed it was something wrong with my flake or system install.
After half an hour, tearing things up and even checking my old system and deployment pipeline to make sure the version of Hugo I was using with nix was one that was close to my old system's, I starting paying more attention to the warnings in the console

```sh
WARN  found no layout file for "html" for kind "page": You should create a template file which matches Hugo Layouts Lookup Rules for this combination.
WARN  found no layout file for "html" for kind "home": You should create a template file which matches Hugo Layouts Lookup Rules for this combination.
```

Something finally clicked and I realized I needed to initialize my theme as a submodule

```sh
git submodule update --init --recursive
```

Afterwards, everything worked just as before.
