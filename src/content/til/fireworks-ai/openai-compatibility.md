---
title: Fireworks.ai OpenAI Compatibility
createdAt: 2024-01-03T21:24:16.000Z
updatedAt: 2024-01-03T21:24:16.000Z
publishedAt: 2024-01-03T21:24:16.000Z
tags:
  - openai
  - fireworks-ai
  - python
draft: false
---

I've starting playing around with [Fireworks.ai](fireworks.ai) to run inference using open source language models with an API.
Fireworks' product is the best I've come across for this use case.
While Fireworks has their [own client](https://pypi.org/project/fireworks-ai/), I wanted to try and use the OpenAI Python SDK compatibility approach, since I have a lot of code that uses the OpenAI SDK.
It looks like Fireworks' [documented approach](https://readme.fireworks.ai/docs/openai-compatibility) no longer works since OpenAI published version `1.0.0`.
I got this error message:

```sh
You tried to access openai.Completion, but this is no longer supported in openai>=1.0.0
```

With a few changes, I was able to get calls to the Fireworks API working with version `1.6.1` of the Python client.

```python
from openai import OpenAI

prompt = "..."

client = OpenAI(
    api_key=os.environ.get("FIREWORKS_API_KEY"),
    base_url="https://api.fireworks.ai/inference/v1",
)

completion = client.completions.create(
    model="accounts/fireworks/models/mixtral-8x7b-instruct",
    prompt=prompt,
    max_tokens=1000,
)
print(completion.choices[0].text)
```

This also works for streaming responses

```python
from openai import OpenAI

prompt = "..."

client = OpenAI(
    api_key=os.environ.get("FIREWORKS_API_KEY"),
    base_url="https://api.fireworks.ai/inference/v1",
)

stream = client.completions.create(
    model="accounts/fireworks/models/mixtral-8x7b-instruct",
    prompt=prompt,
    max_tokens=1000,
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].text or "", end="")
```
