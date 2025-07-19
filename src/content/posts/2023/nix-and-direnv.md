---
title: Nix and direnv
createdAt: 2023-04-02T23:36:15.000Z
updatedAt: 2023-04-02T23:36:15.000Z
publishedAt: 2023-04-02T23:36:15.000Z
tags:
  - partly_ai_authored
  - gpt4
  - language_models
  - python
draft: false
aliases:
  - /posts/nix-and-direnv/
---

I know a little about `nix`.
Not a lot.
I know some things about Python virtual environments, `asdf` and a few things about package managers.
I've heard the combo of `direnv` and `nix` is fantastic from a number of engineers I trust, but I haven't had the chance to figure out what these tools can really do.
I could totally ask someone what their setup is, but I decided to ask ChatGPT (`gpt-4`) to see what would happen.
The following is the summary of what I did that worked, as instructed and summarized by the LM, with a bit of editing and commentary by me.

## Creating a Python environment with Nix

In this example, we will create a Python environment with specific packages (`requests` and `beautifulsoup4`) using Nix. We will then use this environment to run a Python script that fetches a web page and prints its title.

### Python Script

Create a Python script named `web_title.py` with the following content:

```python
import requests
from bs4 import BeautifulSoup

def get_web_title(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    return soup.title.string

if __name__ == "__main__":
    url = "https://nixos.org/"
    title = get_web_title(url)
    print(f"The title of the web page at {url} is: {title}")
```

### Nix environment

Create a Nix expression named `python-environment.nix` with the following content:

```nix
{ pkgs ? import <nixpkgs> { } }:

let
  pythonEnv = pkgs.python3.withPackages(ps: with ps; [
    ps.beautifulsoup4
    ps.requests
  ]);
in
pkgs.mkShell {
  packages = [
    pythonEnv
  ];
}

```

This Nix expression creates a shell environment with the required Python packages.
The `withPackages` function is used to create a custom Python interpreter that includes the specified packages.

### Running the script

To enter the Nix shell environment, run the following command in your terminal:

```bash
nix-shell python-environment.nix
```

Inside the `nix-shell` environment, you can run the `web_title.py` script with:

```bash
python web_title.py
```

This will fetch the web page at https://nixos.org and print its title.

```text
The title of the web page at https://nixos.org/ is: Nix & NixOS | Reproducible builds and deployments
```

By using Nix, we ensure that the Python environment and its dependencies are managed in an isolated and reproducible manner, without affecting the rest of the system or other projects.

## Adding direnv to the environment

If you don't have it already, install `direnv` from [here](https://direnv.net).

Create an `.envrc` file in the same directory as your `python-environment.nix` file with the following content:

```bash
use_nix
export MY_SECRET_KEY="your-secret-key-here"
```

Replace `"your-secret-key-here"` with the actual secret you want to use.

Create a symbolic link named `shell.nix` pointing to the `python-environment.nix` file:

```bash
ln -s python-environment.nix shell.nix
```

Allow `direnv` to load the `.envrc` file in the current directory:

```bash
direnv allow
```

Now, `direnv` will automatically load the Nix environment when you enter the directory, and unload it when you leave. Additionally, the `MY_SECRET_KEY` environment variable will be set with the specified value.

You just have everything there, loaded and isolated when you `cd` into the project directory.

Inside your Python scripts, you can access the environment variable using the `os.environ` dictionary:

```python
import os

secret_key = os.environ["MY_SECRET_KEY"]
```

IMPORTANT: To avoid sharing sensitive information, do not commit your `.envrc` file to version control

### Wrapping it up

To tie it all together, run the example above, but with `direnv` you no longer need to run `nix-shell python-environment.nix`.

Let's modify the code a little to print the environment variable.

```python
import os
import requests
from bs4 import BeautifulSoup

def get_web_title(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    return soup.title.string

if __name__ == "__main__":
    url = "https://nixos.org/"
    title = get_web_title(url)
    print(f"The title of the web page at {url} is: {title}")
    print(os.environ.get("MY_SECRET_KEY"))
```

Now run it with just:

```sh
python web_title.py
```

Output:

```text
The title of the web page at https://nixos.org/ is: Nix & NixOS | Reproducible builds and deployments
your-secret-key-here
```

👍
