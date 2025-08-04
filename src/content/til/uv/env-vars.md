---
title: "Running `uv` with Environment Variables"
createdAt: 2025-08-03T15:30:53.592711
updatedAt: 2025-08-03T15:30:53.592711
publishedAt: 2025-08-03T15:30:53.592711
tags: ["python", "uv", "direnv"]
draft: false
---

The `.env*` file and the [`python-dotenv`](https://github.com/theskumar/python-dotenv) package are popular conventions in Python for managing environment variables.
I often forget or pause when trying to remember exactly which package I need to install (`python-dotenv`) and how to do the import

```python
from python_dotenv import load_dotenv

load_dotenv()
```

I heard someone recently lament that the package wasn't `pip install`-able as `pip install dotenv` but fortunately, `uv` as a great and memorable solution to this problem that doesn't require any changes to your code.

## How?

You can use the `--env-file` flag to specify a `.env` file to load when running `uv run`.

```python title="script.py"
import os

print(os.getenv("HELLO"))
```

```text title=".env"
HELLO="world"
```


Starting by running without the `--env-file` flag, we see the environment variable is not loaded.

```sh
uv run python script.py
#=> None
```

Run with the `--env-file` flag:

```sh
uv run --env-file .env python script.py
#=> "world"
```

The `uv` tool also [supports](https://docs.astral.sh/uv/reference/environment/#uv_env_file) the `UV_ENV_FILE` environment variable for this purpose.

## Better with `direnv`

Coupled with [`direnv`](https://direnv.net/), you can run all your `uv` commands as normal and set the environment variable such that your secrets are included.

```sh title=".envrc"
export UV_ENV_FILE=".env"
```

```sh
direnv allow
uv run python script.py
#=> "world"
```

Or you can let just let `direnv` load the `.env` file for you.

```sh title=".envrc"
dotenv
```

```sh
direnv allow
uv run python script.py
#=> "world"
```

Given all the options for loading environment variables, in the tools I am already using, there isn't usually a good reason for me to install `python-dotenv` anymore.
