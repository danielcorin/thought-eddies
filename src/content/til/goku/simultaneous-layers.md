---
title: >-
  Using My Full Keyboard as an App Launcher with Goku Simultaneous Layers
  (Simlayer)
createdAt: 2024-01-08T18:40:52.000Z
updatedAt: 2024-01-08T18:40:52.000Z
publishedAt: 2024-01-08T18:40:52.000Z
tags:
  - goku
  - karabiner
  - system_automation
  - hotkeys
draft: false
---

Goku has a concept called a `simlayer`.
A `simlayer` allows you to press any single key on the keyboard, then any second key while holding the first and trigger an arbitrary action as a result.
I'm going to write a `karabiner.edn` config that opens Firefox when you press <kbd>.</kbd>+<kbd>f</kbd>.

```clojure
{:simlayers {:launch-mode {:key :period}},
 :templates {:open-app "open -a \"%s\""},
 :main
 [{:des "launch mode",
   :rules [:launch-mode [:f [:open-app "Firefox"]]]}]}
```

```sh
❯ goku
Done!
```

To start, we define a `simlayer` for the period key.
We will reference this layer when we define our rules.
Next we define a template.
Each entry in `:templates` is a templated shell command that can run when a rule is satisfied.
Finally, we define the "launch mode" rule in `:main`.
We can call it anything we want, so I chose "launch mode".
Now let's breakdown the rule

- `:launch-mode` references the `simlayer`
- `[:f [:open-app "Firefox"]]` is the rule. In this case, when <kbd>f</kbd> is pressed, we invoke the `:open-app` template passing "Firefox" as an argument. The shell commands that runs as a result is `open -a "Firefox"`

If we want to add more mappings for applications to launch with this `simlayer`, we can augment the rule like so


```clojure
{:simlayers {:launch-mode {:key :period}},
 :templates {:open-app "open -a \"%s\""},
 :main
 [{:des "launch mode",
   :rules
   [:launch-mode
    [:f [:open-app "Firefox"]]
    [:s [:open-app "Spotify"]]
    [:i [:open-app "Cursor"]]
    [:c [:open-app "Calendar"]]]}]}
```

Lastly, let's add another template and another rule in "launch mode" using that template, meaning we will still use the period key to trigger the rule.


```clojure
{:simlayers {:launch-mode {:key :period}},
 :templates {:open-app "open -a \"%s\"", :open-url "open \"%s\""},
 :main
 [{:des "launch mode",
   :rules
   [:launch-mode
    [:f [:open-app "Firefox"]]
    [:s [:open-app "Spotify"]]
    [:i [:open-app "Cursor"]]
    [:c [:open-app "Calendar"]]
    [:a [:open-url "https://calendar.google.com"]]]}]}
```
