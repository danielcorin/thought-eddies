---
title: Running Huggingface Models with Llama.cpp and ollama
createdAt: 2024-08-30T18:24:53.000Z
updatedAt: 2024-08-30T18:24:53.000Z
publishedAt: 2024-08-30T18:24:53.000Z
tags:
  - llama-cpp
  - gguf
  - safetensors
  - ollama
draft: false
---

One challenge I've continued to have is figuring out how to use the models on Huggingface.
There are usually Python snippets to "run" models that often seem to require GPUs and always seem to run into some sort of issues when trying to install the various Python dependencies.
Today, I learned how to run model inference on a Mac with an M-series chip using [`llama-cpp`](https://github.com/ggerganov/llama.cpp) and a `gguf` file built from `safetensors` files on Huggingface.

## Download and convert the model

For this example, we'll be using the [Phi-3-mini-4k-instruct](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct) by Microsoft from Huggingface.
You will also need [`git-lfs`](https://git-lfs.com/), so install that first.

Llama-cpp generally needs a `gguf` file to run, so first we will build that from the `safetensors` files in the Huggingface repo.
This will take a while to run, so do the next step in parallel.

```sh
git clone https://huggingface.co/microsoft/Phi-3-mini-4k-instruct
```

Separately, pull down the code for llama-cpp and build it

```sh
git clone git@github.com:ggerganov/llama.cpp.git
cd llama.cpp
make
```

Create a virtualenv and install the dependencies for llama-cpp's conversion scripts.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Now, let's convert the `safetensors` files into a `gguf`.
From the `llama.cpp` folder, run

```sh
python convert_hf_to_gguf.py ../models/Phi-3-mini-4k-instruct --outfile ../models/Phi-3-mini-4k-instruct-f16.gguf --outtype f16
```

## Run inference

We've now generated the `gguf` file.
Let's run it.

Again, from the the `llama.cpp` folder run

```sh
./llama-cli -m ../models/Phi-3-mini-4k-instruct-f16.gguf -cnv -ngl 80 -p "You are a helpful assistant"
```

This runs llama-cpp in the command line, in conversation mode (`-cnv`), offloading the whole model to the GPU (`-ngl 80`) and with a system prompt (`-p`).
When everything is loaded, you'll be given a command prompt to type into:

```text
You are a helpful assistant

> Hi, who am I speaking with?
Hello! I'm Phi, your friendly AI assistant designed to help you with information and tasks. How can I assist you today?

> Who designed you?
I was created by Microsoft's team of engineers and researchers. They continuously work to improve my abilities and ensure I provide the best assistance possible.
```

Llama-cpp also has a server that will locally host a UI that can be used for prompting the model.

```sh
./llama-server -m ../models/Phi-3-mini-4k-instruct-f16.gguf --port 8080
```

## Run the model from ollama

[Ollama](https://ollama.com/) is a user-friendly way to get up and running with local language model quickly.
Using a `Modelfile`, we can expose the Phi-3 model we just downloaded and convert via `ollama`.

In the models folder, create a file called `phi-3-mini-4k-instruct.modelfile` containing

```text
FROM ./Phi-3-mini-4k-instruct-f16.gguf
```

Then run:

```sh
ollama create phi-3-mini-4k-instruct -f phi-3-mini-4k-instruct.modelfile
```

which will output something like

```sh
transferring model data
using existing layer sha256:fe4c64522173db6b3dae84ae667f6a8ad9e6cbc767f37ef165addbed991b129d
using autodetected template zephyr
creating new layer sha256:86107d0be467af35235b1becfb7a10e9cd30cf88332325c66670d70c90ee82b1
writing manifest
success
```

You should see the new model show up in `ollama`

```sh
ollama list
```

```sh
NAME                            ID              SIZE    MODIFIED
phi-3-mini-4k-instruct:latest   945b0b26c95a    7.6 GB  35 seconds ago
```

Finally, run the model through `ollama`

```sh
❯ ollama run phi-3-mini-4k-instruct
>>> Hi, who am I speaking with?
Hello! You're communicating with an AI assistant. How can I assist you today?

>>> Who created you?
I was crafted by Microsoft through a team of engineers and research scientists dedicated to
improving artificial intelligence technologies for various applications, including conversational
assistance like myself!
```

To clean things up (if you so choose), run

```sh
ollama rm phi-3-mini-4k-instruct:latest
```

Huge thanks to [Vinny](https://ynniv.com) for his help getting this working!
