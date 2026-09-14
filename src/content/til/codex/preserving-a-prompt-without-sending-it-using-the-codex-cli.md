---
title: 'Preserving a Prompt Without Sending It Using the Codex CLI'
createdAt: 2026-09-14T10:00:26.654697
updatedAt: 2026-09-14T10:00:26.654697
publishedAt: 2026-09-14T10:00:26.654697
tags: null
draft: false
---

I often use [voice-to-text](/projects/reco) to prompt in the Codex CLI, one of my preferred agents these days.
Sometimes, after the transcribed text lands in the prompt field, I realize I need to do something else before I send it.
With Claude Code, I'd gotten into the habit of using <kbd>Ctrl</kbd> + <kbd>S</kbd> to clear the input field and stash the prompt.
After I send the next prompt, Claude Code restores the stashed text to the input field.
I hadn't found anything similar in Codex, so I'd been selecting and copying the text with my mouse.
Then it [started snowing](/logs/2026/09/11), and the copied text started including both unwanted line breaks and random dots.
It was a mess.

So, I finally made the effort to figure out how to make this work.
The first solution I found worked, but was far more cumbersome than I thought was reasonable.
Pressing <kbd>Ctrl</kbd> + <kbd>G</kbd> opens the current prompt in an external editor, which was `vim` in my terminal.
From there, you can run `:%w !pbcopy` to copy the text to the macOS clipboard, then exit `vim`.
It works, but isn't easy.
It also didn't work out of the box in my VS Code setup (yes, I sometimes still use an IDE).
The fix was to launch Codex with:

```sh
VISUAL="code --wait" EDITOR="code --wait" codex
```

Then <kbd>Ctrl</kbd> + <kbd>G</kbd> opens a Markdown file containing the current prompt in VS Code, where I can copy the text normally.

The answer I was looking for turned out to be pressing <kbd>Ctrl</kbd> + <kbd>C</kbd> while the unsent prompt is still in the input field.
This clears the input while keeping the text in the prompt history.
From there, I can do whatever I need, then press <kbd>↑</kbd> to navigate through Codex's prompt history and retrieve the text I'd set aside.
