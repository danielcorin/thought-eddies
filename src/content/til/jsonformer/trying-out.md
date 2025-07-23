---
title: Trying out Jsonformer
createdAt: 2023-06-02T18:45:00.000Z
updatedAt: 2023-06-02T18:45:00.000Z
tags:
  - jsonformer
  - language_models
  - structured_data
draft: false
---

I tried out `jsonformer` to see how it would perform with some of structured data use cases I've been exploring.

## Setup

```sh
python -m venv env
. env/bin/activate
pip install jsonformer transformers torch
```

## Code

⚠️ Running this code will download 10+ GB of model weights ⚠️

```python
from jsonformer import Jsonformer
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("databricks/dolly-v2-12b")
tokenizer = AutoTokenizer.from_pretrained("databricks/dolly-v2-12b")

json_schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RestaurantReview",
  "type": "object",
  "properties": {
    "review": {
      "type": "string"
    },
    "sentiment": {
      "type": "string",
      "enum": ["UNKNOWN", "POSITIVE", "MILDLY_POSITIVE", "NEGATIVE", "MILDLY_NEGATIVE"]
    },
    "likes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "dislikes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": ["review", "sentiment"]
}
prompt = """From the provided restaurant review, respond with JSON adhering to the schema.
Use content from the review only.
Review:
Amazing food, I like their brisket sandwiches! Also, they give you a lot of sides! Excited to come again.
Response:
"""
jsonformer = Jsonformer(model, tokenizer, json_schema, prompt)
generated_data = jsonformer()

print(json.dumps(generated_data, indent=2))
```

## Results

```sh
(env) ~/ time python run_review.py
{
  "review": "Amazing food, I like their brisket sandwiches",
  "sentiment": "POSITIVE",
  "likes": [
    "They give you a lot of sides!"
  ],
  "dislikes": [
    "I'm not a fan of the rice"
  ]
}
150.52s user 98.48s system 104% cpu 3:57.68 total

(env) ~/ time python run_review.py
{
  "review": "Amazing food, I like their brisket sandwiches",
  "sentiment": "POSITIVE",
  "likes": [
    "Excited to come again"
  ],
  "dislikes": [
    "Their sandwiches are too expensive"
  ]
}
141.12s user 92.58s system 109% cpu 3:34.12 total

(env) ~/ time python run_review.py
{
  "review": "Amazing food, I like their brisket sandwiches",
  "sentiment": "POSITIVE",
  "likes": [
    "Excited to come again"
  ],
  "dislikes": [
    "They give you a lot of sides"
  ]
}
148.66s user 96.66s system 106% cpu 3:50.38 total
```

## Takeaways

`jsonformer`'s has a nice API to mandate structured output of a language model.
The quality of the output from `dolly` isn't the best.
There are hallucinations and only a single like and dislike is generated for each completion.
It would be nice it if supported more than just JSON schemas.
It runs quite slowly on an M1 Macbook Pro.
This library could become much more compelling if [OpenAI](https://github.com/1rgs/jsonformer/pull/16) is added.
