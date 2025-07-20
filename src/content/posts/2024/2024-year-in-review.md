---
title: 'Year in Review: 2024'
createdAt: 2024-12-31T15:50:04.000Z
updatedAt: 2024-12-31T15:50:04.000Z
publishedAt: 2024-12-31T15:50:04.000Z
tags:
  - year_review
draft: false
---

This year included a lot of writing and learning new things.

My goals for the year were the following

> Train a machine learning model and write about it
>
> - I've been learning ML in reverse, first playing with language models and now learning more about what it actually takes to construct a system capable of ML inference. Training my own models feels like the next step to develop depth of understanding in this area.
>
> Build search for my blog
>
> - As I've continued writing more, I've started to reference past work in my newer work or just to check how I solved a problem I know I've seen before. Adding search to this blog, which contains things I've learned, ideas and projects I've worked on makes retrieving that information easier.
>
> Setup a digital garden
>
> - I'm continuously trying to remove boundaries to if and when I write about things. I find writing helps clarify my thought process and so my aim is to setup an environment for myself so I do more of it. I view my digital garden as a space for playing around with ideas in a less structured way than a proper "post". Sometimes things from the garden may evolve into something else but there is no expectation they will.

## Things I did

- Setup [Nix](https://github.com/danielcorin/nix-config/) to manage my MacBook's system configuration and dotfiles
- Experimented with solving [Connections](/tags/connections) with LLMs, including fine-tuning and multi-turn conversation
- Created a [search page](/search) for this site
- Made my site [friendly](./index.md) to LLMs by appending `index.md` to urls to get raw markdown
- Set up a [digital garden](/garden) for idea iteration
- Experimented with [VLMs](/tags/vlms/) for structured data extraction
- Trained a bunch of [machine learning models](/tags/course.fast.ai) while working through the [Fast.ai course](https://course.fast.ai/)
- Built a [word game]({{< ref "projects/cogno.md" >}}) using embeddings
- Built an [Electron app]({{< ref "projects/delta.md" >}}) for LLM conversation branching
- Created a [blogroll]({{< ref "garden/inspiration/people.md" >}})
- Created a [personal curated content feed](/feeds/curated/)
- Created a [process](https://github.com/danielcorin/blog/blob/main/scripts/convert_notebook.py) to convert notebooks to posts on this blog, which might be my preferred code+writing approach right now (for Python at least)

## Content by the numbers

(Calculated with [this](https://github.com/danielcorin/blog/tree/main/scripts/year_review.py) quick and dirty script)

| Category                   | Posts   | Words     |
| -------------------------- | ------- | --------- |
| [🏗️ Projects](/projects)   | 4       | 791       |
| [📍 Now](/now)             | 1       | 63        |
| [📖 Posts](/posts)         | 21      | 25415     |
| [🌱 Garden](/garden)       | 4       | 4827      |
| [✏️ Logs](/logs)           | 140     | 22687     |
| [📝 Today I Learned](/til) | 47      | 35214     |
| **Total**                  | **217** | **88997** |

The "logs" section of this site has become a helpful scratchpad for ideas and capture of what I am up to for myself to go back and reference.
I don't actively surface these entries anywhere on the site, but you can find them [here](/logs).
Lately, a lot of longer posts and projects have started out as ideation in the logs.
For a while I was also putting links of interesting work by others in my logs but I've moved that over to [feeds](/feeds).

Not all content in the garden is timestamped.
I'll probably aim to at least maintain an `updated_at` in the future.

I'll also probably aim to restructure the `now` page(s) so that it preserves history explicitly rather than requiring inspection of the git history.

## Things I didn't do

### Make more predictions

This was one of those things that seemed good on paper, but was hard to do in practice.
Incidentally, market-making and betting markets on arbitrary events became much more popular in 2024.
I don't feel a strong pull to focus on this going forward.

### Redesign/rebuild this blog

I have a love/hate relationship with Hugo (particularly the templating language) but it's held up under a lot of growth over the past ~2 years.
I've also gotten a lot of mileage out of the [Poison](https://github.com/lukeorth/poison) theme on GitHub, but a part of me wants to put more of a personal stamp on my site's design.
I'd prefer something that primarily supports markdown posts, makes adding additional content like images, Bluesky posts and other embedded things straightforwardly and allows me to write JavaScript to build interactive things when I want to (this last item being the main shortcoming of Hugo).
The challenge is balancing spending time exploring alternatives for this site and working on other projects and I know there will be a lot of effort required to migrate existing content.

## Things I aim to focus on next year

- Continue building machine learning foundations
- Get comfortable with an LLM eval stack
- Continue exploring alternate LLM UX through [Delta](/projects/delta) and other experiments
- Engage more with folks working on applying LLMs
