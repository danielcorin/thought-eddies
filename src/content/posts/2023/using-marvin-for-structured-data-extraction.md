---
title: Using Marvin for Structured Data Extraction
createdAt: 2023-07-12T12:28:51.000Z
updatedAt: 2023-07-12T12:28:51.000Z
publishedAt: 2023-07-12T12:28:51.000Z
tags: null
draft: false
---

I've been following the "AI engineering framework" [marvin](https://github.com/PrefectHQ/marvin) for several months now.
In addition to [openai_function_call](https://github.com/jxnl/openai_function_call), it's currently one of my favorite abstractions built on top of a language model.
The docs are quite good, but as a quick demo, I've ported over a simplified version of an example from an [earlier post](/posts/2023/openai-function-calling), this time using `marvin`.

```python
import json
import marvin
from marvin import ai_model

from pydantic import (
    BaseModel,
)
from typing import (
    List,
)

marvin.settings.llm_model = "gpt-3.5-turbo-16k"

class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str

@ai_model
class Recipe(BaseModel):
    title: str
    description: str
    duration_minutes: int
    ingredients: List[Ingredient]
    steps: List[str]

# read the recipe from a text file
with open("content.txt", "r") as f:
    content = f.read()

recipe = Recipe(content)
print(json.dumps(recipe.dict(), indent=2))
```

The result:

```json
{
  "title": "KL Hokkien Mee",
  "description": "Savoury chewy noodles smothered in a sweet salty soy sauce with prawns, pork belly, cabbage, and gai-lan. The perfect meal for dinner or lunch.",
  "duration_minutes": 30,
  "ingredients": [
    {
      "name": "thick egg noodles",
      "quantity": 400.0,
      "unit": "grams"
    },
    {
      "name": "pork belly",
      "quantity": 1.0,
      "unit": "cup sliced"
    },
    {
      "name": "large shrimp",
      "quantity": 0.75,
      "unit": "cup peeled and deveined"
    },
    {
      "name": "Napa cabbage",
      "quantity": 1.0,
      "unit": "cup thinly sliced"
    },
    {
      "name": "gai lan",
      "quantity": 1.0,
      "unit": "cup chopped"
    },
    {
      "name": "chicken stock",
      "quantity": 0.25,
      "unit": "cup unsalted"
    },
    {
      "name": "garlic",
      "quantity": 2.0,
      "unit": "cloves minced"
    },
    {
      "name": "vegetable oil",
      "quantity": 0.5,
      "unit": "tablespoon"
    },
    {
      "name": "dark soy sauce",
      "quantity": 1.5,
      "unit": "tablespoon"
    },
    {
      "name": "kecap manis",
      "quantity": 1.0,
      "unit": "tablespoon"
    },
    {
      "name": "white granulated sugar",
      "quantity": 0.5,
      "unit": "tablespoon"
    },
    {
      "name": "cornstarch",
      "quantity": 0.5,
      "unit": "tablespoon"
    },
    {
      "name": "water",
      "quantity": 0.5,
      "unit": "cup"
    }
  ],
  "steps": [
    "In a bowl, combine Sauce ingredients as listed above. Set aside.",
    "In a wok filled halfway with water, bring to a boil. Blanch your noodles for only 20-30 seconds or until loosened. Strain immediately. Any longer and your noodles will be soggy.",
    "Dry your wok and over medium heat, add oil and pork belly. Fry until the pork belly has released some fat and is browned on the edges.",
    "Toss in garlic and shrimp. Fry until shrimp is 50% cooked.",
    "Increase heat to medium high. Add noodles and Sauce. Mix the sauce into noodles allowing the sauce to reduce a bit, about 45-60 seconds.",
    "Then add cabbage, gai-lan and chicken stock. Toss everything together and cook until there's a thin layer of sauce on the bottom of the wok. Remove off heat and enjoy!"
  ]
}
```

The code is clean and the result is good quality.
The abstraction allows me to almost entirely avoid dealing with code that calls the language model.
I get to think in data structures and code and the language model's response is woven into the software using the primitives I define.
However, the response isn't exactly how I want it.
I don't like that additional suffixes are being included in some of the `unit`.
For example, `"unit": "cup unsalted"`.
The following modification to the `Ingredient` class helps improve this

```python
class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str
    details: Optional[str]
```

New output:

```json
{
    ...
    "ingredients": [
        {
            "name": "thick egg noodles",
            "quantity": 400.0,
            "unit": "grams",
            "details": "loosened"
        },
        {
            "name": "pork belly",
            "quantity": 1.0,
            "unit": "cup",
            "details": "sliced"
        },
        {
            "name": "large shrimp",
            "quantity": 0.75,
            "unit": "cup",
            "details": "peeled and deveined"
        },
        {
            "name": "Napa cabbage",
            "quantity": 1.0,
            "unit": "cup",
            "details": "thinly sliced"
        },
        {
            "name": "gai-lan",
            "quantity": 1.0,
            "unit": "cup",
            "details": "chopped"
        },
        {
            "name": "chicken stock",
            "quantity": 0.25,
            "unit": "cup",
            "details": "unsalted"
        },
        {
            "name": "garlic",
            "quantity": 2.0,
            "unit": "cloves",
            "details": "minced"
        },
        {
            "name": "vegetable oil",
            "quantity": 0.5,
            "unit": "tablespoon",
            "details": ""
        },
        {
            "name": "dark soy sauce",
            "quantity": 1.5,
            "unit": "tablespoon",
            "details": ""
        },
        {
            "name": "kecap manis",
            "quantity": 1.0,
            "unit": "tablespoon",
            "details": "aka sweet soy sauce"
        },
        {
            "name": "white granulated sugar",
            "quantity": 0.5,
            "unit": "tablespoon",
            "details": ""
        },
        {
            "name": "cornstarch",
            "quantity": 0.5,
            "unit": "tablespoon",
            "details": ""
        },
        {
            "name": "water",
            "quantity": 0.5,
            "unit": "cup",
            "details": ""
        }
    ],
    ...
}
```

This mostly looks good.
My only remaining complaint is that if no `details` are extracted, the field is still included as an empty string.

I tried a few different modifications to the `Ingredient` class to eliminated this but all were unsuccessful such that the output still included `"details": ""` for some ingredients.

```python
    details: Optional[str] = None
```

```python
    details: Optional[str] = Field(default=None)
```

```python
    details: Optional[str] = Field(
        default=None, description="null if no data is available"
    )
```

It's hard to tell without actually reading the prompt and response verbatim what is going on here.
Inspecting `pydantic`'s behavior for a null value, we see `details` show up as `None` rather than an empty string:

```python
>>> Ingredient(name="test", quantity=1, unit="cup").dict()
{'name': 'test', 'quantity': 1.0, 'unit': 'cup', 'details': None}
```

The outputted JSON now contains `null` for the field:

```python
>>> print(json.dumps(Ingredient(name="test", quantity=1, unit="cup").dict(), indent=2))
{
  "name": "test",
  "quantity": 1.0,
  "unit": "cup",
  "details": null
}
```

I have to assume the language model is outputting the empty string (`""`) rather than `null` or omitting the field.
As a final test, I ran the code again using `gpt-4` and the last definition for `details` above.

```python
marvin.settings.llm_model = "gpt-4"

class Ingredient(BaseModel):
    ...
    details: Optional[str] = Field(
        default=None, description="null if no data is available"
    )
```

`Gpt-4` is slower and more expensive and still does not do what I want.
This small issue isn't difficult to correct in code, but it provides a bit of signal into how well the model follows instructions with this approach to prompting, which is a function of both the model and the prompt itself.
