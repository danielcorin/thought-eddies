---
title: Intro to Deno
createdAt: 2024-01-23T20:57:19.000Z
updatedAt: 2024-01-23T20:57:19.000Z
publishedAt: 2024-01-23T20:57:19.000Z
tags:
  - typescript
  - deno
  - openai
  - hono
draft: false
---

I tried out [Deno](https://deno.com/) for the first time.
Deno bills itself as

> the most productive, secure, and performant JavaScript runtime for the modern programmer

Given my experience with it so far, I think it may have a case.
One thing I immediately appreciated about Deno was how quickly I could go from zero to running code.
It's one of the things I like about Python that has kept me coming back despite a number of other shortcomings.
Deno integrates easily into VS Code ([Cursor](https://cursor.sh/)) with the [vscode_deno](https://github.com/denoland/vscode_deno) plugin.
I found this plugin with a quick search in the marketplace.

I followed the [Quick Start](https://docs.deno.com/runtime/manual) from the docs to get a minimal example working.
Quickly, I had the Hello World HTTP endpoint up and running.
From here, I looked to install `hono` which had been recommended and a simple framework that followed web standards.
Hono's project repo actually provides a Deno [example](https://github.com/honojs/examples/blob/main/deno/hello.ts), so this was my introduction to how imports worked in Deno -- you just sort of magically import things.
Cursor prompted me to cache the import and its dependencies, so I ran that and immediately had the library code available to inspect and lookup definitions.
With Hono imported and cached, I modified my Hello World example to the following

```ts
import { logger } from 'https://deno.land/x/hono@v3.11.11/middleware.ts';
import { Context, Hono } from 'https://deno.land/x/hono@v3.11.11/mod.ts';
const app = new Hono();

app.use('*', logger());
app.get('/', (c: Context) => {
  return c.text('Hello World!');
});

Deno.serve(app.fetch);
```

then ran it with

```
deno run -A server.ts
```

It worked.

```sh
❯ curl localhost:8000/
Hello World!%
```

One of Deno's selling point is that it is secure, so I decided to dig into that a bit.
The `-A` parameter tells Deno to run the code with all permissions.
From the `--help` docs:

```sh
deno run --help

...

  -A, --allow-all
          Allow all permissions. Learn more about permissions in Deno:
          https://deno.land/manual@v1.39.4/basics/permissions
```

When I ran the code without the `-A` flag, Deno complained

```sh
❯ deno run server.ts
┌ ⚠️  Deno requests net access to "0.0.0.0:8000".
├ Requested by `Deno.listen()` API.
├ Run again with --allow-net to bypass this prompt.
└ Allow? [y/n/A] (y = yes, allow; n = no, deny; A = allow all net permissions) >
```

I entered `y` so it worked

```sh
┌ ⚠️  Deno requests net access to "0.0.0.0:8000".
✅ Granted net access to "0.0.0.0:8000".
Listening on http://localhost:8000/
```

I tried again entering `n` and it crashed

```sh
┌ ⚠️  Deno requests net access to "0.0.0.0:8000".
❌ Denied net access to "0.0.0.0:8000".
error: Uncaught (in promise) PermissionDenied: Requires net access to "0.0.0.0:8000", run again with the --allow-net flag
Deno.serve(app.fetch);
     ^
    at listen (ext:deno_net/01_net.js:466:35)
    at Object.serve (ext:deno_http/00_serve.js:597:16)
    at file:///Users/danielcorin/dev/conversation-buddy/server.ts:13:6
```

This my first encounter with a language that managed permissions at runtime in this manner.
Maybe the most similar thing that comes to mind is iOS/macOS applications requesting system permissions when first run by the user.
Oddly enough, if Python had a feature like this, I likely would have had an easier time creating a [sandboxed environment](/posts/2024/sandboxed-python-env) to test potentially unsafe libraries.
Deno has an appealing approach here.

To avoid needing to enter `y` each time, I followed the helpful instructions and added the `--allow-net` flag to my command.
It ran happily

```sh
❯ deno run --allow-net server.ts
Listening on http://localhost:8000/
```

Next, I decided to see if I could use the OpenAI [speech to text API](https://platform.openai.com/docs/guides/speech-to-text) to extract text from an mp3 audio recording.
The [`openai-node`](https://github.com/openai/openai-node) library provides [installation instructions](https://github.com/openai/openai-node#installation) for Deno.
Pretty cool -- I didn't even need to find the most recent version (though I checked anyway and the docs were up to date 🙏).
Unfortunately, OpenAI only has docs for using the speech to text API with Python and curl, but the TypeScript client is pretty similar to Python.
Additionally, it was easy to read the client source code with Deno's integration and tooling once I cached the library.

I recorded myself using QuickTime, then saved the output.
It was an `m4a` file, so I [asked `gpt-4`](/logs/2024/01/23) how to convert it to an `mp3` which I needed for the API and it gave me a working command.

Looking at the `TranscriptionCreateParams` of the OpenAI client, a saw I needed a `Uploadable` for the `file` parameter.
It was also at this point that I realized I hadn't needed to convert the `m4a` file to `mp3` after all because the API supports the former as well 🤷‍♂️.
Read the docs!
I didn't know how to read a file from my file system into an `Uploadable`, so I asked Cursor to write it for me.
After a refinement, requesting it to be more concise, I got this

```ts
const helloAudioUploadable = new File(
  [await Deno.readFile('hello.mp3')],
  'hello.mp3',
  { type: 'audio/mpeg' }
);
```

That seemed to work, so I wired up the rest of the code

```ts
import { logger } from 'https://deno.land/x/hono@v3.11.11/middleware.ts';
import { Context, Hono } from 'https://deno.land/x/hono@v3.11.11/mod.ts';
import OpenAI from 'https://deno.land/x/openai@v4.25.0/mod.ts';
import { Transcription } from 'https://deno.land/x/openai@v4.25.0/resources/audio/transcriptions.ts';

const app = new Hono();
const client = new OpenAI();

const helloAudioUploadable = new File(
  [await Deno.readFile('hello.mp3')],
  'hello.mp3',
  { type: 'audio/mpeg' }
);

app.use('*', logger());
app.get('/', async (c: Context) => {
  const transcription: Transcription = await client.audio.transcriptions.create(
    {
      file: helloAudioUploadable,
      model: 'whisper-1',
    }
  );
  return c.text(transcription.text);
});

Deno.serve(app.fetch);
```

Then ran it

```sh
❯ deno run --allow-net server.ts
┌ ⚠️  Deno requests env access to "OPENAI_BASE_URL".
├ Run again with --allow-env to bypass this prompt.
└ Allow? [y/n/A] (y = yes, allow; n = no, deny; A = allow all env permissions) >
```

Deno protecting my system again.
Nice.
A couple iterations later and I had it working (I could have just used `-A`).

```sh
❯ deno run --allow-net --allow-env --allow-read server.ts
Listening on http://localhost:8000/
```

Finally, I tried out the endpoint

```sh
❯ curl localhost:8000/
Hello, Dan here.%
```

Indeed, that was what I said.

I _really_ enjoyed using Deno.
I'm definitely going to continue to use it in my projects.
