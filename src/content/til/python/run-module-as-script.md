---
title: Run a Python Module as a Script
createdAt: 2024-04-10T20:06:42.000Z
updatedAt: 2024-04-10T20:06:42.000Z
publishedAt: 2024-04-10T20:06:42.000Z
tags: null
draft: false
---

I've been familiar with Python's `-m` flag for a while but never had quite internalized what it was really doing.
While reading about this cool AI pair programming project called [`aider`](https://github.com/paul-gauthier/aider), the docs mentioned that the tool could be invoked via `python -m aider.main` "[i]f your pip install did not place the aider executable on your path".
I hadn't made this association between pip installed executables and the `-m` flag.
The source for the file that runs when that Python command is invoked can be found [here](https://github.com/paul-gauthier/aider/blob/v0.28.0/aider/main.py#L670).
I tried running the following in a project that had the [`llm`](https://github.com/simonw/llm) tool installed and things began to make more sense

```sh
❯ python -m llm "test"
It looks like you're testing the system. How can I assist you further?
```

Looking at the source, we can find the invocation point in [`__main__.py`](https://github.com/simonw/llm/blob/main/llm/__main__.py).

Following up with Claude, I learned

> The `-m` flag tells Python to run a module as a script. It searches for the specified module in the Python module search path and executes its contents as the main module.

This is response is almost verbatim from the [Python docs](https://docs.python.org/3/using/cmdline.html#cmdoption-m).

Another use of `-m` I've commonly seen is

```sh
python -m http.server
```

For completeness, here is [that source code](https://github.com/python/cpython/blob/3.12/Lib/http/server.py#L1274).
Now, I have a better sense of what is really going on.
