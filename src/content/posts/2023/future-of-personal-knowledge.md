---
title: Future of Personal Knowledge
createdAt: 2023-04-07T12:10:58.000Z
updatedAt: 2023-04-07T12:10:58.000Z
publishedAt: 2023-04-07T12:10:58.000Z
tags:
  - language_models
  - second_brain
  - personal_knowledge
  - documentation
draft: false
aliases:
  - posts/future-of-personal-knowledge
---

Over the the years, I've developed a system for capturing knowledge that has been useful to me.
The idea behind this practice is to provide immediate access to useful snippets and learnings, often with examples.
I'll store things like:

> Amend commit message
>
> ```sh
> git commit --amend -m "New commit message"
> ```

with tags like `#git`, `#commit`, and `#amend` after I searched Google for "how to amend a git commit message".
With the knowledge available locally and within my own file system, I've added search capabilities on top which allows me to quickly find this snippet any time I need it.
I use a system hotkey to bring up the search function then type loosely what I am looking for (maybe "git amend commit") and this snippet is returned as a result.

In addition to being a useful archive, this knowledge base has helped me write software more quickly. Instead of needing to do a Google search, select a link, then read the page each time I need to do something I know I've done before once or twice, but can't remember how, I just search my index for the result I researched a while back, then documented.

Language models often provide similar capabilities to what I've constructed with my knowledge base, but they work for things I've never documented or even encountered before.
This functionality has made me begin to wonder if there continues to be a role of a personal knowledge base in a engineer's toolkit and whether it's worth the effort to continue to build and maintain.

## Advantages and flaws of a personal knowledge base

### Advantages

- available offline
- extremely fast
- yields consistent results
- author controls when content is updated
- author can provide useful or relevant examples for themselves or examples relevant to specific projects or contexts
- can contain knowledge that is not publicly available

### Flaws

- doesn't know about things I've never documented
- becomes out of date by default and I have to update the content
- requires non-zero effort to construct (create an entry, write an explanation, add the solution, tag it)

## Advantages and flaws of language models

Given the combination of context, speed and availability (given the fact that the most powerful LMs today are used via API), and privacy, I don't see myself entirely moving away from keeping a personal knowledge base.
It's clear though that language models have some impressive advantages as they can effective serve as the world's public knowledge base (through the date they were trained).
Lately, I've found myself pulling up ChatGPT more often than searching my personal knowledge index, even for things I suspect I've documented.
The cost of considering whether I've figured something out before, then searching for it in my personal index coupled with the potential that I was mistaken and don't find what I need doesn't seem worth it when ChatGPT generally gives an answer that solves my issue.
ChatGPT can sometimes be more verbose than I need and that's not great for getting answers extremely fast but it's generally quite good at inferring your intent from concise prompts.
I had a lot of success getting useful information for the same types of things I would type into Google or to search my knowledge index like "amend git commit" or "bash check if variable is set".
Prepending "Be concise." to the prompt eliminates a lot of the prose from the answer.
However, if I'm doing research on the best way to structure my shell script, I may want to see more options for how to check if a variable is set.
Having all these options available feels like a super power and I can create prompt templates on top of a tool like [chatblade](https://github.com/npiv/chatblade) that I can invoke in context-specific circumstances to get the type of result I need without needing to manually prepend a prompt to my query.

## Verdict

It seems like the days of cataloging simple examples for common software tools are probably over.
Language models provide fast and more flexible access to most publicly available information, without requiring the investment of manually constructing the index.
Ultimately, I think a hybrid model that incorporates both one's personal knowledge combined with a languages model's results will probably be even more useful than either tool alone.
Additionally, constructing a history (like shell history) of language model responses stored locally could be useful providing capabilities offline for repeat searches.
Being able to ctrl-r, fuzzy search for a language model query, then have the result returned immediately from local storage seems like it could provide the best of both worlds and integrate well into a terminal-centric workflow.
This would transition the notion of a personal knowledge base to a language model generated knowledge base, with optional, personal edits.
If the local knowledge base doesn't have the answer, the same query can be routed to the language model.
It would be interesting to combine this shell-history-like functionality with a CLI tool that calls a language model.
