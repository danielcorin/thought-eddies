---
title: Installing git-lfs with Nix
createdAt: 2024-03-29T10:34:02.000Z
updatedAt: 2024-03-29T10:34:02.000Z
publishedAt: 2024-03-29T10:34:02.000Z
tags:
  - git
  - git-lfs
  - nix
draft: false
---

I was pulling the [`openai/evals`](https://github.com/openai/evals) repo and trying to running some of the examples.
The repo uses `git-lfs`, so I installed that to my system using `home-manager`.

```nix
{ config, pkgs, ... }:
let
    systemPackages = with pkgs; [
        # ...
        git-lfs
        # ...
    ];
in
{
    programs.git = {
        enable = true;
        lfs.enable = true;
        # ...
    };
};
```

After applying these changes, I could run

```sh
git lfs install
git lfs pull
```

to populate the `jsonl` files in the repo and run the examples.
