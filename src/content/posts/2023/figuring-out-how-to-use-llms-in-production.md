---
title: Figuring out how to use LLMs in production
description: Code needs structure output
createdAt: 2023-05-08T01:25:03.000Z
updatedAt: 2023-05-08T01:25:03.000Z
publishedAt: 2023-05-08T01:25:03.000Z
tags:
  - language_models
  - python
draft: false
aliases:
  - /posts/figuring-out-how-to-use-llms-in-production/
---

The most popular language model use cases I've seen around have been

- chatbots
- agents
- chat your X use cases

These use cases are quite cool, but often stand alone, separate from existing products or added on as an isolated feature.

## Expanding production use cases for language models

I've been thinking about what could it look like to naturally embed a call to language model in code to flexibly make use of its capabilities in a production application.
In this pursuit, I've been hooked by the idea that declarative, unambiguous data schema can serve as the bridge between language model capabilities and applications.
Generally, schemas provide the contract for the data that will be sent into and expected out of a procedure.
With this approach, we're treating the language model as a sort of magic [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call) or API call.
The request schema provides detailed context about the data we are sending into the language model.
The response schema becomes an instruction set for the language model to interpret and fill in given the request data and accompanying schema as a kind of explanation.
Finally, the response schema also serves as a validation layer in the application.
If the language model returns data that fails to comply with the response schema, a validation error will prevent that bad data from making it any further into the system.
Here's an example of what failed validations might look like:

```python
from pydantic import BaseModel

class MyData(BaseModel):
    field1: str
    field2: str
```

```python
>>> my_obj = {"field2": "a value"} # the output from the model
>>> MyData.parse_obj(my_obj)
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "pydantic/main.py", line 526, in pydantic.main.BaseModel.parse_obj
  File "pydantic/main.py", line 341, in pydantic.main.BaseModel.__init__
pydantic.error_wrappers.ValidationError: 1 validation error for MyData
field1
  field required (type=value_error.missing)
```

To phrase the approach a bit differently, we're aiming to use the request and response data schemas themselves (the literal Python code) as the majority of the prompt for a language model to see if this approach can be effective for application-building with language models.
The main benefit of this approach is that less content is needed to describe the input to the model or instruct it how to respond to a prompt.
The input description, valid response structure and the "operations" we want the model to perform are encoded in the request and response schemas themselves, described by the schema definition and any comments we choose to add.
We no longer need to write prose alone or example responses to get the model to respond in a certain way.

## A possible implementation

Re-using some bits from a [previous post](/posts/2023/shaping-llm-responses), we have the following block of text and response schema:

> Last weekend, I visited my friend who lives in a charming little house on Oak Avenue. The address was 3578 Oak Avenue, and it was easy to find with the help of my GPS. While typing in the address, I discovered there was more than one 3578 Oak Ave, but once I entered right zip code, 90011, I found it. The house was surrounded by trees and had a beautiful garden in the front. Inside, my friend had decorated the place with vintage furniture and colorful paintings. We spent the day catching up and enjoying a cup of coffee in the cozy living room. It was a lovely visit and my first time in Los Angeles, and I can't wait to go back and see my friend's new garden in full bloom.

```python
class Address(BaseModel):
    street: str # street name and number
    city: str
    state: str
    zip_code: str
```

Since we're going to send request and response schemas to the language model, let's define the request schema now:

```python
class JournalEntry(BaseModel):
    content: str
```

Now, let's construct a generic prompt parameterized on the schemas.
We include the schema definition exactly as their objects are defined in code.
Our data input will be a JSON object in adherence with the request schema.

```text
<schemas>
class Address(BaseModel):
    street: str # street name and number
    city: str
    state: constr(min_length=2, max_length=2)
    zip_code: str

class JournalEntry(BaseModel):
    content: str
</schemas>

<input>
{
  "content": "Last weekend, I visited my friend who lives in a charming little house on Oak Avenue. The address was 3578 Oak Avenue, and it was easy to find with the help of my GPS. While typing in the address, I discovered there was more than one 3578 Oak Ave, but once I entered right zip code, 90011, I found it. The house was surrounded by trees and had a beautiful garden in the front. Inside, my friend had decorated the place with vintage furniture and colorful paintings. We spent the day catching up and enjoying a cup of coffee in the cozy living room. It was a lovely visit and my first time in Los Angeles, and I can't wait to go back and see my friend's new garden in full bloom."
}
</input>

From the above instance of the schema `JournalEntry`, extract data as a JSON object with a schema of type `Address`.
Infer and fill in missing data values if possible.

Output JSON and JSON only
```

When we send this prompt to `gpt-3.5-turbo`, we get the expected output result of

```json
{
  "street": "3578 Oak Avenue",
  "city": "Los Angeles",
  "state": "CA",
  "zip_code": "90011"
}
```

With this approach, we can hypothetically substitute any request and response schemas as prompt content to drive our use case. A Python API for constructing a call like this could look like this:

```python
StructuredLLM(Address).run(JournalEntry(content="..."))
```

`StructuredLLM(Address)` initializes a class with the target schema.
`.run(JournalEntry(content="..."))` passes in an instance of the request schema.
The prompt construction and object extraction and validation would live inside `StructuredLLM`.
With this API, we could also easily do things like classify text sentiment or generate tags without needing to write any prompt code.
For example:

```python
class EntryMetadata(BaseModel):
  # where 0 is very negative and 5 is very positive
  sentiment: conint(ge=0, le=5)
  # tags that could help group this text with other similar text
  tags: List[str]
```

Running the prompt again, substituting `Address` for `EntryMetadata` yields:

```json
{
  "sentiment": 4,
  "tags": ["travel", "friendship", "home decor", "Los Angeles"]
}
```

With the proposed Python API, to accomplish this in code, we would run

```python
StructuredLLM(EntryMetadata).run(JournalEntry(content="..."))
```

As a final example, let's add an enumeration, identifying the location described in the entry from a predefined list.

```python
class Location(Enum):
    WORK = 1
    VACATION = 2
    HOME = 3

class EntryMetadata(BaseModel):
  # where 0 is very negative and 5 is very positive
  sentiment: conint(ge=0, le=5)
  # tags that could help group this text with other similar text
  tags: List[str]
  location: Location
```

Result:

```json
{
  "sentiment": 4,
  "tags": ["friend", "visit", "house", "Los Angeles"],
  "location": "VACATION"
}
```

Note the tags do change, which is expected behavior for a language model.
If we wanted more consistent tags, we should provide an enumeration.

The above examples are relatively simple, but injecting object schemas from code into prompts seems to have potential for instructing language models and integrating them with production systems.
I plan to continue exploring more diverse use cases and documenting my findings.
