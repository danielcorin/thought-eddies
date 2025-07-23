---
title: Using `llm` to handle large input context
createdAt: 2025-05-16T19:18:54.000Z
updatedAt: 2025-05-16T19:18:54.000Z
publishedAt: 2025-05-16T19:18:54.000Z
tags:
  - llm
  - repomix
draft: false
---

Today, I ran into an issue where I wanted to use [`repomix`](https://repomix.com/) to pack a large codebase into a single file to pass to an LLM, but I couldn't paste the output into any of the UIs I typically use. The React apps all became sluggish as I waited for ~500,000 tokens to paste.

Enter `llm`.

I solved this problem with a bash one-liner:

```sh
llm -m gemini-2.5-pro-preview-05-06 "The provided context is all the code of an old codebase. Analyze this code and come up with high impact, meaningful improvements to make the codebase easier to work with." < repomix.output
```

The API and subsequent inference took about 85 seconds, and I had my response.

The quality of the results was mixed.
There were a few good suggestions, some of which we'd already considered and some that we're currently implementing.
Overall, I'm unsure this is an approach I will reach for very often.
