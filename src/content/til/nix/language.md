---
title: Nix Language
createdAt: 2023-07-23T18:21:46.000Z
updatedAt: 2023-07-23T18:21:46.000Z
publishedAt: 2023-07-23T18:21:46.000Z
tags:
  - nix
draft: false
---

To broaden my knowledge of `nix`, I'm working through an [Overview of the Nix Language](https://nixos.wiki/wiki/Overview_of_the_Nix_Language).

Most of the data types and structures are relatively self-explanatory in the context of modern programming languages.

Double single quotes strip leading spaces.

```nix
''  s  '' == "s  "
```

Functions are a bit unexpected visually, but simply enough with an accompanying explanation.
For example, the following is a named function `f` with two arguments `x` and `y`.

```nix
f = x: y: x*y
```

To call the function, write `f 1 4`.
Calling the function with only a single arg returns a partial.

```nix
f 3
# returns `y: 3*y`
```

The `with` statement introduces values the scope of the expression so, you don't need to use the dot notation.

```nix
let
  set = { a = 4; b = 10; };
in
  with set; "The values are ${toString a} and ${toString b}"
```

Values defined in a `with` statement do not override already defined values with the same name.

The `rec` expression turns a basic set into a set where self-referencing is possible.

```nix
rec {
    val1 = val2 + 100;
    val2 = 12;
}.val1
# outputs 112
```

`nix repl` can be used to test out statements in the Nix language.
