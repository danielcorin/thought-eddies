---
title: Render Python Encodings Error
createdAt: 2023-12-01T18:04:04.000Z
updatedAt: 2023-12-01T18:04:04.000Z
publishedAt: 2023-12-01T18:04:04.000Z
tags:
  - render
  - python
  - poetry
draft: false
---

[Render](https://render.com/) is a platform as a service company that makes it easy to quickly deploy small apps.
They have an easy-to-use free tier and I wanted run a Python app with dependencies managed by Poetry.
Things had been going pretty well until I unexpectedly got the following error after a deploy

```sh
Fatal Python error: init_fs_encoding: failed to get the Python codec of the filesystem encoding
Python runtime state: core initialized
ModuleNotFoundError: No module named 'encodings'
```

You don't have to search for too long to find out this isn't good.
I tried changing the `PYTHON_VERSION` and `POETRY_VERSION` to no avail.
I also read a few threads on [community.render.com](https://community.render.com).
With nothing much else I could think of trying, I happened to find the `Clear build cache & deploy` sub-option under `Manual Deploy`.
Fortunately for me, running that fixed my issue.
Hopefully, this helps save someone time.
