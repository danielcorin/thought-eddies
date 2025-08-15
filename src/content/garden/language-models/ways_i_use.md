---
title: Ways I Use
draft: false
---

## Code generation

I use language models to generate code following specific instructions.
Usually, this involves a short prompt.
I typically generate 30 lines of code or less.
I may use the model to write an script starting with nothing.
I more frequently use models to amend or augment code in an existing code base.
For example, I may highlight a list then prompt "write a function to remove falsy values then sort in descending order by field `date`"

## A web search alternative

Instead of Google or alternative search engines, I use a language-model-first search engine like [Perplexity](https://www.perplexity.ai/), [You](https://you.com/) or just a model playground.
For a while I used the [OpenAI playground](https://platform.openai.com/playground).
Since the release of Claude 3, I've been using the [Anthropic workbench](https://console.anthropic.com/workbench?new=1).
I also use the [`llm`](https://github.com/simonw/llm) CLI to quickly invoke models, though I'm still building muscle memory for this approach.
The latter is nice because it maintains a local sqlite database of all model interactions.

## To scaffold examples and demos

Whenever I need sample data for a demo or example, I'll use a language model to either generate the sample or write a script to do so.
This my take the form a prompt like

> Write a creative menu for a barbecue restaurant

which is an approach I've used to generate unstructured data to separately demonstrate the model's capability to extract structured data.

## As a thought partner

For me, writing about something helps clarify my understanding and highlight areas where I lack understanding.
I use a model to probe my understanding of topics with instructions to identify areas I might have overlooked.
This is useful when researching,

## Proofreading and refining my writing

I use language models to proofread my writing and suggest improvements based on my goals and audience.
I also use models to help refine specific sentences or paragraphs.
If a sentence doesn't sound right, I'll ask the model to suggest a clearer way to express it, then I'll refine it further if needed.
It's about as useful as getting a cursory pass on a first draft from a peer reviewer, but doesn't take up a human's time and I can run it as often as I want.
It's pretty good at identifying issues.
I still need to find a good and fast way for a model to automatically propose fixes without needing to regenerate an entire document.
