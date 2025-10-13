---
title: 'Debugging DSPy token usage and prompts'
createdAt: 2025-10-12T15:37:35-04:00
updatedAt: 2025-10-12T15:37:35-04:00
publishedAt: 2025-10-12T15:37:35-04:00
tags: ['dspy']
draft: false
---

As I've experimented more with DSPy, I've attempted to dig further into the details of the specific LLM I am using to better understand things like token usage, reasoning, and the specific prompts being sent to the model.
While, DSPy's abstraction is one of the more lightweight for LLM frameworks, in my experience, I generally want to see what is being sent to the model when I'm trying to debug or improve performance for a use case.

## A simple example

We will start with a classic example for me -- using DSPy to extract a date from a sentence in a specific format.

```python
import dspy
```

```python
class ExtractDate(dspy.Signature):
    """Extract a date in yyyy-mm-dd format from the given sentence."""

    sentence = dspy.InputField(desc="The input sentence containing a date")
    date = dspy.OutputField(desc="The extracted date in yyyy-mm-dd format")
```

```python
sentence = "The meeting is scheduled for March 15th, 2024."
```

The first question I often find myself asking is "how many tokens did that inference use?"
This is exposed in a straightforward way with DSPy but the framework also enables `cache` by default.
When experimenting, this is a great help because the framework avoids re-running inference it has already run before, saving you time and money.
However, when trying to measure token utilization (which you'll usually attempt after already running an inference at least once), this caching prevents you from seeing the actual token usage because in practice, for that call, there wasn't any.
The result was pulled from cache.

To consistently see the token usage, the most straightforward approach I have found is to disable caching.

```python
extract_date = dspy.Predict(ExtractDate)


with dspy.settings.context(lm=dspy.LM("openai/gpt-4.1-mini"), track_usage=True, cache=False):
    result = extract_date(sentence=sentence)
    print(result)

    usage = result.get_lm_usage()
    print(usage)

```

    Prediction(
        date='2024-03-15'
    )
    {}

```python

```

Let's make a function to report the results and usage, since we're going to do this a lot.

```python
import json


def filter_none_recursive(obj):
    if isinstance(obj, dict):
        return {k: filter_none_recursive(v) for k, v in obj.items() if v is not None}
    elif isinstance(obj, list):
        return [filter_none_recursive(item) for item in obj if item is not None]
    else:
        return obj

def print_results_and_usage(result):
    usage = result.get_lm_usage()
    print(result)
    filtered_usage = filter_none_recursive(usage)
    print(json.dumps(filtered_usage, indent=2))
```

Now we can take a look at the different ways to configure the model with DSPy to output its response using reasoning.

Gemini Flash 2.5 uses reasoning by default.

```python
with dspy.settings.context(lm=dspy.LM("gemini/gemini-2.5-flash", track_usage=True, cache=False)):
    result = extract_date(sentence=sentence)
    print_results_and_usage(result)
```

    Prediction(
        date='2024-03-15'
    )
    null

This can be disabled by setting `reasoning_effort` to `disable` on `dspy.LM`.

```python
with dspy.settings.context(
    lm=dspy.LM("gemini/gemini-2.5-flash", cache=False, reasoning_effort="disable"),
    track_usage=True,
):
    result = extract_date(sentence=sentence)
    print_results_and_usage(result)
```

    Prediction(
        date='2024-03-15'
    )
    {
      "gemini/gemini-2.5-flash": {
        "completion_tokens": 22,
        "prompt_tokens": 179,
        "total_tokens": 201,
        "prompt_tokens_details": {
          "text_tokens": 179
        }
      }
    }

It can also be disabled by setting `reasoning_effort` to `disable` on the `Predict` instance.

```python
with dspy.settings.context(lm=dspy.LM("gemini/gemini-2.5-flash", track_usage=True, cache=False)):
    result = extract_date(
        sentence=sentence,
        config={"reasoning_effort": "disable"},
    )
    print_results_and_usage(result)
```

    Prediction(
        date='2024-03-15'
    )
    null

Following the first approach, we can set `reasoning_effort` to `high` to attempt to elicit more reasoning tokens from the model.

```python
with dspy.settings.context(
    lm=dspy.LM("gemini/gemini-2.5-flash", cache=False, reasoning_effort="high"),
    track_usage=True,
):
    result = extract_date(sentence=sentence)
    print_results_and_usage(result)
```

    Prediction(
        date='2024-03-15'
    )
    {
      "gemini/gemini-2.5-flash": {
        "completion_tokens": 153,
        "prompt_tokens": 179,
        "total_tokens": 332,
        "completion_tokens_details": {
          "reasoning_tokens": 131,
          "text_tokens": 22
        },
        "prompt_tokens_details": {
          "text_tokens": 179
        }
      }
    }

We can do something similar with GPT-5, OpenAI's hybrid reasoning model.
Note: The OpenAI API requires `temperature=1` and `max_tokens >= 16000` for the `gpt-5` model, hence the changes below.

```python
with dspy.settings.context(
    lm=dspy.LM("openai/gpt-5", temperature=1, max_tokens=16000, cache=False, reasoning_effort="low"),
    track_usage=True,
):
    result = extract_date(sentence=sentence)
    print_results_and_usage(result)
```

    Prediction(
        date='2024-03-15'
    )
    {
      "openai/gpt-5": {
        "completion_tokens": 90,
        "prompt_tokens": 166,
        "total_tokens": 256,
        "completion_tokens_details": {
          "accepted_prediction_tokens": 0,
          "audio_tokens": 0,
          "reasoning_tokens": 64,
          "rejected_prediction_tokens": 0
        },
        "prompt_tokens_details": {
          "audio_tokens": 0,
          "cached_tokens": 0
        }
      }
    }

But it doesn't work in exactly the same way as Gemini.
Here we see a LiteLLM error (the underlying translation layer DSPy uses to support different LLM providers), where our `reasoning_effort` configuration is invalid for the OpenAI API.

```python
with dspy.settings.context(
    lm=dspy.LM("openai/gpt-5", temperature=1, max_tokens=16000, cache=False, reasoning_effort="disable"),
    track_usage=True,
):
    result = extract_date(sentence=sentence)
```

```text wrap=true
...
BadRequestError: litellm.BadRequestError: OpenAIException - Invalid value: 'disable'. Supported values are: 'low', 'medium', and 'high'.
```

## Inspecting raw prompts and responses with history

We've experimented with configuring a few different LLMs.
Now, let's inspect the output of their inference and the prompts DSPy sends to the model.
Each LM instance maintains a `history` list that contains detailed information about every call, including the raw messages, responses, and usage stats.

Let's take a look at this.

```python
lm = dspy.LM("openai/gpt-5-mini", cache=False, temperature=1, max_tokens=16000)

with dspy.settings.context(lm=lm, track_usage=True):
    result = extract_date(sentence=sentence, config={"reasoning_effort": "high"})

```

```python
lm.history
```

    [{'prompt': None,
      'messages': [{'role': 'system',
        'content': 'Your input fields are:\n1. `sentence` (str): The input sentence containing a date\nYour output fields are:\n1. `date` (str): The extracted date in yyyy-mm-dd format\nAll interactions will be structured in the following way, with the appropriate values filled in.\n\n[[ ## sentence ## ]]\n{sentence}\n\n[[ ## date ## ]]\n{date}\n\n[[ ## completed ## ]]\nIn adhering to this structure, your objective is: \n        Extract a date in yyyy-mm-dd format from the given sentence.'},
       {'role': 'user',
        'content': '[[ ## sentence ## ]]\nThe meeting is scheduled for March 15th, 2024.\n\nRespond with the corresponding output fields, starting with the field `[[ ## date ## ]]`, and then ending with the marker for `[[ ## completed ## ]]`.'}],
      'kwargs': {'reasoning_effort': 'high'},
      'response': ModelResponse(id='chatcmpl-CPw9qDTZzuUNjdNIbFladiHQkXGTe', created=1760297794, model='gpt-5-mini-2025-08-07', object='chat.completion', system_fingerprint=None, choices=[Choices(finish_reason='stop', index=0, message=Message(content='[[ ## date ## ]]\n2024-03-15\n\n[[ ## completed ## ]]', role='assistant', tool_calls=None, function_call=None, provider_specific_fields={'refusal': None}, annotations=[]), provider_specific_fields={})], usage=Usage(completion_tokens=154, prompt_tokens=166, total_tokens=320, completion_tokens_details=CompletionTokensDetailsWrapper(accepted_prediction_tokens=0, audio_tokens=0, reasoning_tokens=128, rejected_prediction_tokens=0, text_tokens=None), prompt_tokens_details=PromptTokensDetailsWrapper(audio_tokens=0, cached_tokens=0, text_tokens=None, image_tokens=None)), service_tier='default'),
      'outputs': ['[[ ## date ## ]]\n2024-03-15\n\n[[ ## completed ## ]]'],
      'usage': {'completion_tokens': 154,
       'prompt_tokens': 166,
       'total_tokens': 320,
       'completion_tokens_details': CompletionTokensDetailsWrapper(accepted_prediction_tokens=0, audio_tokens=0, reasoning_tokens=128, rejected_prediction_tokens=0, text_tokens=None),
       'prompt_tokens_details': PromptTokensDetailsWrapper(audio_tokens=0, cached_tokens=0, text_tokens=None, image_tokens=None)},
      'cost': 0.0003495,
      'timestamp': '2025-10-12T15:36:37.579158',
      'uuid': '2f29dbd0-18d4-4a1b-9791-578221b5c1c7',
      'model': 'openai/gpt-5-mini',
      'response_model': 'gpt-5-mini-2025-08-07',
      'model_type': 'chat'}]

```python
lm.inspect_history(1)
```

    [2025-10-12T15:36:37.579158]

    System message:

    Your input fields are:
    1. `sentence` (str): The input sentence containing a date
    Your output fields are:
    1. `date` (str): The extracted date in yyyy-mm-dd format
    All interactions will be structured in the following way, with the appropriate values filled in.

    [[ ## sentence ## ]]
    {sentence}

    [[ ## date ## ]]
    {date}

    [[ ## completed ## ]]
    In adhering to this structure, your objective is:
            Extract a date in yyyy-mm-dd format from the given sentence.


    User message:

    [[ ## sentence ## ]]
    The meeting is scheduled for March 15th, 2024.

    Respond with the corresponding output fields, starting with the field `[[ ## date ## ]]`, and then ending with the marker for `[[ ## completed ## ]]`.


    Response:

    [[ ## date ## ]]
    2024-03-15

    [[ ## completed ## ]]

Here we see almost everything we'd want to know about the prompt DSPy sent and the response it received from the model.
We even see `kwargs` overrides that were passed for the specific call.

The main thing we miss is the configuration of the LM instance itself for that specific message, which we can get like this:

```python
lm.dump_state()
```

    {'model': 'openai/gpt-5-mini',
     'model_type': 'chat',
     'cache': False,
     'num_retries': 3,
     'finetuning_model': None,
     'launch_kwargs': {},
     'train_kwargs': {},
     'temperature': 1,
     'max_completion_tokens': 16000}

This isn't necessarily a foolproof way to get what the LM configuration was at call time because the LM and its `kwargs` are mutable.
It's possible (though probably not advisable) to change them after the call has been made.
However, for my own experimentation purposes, I've found the above functions to be helpful.

Remember to re-enable caching when you're done inspecting token usage to save time and cost!
