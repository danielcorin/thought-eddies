---
title: Pip Latest Version Checking
createdAt: 2024-04-24T09:40:27.000Z
updatedAt: 2024-04-24T09:40:27.000Z
publishedAt: 2024-04-24T09:40:27.000Z
tags:
  - python
  - pip
draft: false
---

I run a lot of different version of various languages and tools across my system.
Nix and direnv help make this possible to manage reasonably.
Recently, starting a new Python project, I was running into this warning after install dependencies with pip (yes, I am aware there are new/fresh/fast/cool ways to install dependencies in Python but that is what this project currently uses).

```
WARNING: There was an error checking the latest version of pip.
```

It turned out the file in `~/Library/Caches/pip/selfcheck` was corrupted.
Removing the directory and reinstalling `pip` fixed the warning.

```sh
rm -r ~/Library/Caches/pip/selfcheck/
pip install --upgrade --force-reinstall pip
```
