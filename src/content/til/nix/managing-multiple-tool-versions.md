---
title: Managing Multiple Tool Versions with Nix
createdAt: 2024-02-19T21:14:28.000Z
updatedAt: 2024-02-19T21:14:28.000Z
publishedAt: 2024-02-19T21:14:28.000Z
tags:
  - nix
  - flakes
  - direnv
  - asdf
  - homebrew
draft: false
---

This post is extremely similar to [nix flakes and direnv](/til/nix/nix-and-direnv-with-flakes).
Here, I repeated my process, but with a little more thought and a little less language model magic.

I setup my new computer to use nix, switching away from Homebrew, which I've used to manage and install dependencies on my system for about a decade.
My goal was to unify my configuration management with my package management.
Thus far, I've been quite satisfied.
However, I've also relied on `asdf` to manage and switch between multiple versions of things like Python and Node.
Lately, I've been jumping between projects that use different versions of node.
While modifying my [`home.nix`](https://github.com/danielcorin/nix-config/blob/main/home.nix) file and rebuilding would be pretty simple, I wanted to see if I could enable easy access to multiple versions of node at the same time.
My first attempt was to add both of the following to my `home.packages`

```nix
nodejs
nodejs-18_x
```

Nix was able to rebuild this configuration, but I only was still able to use a single version of node (not 18, but the LTS version 20.x.x at the time of this writing).
After a bit of searching and prompting, I learned that I could define two separate packages in the following way

```nix
(writeShellScriptBin "node" ''
    #!${zsh}/bin/zsh
    exec ${nodejs}/bin/node "$@"
'')
(writeShellScriptBin "node18" ''
    #!${zsh}/bin/zsh
    exec ${nodejs-18_x}/bin/node "$@"
'')
```

After rebuilding the changes, I could run the two different versions of node with the aliases I defined

```sh
$ node -v
v20.11.0
$ node18 -v
v18.19.0
```

This solution fit the initial need but Node projects don't typically reference tool version in name (as Python does with `python3`).
It would be easy enough to run a standalone script with `node18`, but a bit more confusing to use that convention for a project that requires Node 18.
Typically, the interpreter is just referred to as `node`.

This setup is still a little unusual, so I was motivated to come up with a more consistent starting point to use nix for setting up project specific dependencies.
Ironically, it ended up looking a lot like my process in [this post](/til/nix/nix-and-direnv-with-flakes).
I'm going to include it again here because it includes the use of a flake template, something I haven't been doing consistently.

To start, I ran

```sh
nix flake init -t github:numtide/flake-utils
```

This writes a flake with

```nix
{
  description = "Flake utils demo";

  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        packages = rec {
          hello = pkgs.hello;
          default = hello;
        };
        apps = rec {
          hello = flake-utils.lib.mkApp { drv = self.packages.${system}.hello; };
          default = hello;
        };
      }
    );
}
```

The aim is to setup flake that will make project-specific tools available when I `cd` into the project folder.
Following this [example](https://github.com/NixOS/templates/blob/master/utils-generic/flake.nix), a few minor modifications make this possible.

```nix
{
  description = "Flake utils demo";

  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system}; in
      {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            # packages go here
          ];
        };
      }
    );
}
```

Let's say I want to install `deno`

To start, I validate I _don't_ have it installed

```sh
$ deno
zsh: command not found: deno
```

Now, I'll add an `.envrc` with

```text
use flake
```

and run

```sh
direnv allow
```

in the directory.

Finally, I'll add `deno` to my packages list, save then run

```sh
cd .
```

which should output a bunch of stuff like


```sh
$ cd .
direnv: loading ~/dev/workshop/myproj/.envrc
direnv: using flake
direnv: nix-direnv: renewed cache
direnv: export +AR +AS +CC +CONFIG_SHELL +CXX +HOST_PATH +IN_NIX_SHELL +LD +LD_DYLD_PATH +MACOSX_DEPLOYMENT_TARGET +NIX_BINTOOLS +NIX_BINTOOLS_WRAPPER_TARGET_HOST_aarch64_apple_darwin +NIX_BUILD_CORES +NIX_CC +NIX_CC_WRAPPER_TARGET_HOST_aarch64_apple_darwin +NIX_CFLAGS_COMPILE +NIX_DONT_SET_RPATH +NIX_DONT_SET_RPATH_FOR_BUILD +NIX_ENFORCE_NO_NATIVE +NIX_HARDENING_ENABLE +NIX_IGNORE_LD_THROUGH_GCC +NIX_LDFLAGS +NIX_NO_SELF_RPATH +NIX_STORE +NM +PATH_LOCALE +RANLIB +SIZE +SOURCE_DATE_EPOCH +STRINGS +STRIP +ZERO_AR_DATE +__darwinAllowLocalNetworking +__impureHostDeps +__propagatedImpureHostDeps +__propagatedSandboxProfile +__sandboxProfile +__structuredAttrs +buildInputs +buildPhase +builder +cmakeFlags +configureFlags +depsBuildBuild +depsBuildBuildPropagated +depsBuildTarget +depsBuildTargetPropagated +depsHostHost +depsHostHostPropagated +depsTargetTarget +depsTargetTargetPropagated +doCheck +doInstallCheck +dontAddDisableDepTrack +mesonFlags +name +nativeBuildInputs +out +outputs +patches +phases +preferLocalBuild +propagatedBuildInputs +propagatedNativeBuildInputs +shell +shellHook +stdenv +strictDeps +system ~PATH
```

Now, when I run

```sh
$ deno
Deno 1.40.5
exit using ctrl+d, ctrl+c, or close()
REPL is running with all permissions allowed.
To specify permissions, run `deno repl` with allow flags.
> console.log("hey")
hey
undefined
>
```

it drops me into a shell.
When I `cd` out of the project, the project's dependencies are unloaded by direnv.

My takeaway generally is that while it can be nice to install tools at a system level, when managing multiple versions, it seems like it would be easier to create flakes per project rather than trying to manage multiple tool versions with different names/aliases using nix-darwin and home-manager.
Setting up a flake with direnv is pretty fast and lightweight.
Remember to run `nix-store --gc` occasionally to free up your disk space.
