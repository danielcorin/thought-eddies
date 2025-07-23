---
title: Nix Channels and the Linux Builder
createdAt: 2024-02-14T07:50:54.000Z
updatedAt: 2024-02-14T07:50:54.000Z
publishedAt: 2024-02-14T07:50:54.000Z
tags:
  - nix
  - macos
  - linux
draft: false
---
I was following [this guide](https://nixcademy.com/2024/01/15/nix-on-macos/) to setup `nix-darwin` on a new Mac when I ran into an issue following the section about cross-compiling Linux binaries.
I put this issue to the side when I first encountered it because I was trying to setup dependency management for my new system and this problem didn't prevent that.
However, I was reminded when I read another [article](https://nixcademy.com/2024/02/12/macos-linux-builder/) by Jacek, which motivated me to figure out what the problem was.

The original article instructs you to add the following to your `nix-darwin` flake

```nix
# file: nix-darwin configuration.nix
{
  nix = {
    linux-builder.enable = true;

    # This line is a prerequisite
    trusted-users = [ "@admin" ];
  };
}
```

then to test the builder works in the following manner

```sh
$ nix build \
  --impure \
  --expr '(with import <nixpkgs> { system = "aarch64-linux"; }; runCommand "foo" {} "uname -a > $out")'
$ cat result
Linux localhost 6.1.72 #1-NixOS SMP Wed Feb 12 16:10:37 UTC 2024 aarch64 GNU/Linux
```

For me this was failing

```sh
nix build \
  --impure \
  --expr '(with import <nixpkgs> { system = "aarch64-linux"; }; runCommand "foo" {} "uname -a > $out")'
warning: Nix search path entry '/nix/var/nix/profiles/per-user/root/channels' does not exist, ignoring
error:
       … <borked>

         at «none»:0: (source not available)

       … while calling the 'import' builtin

         at «string»:1:7:

            1| (with import <nixpkgs> { system = "aarch64-linux"; }; runCommand "foo" {} "uname -a > $out")
             |       ^

       (stack trace truncated; use '--show-trace' to show the full trace)

       error: file 'nixpkgs' was not found in the Nix search path (add it using $NIX_PATH or -I)

       at «none»:0: (source not available)
```

It seems `nixpkgs` references a "channel" that I had not yet added using `nix channel`.

After running
```sh
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update
```

I was able to run the `nix build` command without issue

```sh
nix build \
  --impure \
  --expr '(with import <nixpkgs> { system = "aarch64-linux"; }; runCommand "foo" {} "uname -a > $out")'
cat result
Linux localhost 6.1.72 #1-NixOS SMP Thu Feb  1 00:17:12 UTC 2024 aarch64 GNU/Linux
```
