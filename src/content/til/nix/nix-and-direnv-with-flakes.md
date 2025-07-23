---
title: Nix and Direnv with Flakes
createdAt: 2024-02-07T02:43:35.000Z
updatedAt: 2024-02-07T02:43:35.000Z
publishedAt: 2024-02-07T02:43:35.000Z
tags:
  - nix
  - direnv
  - flakes
  - hugo
  - python
draft: false
selected_work: true
---

Last year I wrote about [nix and direnv](/posts/2023/nix-and-direnv) as I explored the potential convenience of an isolated, project-specific environment.
There were some interesting initial learnings about nix, but I didn't really know what I was doing.
Now, I still don't know what I'm doing, but I've been doing it for longer.
As an example, I'm going to walk through how I set up a flake-driven development environment for this blog with direnv.

My blog is built with Hugo.
I also use Python to run content generation and extraction scripts, which require a few Python libraries.
I needed to write a flake to use nix to install all these components.

There seems to be a lot of different ways to write flakes.
I didn't know which to pick, so created a `flake.nix` file and prompted gpt-4 via Cursor to

> write a flake that provides a dev shell with hugo and python

It outputted

```nix
{
  description = "A shell with Hugo and Python";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            pythonEnv
            hugo
          ];
        };
      });
}
```

Next I prompted it to install the python library `arrow` and it gave me


```nix
{
  description = "A shell with Hugo and Python";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        pythonEnv = pkgs.python3.withPackages (ps: with ps; [
          arrow
        ]);
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            pythonEnv
            hugo
          ];
        };
      });
}
```

This structure was enough to get where I needed for this project.
It sounds like some folks believe the use of `flake-utils` is an anti-pattern.
I also came across `flake-parts` while looking for ways to solve this problem.

As I iterated, after adding each new piece, I ran `nix develop -c $SHELL` (thanks Davis for this [tip](https://davi.sh/til/nix/nix-develop-c/)) to validate the flake would build and that the dependency worked within the environment (e.g. I would run `python` then `import pytz` to confirm the library had been installed).
This is the final product:

```nix
{
  description = "My Blog built with Hugo";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/release-23.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        pythonEnv = pkgs.python3.withPackages (ps: with ps; [
          arrow
          python-frontmatter
          pytz
          sqlite-utils
        ]);
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            pythonEnv
            hugo
          ];
        };
      });
}
```

To wire up the auto-activation, I created an `.envrc` with the following content

```text
use flake
```

Finally, I ran `direnv allow` within my blog folder.
Now, when I cd into this folder, I'm immediately dropped into an environment containing all the dependencies defined in the flake (direnv also continues to use the same shell so I don't need to worry about specifying it manually as before).
When I cd out, these are all unloaded so they don't clutter up my system.

```sh
$ cd blog
direnv: loading ~/dev/blog/.envrc
direnv: using flake
direnv: nix-direnv: using cached dev shell
direnv: export +AR +AS +CC +CONFIG_SHELL +CXX +HOST_PATH +IN_NIX_SHELL +LD +LD_DYLD_PATH +MACOSX_DEPLOYMENT_TARGET +NIX_BINTOOLS +NIX_BINTOOLS_WRAPPER_TARGET_HOST_aarch64_apple_darwin +NIX_BUILD_CORES +NIX_CC +NIX_CC_WRAPPER_TARGET_HOST_aarch64_apple_darwin +NIX_CFLAGS_COMPILE +NIX_DONT_SET_RPATH +NIX_DONT_SET_RPATH_FOR_BUILD +NIX_ENFORCE_NO_NATIVE +NIX_HARDENING_ENABLE +NIX_IGNORE_LD_THROUGH_GCC +NIX_LDFLAGS +NIX_NO_SELF_RPATH +NIX_STORE +NM +PATH_LOCALE +RANLIB +SIZE +SOURCE_DATE_EPOCH +STRINGS +STRIP +__darwinAllowLocalNetworking +__impureHostDeps +__propagatedImpureHostDeps +__propagatedSandboxProfile +__sandboxProfile +__structuredAttrs +buildInputs +buildPhase +builder +cmakeFlags +configureFlags +depsBuildBuild +depsBuildBuildPropagated +depsBuildTarget +depsBuildTargetPropagated +depsHostHost +depsHostHostPropagated +depsTargetTarget +depsTargetTargetPropagated +doCheck +doInstallCheck +dontAddDisableDepTrack +mesonFlags +name +nativeBuildInputs +out +outputs +patches +phases +preferLocalBuild +propagatedBuildInputs +propagatedNativeBuildInputs +shell +shellHook +stdenv +strictDeps +system ~PATH
```

It was nice to get this working end to end and get a perspective on what developer experience could look like with nix, but still somewhat unsatisfying to not have a consistent starting point for creating a flake for a project.
I plan to continue researching `flake-parts`, `flake-utils` and flake templates to get a sense of best practices in this area.
