---
title: 'Goose as a Task Runner'
createdAt: 2025-02-28T21:41:27-05:00
updatedAt: 2025-07-18T21:41:27-05:00
draft: false
tags:
  - goose
  - language_models
---

[Goose](https://github.com/block/goose) is a CLI language model-based agent.
Goose exposes a chat interface and uses tool calling (mostly to invoke shell commands) to accomplish the objective prompted by the user.
These tasks can include everything from writing code to running tests to converting a folder full of mov files to mp4s.
Most things you can do with your computer, Goose can do with your computer.

Goose runs most commands by default.
Some other tools call this "YOLO mode".
If this approach concerns you, you may want to prompt Goose to let you know before it runs commands (this approach **does not** substitute for running the tool in an isolated/containerized environment).
You ultimately never know what an LLM-based tool will actually run when given access to your system.

## Goose hints

When you start Goose, it will check for a `.goosehints` file in the current directory ([docs](https://block.github.io/goose/docs/guides/using-goosehints/)).
If it finds one, it will use the hints in that file to guide its behavior.
The instructions will be appended to the system prompt that Goose is provided.

Here's an example file:

```text title=".goosehints"
Always speak like a pirate.
```

Now, when can start Goose and say "hi", it will read the file and respond to my prompt.

```sh
❯ goose s
starting session | provider: anthropic model: claude-3-7-sonnet-latest
    logging to /Users/danielcorin/.local/share/goose/sessions/Kt3w4dIH.jsonl

Goose is running! Enter your instructions, or try asking what goose can do.

( O)> hey
# Ahoy there, matey!

'Tis a fine day to be sailin' the digital seas! I be Goo
se, yer AI assistant, ready to help ye with whatever tas
k ye need.

What can I be doin' for ye today? Be it code to write, f
iles to edit, or commands to run on yer macOS vessel, I
be at yer service!

Just give me a headin', and we'll set sail together on t
his technological adventure.

If ye need to know what commands be at yer disposal, ye
can use:
- `/help` or `/?` to see available slash commands
- `/exit` or `/quit` to end our voyage
- `/t` to toggle between Light/Dark/Ansi themes

What say ye, captain? What course shall we chart?
```

## Goose as a task runner

Because a `.goosehints` file can contain any natural language instructions, we can also use it to define useful tasks that might benefit from a language model-based agent execution flow, like idea generation, summarization, or structured data extraction.

Here's an example of a `.goosehints` file that uses Goose to generate summaries of content from my blog.
It provides the description of a _hypothetical_ summary command and a few _hypothetical_ options for creating summaries across my post types and over different time periods.
It also prompts for citations from the original content from which the summaries are derived.

I'm emphasizing the _hypothetical_ part because we're not actually going to implement this `/summary` command with code.
We're going to have Goose use this specification as instructions which it will carry out, allowing the language model to run commands to do it.

Here's the file:

````text title=".goosehints"
This repository is a the Hugo blog for my personal website, danielcorin.com.
It's Github repository is available at https://github.com/danielcorin/blog.

The `Makefile` contains useful commands for managing the blog.

You should also support the following commands:

## `/summary`

This command summarizes the posts for a given type and period.

For example,

```
/summary logs 2020-02
```

This will summarize all the posts in the `logs` folder for the month of February 2020.

```
/summary all -3m
```

This will summarize all posts of all types in the last 3 months, including `posts`, `til`, `logs`, `projects` and `garden`.
This command also supports weeks and years:

```
/summary all -3w
/summary all -1y
```

The outputted summary should contain Hugo links to the posts from which the summary is derived.
Then can be provided inline.
For example,

```md
... [2025-02-28](logs/2025/02/28) ...
```

or

```md
I [learned more about Astro](til/astro/intro) and build a new website ...
```

No need to reference the dates directly.
Weave the links into the prose of the summary.

The summary will be outputted in `content/summary/<type>/<period>.md`.
````

Now, I can run Goose and generate a summary of my `logs` posts in February 2025 like this:

```sh
goose s
( O)> /summary logs 2025-02
```

Goose first reads the `.goosehints` file and then plans and executes a series of shell commands to find the appropriate files, load them into context, generate the summary, and write it to a file in the location and with the naming convention specified.

After running the command above, Goose wrote a file out to `content/summary/logs/2025-02.md` with a pretty reasonable summary.

## That's a lot of tokens

While the above command works well in my experience, it can use a lot more tokens than is really necessary as Goose navigates the filesystem, builds a context window, generates the summary, and writes it to a file.
Most of these steps don't _need_ to be executed by Goose.
We can write a deterministic script that builds the context from the types of posts and window of time we specify, then _just_ prompt an LLM to summarize.

I had the LLM write a script for this.
Compared to the ~50 lines in my sparse `.goosehints` file, the script is almost 300 lines of Python.

This is obviously not an apples-to-apples comparison.
The script is deterministic (except for the LLM summary), far more efficient, and less prone to random failures of the LLM agent.
However, the `.goosehints` file is more flexible, easier to understand, and easier to read.

I believe there is room and value in both approaches.

## Language vs Code

The ability to write a quick instruction set and have an agent execute it in steps is powerful and distinctly its own thing compared to what long-time engineers are used to.
Once an idea has been translated into code, edges need to be dealt with, compilers and interpreters satisfied.
Code necessarily imposes limiting constraints on the developer.
We want and need our programs to be correct.
To accomplish this, we need to handle failure modes and edge cases.

Natural language is more flexible and squishy compared to code.
There is more room for interpretation at inference time.
Any validation (like does the program compile/run) is done at runtime.
Natural language allows for faster iteration but, in practice, can produce unpredictable results.

While (orders of magnitude more) inefficient compared to the typical way you'd perform this task, I was still impressed with the results of the `/summary` command from my `.goosehints` file.
The execution became an implementation detail dealt with by the model once the spec was written.
The prose and documentation are clearer than the Python and shell equivalents I wrote, especially for a non-technical reader.
It's also trivial to extend - I just write the document of the new feature and Goose and the model do the rest.

Goose and other LLM-based tools make it easy and fast to extend a script version of the summary command, but the way you do that is by writing the spec or description of what you want.
This is all you do when creating a "command" in a `.goosehints` file.

You could argue that natural language instructions, executed by an agent, are like an interpreted language whereas an already-written script is closer to a compiled language because the language tools and runtime impose constraints and invariants on the behavior of the program.
It's possible to reason about what the behavior of the latter will be at runtime, but the former can still be useful.
