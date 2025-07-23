---
title: Trying Out Deepsparse
createdAt: 2023-03-11T15:35:19.000Z
updatedAt: 2023-03-11T15:35:19.000Z
publishedAt: 2023-03-11T15:35:19.000Z
tags:
  - hugging_face
  - language_models
  - q&a
draft: false
---

I've been keeping an eye out for language models that can run locally so that I can use them on personal data sets for tasks like summarization and knowledge retrieval without sending all my data up to someone else's cloud.
[Anthony](https://github.com/aagnone3) sent me a link to a Twitter thread about product called `deepsparse` by [Neural Magic](https://neuralmagic.com/) that claims to offer

> [a]n inference runtime offering GPU-class performance on CPUs and APIs to integrate ML into your application

## Experimenting

Neural Magic provides a Docker container with a few options for interacting with their inference runtime.
You can start it up like this:

```sh
docker run -it -p 5543:5543 ghcr.io/neuralmagic/deepsparse:1.4.0-debian11 deepsparse.server --task question_answering --model_path "zoo:nlp/question_answering/distilbert-none/pytorch/huggingface/squad/base-none"
```

This starts a model server for the specific task and model passed in the CLI args.
Once started, you can play with the available API at [http://localhost:5543/docs](http://localhost:5543/docs).

You can also start the container and drop into a Python REPL with the `deepsparse` libraries installed.
This approach proved a bit easier for testing things out:

```sh
docker run -it ghcr.io/neuralmagic/deepsparse:1.4.0-debian11
```

Neural Magic has some [docs on Hugging Face](https://huggingface.co/spaces/neuralmagic/question-answering) about building a question and answer pipeline, so I figured I would try that out on a recent [Matt Levine article](https://www.bloomberg.com/opinion/articles/2023-03-10/startup-bank-had-a-startup-bank-run) about Silicon Valley Bank.

```python
from deepsparse import Pipeline

pipeline = Pipeline.create(task="question-answering", model_path="zoo:nlp/question_answering/distilbert-none/pytorch/huggingface/squad/base-none")

# the pasted contents of the article: https://www.bloomberg.com/opinion/articles/2023-03-10/startup-bank-had-a-startup-bank-run
context = "..."

# I plugged each of my questions below in here
question = "..."

inference = pipeline(question=question, context=context)

# the resulting `QuestionAnsweringOutput`
print(inference)
```

Here were some of the questions I asked, the model's answers and my commentary on the responses.

```python
question = "What did SVB's customers keep doing?"

#=> QuestionAnsweringOutput(score=17.167190551757812, answer='flinging money', start=1839, end=1853)
```

Sort of, yeah.

```python
question = "How much of the deposits are insured?"

#=> QuestionAnsweringOutput(score=16.52017593383789, answer='173 billion', start=12490, end=12501)
```

Wrong, this is the total amount of deposits.

```python
question = "What is SVB?"

#=> QuestionAnsweringOutput(score=16.845714569091797, answer='Perfectly reasonable banking service', start=1910, end=1946)
```

Yes, the article does _say_ that. I think you could probably argue this is the best answer given the context of the article.

```python
question = "Who are SVB's customers?"

#=> QuestionAnsweringOutput(score=17.964557647705078, answer='venture capital investors', start=10901, end=10926)
```

Funnily enough, yes, but more specifically, founders of companies with venture capital investor's money.

```python
question = "When did SVB collapse?"

#=> QuestionAnsweringOutput(score=14.613320350646973, answer='Friday', start=11559, end=11565)
```

Right.

```python
question = "Who could buy SVB?"

#=> QuestionAnsweringOutput(score=16.631027221679688, answer='equity investors', start=1275, end=1291)
```

Probably not? I don't think the article suggests this might happen at least.

## Takeaways

To start, the software does perform as advertised.
It is an inference engine I can download and run it on my local CPU, and it does produce responses of reasonable accuracy.
It's possible, having used GPT-3.5 and ChatGPT extensively, that my expectations were too high for running models on such under powered hardware.
This model, after all, does a pretty good job with what it was trained on (the article text) and appears to only regurgitate prose of the article in response to a question -- it doesn't seem to have generative capabilities.
Having limited model experience before beginning to play with the OpenAI playground, I assumed models would have baked in training context, but in retrospect it appears somewhat obvious that this may not always be the case.
Models need to be trained on your data sets to be useful for your application.
If I wanted "better" answers about what recently happened to SVB, I would probably need more training context, a different model or both.

This prompted me to research a bit more about other types of models and/or training approaches.

ChatGPT told me the following with regards to the `model_path` I pass into `deepsparse`:

> - `zoo` : This refers to the zoo of pre-trained models available in the Hugging Face Model Hub. It is the base URL for accessing pre-trained models.
> - `nlp` : This refers to the Natural Language Processing domain.
> - `question_answering` : This indicates the specific task for which the pre-trained model has been fine-tuned, i.e., answering questions given a context.
> - `distilbert-none` : This is the architecture of the pre-trained model. In this case, it is a distilled version of the BERT model, which has fewer parameters but achieves similar performance.
> - `pytorch` : This indicates the deep learning framework used to train and load the pre-trained model.
> - `huggingface` : This indicates the library that provides access to the pre-trained model.
> - `squad` : This indicates the specific dataset on which the pre-trained model has been fine-tuned. In this case, it is the Stanford Question Answering Dataset (SQuAD).
> - `base-none` : This refers to the specific version of the pre-trained model. In this case, it is the base version with no further modifications or enhancements.

That helps a bit.
There are a lot of options that I need to understand better.

Let's try the same set of questions with a different model, just for fun:

```python
from deepsparse import Pipeline

questions = [
  "What did SVB's customers keep doing?",
  "How much of the deposits are insured?",
  "What is SVB?",
  "Who are SVB's customers?",
  "When did SVB collapse?",
  "Who could buy SVB?",
]

# pasted article
context = "..."

pipeline = Pipeline.create(task="question-answering", model_path="zoo:nlp/question_answering/bert-base/pytorch/huggingface/squad/12layer_pruned80_quant-none-vnni")
for question in questions:
  inference = pipeline(question=question, context=context)
  print(f'{question}\n{inference}\n')

```

Here are the results:

```text
What did SVB's customers keep doing?
score=15.124402046203613 answer='maturing' start=20674 end=20682

How much of the deposits are insured?
score=15.08907699584961 answer='165 billion' start=13460 end=13471

What is SVB?
score=15.948863983154297 answer='a liability-sensitive outlier in a generally asset-sensitive world' start=6262 end=6328

Who are SVB's customers?
score=14.0928955078125 answer='IPOs' start=7085 end=7089

When did SVB collapse?
score=10.8321533203125 answer='Dec. 31.\n8' start=21384 end=21394

Who could buy SVB?
score=11.741353988647461 answer='Chris Kotowski' start=6230 end=6244
```

Also, not the best.
It looks like I have plenty left to learn.

## What's next?

I'm not really getting the answers I hoped for from the model, and there are so many variants and options that I need to take a step back to better understand the primitives in this model ecosystem, then play around some more.
Nevertheless, it was interesting to go from nothing to a locally running model with some working capabilities.
