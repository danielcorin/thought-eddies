---
title: Installing Python Packages with Nix
createdAt: 2024-03-04T18:48:33.000Z
updatedAt: 2024-03-04T18:48:33.000Z
publishedAt: 2024-03-04T18:48:33.000Z
tags:
  - nix
  - language_models
  - python
  - home-manager
  - flakes
draft: false
---

I've been meaning to try out Simon's [`llm`](https://github.com/simonw/llm/) package for a while now.
From reading the docs and following the development, it's a modular, meet-you-where-you-are CLI for running LLM inference locally or using almost any API out there.
In the past, I might have installed this with `brew`, but we run `nix` over here now so everything is harder first, then reproducible.

The `llm` package/cli is available as a few different nixpkgs

```sh
nix-env -qaP | grep llm

...
nixpkgs.python311Packages.llm python3.12-llm-0.13.1
nixpkgs.python312Packages.llm python3.12-llm-0.13.1
nixpkgs.llm llm-0.13.1
```

When I tried to add `llm` to the system packages list (both for `nix-darwin` and `home-manager`) I kept getting an install issue that looked something like this

```sh
path '/Users/danielcorin/.config/nix/flake.nix' does not contain a 'flake.nix', searching up
warning: Git tree '/Users/danielcorin/.config/nix' is dirty
building the system configuration...
warning: Git tree '/Users/danielcorin/.config/nix' is dirty
error: builder for '/nix/store/2gj7wi1q56jkydx5pxkqf9878j1n37yz-python3.11-llm-0.12.drv' failed with exit code 1;
       last 10 log lines:
       > removing build/bdist.macosx-11.0-arm64/wheel
       > Successfully built llm-0.12-py3-none-any.whl
       > Finished creating a wheel...
       > Finished executing pypaBuildPhase
       > Running phase: pythonRuntimeDepsCheckHook
       > Executing pythonRuntimeDepsCheck
       > Checking runtime dependencies for llm-0.12-py3-none-any.whl
       >   - openai<1.0 not satisfied by version 1.10.0
       >   - click-default-group>=1.2.3 not satisfied by version 1.2.2
       >   - pip not installed
       For full logs, run 'nix log /nix/store/2gj7wi1q56jkydx5pxkqf9878j1n37yz-python3.11-llm-0.12.drv'.
error: 1 dependencies of derivation '/nix/store/fnaywn0shm6h444k75v3hnrji0wc54ip-system-applications.drv' failed to build
error: 1 dependencies of derivation '/nix/store/h99h8yy8jwicahgjddzslxhkd09ck57d-darwin-system-24.05.20240205.0a25418+darwin4.bdbae6e.drv' failed to build
```

This result was perplexing because I had just validated the present of version 0.13.1 in the prior command.
I tried different variations to try and point my config to this version to no avail.
However, the breakthrough came when I ran `nix flake metadata` and realized I might need to update my flake dependencies.
It turns out these were about a month old and this version of `llm` was about a week old.

```sh
❯ nix flake update
warning: Git tree '/Users/danielcorin/.config/nix' is dirty
warning: updating lock file '/Users/danielcorin/.config/nix/flake.lock':
• Updated input 'home-manager':
    'github:nix-community/home-manager/f99eace7c167b8a6a0871849493b1c613d0f1b80' (2024-02-05)
  → 'github:nix-community/home-manager/23ff9821bcaec12981e32049e8687f25f11e5ef3' (2024-03-04)
• Updated input 'nix-darwin':
    'github:LnL7/nix-darwin/bdbae6ecff8fcc322bf6b9053c0b984912378af7' (2024-02-02)
  → 'github:LnL7/nix-darwin/daa03606dfb5296a22e842acb02b46c1c4e9f5e7' (2024-03-04)
• Updated input 'nixpkgs':
    'github:NixOS/nixpkgs/0a254180b4cad6be45aa46dce896bdb8db5d2930' (2024-02-05)
  → 'github:NixOS/nixpkgs/fa9a51752f1b5de583ad5213eb621be071806663' (2024-03-02)
warning: Git tree '/Users/danielcorin/.config/nix' is dirty
```

Now, the `llm` CLI is available on my path (I ended up adding it as a package to my home-manager flake)

```sh
which llm
/etc/profiles/per-user/danielcorin/bin/llm
```
