---
title: Input data schemas and token efficiency
createdAt: 2023-05-17T01:34:54.000Z
updatedAt: 2023-05-17T01:34:54.000Z
publishedAt: 2023-05-17T01:34:54.000Z
tags:
  - language_models
  - structured_data
draft: false
aliases:
  - posts/input-data-schemas-and-token-efficiency
---

Plenty of data is ambiguous without additional description or schema to clarify its meaning.
It's easy to come up with structured data that can't easily be interpreted without its accompanying schema.
Here's an example:

```json
{
  "data": [
    12,
    "21",
    true,
    {
      "name": "John Doe",
      "age": 30
    }
  ]
}
```

You can argue that this is "bad" structured data, but if you have this data structure, there is little meaning you can derive without additional insight into what the data represents.

A language model is only as useful and the information made available to it.
If we accompany the above data with a schema, we can do more interesting things with it.

```text
Player Data:
{"data": [12,"21", true, {"name": "John Doe", "age": 30}]}

Schema:

{
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "items": [
        {
          "type": "integer",
          "description": "Number of seasons played"
        },
        {
          "type": "string",
          "description": "Jersey number"
        },
        {
          "type": "boolean",
          "description": "true if under contract next year with current team"
        },
        {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "Player name"
            },
            "age": {
              "type": "integer",
              "description": "Player age"
            }
          },
          "required": ["name", "age"],
          "description": "An object representing a professional athlete"
        }
      ]
    }
  },
  "required": ["data"]
}

Write a few sentences introducing the player to his home crowd at the beginning of the game.
Imagine him coming out to applause and cheers:
```

The result from ChatGPT:

> Ladies and gentlemen, please give a warm round of applause and a thunderous cheer as we welcome our beloved athlete to the court! With an impressive track record of 12 seasons played, our star player wears the jersey number "21" with pride. And here's the exciting news: he's under contract for the upcoming year, ensuring his unwavering dedication to our team. But it's not just his statistics that make him extraordinary. Allow me to introduce the man behind the game. His name is John Doe, a seasoned professional with an impressive age of 30. John embodies the spirit of a true athlete, and we are honored to have him as an integral part of our team. Let the game begin, and let's witness the brilliance of our remarkable player, John Doe!

These results are silly but that is not really the point.
It's hard to image we'd be able generate something that included the jersey number of number of seasons played without providing the schema or some description of the data.

```text
Player Data:
{"data": [12, "21", true, {"name": "John Doe", "age": 30}]}

Write a few sentences introducing the player to his home crowd at the beginning of the game.
Imagine him coming out to applause and cheers:
```

Result:

> Ladies and gentlemen, let's give a warm round of applause to our beloved player who's about to grace the field! Today, we have the incredible John Doe stepping onto the stage, ready to showcase his skills and passion for the game. With a remarkable age of 30, John brings a wealth of experience and wisdom to the team. Known for his unwavering dedication and relentless spirit, he's a force to be reckoned with on the field. So, let's cheer louder and show our utmost support as John Doe leads our team to victory!

The model can't do anything with the unlabeled data because it lacks context and that isn't a surprise.

## Token efficiency

As I've been experimenting with structuring LLM response outputs, in the back of my mind, I've been a bit concerned about using JSON as a response data format.
A quick (and overly simple) test of JSON vs. CSV shows CSV uses ~50% the tokens compared to JSON.
It might be more complicated representing a nested data structure as a CSV, but this test shows JSON to be relatively token-inefficient.
This isn't a specific rule to be followed, just something to consider when passing data to a language model.

```python
import tiktoken
enc = tiktoken.get_encoding("cl100k_base")

json_str = """
[{"field1":"val1","field2":"val2"},{"field1":"val3","field2":"val4"},{"field1":"val5","field2":"val6"}]
"""

csv_str = """field1,field2
val1,val2
val3,val4
val5,val6
"""

print(len(enc.encode(json_str))) # 40
print(len(enc.encode(csv_str))) # 21
```

## Takeaways

- Description of input data matters for the model, whether it's structured or unstructured
- Schema accompanying compact representation of data, especially if there is a lot of data, might be more token-efficient than verbose, self-describing data

## Future work

- Investigate token-efficient, language model-readable data formats and representations of schemas both for inputs and outputs
