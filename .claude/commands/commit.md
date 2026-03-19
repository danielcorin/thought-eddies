---
description: Create a git commit with a clear message
argument-hint: [optional commit message hint]
---

Create a git commit for the currently staged or modified files.

Steps:

1. Run `git status` and `git diff` to understand the changes
2. Run `git log --oneline -5` to see recent commit message style
3. Stage relevant files (prefer adding specific files over `git add -A`)
4. Write a concise commit message that focuses on the "why" rather than the "what"
5. Commit the changes

Rules:

- NEVER add `Co-Authored-By` lines to the commit message
- NEVER add Claude as a coauthor or collaborator in any form
- Do not commit files that likely contain secrets (.env, credentials, etc.)
- Use a HEREDOC to pass the commit message for correct formatting
- If the user provided a hint via `$1`, use it to guide the commit message
- Follow the commit message style of recent commits in the repo
