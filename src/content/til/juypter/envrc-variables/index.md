---
title: Accessing direnv environment variables in a Jupyter notebook
createdAt: 2024-10-16T00:00:00.000Z
updatedAt: 2024-10-16T00:00:00.000Z
publishedAt: 2024-10-16T00:00:00.000Z
tags:
  - direnv
  - jupyter
draft: false
---

I use [`direnv`](https://direnv.net/) to manage my shell environment for projects.
When using a Jupyter notebook within a project, I realized that the environment variables in my `.envrc` file were not being made available to my notebooks.
The following worked for me as a low-effort way to load my environment into the notebook in a way that wouldn't risk secrets being committed to source control, since I gitignore the `.envrc` file.

The code below assumes an `.envrc` file exists in the project root, containing

```sh
export MY_VAR="test_val"
```

Let's run the example

```python
%pip install python_dotenv
```

```python
import os
print(f"value: {os.environ.get("MY_VAR")}")
```

    value: None

```python
from dotenv import load_dotenv
load_dotenv("./.envrc")
print(f"value after dotenv load: {os.environ.get("MY_VAR")}")
```

    value after dotenv load: test_val

Quick and easy!
