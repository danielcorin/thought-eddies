---
title: Disable Obsidian's blinking cursor
description: A post about disabling the blinking cursor in Obsidian
createdAt: 2023-08-26T19:23:00.000Z
updatedAt: 2023-08-26T19:23:00.000Z
publishedAt: 2023-08-26T19:23:00.000Z
tags:
  - obsidian
  - macos
draft: false
---

I wanted to stop the Obsidian editor cursor from blinking.
Something like VS Code's

```json
{
  "editor.cursorBlinking": "solid"
}
```

Some searching turned up [an option](https://forum.obsidian.md/t/allow-stopping-the-cursor-from-blinking/39819) to solve this problem in Vim mode using CSS, but in insert mode, the cursor still blinks.
Eventually, I came across a macOS-based approach to solve this issue on [StackExchange](https://superuser.com/a/1444563), included here for convenience

```text
defaults write -g NSTextInsertionPointBlinkPeriod -float 10000
defaults write -g NSTextInsertionPointBlinkPeriodOn -float 10000
defaults write -g NSTextInsertionPointBlinkPeriodOff -float 10000
```

After running, restart Obsidian and the cursor no longer blinks.
These configuration changes also disable cursor blinking in other applications, which for me, is a welcome change.
