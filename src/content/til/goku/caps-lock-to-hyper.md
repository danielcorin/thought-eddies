---
title: Mapping Caps Lock to a Hyper Key with Karabiner and Goku
createdAt: 2024-01-06T20:52:47.000Z
updatedAt: 2024-01-06T20:52:47.000Z
publishedAt: 2024-01-06T20:52:47.000Z
tags:
  - karabiner
  - goku
  - system_automation
  - hotkeys
  - hammerspoon
draft: false
---

[Karabiner](https://karabiner-elements.pqrs.org/) is a keyboard customizer for macOS.
I've used it for a while to map my caps lock key to <kbd>cmd</kbd> + <kbd>ctrl</kbd> + <kbd>option</kbd> + <kbd>shift</kbd>.
This key combination is sometimes called a hyper key.
With this keyboard override, I use other programs like [Hammerspoon](https://www.hammerspoon.org/) and [Alfred](https://www.alfredapp.com/) to do things like toggle apps and open links.
Karabiner provides an out-of-the-box, predefined rule to perform this complex modification.
I've used this approach for a while but recently learned about [Goku](https://github.com/yqrashawn/GokuRakuJoudo) which adds a lot of additional functionality to Karabiner using Clojure's extensible data notation ([edn](https://github.com/edn-format/edn)) to declaratively configure Karabiner.

For me, there has been a steep learning curve to use Goku that goes along with its power.
The [examples](https://github.com/yqrashawn/GokuRakuJoudo/blob/master/examples.org) are a good place to start learning.
My initial aim was to reimplement my existing Karabiner rule, described above.
After installing `goku`, I created a configuration file at `~/.config/karabiner.edn`.
Inside it, I added

```clojure
{:main [{:des "caps lock" :rules [[:##caps_lock :!QWEright_shift nil {:alone :escape}]]}]}
```

I actually didn't figure this out from the docs, but rather from an [open source karabiner.edn](https://github.com/yqchilde/capslox-karabiner/blob/2108763e4e8c02793e52210975d705ae62a204d2/capslox-karabiner.edn#L41) on Github by [yqchilde](https://github.com/yqchilde).
Huge thanks for them for open sourcing their work, as I was having a tough time finding a solution to this using the docs alone.
The Clojure is a bit hard to read if you're not used to it.
I also installed [Calva](https://calva.io/) to format the `karabiner.edn` file, but for a file this simple, it didn't add any whitespace.
The rule above encodes two behaviors

- when caps lock is pressed alone, it acts as the escape key
- when caps lock is pressed as a modifier (with another key, like <kbd>a</kbd> or <kbd>1</kbd>), it acts as the hyper key

This edn configuration replicates my existing Karabiner config.
Finally, I ran `goku` from `~/.config/karabiner.edn` and the config is loaded into Karabiner.

```sh
❯ goku
Done!
```

You can also run `brew services start goku`, to watch this file and load the config into Karabiner automatically on changes.

As a bonus, right below the hyper key definition, that same `karabiner.edn` file also redefines [behavior](https://github.com/yqchilde/capslox-karabiner/blob/2108763e4e8c02793e52210975d705ae62a204d2/capslox-karabiner.edn#L43C18-L43C45) for the default cap locks behavior by pressing caps lock, then escape.
The caps lock light turns on with this key combination and pressing it again, turns it off.
The rule looks like this

```clojure
[:!QWER#Pescape :caps_lock]
```

My final `karabiner.edn` looks like this

```clojure
{:main [{:des "caps lock" :rules [[:##caps_lock :!QWEright_shift nil {:alone :escape}]
                                  [:!QWER#Pescape :caps_lock]]}]}

```

The result is a nice improvement, as I've regained access to the caps lock functionality.
