---
title: Gemini 2.5 Uses Thinking By Default
createdAt: 2025-07-05T18:23:38.000Z
updatedAt: 2025-07-05T18:23:38.000Z
publishedAt: 2025-07-05T18:23:38.000Z
tags:
  - gemini
  - language_models
draft: false
---

It started because I was using the OpenAI completion API to try several different models while building [Tomo](https://wvlen.llc/apps/tomo).

Gemini 2.5 Flash and Pro were released and I added the new model strings and everything Just Worked.

Something felt off though.
When chatting with `gemini-2.5-flash` the model felt slow.

Well not exactly _slow_, but it felt like the model was consistently taking more time than I expected before the response would start streaming.

I wrote up a quick script to try and isolate the behavior and ran the inference for the new model and the past two GA releases of Gemini Flash.

```python {title="gemini_openai.py"}
import os
import time

from openai import OpenAI

gemini_client = OpenAI(
    api_key=os.environ.get("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)


def stream_with_openai_client(model_name):
    start_time = time.time()
    stream = gemini_client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Write a story about a robot."},
        ],
        stream=True,
    )

    first_token = True
    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            if first_token:
                ttft = time.time() - start_time
                print(f"{model_name} TTFT: {ttft:.3f}s")
                first_token = False
    return ttft


if __name__ == "__main__":
    results = {}
    results["gemini-1.5-flash"] = stream_with_openai_client("gemini-1.5-flash")
    results["gemini-2.0-flash"] = stream_with_openai_client("gemini-2.0-flash")
    results["gemini-2.5-flash"] = stream_with_openai_client("gemini-2.5-flash")
```

The results confirmed what I had been seeing.
The time to first token, specifically for `gemini-2.5-flash`, was a lot longer than I expected and longer than for the previous two GA releases.

```sh
❯ python gemini_openai.py
gemini-1.5-flash TTFT: 0.523s
gemini-2.0-flash TTFT: 0.511s
gemini-2.5-flash TTFT: 8.538s
```

I didn't want to jump to conclusions, so I tried the same script with the [Google GenAI SDK](https://googleapis.github.io/python-genai/).

```python {title="gemini_genai.py"}
import os
import time

from google import genai

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))


def stream_with_genai(model_name):
    start_time = time.time()
    response = client.models.generate_content_stream(
        model=model_name, contents="Write a story about a robot."
    )

    first_token = True
    for chunk in response:
        if chunk.text:
            if first_token:
                ttft = time.time() - start_time
                print(f"{model_name} TTFT: {ttft:.3f}s")
                first_token = False
    return ttft


if __name__ == "__main__":
    results = {}
    results["gemini-1.5-flash"] = stream_with_genai("gemini-1.5-flash")
    results["gemini-2.0-flash"] = stream_with_genai("gemini-2.0-flash")
    results["gemini-2.5-flash"] = stream_with_genai("gemini-2.5-flash")
```

The results were nearly the same.

```sh
❯ python gemini_genai.py
gemini-1.5-flash TTFT: 0.540s
gemini-2.0-flash TTFT: 0.420s
gemini-2.5-flash TTFT: 9.468s
```

## Why?

While it's not exactly clear that this is the case, the Gemini 2.5 models enable thinking [by default](https://ai.google.dev/gemini-api/docs/models).
For `gemini-2.5-pro`, [reasoning cannot be disabled](https://ai.google.dev/gemini-api/docs/thinking#set-budget) but for `gemini-2.5-flash`, it can be.

When we disable reasoning, time to first token is much faster:

```python {title="gemini_openai_no_reasoning.py"}
# ...

def stream_with_openai_client(model_name):
    start_time = time.time()
    stream = gemini_client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Write a story about a robot."},
        ],
        stream=True,
        reasoning_effort="none",
    )

# ...
```

```sh
❯ python gemini_openai_no_reasoning.py
gemini-1.5-flash TTFT: 0.555s
gemini-2.0-flash TTFT: 0.488s
gemini-2.5-flash TTFT: 0.402s
```

We can also [add a configuration](https://ai.google.dev/gemini-api/docs/openai#thinking) to `include_thoughts` which seems to reduce the time to first token as well (though not nearly as much compared to when reasoning is disabled entirely).

```python {title="gemini_openai_include_thoughts.py"}
# ...

    stream = gemini_client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Write a story about a robot."},
        ],
        stream=True,
        extra_body={
            "extra_body": {
                "google": {
                    "thinking_config": {
                        "include_thoughts": True,
                    }
                }
            }
        },
    )

# ...
```

```sh
❯ python gemini_openai_include_thoughts.py
gemini-1.5-flash TTFT: 0.749s
gemini-2.0-flash TTFT: 0.510s
gemini-2.5-flash TTFT: 1.591s
```

So thinking explains the delay I was seeing in time to first token.

In my opinion, it's a bit of a departure from the previous behavior.

It's curious that Google would make thinking opt-out behavior.
This seems like a trade off that would improve model performance on benchmarks, increase latency, and increase token usage.

I haven't seen this new default behavior discussed anywhere.
It is documented, but it's just surprising to me that it was made the default behavior.
