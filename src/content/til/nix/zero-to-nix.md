---
title: Zero to Nix
createdAt: 2023-07-23T15:47:58.000Z
updatedAt: 2023-07-23T15:47:58.000Z
publishedAt: 2023-07-23T15:47:58.000Z
tags:
  - nix
draft: false
---

I started working through the [Zero to Nix](https://zero-to-nix.com/start/install) guide.
This is a light introduction that touch on a few of the command line tools that come with `nix` and how they can be used to build local and remote projects and enter developer environments.
While many of the examples are high level concept you'd probably apply when developing with `nix`, flake templates are one thing I could imagine returning to often.

```sh
nix flake init --template "github:DeterminateSystems/zero-to-nix#python-pkg"
```

It also references a tool called `home-manager` that I've heard about but not tried.
In researching this tool, it recommends familiarity with the Nix language so I'm going to research this as a [next step](/til/nix/language).
