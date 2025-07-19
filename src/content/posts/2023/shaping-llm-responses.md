---
title: Shaping LLM Responses
createdAt: 2023-04-30T22:29:34.000Z
updatedAt: 2023-04-30T22:29:34.000Z
publishedAt: 2023-04-30T22:29:34.000Z
tags:
  - python
  - language_models
draft: false
aliases:
  - /posts/shaping-llm-responses/
---

It's necessary to pay attention to the shape of a language model's response when incorporating it as a component in a software application.
You can't programmatically tap into the power of a language model if you can't reliably parse its response.
In the past, I have mostly used a combination of prose and examples to define the shape of the language model response in my prompts.
Something like:
> Respond using JSON with the following shape:
>
> ```json
> {
>   ...
> }
> ```

I was curious if I could use something more familiar and structured to archive a similar purpose.

## The familiar

[`pydantic`](https://docs.pydantic.dev/latest/) is a popular library for data validation in Python and is an integral part of a number of leading libraries including [`fastapi`](https://github.com/tiangolo/fastapi).
We can use `pydantic` in a toy example to show what it could look like to use it define the desired output structure from the language model.

In the following script, we'll extract data adhering to the passed `pydantic` schema for the class `Address` from the following input text.
We'll do this by passing the code literal of the `pydantic` model into the language model prompt, then instruct the model to respond with schema-compliant JSON, that we can unpack into an instance of the schema.
If the response from the language model is not schema-compliant, the code will throw a `pydantic.error_wrappers.ValidationError`.

## The text

> Last weekend, I visited my friend who lives in a charming little house on Oak Avenue. The address was 3578 Oak Avenue, and it was easy to find with the help of my GPS. While typing in the address, I discovered there was more than one 3578 Oak Ave, but once I entered right zip code, 90011, I found it. The house was surrounded by trees and had a beautiful garden in the front. Inside, my friend had decorated the place with vintage furniture and colorful paintings. We spent the day catching up and enjoying a cup of coffee in the cozy living room. It was a lovely visit and my first time in Los Angeles, and I can't wait to go back and see my friend's new garden in full bloom.

## The code

```python
import inspect
import json
import openai

from typing import Type
from pydantic import BaseModel

class Address(BaseModel):
    street: str # street name and number
    city: str
    state: str
    zip_code: str


PROMPT: str = """{input_text}

From the above input, extract data and generate a JSON object of type `{type}` that adheres to the following schema.
Schema:

{schema}
Output the JSON and the JSON only.
"""

def build_prompt(text: str, cls: Type[BaseModel]) -> str:
  return PROMPT.format(
    input_text=text,
    type=cls.__name__,
    schema=inspect.getsource(cls),
  )

def extract_data(text: str, cls: Type[BaseModel]) -> BaseModel:
  prompt: str = build_prompt(text, cls)
  completion = openai.ChatCompletion.create(
  model="gpt-3.5-turbo",
    messages=[
      {"role": "user", "content": prompt}
    ],
    temperature=0,
  )

  result = completion.choices[0].message.content
  result_obj: dict = json.loads(result)
  return cls.parse_obj(result_obj)

def main():
  text = "<input text from above>"
  return extract_data(text, Address)

if __name__ == "__main__":
  print(main())
```

The full prompt after formatting looks as follows:

> Last weekend, I visited my friend who lives in a charming little house on Oak Avenue. The address was 3578 Oak Avenue, and it was easy to find with the help of my GPS. While typing in the address, I discovered there was more than one 3578 Oak Ave, but once I entered right zip code, 90011, I found it. The house was surrounded by trees and had a beautiful garden in the front. Inside, my friend had decorated the place with vintage furniture and colorful paintings. We spent the day catching up and enjoying a cup of coffee in the cozy living room. It was a lovely visit and my first time in Los Angeles, and I can't wait to go back and see my friend's new garden in full bloom.
>
> From the above input, extract data as a JSON object of type `Address` that adheres to the following schema.
> Infer and fill in missing data values if possible
> Schema:
>
> ```python
> class Address(BaseModel):
>    street: str # street name and number
>    city: str
>    state: constr(min_length=2, max_length=2)
>    zip_code: str
> ```
>
> JSON output:

Running the script yields the following:

```sh
❯ python script.py
street='3578 Oak Avenue' city='Los Angeles' state='CA' zip_code='90011'
```

First thing, it works and pretty well!
Second, there are a few subtleties that help make this approach work as well as it does.

1. From the prompt, "Infer and fill in missing data values if possible": The state is not specified in the input text, but the language model infers it based on the instructions
2. `state: constr(min_length=2, max_length=2)`: It would be hard to fault the model if it inferred the state as "California", but we use an additional schema constraint to ensure the two character abbreviation is used
3. `street: str # street name and number`: After testing the script a few times, I ran into an issue where the resulting `street` was parsed as "Oak Avenue". Adding this comment helps ensure that the number and street name are extracted together.

## Generalizing

This approach is already relatively general.
One can easily swap the `BaseModel` subclass passed into `extract_data` for a different data structure.
There's a bit more work to do here to extract data adhering to the schema of a model with field values that are other models.
For example:

```python
class Address(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str

class User(BaseModel):
  first_name: str
  last_name: str
  address: Address
```

In order to parse out data for a `User` for an input text, you'd want to include the schemas for both the `Address` and the `User`.

## JSON Schema

I've [written about](/posts/2023/language-model-schema-and-object-gen) experimenting with JSON Schema to construct schema-adherent responses from a language model. You can also obtain and use JSON schema from `pydantic` classes to use for parsing and schema-adherent response construction:

```python
Address.schema_json()
```
