---
title: 'Warp: first impressions'
createdAt: 2023-07-30T20:14:17.000Z
updatedAt: 2023-07-30T20:14:17.000Z
publishedAt: 2023-07-30T20:14:17.000Z
tags:
  - warp
  - terminal
  - dev_tools
draft: false
---

I downloaded [Warp](https://www.warp.dev/) today.
I've been using [iTerm2](https://iterm2.com/) for years.
It's worked well for me but Warp came recommended and so I figured I should be willing to give something different a chance.
Warp looks like a pretty standard terminal except you need to sign-in, as with most things SaaS these days.
It looks like the beta is free but there is a paid version for teams.
Warp puts "workflows" as first class citizens of the editor experience.
These occupy the left sidebar where files typically live in a text editor.
At first past, workflows seem like aliases where the whole "formula" is visible in the terminal window when you invoke them, rather than requiring you to memorize your alias/function and arguments.
Additionally, typing `workflows:` or `w:` in the prompt, opens a workflow picker with fuzzy search and a preview of what the workflow runs.
It comes with window splitting (like tmux) by default, and somehow using my personal hotkeys.
I'm not sure if this is a lucky coincidence or it they somehow loaded by iTerm2 settings.
By default, the `PS1` is

```sh
~
<cursor here>
```

The `~` is the current directory.
As I jumped around my file system, I learned the PS1 probably has many hidden features.
In a git repo, I saw something like this:

```sh
~/dev/blog git:(my-branch)±1
```

There is also a feature to "Honor the user's custom prompt" which worked for my zsh PS1.

The input prompt is permanently fixed to the bottom of each window, so when you scroll, it's still there with you.
When you run a long running command, like a web server, the command you ran stays pinned above the stdout.
Initially, this appeared unusual to me and I didn't understand what I was looking at but it quickly made sense.
There is also inline autocomplete that pulls from your history.
Pressing Ctrl+Shift+Space on a pass command send the contents as a prompt to a language model, which gives recommendations for what to do next.
Additionally, you can type anything you want to the "bot" similar to ChatGPT.
This feature is a very welcome addition to my terminal workflow, especially because it's very close in proximity to where I am working when I often want to invoke a language model.
I could see this being super useful.
The feature isn't unlimited though (for free mode at least).
After a couple of messages, I was shown

```text
Requests used: 3 / 100. 20 hours until refresh.
```

It would be excellent if I could supply my own OpenAI token or customize this right drawer for my own uses -- maybe something to investigate to shell if other terminal emulators could do this.

The app indicates which pane is active using a blue triangle in the top left of the pane.
I typically do this with text brightness, but it works.
There also built-in support for jumping between panes via hotkey.
These didn't have my defaults (first time was just luck), and also behaved differently than I'm used to.
I use arrows to indicate the direction of movement.
Pressing the right arrow from the bottom left pane jumps me to the top right pane.
I'd expect it to jump to the pane in the same row.

Those are my first impressions.
It doesn't quite feel like "home" -- I may need to look into theme customization.
I'm planning to keep it around and experiment a bit.
