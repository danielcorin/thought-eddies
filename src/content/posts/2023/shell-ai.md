---
title: Using GPT-3.5 to Quickly Generate and Run Shell Commands
createdAt: 2023-04-16T14:10:26.000Z
updatedAt: 2023-04-16T14:10:26.000Z
publishedAt: 2023-04-16T14:10:26.000Z
tags:
  - language_models
  - python
  - cli
draft: false
aliases:
  - /posts/shell-ai/
---

I believe that language models are most useful when available at your fingertips in the context of what you're doing.
[Github Copilot](https://github.com/features/copilot) is a well known application that applies language models in this manner.
There is no need to pre-prompt the model.
It knows you're writing code and that you're going to ask it to write code for you based on the contents of your comment. Github is further extending this idea with [Copilot for CLI](https://githubnext.com/projects/copilot-cli/), which looks promising but isn't generally available yet.
I'll describe a tool I've created, called "Shell AI" (`sai`) that integrates a language model directly into the command line interface to generate and run shell commands on the fly.

## The concept

*Disclaimer: I run macOS and I haven't tested this for any other OS.*

I'm in the shell and I need to create a folder for every day of the next week, including today named with the date formatted as "yyyy-mm-dd".

Here's an example of how I might try and use a tool to accomplish this task:

```sh
sai create a folder for every day of the next week, including today named with the date formatted as 'yyyy-mm-dd'
```

Here's what I would want it to output:

```sh
for i in {0..6}; do mkdir "$(date -v+${i}d '+%Y-%m-%d')"; done
```

A tool with this usage pattern is trivially achievable using `gpt-3.5-turbo` and a short prompt:

```python
import openai
import os
import sys


PROMPT = """
You are a unix terminal assistant.
The user will prompt you with something they need to do in the terminal on macOS.
You will respond with ONLY a command to accomplish the stated goal.

What I need to do: {command}

Run:
"""

def main():
  command = " ".join(sys.argv[1:])
  completion = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[
      {"role": "user", "content": PROMPT.format(command=command)}
    ]
  )

  completion_result = completion.choices[0].message.content
  # strip backticks and extra whitespace in case the model adds them
  cmd_to_run = completion_result.strip("`").strip()
  print(cmd_to_run)

if __name__ == "__main__":
  main()
```

This approach serves most of my use cases.
A more generic tool like [`chatblade`](https://github.com/npiv/chatblade) or [`llm`](https://github.com/simonw/llm) may better serve a research use case, or provide a description of what the command will do.
In this context, I'm not really interested in that.
I just need to do the **thing** and often the **thing** is similar to something I've done before, but can't quite conjure from my own memory.
This approach prompts the language model to conjure the command for me.

To really integrate the use case into my workflow, I just need a way to quickly execute the command if it looks acceptable. We can do this by prompting the user to enter `y` if they want to proceed and prompt and capture that with `input` in the code.

```python
import openai
import os
import sys


PROMPT = """
You are a unix terminal assistant.
The user will prompt you will something they need to do in the terminal on macOS.
You will respond with ONLY a command to accomplish the stated goal.

What I need to do: {command}

Run:
"""

def main():

  command = " ".join(sys.argv[1:])
  completion = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[
      {"role": "user", "content": PROMPT.format(command=command)}
    ]
  )

  completion_result = completion.choices[0].message.content
  cmd_to_run = completion_result.strip("`").strip()
  print(cmd_to_run)
  if input("run command? (y/N): ") == "y":
    os.system(cmd_to_run)

if __name__ == "__main__":
  main()
```

Now we have this:

```sh
❯ sai create a folder for every day of the next week, including today named with the date formatted as 'yyyy-mm-dd'
$(date -v+0d +%Y-%m-%d) $(date -v+1d +%Y-%m-%d) $(date -v+2d +%Y-%m-%d) $(date -v+3d +%Y-%m-%d) $(date -v+4d +%Y-%m-%d) $(date -v+5d +%Y-%m-%d) $(date -v+6d +%Y-%m-%d)
run command? (y/N):
```

The command[^1] looks ok to me so let's run it

```sh
❯ sai create a folder for every day of the next week, including today named with the date formatted as 'yyyy-mm-dd'
mkdir $(date -v+0d +%Y-%m-%d) $(date -v+1d +%Y-%m-%d) $(date -v+2d +%Y-%m-%d) $(date -v+3d +%Y-%m-%d) $(date -v+4d +%Y-%m-%d) $(date -v+5d +%Y-%m-%d) $(date -v+6d +%Y-%m-%d)
run command? (y/N): y
```

```sh
❯ sai list folders in directory that start with 2023
ls -d 2023*
run command? (y/N): y
2023-04-16	2023-04-17	2023-04-18	2023-04-19	2023-04-20	2023-04-21	2023-04-22
```

## Use it yourself

You can find the code and rough installation instructions [on Github](https://github.com/danielcorin/shell-ai).

## Wrapping up

There are so many ways one can extend this idea and I'm tempted to add more capabilities, but in the spirit of doing one thing well, I'll stop here.

[^1]: The command was different on my second run of the program.
These minor variations frequently occur with language models.
You can reduce the [`temperature`](https://platform.openai.com/docs/api-reference/chat/create#chat/create-temperature) to get less variance in the results.
