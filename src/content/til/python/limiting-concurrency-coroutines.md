---
title: Limiting concurrency with Python Coroutines
createdAt: 2023-12-05T18:08:00.000Z
updatedAt: 2023-12-05T18:08:00.000Z
publishedAt: 2023-12-05T18:08:00.000Z
tags:
  - python
  - coroutines
  - concurrency
draft: false
---

In a previous [note](/til/python/coroutines), I discussed running coroutines in a non-blocking manner using `gather`.
This approach works well when you have a known number of coroutines that you want to run in a non-blocking manner.
However, if you have tens, hundreds, or more tasks, especially when network calls are involved, it can be important to limit concurrency.
We can use a semaphore to limit the number of coroutines that are running at once by blocking until other coroutines have finished executing.

```python
import asyncio


async def constrained_execution(funcs, max_runs):
  jobs = []
  semaphore = asyncio.Semaphore(max_runs)

  async def job(fn):
    async with semaphore:
      return await fn()

  for func in funcs:
    jobs.append(asyncio.ensure_future(job(func)))
  return await asyncio.gather(*jobs)


async def process(item):
  print(f"Processing item {item}")
  await asyncio.sleep(1)
  return item


async def main():
  fns = []
  for item in range(100):
    fns.append(lambda item=item: process(item))
  results = await constrained_execution(fns, 10)
  print(results)


if __name__ == "__main__":
    asyncio.run(main())
```

This approach is especially useful when you want to improve performance by making network requests using coroutines, but don't want to exceed a specific number of requests in parallel, due to issues like rate limiting or API availability.

```python
import aiohttp
import json


async def fetch_post_title(session, id_):
    url = f"https://jsonplaceholder.typicode.com/posts?id={id_}"
    async with session.get(url) as response:
        response = json.loads(await response.text())
        return response[0]["title"]

async def main():

  ids = range(1, 101)
  async with aiohttp.ClientSession() as session:
    fns = [
      lambda id_=id_: fetch_post_title(session, id_) for id_ in ids
    ]
    results = await constrained_execution(fns, 5)
    print(len(results)) # 100
    print(results) # [ '...', '...', ... ]


if __name__ == "__main__":
    asyncio.run(main())
```

A function like `constrained_execution` can be useful for scripting tasks you encounter in your day to day.
