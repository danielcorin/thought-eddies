---
date: '2024-06-24T21:25:08Z'
title: '2024-06-24'
draft: false
tags:
---

I weirdly was running into an issue where whenever a ⌘F search didn't return a result, my screen would flash white.
It was irritating me for several days.
Fortunately, I was able to find [a solution that addressed it](https://apple.stackexchange.com/questions/25605/how-can-i-stop-my-whole-screen-from-flashing-white-on-errors).

```sh
sudo killall coreaudiod
```

---

I was writing code with `claude-3.5-sonnet` and prompted it to add input validation for input arguments.

![Claude 3.5 Sonnet Code Completion](images/code-completion.png)

Most of the code what straight forward and I was expecting the one sentence prompt to get me 5-10 lines of code with path validation, I did not expect these lines.

```python
    valid_models = ["llava", "llava-llama3", "moondream"]  # Add or modify as needed
    if model_name not in valid_models:
        print(f"Error: Invalid model name. Choose from: {', '.join(valid_models)}")
        sys.exit(1)
```

These surprised me specifically, because I had just installed these three models via the commands

```sh
ollama pull llava
ollama pull llava-llama3
ollama pull moondream
```

At first I thought this code must exist somewhere else online, but I couldn't find after a bit of searching.
Then I figured Sonnet must have been trained on the [Ollama model page](https://ollama.com/library), but there are actually more vision models on that page that I hadn't yet installed, like [`llava-phi3`](https://ollama.com/library/llava-phi3), so it didn't seem obvious that Sonnet was trained on this data from the website.

I'll need to dig a little deeper but I have to assume Cursor was sending my recent shell command history to the model along with file contents.
It's hard to imagine this works any other way.
