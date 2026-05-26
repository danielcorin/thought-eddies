---
title: 'Claude Code and Agent Conventions'
createdAt: 2026-05-26T10:40:57.149969
updatedAt: 2026-05-26T10:40:57.149969
publishedAt: 2026-05-26T10:40:57.149969
tags: null
draft: false
---

For some reason I believed Claude Code at least supported the [`AGENTS.md`](https://agents.md/) convention. It seems it neither supports that, nor the `.agents` folder convention.

First, I tried setting up a skill.

```sh
❯ tree .agents
.agents
└── skills
    └── chainlink
        ├── commands.md
        ├── hooks.md
        └── SKILL.md

3 directories, 3 files
```

Then ran `claude`:

```
❯ list the skills you see

⏺ Here are the available skills:

  1. update-config — Configure Claude Code settings
  (hooks, permissions, env vars, settings.json)
  1. keybindings-help — Customize keyboard shortcuts and
  keybindings
  1. verify — Run the app and observe behavior to verify
  a code change works
  1. code-review — Review the current diff for
  correctness bugs at a given effort level
  1. fewer-permission-prompts — Scan transcripts and add
  allowlists to reduce permission prompts
  1. loop — Run a prompt or slash command on a recurring
  interval
  1. claude-api — Build, debug, and optimize Claude API /
   Anthropic SDK apps
  2. run — Launch and drive the project's app to see a
  change working
  1. init — Initialize a new CLAUDE.md file with codebase
   documentation
  2.  review — Review a pull request
  3.  security-review — Complete a security review of
  pending changes on the current branch

  You can invoke any of these by typing /<skill-name>.

✻ Sautéed for 5s
```

This doesn't work by default.
The skill in the `.agents` folder isn't automatically loaded by the Claude Code harness.

This same prompt indicates things do work when you switch to the `.claude` folder convention.

```sh
❯ tree .claude
.claude
└── skills
    └── chainlink
        ├── commands.md
        ├── hooks.md
        └── SKILL.md

3 directories, 3 files
```

```
❯ list the skills you see

⏺ Here are the available skills:

  1. chainlink — Track issues, sessions, and breadcrumbs
  with the chainlink CLI
  2. update-config — Configure Claude Code harness via
  settings.json (hooks, permissions, env vars)
  3. keybindings-help — Customize keyboard shortcuts and
  keybindings
  4. verify — Verify a code change works by running the
  app and observing behavior
  5. code-review — Review the current diff for
  correctness bugs
  6. fewer-permission-prompts — Scan transcripts and add
  allowlists to reduce permission prompts
  7. loop — Run a prompt or slash command on a recurring
  interval
  8. claude-api — Build, debug, and optimize Claude API /
   Anthropic SDK apps
  9. run — Launch and drive the project's app to see a
  change working
  10. init — Initialize a new CLAUDE.md file with
  codebase documentation
  11. review — Review a pull request
  12. security-review — Complete a security review of
  pending changes on the current branch

✻ Cogitated for 5s
```

The same lack of standard support can be seen with the agent markdown files.

```md title=AGENTS.md
My name is Bob
```

```sh
❯ what is my name

⏺ Based on your git config and email, your name is Dan
  Corin.
```

```md title=CLAUDE.md
My name is Bob
```

```sh
❯ what is my name

⏺ Your name is Bob.
```

## Codex

Per my testing today, Codex seems to now support both provider-agnostic conventions `AGENTS.md` and a `.agents` folder.
