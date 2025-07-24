---
title: Migrating to Modules in Hugo
createdAt: 2023-07-02T14:56:00.000Z
updatedAt: 2023-07-02T14:56:00.000Z
tags:
  - hugo
  - go
  - modules
  - git
  - submodules
draft: false
---

Go introduced modules several years ago as part of a dependency management system.
My Hugo site is still using git submodules to manage its theme.
I attempted to migrate to Go's submodules but eventually ran into a snag when trying to deploy the site.

To start, remove the submodule

```sh
git submodule deinit --all
```

and then remove the `themes` folder

```sh
git rm -r themes
```

To finish the cleanup, remove the `theme` key from `config.toml`.

Next, setup the project to use modules

```sh
go mod init github.com/danielcorin/blog
```

and added the theme as a module to the `config.toml`

```toml
[module]
[[module.imports]]
  path = 'github.com/lukeorth/poison'
```

To update the `go.mod` file, run

```sh
hugo mod get -u
```

which should add the module to the `go.mod` file

```text
module github.com/danielcorin/blog

go 1.19

require github.com/lukeorth/poison v0.0.0-20230630204947-22c6c4aba785 // indirect
```

Running `hugo serve` and `hugo --gc` should both still work.

I pushed this changed but it failed to build on Vercel, where I have my site deployed.
It looks like `go` isn't available during build time

```text
Running "vercel build"
Vercel CLI 31.0.1
Installing Hugo version 0.110.0
Error: failed to download modules: binary with name "go" not found
Total in 0 ms
Error: Command "hugo --gc --minify --ignoreCache --verbose" exited with 255
BUILD_UTILS_SPAWN_255: Command "hugo --gc --minify --ignoreCache --verbose" exited with 255
```

I may return to this though I do have some concerns about whether fixing the issue will increase build time, which is something I'd like to avoid.
