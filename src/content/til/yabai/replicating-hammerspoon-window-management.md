---
title: Replicating Hammerspoon window management with yabai and skhd
createdAt: 2024-02-25T09:08:43.000Z
updatedAt: 2024-02-25T09:08:43.000Z
publishedAt: 2024-02-25T09:08:43.000Z
tags:
  - hammerspoon
  - yabai
  - skhd
draft: false
---

I've used Hammerspoon as a window manager for almost [10 years](https://github.com/danielcorin/my-hammerspoon/blob/master/sizeup.lua).
I decided to explore some of the newer tools in window management to see if I could find an alternative approach for what I do with Hammerspoon.
Using `yabai` and `skhd`, I wrote the following `skhdrc` file that _nearly_ reproduces the core functionality of my Hammerspoon window management code.
I have four general window management use cases:

- halves
- quarters
- maximize
- move to another display

Here's how I implemented that with `skhd` hotkeys mapped to `yabai` commands:

```
# left half
ctrl + alt + cmd - left : yabai -m window --grid 1:2:0:0:1:1

# bottom half
ctrl + alt + cmd - down : yabai -m window --grid 2:1:0:1:1:1

# top half
ctrl + alt + cmd - up : yabai -m window --grid 2:1:0:0:1:1

# right half
ctrl + alt + cmd - right : yabai -m window --grid 1:2:1:0:1:1

# maximize
ctrl + alt + cmd - m : yabai -m window --grid 1:1:0:0:1:1

# top left corner
ctrl + shift + alt - left : yabai -m window --grid 2:2:0:0:1:1

# top right corner
ctrl + shift + alt - up : yabai -m window --grid 2:2:1:0:1:1

# bottom left corner
ctrl + shift + alt - down : yabai -m window --grid 2:2:0:1:1:1

# bottom right corner
ctrl + shift + alt - right : yabai -m window --grid 2:2:1:1:1:1

# prev display
ctrl + alt - left : yabai -m window --display prev; yabai -m display --focus prev

# next display
ctrl + alt - right : yabai -m window --display next; yabai -m display --focus next
```

This configuration covers all my existing window management needs.
One minor inconsistency compared to my existing setup is that the window doesn't maintain the same relative position and size when moved to a different display, but it's a pretty subtle difference.

It seems like I might be able to solve the resizing issues using a managed layout, but this is a pretty different approach to what I currently do, so maybe another time.
This mode can be enabled (per display) with:

```
yabai -m config layout bsp
```

There is also some strange behavior where when a window is full screen on my large monitor and I attempt to send it to my other screen, yabai doesn't actually the window to the other screen and instead, it ends up somewhere on the bottom left of the larger display and I lose focus on the window.
This happens when I run a hotkey bound to

```sh
yabai -m window --display prev; yabai -m display --focus prev
```
