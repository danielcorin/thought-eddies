---
title: Playing with Language Models
createdAt: 2023-02-24T00:36:45.000Z
updatedAt: 2023-02-24T00:36:45.000Z
publishedAt: 2023-02-24T00:36:45.000Z
tags:
  - language_models
  - gpt3
  - chatgpt
  - reads
draft: false
aliases:
  - posts/playing-with-language-models
---

Since the launch of GPT3, and more notably ChatGPT, I’ve had a ton of fun learning about and playing with emerging tools in the language model space.

## Restaurant concepts and menus with ChatGPT and DALL-E

I was chatting with folks at work over lunch and someone had the idea to try and come up with an unusual restaurant concept using ChatGPT.
We ended up with an Italian-Thai Fusion restaurant.
From this concept, we had the LM generate a menu, and then we prompted it to come up with a recipe for Sweet and Sour Chicken Parmesan (a menu item it proposed).
Finally, we generated a picture of what Sweet and Sour Chicken Parmesan would look like.
The whole process took 5-10 minutes, copying and pasting between browser tabs on a phone.
While this was a silly example, it was a compelling window into where things might go with this technology.

## Date math with GPT-3

I attempted to design a prompt for the GPT-3 API that could parse datetimes described with natural language.
For example, if today was 2023-02-01 and I input `next thursday from 3:30-4pm` to the model, I wanted to design a prompt such that the model would output

```json
["2023-02-10 15:30:00-08:00", "2023-02-10 16:00:00-08:00"]
```

assuming I provided the timezone.

I quickly learned I needed to inject the current time into the prompt at runtime, to give the model a starting point from which it could "calculate" the dates I was prompting for.
It was also relatively easy to get the model to output the data in the JSON format I was requesting.
The date math, however, was not as straightforward. I ended up with the following finished product:

```sh
❯ date
Sun Feb 26 17:30:05 EST 2023
❯ python parse_date_options.py thursday from 8pm-9pm or friday 2-5pm
[
  ["2023-03-02 20:00:00-08:00", "2023-03-02 21:00:00-08:00"],
  ["2023-03-03 14:00:00-08:00", "2023-03-03 17:00:00-08:00"]
]
```

With some iteration on the prompt, I eventually kinda-sorta got the outcome I was looking for. You can find the code [here](https://gist.github.com/danielcorin/c19483b9c52c1e2970db9f6f2493e7d7) if you're interested. Keep in mind, the code is often wrong and is inconsistent between runs.
It was cool to see the date formatted properly though and the occasional correct answer.
I'm sure a [langchain](https://github.com/hwchase17/langchain) tool would be better at this.

## Personal knowledge/second brain indexing and search

Since I've become more serious about using Obsidian to capture notes, the idea of writing Q&A against my personal knowledge base or Second Brain has been a compelling one and one I've seen a number of folks talking about as well.
There is even an [Obsidian data loader](https://llamahub.ai/l/obsidian) for LlamaIndex, indicating people are already doing this type of thing today.
While I'm personally not comfortable shipping bits and pieces of my personal notes data to OpenAI, this concept has motivated me to look into deploying a pre-trained model from Hugging Face.
I'm open to (soliciting) recommendations on a good (and reasonably priced) way to do this.

It’s pretty wild to see the speed of change as this tech has become more accessible and entered mainstream.

A few more good and surprising reads I’ve come across or were recommended to me recently:

[Tutorial: How to create consistent characters in Midjourney](https://linusekenstam.substack.com/p/tutorial-how-to-create-consistent): Having played with Midjourney a fair amount myself (I illustrated a [book](https://adventure-of-penelope.vercel.app) with it), consistency or lack thereof was a challenge area that had come up several times.
To see a guide outline the approach to achieving more consistency with Midjourney further raised the potential of where I could see this tech making impact.

[CheatGPT](https://blog.humphd.org/cheatgpt/): While not entirely surprising that students are using ChatGPT to complete programming assigned, it's impactful to hear a professor to describe the quality of the code written by his students, only to realize his students hadn’t actually written the code.
Hopefully, these challenges will motivate productive change in the classroom and how we educate

[thesephist.com](https://thesephist.com/): I recently discovered Linus' blog and work and have enjoyed his thoughtful posts on building better tools and thinking, and I still I have a lot to read ahead.
I also enjoy his implementation of what he calls [the stream](https://stream.thesephist.com/), which is a sort of social-media-decoupled personal stream-of-consciousness.

## What’s next

- This week I’m doing a project at work where we’re attempting some structured data generation of arbitrarily complex objects with LMs
- I'm going to spend some time learning more about how to deploy pre-trained models from [Hugging Face](https://huggingface.co/) and investigating different types of models
