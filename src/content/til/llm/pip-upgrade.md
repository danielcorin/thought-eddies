---
title: '`llm` upgrade pip'
createdAt: 2025-01-26T14:47:56.000Z
updatedAt: 2025-01-26T14:47:56.000Z
publishedAt: 2025-01-26T14:47:56.000Z
tags:
  - llm
  - pip
draft: false
---

The [`llm`](https://github.com/simonw/llm) package uses a [plugin architecture](https://llm.datasette.io/en/stable/plugins/index.html) to support numerous different language model API providers and frameworks.
Per the documentation, these plugins are installed using a version of [`pip`](https://pip.pypa.io/en/stable/installation/), the popular Python package manager

> Use the llm install command (a thin wrapper around pip install) to install plugins in the correct environment:
> `llm install llm-gpt4all`

Because this approach makes use of `pip` occasionally we run into familiar issues like `pip` being out of date and complaining about it on every use

```sh
❯ llm install llm-ollama
Collecting llm-ollama
...
Successfully installed llm-ollama-0.8.2 ollama-0.4.7

[notice] A new release of pip is available: 24.3.1 -> 25.0
[notice] To update, run: /opt/homebrew/Cellar/llm/0.19.1/libexec/bin/python -m pip install --upgrade pip
```

The instance of `pip` that needs to be updated here is the `pip` being used within `llm`.
I couldn't find explicit instructions on how to address this issue upon some cursory searches, but the solution is pretty intuitive - props to Simon for a nice API design.

To update `pip` within `llm`, run

```sh
llm install --upgrade pip
```

The upgrade notice should disappear if all goes well.
