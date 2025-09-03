---
title: 'Claude Code Custom Slash Commands Hierarchy'
createdAt: 2025-09-02T18:49:42.561814
updatedAt: 2025-09-02T18:49:42.561814
publishedAt: 2025-09-02T18:49:42.561814
tags: [claude-code, slash-commands]
draft: false
---

Claude Code supports [custom slash commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands#custom-slash-commands).

> Custom slash commands allow you to define frequently-used prompts as Markdown files that Claude Code can execute. Commands are organized by scope (project-specific or personal) and support namespacing through directory structures.

This feature reminds me of my experiment using [Goose as a task runner](/posts/2025/goose-as-a-task-runner), where writing a markdown spec in a `.goosehints` file is sufficient to get the agent to execute a task.

Claude Code provides native support for these "slash commands" as well as support for arguments.
If you find yourself prompting in a similar way often, a custom slash command may be a good fit to save you some typing.

While there are lots of interesting ways to use this feature, today I learned about how they apply hierarchically between the home folder and within your project and its subfolders.

Let's consider the following custom slash command

```md title="~/.claude/commands/hello.md"
Say "hello from home dir"
```

If we fire up `claude` in an empty folder, we see the following when we prompt `/hello`

```sh
╭───────────────────────────────────────────────────────────────────────────────────╮
│ > /hello                                                                          │
╰───────────────────────────────────────────────────────────────────────────────────╯
  /hello     Say "hello from home dir" (user)
```

Now, let's add a custom slash command in the project folder.

```md title="./.claude/commands/hello.md"
Say "hello from project dir"
```

```sh
claude
```

```sh
╭───────────────────────────────────────────────────────────────────────────────────╮
│ > /hello                                                                          │
╰───────────────────────────────────────────────────────────────────────────────────╯
  /hello                Say "hello from project dir" (project)
```

The slash command defined in the home folder is overridden by the one we defined in the project folder.

Now, let's add a custom slash command in a subfolder of the project.

```md title="./subfolder/.claude/subfolder/hello.md"
Say "hello from subfolder"
```

```sh
claude
```

```sh
╭───────────────────────────────────────────────────────────────────────────────────╮
│ > /hello                                                                          │
╰───────────────────────────────────────────────────────────────────────────────────╯
  /hello               Say "hello from project dir" (project)
  /subfolder:hello     Say "hello from subfolder" (project)
```

We see both slash commands, with the one we just added showing up under the namespace.

Say we also want the commands from our home directory and want to avoid naming collisions with the project commands.
We can do that by symlinking the home commands into the a subdirectory in the project.

```sh
mkdir -p .claude/commands/home && ln -sf ~/.claude/commands/* .claude/commands/home/
```

```sh
claude
```

```sh
╭───────────────────────────────────────────────────────────────────────────────────╮
│ > /hello                                                                          │
╰───────────────────────────────────────────────────────────────────────────────────╯
  /hello               Say "hello from project dir" (project)
  /home:hello          Say "hello from home dir" (project)
  /subfolder:hello     Say "hello from subfolder" (project)
```

The `/hello` command from the home directory now shows up under the `home` namespace as a project command.
However, since it is a symlink, any changes to the `~/.claude/commands/hello.md` file will be reflected in the project commands the next time we start `claude`.

That is a reasonable setup but what if you work in a monorepo and want to be able to use `./.claude/commands` from the root of the project in subfolders of the project?

Given our setup above, for starters, let's run `claude` in the `subrepo` folder.

```sh
cd subrepo
claude
```

```sh
╭───────────────────────────────────────────────────────────────────────────────────╮
│ > /hello                                                                          │
╰───────────────────────────────────────────────────────────────────────────────────╯
  /hello     Say "hi from home dir" (user)
```

As expected, only the `/hello` command defined in `~/.claude/commands/hello.md` is available.
To get the same commands to be available in the subfolder as in the root of the project, we can symlink the `./.claude/commands` folder into the subfolder (`./subrepo/.claude/commands`).

```sh
cd subrepo  # if you haven't already
mkdir -p .claude/commands && ln -sf "$(realpath ../.claude)" .claude
```

```sh
claude
```

```sh
╭───────────────────────────────────────────────────────────────────────────────────╮
│ > /hello                                                                          │
╰───────────────────────────────────────────────────────────────────────────────────╯
  /hello               Say "hello from project dir" (project)
  /subfolder:hello     Say "hello from subfolder" (project)
  /home:hello          Say "hello from home dir" (project)

```

If we inspect the files, we can see the symlink in place as we expect.

```sh
dev/cc-commands/subrepo
❯ ls -l -R -A
lrwxr-xr-x@ - danielcorin  2 Sep 19:55  .claude -> /Users/danielcorin/dev/cc-commands/.claude
```

With this approach, any changes to the source folder are also reflected in the symlinked folder, which keeps everything in sync.

This seems to be the current state of the world with Claude Code, but it would be nice if there were better [monorepo support](https://github.com/anthropics/claude-code/issues/2365), similar to how the tool [supports](https://docs.anthropic.com/en/docs/claude-code/memory#how-claude-looks-up-memories) looking for `CLAUDE.md` files.

With symlinks, there are a few different approaches that can smooth over the rough edges while Anthropic decides how or if they want to support cascading commands.
