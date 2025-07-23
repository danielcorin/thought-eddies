---
title: Cloudflare D1
createdAt: 2023-06-18T09:59:00.000Z
updatedAt: 2023-06-18T09:59:00.000Z
tags:
  - sqlite
  - cloudflare
  - d1
draft: false
---

I was interested to learn more about the developer experience of [Cloudflare's D1](https://developers.cloudflare.com/d1) serverless SQL database offering.
I started with [this tutorial](https://developers.cloudflare.com/d1/get-started/#write-queries-within-your-worker).
Using [`wrangler`](https://developers.cloudflare.com/workers/wrangler/install-and-update/) you can scaffold a Worker and create a D1 database.
The docs were straightforward up until the [Write queries within your
Worker](https://developers.cloudflare.com/d1/get-started/#write-queries-within-your-worker) section.
For me, `wrangler` scaffolded a worker with a different structure than the docs discuss.
I was able to progress through the rest of the tutorial by doing the following:

Add the following to `worker-configuration.d.ts`:

```js
export interface Env {
    DB D1Database;
}
```

Modify `worker.ts` to make the SQL query:

```js
        ...

        if (url.pathname.startsWith('/api/')) {
            if (url.pathname === "/api/beverages") {
                const { results } = await env.DB.prepare(
                  "SELECT * FROM Customers WHERE CompanyName = ?"
                )
                  .bind("Bs Beverages")
                  .all();
                return Response.json(results);
              }

            return apiRouter.handle(request);
        }

        ...
```

Run

```sh
wrangler dev --local
```

`wrangler dev --local --persist` yields an error for my version of `wrangler`:

```sh
❯ wrangler version
 ⛅️ wrangler 3.1.0
```

Validate the worker queries the database:

```sh
❯ curl http://127.0.0.1:8787/api/beverages | jq .
[
  {
    "CustomerId": 11,
    "CompanyName": "Bs Beverages",
    "ContactName": "Victoria Ashworth"
  },
  {
    "CustomerId": 13,
    "CompanyName": "Bs Beverages",
    "ContactName": "Random Name"
  }
]
```

I ran `npm run deploy` to start a Cloudflare working in production.
The CLI outputted a URL when my worker was up and running.
I tried `curl`ing the API route that accesses the database, but unfortunately got an error ("Error 1101").
I started streaming realtime logs from the Cloudflare dashboards for the working, the hit the same route again.
The logs registered the exception but I wasn't able to find much additional information:

```json
{
    "exceptions": [
        {
        "name": "Error",
        "message": "D1_ERROR",
        "timestamp": 1687098711996
        }
    ],
    ...
}
```

Overall, it was easy to get things working locally and in production (for the worker at least).
It's not clear if D1 can be easily used outside the Cloudflare serverless ecosystem -- for example, I'm not sure if I could connect to a D1 database from a Python app.
Currently, D1 seems dependent on Cloudflare's tooling and serverless platform.
I stopped once I got stuck on the `D1_ERROR`.
