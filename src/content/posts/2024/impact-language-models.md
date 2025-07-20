---
title: >-
  Challenges and Opportunities of the Impact of Language Models on Software
  Engineering
createdAt: 2024-07-12T19:00:00.000Z
updatedAt: 2024-07-12T19:00:00.000Z
publishedAt: 2024-07-12T19:00:00.000Z
tags:
  - language_models
  - thoughts
draft: false
---

I'm trying something a bit new, writing some of my thoughts about how the future might look based on patterns I've been observing lately.

From where I'm sitting, it seems language models are positioned to become an indispensable tool for the software engineer.
While there continues to be advancement in model-driven agents which can autonomously accomplish software-creation tasks of increasing complexity, it's not clear if or how long it will take these to completely replace the job function responsible for writing, testing, deploying and maintaining software in a production environment.
If we accept the premise that the job of software engineer will exist in some capacity for the next several years, it becomes interesting to explore how widespread use of language models in software development will affect the job and evolution of the field.

## Models could hurt software quality

I've heard some variant of the following refrain a few times:

> Writing software with language models will result in more bugs and security vulnerabilities

I don't think more bugs and security vulnerabilities are a necessary outcome of using language models to write code, but I expect some software written with language models will be buggy and insecure.
I suspect these vulnerabilities and bugs will _mostly_ be created in codebases by developers with less experience writing software.
Most likely, by folks who never would have attempted to write code had language models not made writing software more accessible.

This is not to say existing software engineers won't make any or even more mistakes by writing code with language models, but that experienced engineers are typically more familiar with tools and approaches that can help prevent these mistakes from making it to production (e.g.
unit testing, integration testing, browser automation testing, penetration testing, load testing, code review).

I personally find the most effective way to build with a model is to view it as a pair programming partner.
When writing code that will go to production with a pair, you might not personally write every line, but you're engaged enough that you've at least read every line.
I don't yet trust models to write code that will go to production without thorough testing and scrutiny.
The model isn't going to get paged for an outage or security incident.
If I'm going to be paged, I want to know what I'm shipping.

## Inertia of existing languages and frameworks will increase

I think models will increase the number of people who are capable of building things with software.
However, I also see models augmenting the capabilities of folks who are already confident software developers.
The productivity I've gotten from using models to write software has been substantial, but these gains aren't evenly distributed.
If I want to write Python code, the model consistently can generate working code following my instructions.
When I've tried to use a model to write a front end application with [htmx](https://htmx.org/), a newer framework with fewer existing examples in open source, the model has been less helpful.

Because of the productivity improvements, I imagine that professional engineers may bias to using languages and frameworks that the models they use are also proficient in, especially since businesses impose pressure to ship quickly.
How good a model is at writing code in a language seems to be loosely correlated with how much existing code is out there in open source to be trained on.
I think this situation will increase inertia and switching cost from "incumbent" languages and frameworks.
If I've become used to a certain level of productivity, when I evaluate whether a new language or framework is worth using, it doesn't just matter how productive or performant the technology is itself, it also matters how productive I can be with it using language models.

It may become necessary to train or fine-tune and release a model as part of a release of a new language or framework, or even a new major version of an existing language or framework to facilitate adoption of new APIs and features.
As we come to rely more heavily on models for productivity, if new developments aren't quickly incorporated into model training sets, we may lag behind in adopting advances and improvements for our systems, trading off the productivity gains for having the models write a lot of code for us.

Lastly, if training on more modestly sized datasets isn't enough to make the model a meaningful productivity booster, the early mover advantage may be too much for new languages or frameworks to overcome.
It may be too big of a productivity hit for a team to switch from Python to Rust unless their product _requires_ the performance improvements Rust can offer.
This problem already exists today, but the effects could become more entrenched.

That said, I've seen earlier signs that these effects may be possible to overcome.
While my experience writing htmx code (as an example) with GPT-4 wasn't too successful, Claude 3.5 Sonnet was quite good at generating code using this framework.
This could be due to an increase in source material, improvement in model abilities or both.
It's hard to say with so many components of the environment changing at once.

## Models lower migration cost

Models are excellent at reproducing code from one language or framework in another, provided they are already effective at producing both the source and the target language.
Because of this capability, models are well positioned to reduce the cost of restructuring applications from an existing approach to a new one, or put another way, performing migrations.
An example could be a migration of a service's endpoints from REST to protobuf.
Provided with the existing REST code, most leading-edge models could generate a high-quality starting point for the protobuf messages and services.
If you have 10s or 100s of services, the time savings quickly start to add up.

Prior to the availability of these models, building high-quality migration tooling often required deep investment and static analysis.
Many models can do this work without much additional upfront investment.
Model assistance may reduce the expected effort of a migration effort to shift it from being "impractical" or "too time-consuming" to "feasible" or even "straightforward".
These improvements could be transformational for engineering organizations that have struggled to improve their developer experience or system health but have struggled to find the time, or incur substantial consulting fees to staff temporary teams to aid in required migration work.

Beware that this opportunity may be fleeting.
While lagging, the demands of the business will probably adjust for this overall improvement in engineering velocity and leverage.
Models will eventually lead businesses to expect more out of their engineering teams.
For now, they may temporarily create the slack you need to get your team or organization into a better state and will likely decrease the absolute cost of org-wide changes and migrations.

## Model change how we interview for engineering roles

When I entered the software industry, many interviews required me to write code on a whiteboard.
This constraint was frustrating because the actual job wasn't to write code on a whiteboard, it was to write code on a computer.
I think we're in the midst of seeing a similar transition in software interviewing.
If students are learning to build software collaboratively with language models, we're going to need to find ways to evaluate their skills that allow them to use the tools with which they're familiar.
One possible approach could be shifting the focus of interviews from writing code to debugging, taking care to playtest the question to ensure it can't be trivially solved by a model.
Another possibility is to increase the scope of the interview question in such a way that it becomes closer to something you could accomplish coding for an hour with a model.

I used to ask a "URL shortener" interview question.
It was quite open-ended and allowed the candidate to build whichever parts of the system that were interesting to them and that showed their skills.
In the case that a candidate was using a model on this problem, my expectations for how much they could build in an hour would be higher.

Raising the bar like this has consequences.
If you assume every candidate is going to use a model, you implicitly require most if not all candidates to use one to pass.
If you allow/expect candidates to use models, do you let them bring their own development environment or only allow them to use tools that your organization uses? What if you only have Copilot, but they are well practiced using Sonnet 3.5? Maybe they won't be able to pass only using your tools.
That might be ok if the match of their skills and your tools is important.
Maybe these considerations aren't meaningfully different from allowing candidates to interview in any language they want, even if your org doesn't use it.
Following this same argument should allow the candidate to choose their own tools for the interview.

I don't claim to have a solution to the age-old problem of how to identify talent, but I do think most existing approaches to interviewing software engineers need modification because existing interview questions are so easily solved by models and most interviews (even if processes dictate otherwise) index on solution correctness to pass a candidate more than most other signals.

## What am I missing?

If you're interesting in chatting more about any of these areas or think I'm very wrong in my assessments, I'd love to hear from you.
Feel free to reach out over [email](mailto:dcorin6@gmail.com) or [DM me](https://twitter.com/danielcorin1).
