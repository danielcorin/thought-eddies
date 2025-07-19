---
title: 'Structured Output, Functions and Prompting'
createdAt: 2024-08-12T21:15:27.000Z
updatedAt: 2024-08-12T21:15:27.000Z
publishedAt: 2024-08-12T21:15:27.000Z
tags:
  - openai
  - language_models
  - function_calling
  - structured_data
draft: false
---

I've been prompting models to output JSON for about as long as I've been using models.
Since [`text-davinci-003`](https://platform.openai.com/docs/deprecations), getting valid JSON out of OpenAI's models didn't seem like that big of a challenge, but maybe I wasn't seeing the long tails of misbehavior because I hadn't massively scaled up a use case.
As adoption has picked up, OpenAI has released features to make it easier to get JSON output from a model.
Here are three examples using [structured outputs](https://platform.openai.com/docs/guides/structured-outputs/), [function calling](https://platform.openai.com/docs/guides/function-calling) and just prompting respectively.


```python
from pydantic import BaseModel
from openai import OpenAI
from typing import List
import json
import time


class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str


class Recipe(BaseModel):
    name: str
    ingredients: List[Ingredient]
    instructions: List[str]
    prep_time: int
    cook_time: int
    servings: int


MODEL = "gpt-4o-2024-08-06"
client = OpenAI()


def extract_recipe_with_response_format(recipe_text: str) -> Recipe:
    completion = client.beta.chat.completions.parse(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a helpful cooking assistant that extracts recipe information.",
            },
            {"role": "user", "content": recipe_text},
        ],
        response_format=Recipe,
    )
    return completion.choices[0].message.parsed


def extract_recipe_with_function_calling(recipe_text: str) -> Recipe:
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a helpful cooking assistant that extracts recipe information.",
            },
            {"role": "user", "content": recipe_text},
        ],
        functions=[
            {
                "name": "create_recipe",
                "description": "Create a structured recipe from the given text",
                "parameters": Recipe.model_json_schema(),
            }
        ],
        function_call={"name": "create_recipe"},
    )

    function_call = completion.choices[0].message.function_call
    response_data = json.loads(function_call.arguments)
    return Recipe(**response_data)


def extract_recipe_with_schema_in_prompt(recipe_text: str) -> Recipe:
    schema = Recipe.model_json_schema()
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": f"You are a helpful cooking assistant that extracts recipe information. Please format your response as a JSON object matching this schema: {json.dumps(schema)}. No talk. Just JSON.",
            },
            {"role": "user", "content": recipe_text},
        ],
    )
    response_data = json.loads(
        completion.choices[0].message.content.replace("```json", "").replace("```", "")
    )
    return Recipe(**response_data)


def print_recipe(recipe: Recipe):
    print(json.dumps(recipe.model_dump(), indent=2))


if __name__ == "__main__":
    recipe_text = """
    Classic Chocolate Chip Cookies

    Ingredients:
    - 2 1/4 cups all-purpose flour
    - 1 tsp baking soda
    - 1 tsp salt
    - 1 cup unsalted butter, softened
    - 3/4 cup granulated sugar
    - 3/4 cup brown sugar
    - 2 large eggs
    - 2 tsp vanilla extract
    - 2 cups semisweet chocolate chips

    Instructions:
    1. Preheat oven to 375°F (190°C).
    2. In a bowl, mix flour, baking soda, and salt.
    3. In another bowl, cream butter and sugars until light and fluffy.
    4. Beat in eggs and vanilla to the butter mixture.
    5. Gradually stir in the flour mixture.
    6. Fold in chocolate chips.
    7. Drop spoonfuls of dough onto ungreased baking sheets.
    8. Bake for 9 to 11 minutes or until golden brown.
    9. Cool on baking sheets for 2 minutes, then transfer to wire racks.

    Prep Time: 15 minutes
    Cook Time: 10 minutes
    Servings: 24 cookies
    """

    print("Using response_format:")
    start_time = time.time()
    recipe_response_format = extract_recipe_with_response_format(recipe_text)
    end_time = time.time()
    print(f"Time taken: {end_time - start_time:.2f} seconds")
    print_recipe(recipe_response_format)

    print("\nUsing function calling:")
    start_time = time.time()
    recipe_function_calling = extract_recipe_with_function_calling(recipe_text)
    end_time = time.time()
    print(f"Time taken: {end_time - start_time:.2f} seconds")
    print_recipe(recipe_function_calling)

    print("\nUsing schema in prompt:")
    start_time = time.time()
    recipe_schema_in_prompt = extract_recipe_with_schema_in_prompt(recipe_text)
    end_time = time.time()
    print(f"Time taken: {end_time - start_time:.2f} seconds")
    print_recipe(recipe_schema_in_prompt)
```

Running the script (output objects truncated) yields

```sh
Using response_format:
Time taken: 5.75 seconds
{
  "name": "Classic Chocolate Chip Cookies",
  ...
  "prep_time": 15,
  "cook_time": 10,
  "servings": 24
}

Using function calling:
Time taken: 4.55 seconds
{
  "name": "Classic Chocolate Chip Cookies",
  ...
  "prep_time": 15,
  "cook_time": 10,
  "servings": 24
}

Using schema in prompt:
Time taken: 4.58 seconds
{
  "name": "Classic Chocolate Chip Cookies",
  ...
  "prep_time": 15,
  "cook_time": 10,
  "servings": 24
}
```

Don't read too much into the time durations.
After running the script a few times, all approaches seem to take 4-6 seconds, with none clearly faster than the others.
The quality of the extraction seems to be around the same for all approaches for this use case as well.

Function calls are pitched as a solution to allow you to "connect models like gpt-4 to external tools and systems"[^1].
Structured outputs are supposed to be for "[g]enerating structured data from unstructured inputs"[^2].
The latter is an improvement on "JSON mode" apparently introduced in 2023 that I never tried.
The bottom line is we need these models to respond with structure, but we don't want the imposition of this structure to detract from the model's performance.

I need to do some testing to see if the quality of the model's response varies depending on which approach is used.

[^1]: https://platform.openai.com/docs/guides/function-calling
[^2]: https://openai.com/index/introducing-structured-outputs-in-the-api
