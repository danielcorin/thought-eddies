---
name: breadcrumb-post
description: Turn an agent-discovered fix, setup note, or small practical solution into a concise breadcrumb post for thought-eddies. Use when Daniel asks to write, create, or log a breadcrumb, especially from an agent-produced source file, investigation, or completed task.
---

# Write a breadcrumb post

Create a durable, searchable record of a useful solution that an agent did most of the work to discover or implement.
A breadcrumb is intentionally smaller and less involved than a TIL or full post. It preserves enough context, commands, and caveats for Daniel or someone with the same problem to reproduce the result later.

## Decide whether the content fits

Use a breadcrumb when:

- an agent found, implemented, or explained most of the solution;
- the result is a practical fix, configuration, diagnosis, or repeatable procedure;
- the work could often be completed in one well-articulated agent request; and
- a concise, discoverable writeup is more useful than leaving the result in a chat transcript or project file.

A TIL is a better fit when Daniel did substantial exploration and wants to explain what he learned in depth. A full post is a better fit for an original argument, broader reflection, or substantial narrative.

## Gather context

1. Read all source material the user names. Inspect related files or command output when needed to understand what actually happened.
2. Read `src/content/breadcrumbs/2026/diagnosing-system-wide-scroll-lag-on-macos.mdx` as the primary tone and structure reference.
3. Check `src/content.config.ts` for the current `breadcrumbs` schema and inspect other recent breadcrumbs if they exist.
4. Search existing content for a duplicate or a post that should be linked.
5. Do not expose client names, private repository paths, usernames, credentials, internal hostnames, or other details that are unnecessary to reproduce the solution. Generalize them rather than calling attention to the redaction.
6. Do not browse the web unless a technical claim needs current verification or the user asks for research. Prefer the supplied evidence and distinguish what was observed from what is inferred.

## Write the post

Create:

```text
src/content/breadcrumbs/<year>/<descriptive-searchable-slug>.mdx
```

Use a title and description containing the terms someone would search for when encountering the same problem. Use valid frontmatter:

```yaml
---
title: '...'
description: '...'
createdAt: <ISO 8601 timestamp>
updatedAt: <same timestamp>
publishedAt: <same timestamp when publishing>
tags:
  - relevant-tag
draft: false
---
```

Honor explicit draft or publishing instructions. If intent is unclear and publication would be consequential, use `draft: true` and omit `publishedAt`.

Match Daniel's voice:

- open in first person with the concrete problem or desired outcome;
- mention turning to an agent naturally and briefly;
- use short, direct sentences and contractions where natural;
- avoid inflated claims, generic scene-setting, and tutorial boilerplate;
- explain the mechanism just enough to make the fix understandable;
- preserve exact commands, config, diagnostic evidence, and important caveats;
- prefer a few descriptive headings over an exhaustive procedure; and
- keep the piece proportional to the solution. Do not expand a small result into a full article.

A useful default shape is:

1. the problem and why Daniel asked an agent;
2. what the agent found;
3. the configuration, command, or fix;
4. how to verify it;
5. limitations or caveats; and
6. a short attribution after a horizontal rule.

End with transparent attribution such as:

```md
---

The bulk of this investigation and writeup was produced by `<agent>`.
I am publishing it in the hopes that someone with the same problem can find the solution.
```

Use the known agent name. If it is unknown, say "an agent" rather than guessing.
If the original prompt is available and useful, include it using `ChatContainer` and `ChatMessage`, with the matching imports at the top of the MDX body. Never reconstruct or invent a prompt.

## Verify

1. Run Prettier on the new post and any files added for the task:

   ```sh
   pnpm exec prettier --write <paths>
   ```

2. Run `pnpm build` to validate frontmatter, MDX, and routes.
3. Review the rendered prose or generated HTML for accidental private details and malformed code blocks.
4. Report the post path, draft state, verification result, and any claims that still need confirmation.
