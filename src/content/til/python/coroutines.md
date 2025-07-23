---
title: Python Coroutines
description: >-
  Exploring accidental synchronous blocking in asynchronous programming in
  Python with coroutines.
createdAt: 2023-12-02T09:44:55.000Z
updatedAt: 2023-12-02T09:44:55.000Z
publishedAt: 2023-12-02T09:44:55.000Z
tags:
  - python
  - coroutines
draft: false
---

Python coroutines allow for asynchronous programming in a language that earlier in its history, has only supported synchronous execution.
I've previously [compared](/posts/2017/2017-04-18-go-channels) taking a synchronous approach in Python to a parallel approach in Go using channels.
If you're familiar with async/await in JavaScript, Python's syntax will look familiar.
Python's [event loop](https://docs.python.org/3/library/asyncio-eventloop.html#event-loop) allows coroutines to yield control back to the loop, awaiting their turn to resume execution, which can lead to more efficient use of resources.
Using coroutines in Python is different from JavaScript because they can easily or even accidentally be intermingled with synchronously executing functions.
Doing this can produce some unexpected results, such as blocking the event loop and preventing other tasks from running concurrently.

Here is an example demonstrating the issue:

```python
import asyncio
import time

async def blocking_function():
    print("This function blocks.")
    # This will block the event loop
    time.sleep(5)
    print("Function complete.")

async def main():
    print("Started.")
    await asyncio.gather(
        blocking_function(),
        blocking_function(),
    )
    print("All complete.")

if __name__ == "__main__":
    asyncio.run(main())
```

The above code outputs

```text
Started.
This function blocks.
Function complete.
This function blocks.
Function complete.
All complete.
```

Even though `blocking_function` is an `async` function and thus can be awaited as a coroutine, it blocks the event loop when called. When we run the code above, we see the functions run in series based on the printed output.

Most importantly, these calls block the _entire event loop_ started in `main`.
This behavior may be obvious when presented in such a transparent example, but can easily become a problem that is more difficult to diagnose with layers of async/await calls.
Here is the equivalent code using coroutines throughout.

```python
import asyncio


async def async_function():
    print("This function is async.")
    # asyncio.sleep is a non-blocking sleep that allows other coroutines to run while this one is sleeping
    await asyncio.sleep(5)
    print("Async function complete.")

async def main():
    # These will now run in parallel
    await asyncio.gather(
        async_function(),
        async_function(),
    )
    print("All complete.")

if __name__ == "__main__":
    asyncio.run(main())
```

This code outputs

```text
This function is async.
This function is async.
Async function complete.
Async function complete.
All complete.
```

We see the printed output is different -- the functions begin and end together and the running duration of the program is around half compared to the first example.
The `sleep` calls are "non-blocking" and the event loop remains available to process additional coroutines rather than getting monopolized by a single synchronous call, behind which all additional work gets blocked.

The above example is contrived, if you're using coroutines in Python, it quickly shows up.
Consider this call to OpenAI using their client.

```python
async def get_completion(prompt: str):
    print("start completion")
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4-1106-preview",
        messages=[
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )
    content = response.choices[0].message.content
    print(content)
    return content
```

This call will block the event loop because the `client.chat.completions.create` is synchronous, even if we try and call the functions in a non-blocking manner.

```python
import asyncio


async def main():
    task1 = asyncio.create_task(get_completion("Pick a random color"))
    task2 = asyncio.create_task(get_completion("Pick a random number"))
    await asyncio.gather(task1, task2)


if __name__ == "__main__":
    asyncio.run(main())
```

The output looks like this

```text
start completion
Cerulean.
start completion
Sure! Here's a random number: 67
```

If we switch to using an `AsyncOpenAI` from the `openai` package, we can now make actual non-blocking calls.

```python
import asyncio


async def nonblocking_get_completion(prompt: str):
    print("start completion")
    client = AsyncOpenAI()
    response = await client.chat.completions.create(
        model="gpt-4-1106-preview",
        messages=[
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )
    content = response.choices[0].message.content
    print(content)
    return content

async def main():
    task1 = asyncio.create_task(nonblocking_get_completion("Pick a random color"))
    task2 = asyncio.create_task(nonblocking_get_completion("Pick a random number"))
    await asyncio.gather(task1, task2)

if __name__ == "__main__":
    asyncio.run(main())
```

This outputs something like

```text
start completion
start completion
Periwinkle
Sure! Here is a random number: 42
```

Based on the output, we see `nonblocking_get_completion` was called twice before either completes, which indicates they're running as non-blocking coroutines.
