---
title: Prefill And Stop Sequences
createdAt: 2024-09-03T20:41:07.000Z
updatedAt: 2024-09-03T20:41:07.000Z
publishedAt: 2024-09-03T20:41:07.000Z
tags:
  - prompt_eng
  - stop_sequence
draft: false
---

I revisited Eugene's excellent work, "[Prompting Fundamentals and How to Apply Them Effectively](https://eugeneyan.com/writing/prompting/)".
From this I learned about the ability to [prefill Claude's responses](https://eugeneyan.com/writing/prompting/#prefill-claudes-responses).
Using this technique, you can quickly get Claude to output JSON without any negotiation and avoid issues with leading codefences (e.g. \`\`\`json).

While JSON isn't as good an example as XML, which ends less ambiguously, here's a quick script showing the concept:

```python
import anthropic


message = anthropic.Anthropic().messages.create(
    model="claude-3-5-sonnet-20240620",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": """<status>Today is Tuesday, September 3rd, 2024 at 8:46pm ET, in New York, NY</status>
Extract the <day_of_week>, <month>, <day>, <year> and <location> from the <status> as JSON.
""",
        },
        {"role": "assistant", "content": "{"},
    ],
    stop_sequences=["}"],
)
print(message.content[0].text)
```

The script outputs

```text
  "day_of_week": "Tuesday",
  "month": "September",
  "day": 3,
  "year": 2024,
  "location": "New York, NY"
```

omitting the leading and trailing curly braces because of the prefix and stop sequences.
These can easily be added back with

```python
print(f"{{{message.content[0].text}}}")
```

which outputs

```text
{
  "day_of_week": "Tuesday",
  "month": "September",
  "day": 3,
  "year": 2024,
  "location": "New York, NY"
}
```

OpenAI models to not seem to respect this prefilling approach

```python
import openai

response = openai.OpenAI().chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": """<status>Today is Tuesday, September 3rd, 2024 at 8:46pm ET, in New York, NY</status>
Extract the <day_of_week>, <month>, <day>, <year> and <location> from the <status> as JSON.
""",
        },
        {"role": "assistant", "content": "{"},
    ],
    max_tokens=1024,
    stop=["}"],
)

print(response.choices[0].message.content)
```

Running this code typically outputs

```text
{
  "day_of_week": "Tuesday",
  "month": "September",
  "day": 3,
  "year": 2024,
  "location": "New York, NY"
```

or

````text
```json
{
  "day_of_week": "Tuesday",
  "month": "September",
  "day": 3,
  "year": 2024,
  "location": "New York, NY"
````

Prefilling is a [documented feature](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prefill-claudes-response) of Claude's whereas I can't seem to find anything on if OpenAI supports the approach.
OpenAI supports [Structured Output](https://platform.openai.com/docs/guides/structured-outputs) which probably covers similar use cases.
However, the continued divergence of these model APIs is worth noting, especially if you're hoping to easily swap between models using similar prompting approaches for your use case.

Using the prefill approach with more complex structured objects is probably not a great idea.
If any of the values within the JSON are objects (`{...}`), something like this might happen:

```python
import anthropic


message = anthropic.Anthropic().messages.create(
    model="claude-3-5-sonnet-20240620",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": """<status>Today is Tuesday, September 3rd, 2024 at 8:46pm ET, in New York, NY</status>
Extract the <day_of_week>, <month>, <day>, <year>, <time> (containing <hour>, <minute>, <second>, <am_or_pm>) and <location> from the <status> as JSON.
""",
        },
        {"role": "assistant", "content": "{"},
    ],
    stop_sequences=["}"],
)
print(message.content[0].text)
```

Output:

```text
  "day_of_week": "Tuesday",
  "month": "September",
  "day": 3,
  "year": 2024,
  "time": {
    "hour": 8,
    "minute": 46,
    "second": 0,
    "am_or_pm": "pm"
```

Here, the stop sequence terminates the inference output before the end of the JSON object and prevents generation for `location`.
Using the XML-based approach Eugene describes can help with this issue.
That approach would look like this:

```python
import anthropic


message = anthropic.Anthropic().messages.create(
    model="claude-3-5-sonnet-20240620",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": """<status>Today is Tuesday, September 3rd, 2024 at 8:46pm ET, in New York, NY</status>
Extract the <day_of_week>, <month>, <day>, <year>, <time> (containing <hour>, <minute>, <second>, <am_or_pm>) and <location> from the <status> as XML wrapped in <response> tags.
""",
        },
        {"role": "assistant", "content": "<response>"},
    ],
    stop_sequences=["</response>"],
)
print(message.content[0].text)
```

```text
  <day_of_week>Tuesday</day_of_week>
  <month>September</month>
  <day>3</day>
  <year>2024</year>
  <time>
    <hour>8</hour>
    <minute>46</minute>
    <second>00</second>
    <am_or_pm>pm</am_or_pm>
  </time>
  <location>New York, NY</location>
```
