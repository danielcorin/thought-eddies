---
title: OpenAI Function Calling
createdAt: 2023-06-18T23:24:00.000Z
updatedAt: 2023-06-18T23:24:00.000Z
publishedAt: 2023-06-18T23:24:00.000Z
tags:
  - language_models
  - openai
  - structured_data
  - function_calling
draft: false
---

This past week, OpenAI added [function calling](https://platform.openai.com/docs/guides/gpt/function-calling) to their SDK.
This addition is exciting because it now incorporates schema as a first-class citizen in making calls to OpenAI chat models.
As the example code and naming suggest, you can define a list of functions and schema of the parameters required to call them and the model will determine whether a function needs to be invoked in the context of the completion, then return JSON adhering to the schema defined for the function.
If you read anything else I've written you probably know what I'm going to try and do next: let's use a function to extract structured data from an unstructured input.

## Extract a recipe as structured data

I found [this recipe](https://christieathome.com/blog/kl-hokkien-mee/) and I want to try it out.
I want to parse the content on the page and extract the recipe in a form that I could easily render on a personal recipe site.
I quickly checked the page and it looks like most of the content is nested within an html element with the class `"content"`.
Here is some Python code to extract all the text from the HTML, eliminating the markup:

```python
import requests
from bs4 import BeautifulSoup

url = "https://christieathome.com/blog/kl-hokkien-mee/"
response = requests.get(url)
html_content = response.text
soup = BeautifulSoup(html_content, 'html.parser')
# Find all elements with the class name "content"
content_elements = soup.find(class_="content")
content = content_elements.get_text(strip=True, separator=" ")
print(content)
```

This code outputs a big block of text, a lot of which isn't ingredients or instructions for the recipe.

```text
Home » Recipes » Mains KL Hokkien Mee Last Modified: June 28, 2022 - Published by: christieathome ...
```

Before we get into calling the language model, let's write a schema for the data we'd like to extract from the page's content.
We'll use `pydantic` because it can easily be converted to a JSON schema.

```python
from pydantic import BaseModel
from typing import (
    List,
    Type,
)

class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str

class Recipe(BaseModel):
    title: str
    description: str
    ingredients: List[Ingredient]
    steps: List[str]
```

Nothing too surprising so far.
Now is the interesting part.
Let's wire up a call to OpenAI that uses `functions` and our `Recipe` schema to structure the response:


```python
import json
import openai

messages = [{"role": "user", "content": content}]
functions = [
    {
        "name": "print_json_data",
        "description": "Print JSON data extracted from the input",
        "parameters": Recipe.schema(),
    },
]
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo-16k",
    messages=messages,
    functions=functions,
    function_call="auto",
)
response_message = response["choices"][0]["message"]
arguments = response_message["function_call"]["arguments"]
print(json.loads(arguments))
```

Re-writing with a bit of refactor:

```python
import openai
import json
import requests

from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List

class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str

class Recipe(BaseModel):
    title: str
    description: str
    ingredients: List[Ingredient]
    steps: List[str]

def run_conversation(content):
    messages = [{"role": "user", "content": content}]
    functions = [
        {
            "name": "print_minified_json_data",
            "description": "Print minified JSON data extracted from the input",
            "parameters":  Recipe.schema(),
        },
    ]
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k",
        messages=messages,
        functions=functions,
        function_call="auto",
    )
    response_message = response["choices"][0]["message"]
    arguments = response_message["function_call"]["arguments"]
    return Recipe(**json.loads(arguments))

def get_page_content():
    url = "https://christieathome.com/blog/kl-hokkien-mee/"
    response = requests.get(url)
    html_content = response.text
    soup = BeautifulSoup(html_content, 'html.parser')
    # Find  element with the class name "content"
    content_element = soup.find(class_="content")
    return content_element.get_text(strip=True, separator=" ")

def main():
    content = get_page_content()
    print(content)
    print(run_conversation(content))


if __name__ == "__main__":
    main()

```

Here is where I started to run into problems.
When running the script, I get the following error:

```text
json.decoder.JSONDecodeError: Expecting ',' delimiter: line 7 column 56 (char 348)
```

Inspecting the JSON output of the script, we see the model isn't returning valid JSON:

```json
{
    "title": "...",
    "description": "...",
    "ingredients": [
        ...
        {"name": "large shrimp", "unit": "cup", "quantity": 3/4},
        ...
    ]
}
```

We see `"quantity": 3/4` isn't valid JSON.
We can try to steer the model adding a description to the `pydantic` field:

```python
class Ingredient(BaseModel):
    name: str
    quantity: float = Field(
        description="float value, must be a valid JSON type. for example: 0.75, never 3/4"
    )
    unit: str
```

This modifies the JSON schema in the following way:

```json
{
    "title": "Recipe",
    "type": "object",
    "properties": {
        ...
    },
    "required": [
        ...
    ],
    "definitions": {
        "Ingredient": {
            "title": "Ingredient",
            "type": "object",
            "properties": {
                ...
                "quantity": {
                    "title": "Quantity",
                    "description": "float value, must be a valid JSON type. for example: 0.75, never 3/4",
                    "type": "number"
                },
                ...
            },
            "required": [
                ...
            ]
        }
    }
}
```

Unfortunately, this doesn't resolve the invalid JSON issue.
However, switching from `gpt-3.5-turbo-16k` to `gpt-4-0613` (and removing the `Field` description) yields JSON that adheres to the input schema.
Still, GPT-4 models are slower and more expensive than 3.5 models, so there is motivation to try and get this working with the latter.

Taking an approach I've tried previously, it seems like we can get more reliable results with `gpt-3.5-turbo-16k`.

```python
import openai
import json
import requests

from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List

class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str

class Recipe(BaseModel):
    title: str
    description: str
    ingredients: List[Ingredient]
    steps: List[str]

def run_conversation(content):
    prompt = f"""
Extract input content as JSON adhering to the following schemas

class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str

# extract this schema
class Recipe(BaseModel):
    title: str
    description: str
    ingredients: List[Ingredient]
    steps: List[str]

{content}

Respond with only JSON.
"""
    messages = [{"role": "user", "content": prompt}]
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k",
        messages=messages,
    )
    response_message = response["choices"][0]["message"]
    return Recipe(**json.loads(response_message.content))

def get_page_content():
    url = "https://christieathome.com/blog/kl-hokkien-mee/"
    response = requests.get(url)
    html_content = response.text
    soup = BeautifulSoup(html_content, 'html.parser')
    # Find all elements with the class name "content"
    content_elements = soup.find(class_="content")
    return content_elements.get_text(strip=True, separator=" ")

def main():
    content = get_page_content()
    print(content)
    print(run_conversation(content))


if __name__ == "__main__":
    main()
```

## Takeaways

On one hand, it's great to see OpenAI training models to better integrate with emerging language model use cases like function invocation and schema extraction.
On the other, OpenAI acknowledges this approach doesn't always work in their documentation:

> the model may generate invalid JSON or hallucinate parameters

Previous techniques I've explored for schema extraction seem to produce more consistent results, even with less advanced models.
