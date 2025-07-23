---
title: Nix-Darwin Launch Agents
createdAt: 2024-04-13T16:08:02.000Z
updatedAt: 2024-04-13T16:08:02.000Z
publishedAt: 2024-04-13T16:08:02.000Z
tags:
  - nix-darwin
  - ollama
  - launch-agents
draft: false
githubUrl: >-
  https://github.com/danielcorin/nix-config/commit/4727a12fcc3fb80f7d2f9be6ae2f9f852c84e060
---

On macOS, a Launch Agent is a system daemon that runs in the background and performs various tasks or services for the user.
Having recently installed [`ollama`](https://ollama.com/), I've been playing around with various local models.
One annoyance about having installed `ollama` using Nix via nix-darwin, is that I need to run `ollama serve` in a terminal session or else I would see something like this:

```sh
❯ ollama list
Error: could not connect to ollama app, is it running?
```

After some [code searching](https://github.com/search?type=code), I discovered a method to create a Launch Agent plist for my user using `nix-darwin`.
This allows `ollama serve` to run automatically in the background for my user.
Here's what it looks like:

```nix
{
  description = "DCMBP Darwin system flake";

  inputs = {
    ...
  };

  outputs = inputs@{ self, nix-darwin, nixpkgs, home-manager, ... }:
let
  configuration = { pkgs, ... }: {
    environment.systemPackages = with pkgs; [ ollama ];

      ...

      launchd = {
        user = {
          agents = {
            ollama-serve = {
              command = "${pkgs.ollama}/bin/ollama serve";
              serviceConfig = {
                KeepAlive = true;
                RunAtLoad = true;
                StandardOutPath = "/tmp/ollama_danielcorin.out.log";
                StandardErrorPath = "/tmp/ollama_danielcorin.err.log";
              };
            };
          };
        };
      };
    };
  in
  {
      ...
  };
}
```

This configuration creates a plist file at `/Users/danielcorin/Library/LaunchAgents` that looks like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>KeepAlive</key>
	<true/>
	<key>Label</key>
	<string>org.nixos.ollama-serve</string>
	<key>ProgramArguments</key>
	<array>
		<string>/bin/sh</string>
		<string>-c</string>
		<string>exec /nix/store/nql9lrcn99m34icj20ydm5jjw33pcpcy-ollama-0.1.27/bin/ollama serve</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>StandardErrorPath</key>
	<string>/tmp/ollama_danielcorin.err.log</string>
	<key>StandardOutPath</key>
	<string>/tmp/ollama_danielcorin.out.log</string>
</dict>
</plist>
```

Now, when I create a new shell session and run `ollama list`, it just works.
[Here](https://github.com/danielcorin/nix-config/commit/4727a12fcc3fb80f7d2f9be6ae2f9f852c84e060) is the code diff where I added this in my nix config.

