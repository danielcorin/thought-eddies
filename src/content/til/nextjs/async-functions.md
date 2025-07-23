---
title: Next.js Async Functions
createdAt: 2023-08-13T00:00:00.000Z
updatedAt: 2023-08-13T00:00:00.000Z
publishedAt: 2023-08-13T00:00:00.000Z
tags:
  - nextjs
  - vercel
draft: false
---

## The problem with long running code in Next serverless functions

The current design paradigm at the time of this writing is called [App Router](https://nextjs.org/docs/app).

Next.js and Vercel provide a simple mechanism for writing and deploying cloud functions that expose HTTP endpoints for your frontend site to call.
However, sometimes you want to asynchronously do work on the backend in a way that doesn't block a frontend caller, needs to move on.
You could fire and forget the call from the frontend, but this is often not safe when running in a serverless environment.
The following approach uses two server-side API endpoints to run an asynchronous function from the perspective of the frontend caller.

```sh
❯ npx create-next-app@latest
✔ What is your project named? … async-project
✔ Would you like to use TypeScript? … No / Yes
✔ Would you like to use ESLint? … No / Yes
✔ Would you like to use Tailwind CSS? … No / Yes
✔ Would you like to use `src/` directory? … No / Yes
✔ Would you like to use App Router? (recommended) … No / Yes
✔ Would you like to customize the default import alias? … No / Yes
Creating a new Next.js app in /Users/danielcorin/dev/async-project.
```

Running the app, we can see the starter page

```sh
npm run dev
```

Now, we'll create an API endpoints.
From the project root:

```sh
mkdir -p src/app/api/submit
cd src/app/api/submit
touch route.ts
```

The folder can have any name, but I like this convention for separating API routes from pages.
The folder path is the same url used to hit the API in the browser or with `curl`.

In `route.ts`, let's write a simple HTTP handler for a `POST` to `/api/submit`.

In `src/app/api/submit/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('3 seconds passed');
  return NextResponse.json(data);
}
```

Now `curl` the endpoint:

```sh
curl -X POST -H "Content-Type: application/json" -d '{"key1":"value1","key2":"value2"}' http://localhost:3000/api/submit
```

We see a 3 second delay, then the following prints in the terminal running the Next app

```sh
3 seconds passed
```

and the payload is echoed back to the `curl` command

```sh
{"key1":"value1","key2":"value2"}
```

## A possible solution

Now, let's imagine our caller is constrained in such a way that it can't wait for 3 seconds.
It needs to be able to call `/api/submit`, know the information was received by the server, then move on.
We could attempt to do the work in a promise that we don't `await`.
However, once the function returns (and the underlying Lambda execution exit), we don't know if the promise will ever execute, which could lead to nondeterministic behavior or the code never running at all.
To resolve this challenge, we're going to create another route that will run our code we want to execute asynchronously from the perspective of the caller, but synchronously in the context of the Lambda function, such that it will not exit before the code is finished running.

From the project root

```sh
mkdir -p src/app/api/job
cd src/app/api/job
touch route.ts
```

In `src/app/api/job/route.ts`, we write

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('3 seconds passed');
  return NextResponse.json(data);
}
```

We also modify `src/app/api/submit/route.ts` to read

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();

  fetch(`http://localhost:3000/api/job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return NextResponse.json(data);
}
```

Running the same curl as before returns immediately

```sh
❯ curl -X POST -H "Content-Type: application/json" -d '{"key1":"value1","key2":"value2"}' http://localhost:3000/api/submit
{"key1":"value1","key2":"value2"}
```

Three seconds later, the following prints in the Next app:

```sh
3 seconds passed
```

We've managed to unblock the first API call but can still be confident that long-running code executes in Lambda before the function exits.
This approach doesn't quite work in production through, since we've hardcoded the url to localhost.
We can do a small refactor to make this work in production as well.

Create an `.env.local` file in the project root:

```text
VERCEL_URL="localhost:3000"
```

which will allow the project to continue to work locally.
Vercel sets `VERCEL_URL` automatically in projects.

Update `src/app/api/submit/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();
  const url = `${getUrl()}/api/job`;
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return NextResponse.json(data);
}

function getUrl(): string {
  const envVar = process.env.VERCEL_URL;

  if (!envVar) {
    return '';
  }

  if (envVar.includes('localhost')) {
    return `http://${envVar}`;
  } else {
    return `https://${envVar}`;
  }
}
```

These code changes check `VERCEL_URL` and construct the url depending on the environment.
In Vercel, `VERCEL_URL` should look something like `async-project-q0n3qzlm7-danielcorin.vercel.app`, which should help the above code make a bit more sense.
The value of `VERCEL_URL` changes on each deploy, but this is ok since our second HTTP from the first serverless function calls back into the same version of the app.
