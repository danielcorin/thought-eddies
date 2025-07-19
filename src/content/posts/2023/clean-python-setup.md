---
title: Clean Python Setup
description: No frills Python projects
createdAt: 2023-03-07T01:16:52.000Z
updatedAt: 2023-03-07T01:16:52.000Z
publishedAt: 2023-03-07T01:16:52.000Z
tags:
  - python
  - asdf
draft: false
---

## Why bother?

I create a bunch of little Python projects and I like to have them sandboxed and independent of each other.
I also sometimes need to change which version of Python I am running due to requirements of dependencies.
Your OS may come installed with Python but it's rarely a great idea to try and run your projects from it.

Here's what I do:

## Install `asdf`

`asdf` is a tool version manager.
There are good docs on how install it depending on your setup and preferences, described [here](https://asdf-vm.com/guide/getting-started.html).
Open a new shell session after editing your shell rc file and validate you successfully installed `asdf`

```sh
asdf -V
#=> v0.11.0
```

Next, add the [Python plugin](https://github.com/asdf-community/asdf-python) for `asdf`.

```sh
asdf plugin-add python
```

You can now install any version of Python.

```sh
asdf install python 3.11.1
```

To switch to the version you installed, run

```sh
asdf global python 3.11.1
```

## Setup a virtual environment from `asdf` managed Python

To start, see what versions of Python you've had `asdf` install.
I have two versions:

```sh
asdf list

python
 *3.11.1
  3.7.9
```

We can see that our `python` is currently the `asdf` managed version of Python.

```sh
which python
#=> ~/.asdf/shims/python
```

We can also validate it's the same version as `asdf` claims:

```sh
python -V
#=> Python 3.11.1
```

Let's create a virtual environment.
First `cd` to your project folder, then run:

```sh
python -m venv env
```

Activate the virtual environment and validate your shell is pointing to the virtual environment's `python` rather than `asdf`'s.
You should also see that the virtual environment's version of Python is the same as `asdf`'s.

```sh
. env/bin/activate

which python
#=> ~/dev/python_env_test/env/bin/python

python -V
#=> Python 3.11.1
```

Next, let's switch Python versions.

```sh
# stop using the virtual environment
deactivate

# install first, if you need to
asdf global python 3.7.9
which python
#=> ~/.asdf/shims/python

python -V
#=> Python 3.7.9
```

Create a second virtual environment.

```sh
python -m venv env2

. env2/bin/activate

which python
#=> ~/dev/python_env_test/env2/bin/python

python -V
#=> Python 3.7.9
```

`deactivate` once more and your back to your standard shell with `asdf` managed `python`.

If you ever see Python code you want to try out on your own machine that requires dependencies, or when starting a new project, I recommend setting up a virtual environment for the version you need like this.
Once you have the virtual environment setup and activated, you can install any dependencies you need in a spot that won't affect your system install or any other projects.

## What's next?

I've been hearing a lot about [nix](https://nixos.org/) and `direnv` as a killer combo for managing dev environments.
I'm hoping to try that out and might revist my setup here if it goes well.
