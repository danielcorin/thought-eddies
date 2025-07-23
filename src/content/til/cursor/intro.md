---
title: Cursor Introduction
createdAt: 2023-08-16T00:00:00.000Z
updatedAt: 2023-08-16T00:00:00.000Z
publishedAt: 2023-08-16T00:00:00.000Z
tags:
  - cursor
  - intro
  - partly_ai_authored
draft: false
---

[Cursor](https://www.cursor.so/) is VS Code with Cmd+K that opens a text box that can do text generation based on a prompt.
When I created this post, I first typed

> insert hugo yaml markdown frontmatter

In a few seconds, the editor output

```yaml
---
title: 'Cursor Introduction'
date: 2023-08-12T20:00:00-04:00
draft: false
tags:
  - cursor
  - intro
---
```

This was almost exactly what I was looking for except the date was not quite right, so I corrected that and accepted the generation.
Since I use VS Code, I felt at home immediately.
The only thing missing is my extensions, but extension installation works exactly the same way.
Cmd+L opens a ChatGPT-style chat in the right sidebar.
You can reference files within the chat interface with `@` which seems to load them into the language model prompt as context.
I asked it to describe what this post was about with

> @intro.md what is this post about?

It outputted

> This post is an introduction to Cursor, a tool that enhances VS Code with text generation capabilities. The author explains how they used Cursor's Cmd+K feature to generate YAML frontmatter for a Hugo markdown file. The generated frontmatter was almost perfect, requiring only a minor date correction. The author also mentions the familiarity of the Cursor interface due to its similarity with VS Code, and the ease of installing extensions. The post also introduces the Cmd+L feature, which opens a ChatGPT style chat in the sidebar, allowing users to reference files within the chat interface.

I think that's a nice summary.
It's a bit amusing to use text generation when writing a blog post.
For me, it's more natural to invoke it to generate code because I'm more comfortable writing in English than I am writing code.
I can definitely think of times where it could be useful: as a thesaurus or to improve clarity.

Now, let's dive deeper into how Cursor can be used for code generation.
One of the most powerful features of Cursor is its ability to generate code based on a prompt. This can be incredibly useful when you're stuck on a particular problem or just want to speed up your development process.
For example, if I'm working on a Python project and I need to write a function to calculate the factorial of a number, I can simply type `generate python function for factorial` and Cursor will provide me with a code snippet.
Let's see how it works.

I didn't write that last paragraph and I suspect you can tell.
I asked Cursor in chat

> @intro.md what should I write next?

Next, I prompted it to

> @intro.md find typos in this post

It found a few areas to refine my writing and I've made those edits in the post above.

Overall, it feels surprisingly natural.
This could be because of how much I already copy and paste into and out of language models on a day to day basis, and Cursor makes it feel so much easier.
Already, I want this experience everywhere, with the presence of something like [Alfred](https://www.alfredapp.com/) but with the context of whatever I'm currently doing, in a browser, editor or application.
