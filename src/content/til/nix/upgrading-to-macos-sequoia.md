---
title: Fixing Nix When Upgrading To macOS Sequoia
createdAt: 2024-10-07T18:22:14.000Z
updatedAt: 2024-10-07T18:22:14.000Z
publishedAt: 2024-10-07T18:22:14.000Z
tags:
  - macos
  - nix
draft: false
---

I upgraded to macOS Sequoia a few weeks ago.
I had a feeling this update wasn't going to be trivial with my Nix setup, but after trying to upgrade to a newer package version on `unstable`, I got a message that seemed to imply I needed to upgrade the OS, so I went for it.
Also, I was at least confident I wouldn't lose too much about my setup given it's all committed to version control in my [`nix-config`](https://github.com/danielcorin/nix-config/) repo.

Things were broken in a somewhat concerning way from the start.
The OS was showing me a password prompt and none of the passwords that I would have expected seemed to unlock the disk.

User `winter` from an unofficial Nix Discord suggested the following:

> you should be able to just ignore that
> it happens to me sometimes, i just click cancel and it gets unlocked :)

I didn't try this but hopefully it helps someone.

What I ended up doing after reading [this issue](https://github.com/DeterminateSystems/nix-installer/issues/753) was grabbing the password via this command

```sh
security find-generic-password -s "Nix Store" -w
```

which successfully unlocked the disk.

After that, I had an issue with running `nix-darwin`

```sh
❯ nix run nix-darwin -- switch --flake ~/.config/nix/flake.nix
error: cannot connect to socket at '/nix/var/nix/daemon-socket/socket': Connection refused
```

I was able to fix this by running

```sh
sudo launchctl load /Library/LaunchDaemons/org.nixos.nix-daemon.plist
```

and then things seemed mostly back to normal.
However, I still need to run this command after each system restart.
Hopefully, I will find some time to resolve this issue soon.
If you know of a solution, please let me know, and I'll update this entry with a link and credit to you.
