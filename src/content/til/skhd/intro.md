---
title: Intro to skhd
createdAt: 2023-10-11T23:43:00.000Z
updatedAt: 2023-10-11T23:43:00.000Z
publishedAt: 2023-10-11T23:43:00.000Z
tags:
  - skhd
  - hotkeys
  - system_automation
draft: false
---

I learned about [`skhd`](https://github.com/koekeishiya/skhd) recently, actually after coming across the [`yabai`](https://github.com/koekeishiya/yabai) project.
I've been toying with the idea of moving away from [Hammerspoon](https://www.hammerspoon.org/) for my hotkey and window management, so I took the opportunity to explore `skhd` as a possible alternative.

## Initial setup

To get started on macOS, I followed the guide in the project [README](https://github.com/koekeishiya/skhd#install).
First, I installed `skhd` via `brew`.

```sh
brew install koekeishiya/formulae/skhd
```

The instructions say to start the service immediately with

```sh
skhd --start-service
```

I think it makes more sense to first write a `skhdrc` config file and validate your syntax is good.
I created my config file at `~/.config/skhd/skhdrc` with the following initial contents:

```text
shift + cmd - j : echo 'hello SKHD'
```

I validated my config file by running in verbose mode

```sh
skhd --verbose
```

which output

```sh
skhd: successfully created pid-file..
skhd: using config '/Users/danielcorin/.config/skhd/skhdrc'
hotkey :: #1 {
	mod: 'shift'
	mod: 'cmd'
	key: 'j' (0x26)
	cmd: 'echo 'hello SKHD''
}
skhd: watching files for changes:
	/Users/danielcorin/.config/skhd/skhdrc
```

I didn't get any output to the console or log file from my command when running in verbose mode.
After confirming the configuration was valid, I started `skhd` with

```sh
skhd --start-service
```

then tailed the logs to validate the effects of my hotkey

```sh
tail -f /tmp/skhd_$USER.out.log
```

Pressing <kbd>⌘ Command</kbd> + <kbd>⇧ Shift</kbd> + <kbd>J</kbd>, I validated that `hello SKHD` showed up in the log file.

## Doing something useful

With `skhd`, we can bind arbitrary shell commands to hotkeys.
The following creates a daily post entry in my blog, using a script in the repo:

```sh
shift + cmd - j : cd /Users/danielcorin/dev/hugo/blog && make log
```

This hotkey runs Python code via `make` from my blog directory's script folder to create a file then opens the file as well.
The hotkey improves my workflow from running `make log` in my blog's project directory to running <kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>J</kbd> anywhere.

## Takeaways

`skhd` is a nice hotkey management tool but feels a bit raw.
It would be nice if there were some additional quality of life features to help as you work through the learning curve of the tool, like hotkey collision detection and logging in verbose model.
Once you get used to it though, it's quite powerful and simple.
It pushes you move the complexity of your action out of `skhdrc` and into scripts that it can invoke.
I prefer this separation-of-concerns approach to my current Hammerspoon config, which has the hotkey bindings and action logic all together, though splitting this up would be straightforward.
I'm not completely sold yet, but `skhd` remains a candidate to adopt into my workflow.
If I can figure out a nice solution for toggle apps, I might make the switch.
