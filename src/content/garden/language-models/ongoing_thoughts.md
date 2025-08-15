---
title: Ongoing thoughts
draft: false
date: 2024-08-19T21:26:08-04:00
---

- It is currently kludgy and time consuming to iterate on a prompt for a language model to integrate some kind of inference into an engineering use case in a microservice environment. This is specifically difficult because it's not yet clear where productive separation of concerns should be.
- Many frameworks are under development, but they typically get you off the ground quickly with a basic use case at the expense of scaling well with your use case.
- It's not entirely clear what the most productive prompting approach is for a task or if you (prompt engineering) or a model (DSPy) should improve the prompt.
- We don't always know whether we should try and use a single inference with approaches like Chain of Thought, multi-shot and structured outputs or if and how we should use multiple turns in a conversation.
- When we do pick an approach, it's not clear how we test or monitor. We can write evals (ground truth prompt+output pairs that we validate), though it is only really easy to do for single-message inferences and usually structured output.
- How can we observe (especially to debug) the prompts/context and inference outputs across a conversation with a model? When we get a bad or wrong response, what were the inputs, how can we understand them and how can we improve the model performance for the use case? What if we can't improve the performance and no prompting, fine-tuning or existing model seems to work well?
