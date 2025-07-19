---
title: 'Evals: unit testing for language models'
createdAt: 2024-05-15T18:42:38.000Z
updatedAt: 2024-05-15T18:42:38.000Z
publishedAt: 2024-05-15T18:42:38.000Z
tags:
  - evals
  - language_models
draft: false
githubUrl: 'https://github.com/danielcorin/toys/tree/main/marvin-llm-evals'
---

Generative AI and language models are fun to play with but you don't really have
something you can confidently ship to users until you test what you've built.

# What are evals?

Evals are like the unit tests for LLMs. Similar to unit tests, evals can take on
many different forms -- they are just code you run to generate a model
completion then check the contents of that completion. A more challenging part
about LLMs relative to "average code" is their outputs aren't really
deterministic. Let's think about non-deterministic (less-deterministic?) code
for a second. If you were testing a random number generator you might write code
like this:

```python
from random import random


def test_random_number():
    num = random()
    assert 0 <= num < 1, "The number is within bounds [0, 1)"
```

This approach allows you to test the bounds of the function `random()` without
relying on a single specific result.

<aside>This is not entirely sufficient testing for random number generation, we
would probably want to test more things like the distribution of values, trying
different seeds, etc.</aside>

## A simple LLM use case

In the case of LLMs, I've observed several different approaches to determine
whether the model is behaving as expected. If the LLM output is highly
constrained (e.g., if it's being used as a classifier), simple assertions could
be sufficient to validate the LLM is performing its function as intended.

Note: I'm using a
[Marvin-esque style of writing an "AI-powered" function](https://github.com/prefecthq/marvin?tab=readme-ov-file#-build-ai-powered-functions).
The code is not meant to be runnable, just illustrative of the approach.

```python
from enum import Enum

class Sentiment(Enum):
    POSITIVE = 1
    NEUTRAL = 2
    NEGATIVE = 3

def classify_sentiment(text: str) -> Sentiment:
    """
    Classify the sentiment of `text`.
    """
    ...

def test_classify_sentiment_positive():
    text = "I am so happy!"
    sentiment = classify_sentiment(text)
    assert sentiment == Sentiment.POSITIVE

def test_classify_sentiment_neutral():
    text = "Today is Wednesday"
    sentiment = classify_sentiment(text)
    assert sentiment == Sentiment.NEUTRAL
```

## A more complex use case

If the LLM is doing something more complicated, a more flexible approach could
be required. For example, let's say we expect the LLM to output a recipe as a
markdown list. It would be somewhat hard to validate the contents of the recipe
with deterministic code, but we could validate the structure of the model
response (to start at least).

```python
from enum import Enum


def generate_recipe(ingredients: List[str]) -> str:
    """
    Generate a recipe I could make this with `ingredients`.
    No need to use all the ingredients. Just pick a few.
    Output a markdown list.
    """
    ...

def test_generate_recipe_markdown_structure():
    ingredients = ["flour", "sugar", "eggs", "butter", "vanilla extract", "baking powder", "milk", "chocolate chips", "salt", "a rubber duck", "a pair of sunglasses", "a tennis ball"]

    recipe = generate_recipe(ingredients)
    for line in recipe:
        assert line.startswith("- ")
```

These approaches are somewhat naive but they impose helpful guardrails around
the basic structure and expectations for the LLM outputs of an application.

## Using a model to evaluate a model response?

Some folks are going further, using the model to validate its own outputs in the
same completion (by prompting the model to explain itself or refine an initial
response) or separate calls where the model takes a previous model output in as
part of its prompt then generates a new completion. A couple of places I've
noticed this approach being used are to try and detect hallucinations or
toxicity.

Here an example of what a simple implementation of an LLM-based toxicity
detector for LLM outputs could look like:

```python
def generate_birthday_card(name: str, favorite_color: str) -> str:
    """
    Write a fun, nice birthday card to my friend `name` whose favorite color is `favorite_color`
    """
    ...

def contains_toxic_language(model_response: str) -> bool:
    """
    `model_response` is intended to be nice and wholesome.
    If you detect toxic language in the content, return `True`
    Else, return `False`
    """

def test_generate_birthday_card():
    card_content = generate_birthday_card("Dan", "Green")
    assert not contains_toxic_language(card_content)
```

Our "test" now has two non-deterministic components

- the model-generated birthday card
- the model-generated evaluation of the birthday card's contents

I think you can derive a directional signal from this approach. Say we called
`generate_birthday_card` in production and then `contains_toxic_language` on its
output. We could report stats on the approximate % of toxic responses. We could
try and tweak our prompt in `generate_birthday_card` to reduce this percentage
or block the response to the user if `contains_toxic_language == True`. It seems
like the library (or OpenAI API itself) may even help with this.

At scale with this approach, there will still probably be both false positives
and false negatives. Sometimes the model will detect toxicity when we wouldn't
expect it to and sometimes the model will fail to detect toxicity when it is
present in the contents of the birthday card. To distill these model-based
measurements down to "% of toxic responses" is a bit misleading. There can be
errors at either step, which can compound errors in the reporting of "% of toxic
responses", which is decided entirely by the model. Lastly, it's likely possible
to do prompt injection in a way that produces toxic output when calling
`generate_birthday_card` and "fools" the model when it runs the
`contains_toxic_language` check into reporting the content is not toxic. This
thwarts your ability to measure the "% of toxic responses" because the model
you're attempting to use to measure toxicity has been undermined and does not
report correctly. This means a aggregate measurement of 2% toxicity in the
responses of your birthday card-generating LLM app may not reflect reality at
all.

## Why is this bad?

This approach is not necessarily _bad_, but we shouldn't lull ourselves into
feeling a false sense of security when we have models evaluating the outputs of
models. To start, it's important to consider your use case. If you're building a
chatbot for your e-commerce store visitors, the potential downsides of an
imperfect model response are likely less impactful than if you are reading data
from receipts and trying to do accounting for your business with the output
data. The former has a wide range of possible, useful modes of operation. The
latter generally has only one correct answer. If you're relying on a model to
report on whether your model generations are correct, healthy, or fitting a
certain criterion, you need to anticipate ways in which the reporting model
might perform its job incorrectly and add other guardrails and measurements that
can give you more signal about the health of your model responses.

## Why models are still worth it

Models don't have to be perfect to be useful. Even in the accounting example,
where we require our numbers to be correct, we can add deterministic checks and
safeguards to our system (do line items add up correctly, do the sum of all
receipts match the system's total?) that can flag potentially incorrect
calculations for a second look. Even deterministic software breaks all the time.
We engineer around these breakages by fixing things(!) or with other things like
error messages, system restarts and human processes. Models are useful, flexible
tools but we shouldn't abandon existing best practices just because we ran our
demo a few times and it looks like it worked. Measure and plan for failures as a
part of your design. I'd love to hear what works for you.

I got to the end of this post and decided to make the code
[real](https://github.com/danielcorin/toys/blob/main/marvin-llm-evals/test.py).
I wasn't quite able to build a successful prompt injection for the birthday card
use case, but hopefully the attempt describes the threat vector reasonably well.
