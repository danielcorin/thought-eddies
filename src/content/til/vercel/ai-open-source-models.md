---
title: Using Vercel's AI SDK to stream responses from different language models
createdAt: 2024-01-17T21:40:12.000Z
updatedAt: 2024-01-17T21:40:12.000Z
publishedAt: 2024-01-17T21:40:12.000Z
tags:
  - vercel
  - ai
  - language_models
draft: false
updated_at: 2024-07-21T13:32:28.000Z
---

_Edit (2024-07-21): Vercel has updated the [`ai` package](https://github.com/vercel/ai) to use different abstractions than the examples below.
Consider reading [their docs](https://sdk.vercel.ai/docs/introduction) first before using the example below, which is out of date._

Vercel has a library called [`ai`](https://github.com/vercel/ai), that is useful for building language model chat applications.
I used it to help build [Write Partner](/projects/write-partner)
The library has two main components:

- A backend API that is called by a frontend app that streams language model responses
- A hook (in React) that provides access to the chat, its messages and an API to fetch completions

When designing Write Partner, I started the chat session with the following messages

```javascript
[
  {
    id: '0',
    role: 'system',
    content:
      'You are a thoughtful assistant that asks the user followup questions about their idea to help them deepen their thought process.',
  },
  {
    id: '1',
    role: 'assistant',
    content: 'What would you like to write about?',
  },
];
```

If you want to follow along, you can create a new Next.js project (`npx create-next-app`) and use this simple `page.tsx` file:

```tsx
'use client';

import { useChat } from 'ai/react';

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    initialMessages: [
      {
        id: '0',
        role: 'system',
        content:
          'You are a thoughtful assistant that asks the user followup questions about their idea to help them deepen their thought process.',
      },
      {
        id: '1',
        role: 'assistant',
        content: 'What would you like to write about?',
      },
    ],
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div>
          {messages.map((m) => (
            <div key={m.id}>
              {m.role}: {m.content}
            </div>
          ))}

          <form onSubmit={handleSubmit}>
            <input
              className="text-black"
              value={input}
              placeholder="Say something..."
              onChange={handleInputChange}
            />
          </form>
        </div>
      </div>
    </main>
  );
}
```

This approach worked fine for OpenAI chat models.
After some experimentation, with these models, I decided to investigate how the UX would change with some open source models, as the [docs](https://sdk.vercel.ai/docs) describe.

Switching to another model only requires a change to the backend API.
I decided to try out some models hosted by [Fireworks](https://www.fireworks.ai/).
To make this change, where I previously had a `src/app/api/chat/route.ts` file

```typescript
import OpenAI from 'openai';

import { OpenAIStream, StreamingTextResponse } from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
export const runtime = 'edge';
export async function POST(req: Request) {
  const { messages } = await req.json();
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages,
  });
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
```

I now had

```typescript
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const fireworks = new OpenAI({
  apiKey: process.env.FIREWORKS_API_KEY || '',
  baseURL: 'https://api.fireworks.ai/inference/v1',
});
export const runtime = 'edge';
export async function POST(req: Request) {
  const { messages } = await req.json();
  const response = await fireworks.chat.completions.create({
    model: 'accounts/fireworks/models/mixtral-8x7b-instruct',
    stream: true,
    messages,
  });
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
```

At this point I ran into a problem.
Using the same messages above (a system prompt, an assistant message, and then my user message), I was getting an error back from the API:

```text
 ⨯ node_modules/openai/error.mjs (40:19) @ APIError.generate
 ⨯ 400 Found an assistant message without a preceding user prompt
null
```

The error is pretty straightforward.
The model can't handling having an assistant message before a user message.
I tried again with another model

```typescript
model: 'accounts/fireworks/models/llama-v2-70b-chat';
```

but got the same error.

I tried again, this time with just an assistant message, but that failed as well with the following error

```text
 ⨯ node_modules/openai/error.mjs (40:19) @ APIError.generate
 ⨯ 400 Found multiple user messages in a row, starting at message 2
```

While there may not be obvious uses for multiple user messages or starting assistant messages in a chat, it's worth noting that the contract for using different models with the library are not quite identical.
OpenAI's models support both of these aforementioned uses.

To determine whether the difference was between OpenAI and Fireworks or the models themselves, I changed the backend API to try one more model provider -- Anthropic.
I made the following code changes to support this:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AnthropicStream, StreamingTextResponse } from 'ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});
export const runtime = 'edge';
export async function POST(req: Request) {
  const { messages } = await req.json();
  const response = await anthropic.beta.messages.create({
    messages,
    model: 'claude-2.1',
    stream: true,
    max_tokens: 300,
  });
  const stream = AnthropicStream(response);
  return new StreamingTextResponse(stream);
}
```

I first tried a message with the system and assistant prompt and got the following error

```text
 ⨯ node_modules/@anthropic-ai/sdk/error.mjs (36:19) @ APIError.generate
 ⨯ 400 {"type":"error","error":{"type":"invalid_request_error","message":"messages: Unexpected role \"system\". The Messages API accepts a top-level `system` parameter, not \"system\" as an input message role."}}
null
```

I tried again this just an assistant message

```text
 ⨯ node_modules/@anthropic-ai/sdk/error.mjs (36:19) @ APIError.generate
 ⨯ 400 {"type":"error","error":{"type":"invalid_request_error","message":"messages: first message must use the \"user\" role"}}
null
```

Finally, I tried with no initial chat messages and it worked.
More discrepancies between models.

Unfortunately, models aren't quite plug and play.
Further complicating this situation is the fact the prompts aren't quite portable between models either -- something I learned [testing data extraction techniques](/posts/2023/promptfoo-and-output-structure) with gpt-3.5 and gpt-4.
The behavior of different models using the same prompt seems to be pretty inconsistent.
Despite these challenges, the `ai` library is a huge help in building language model-based applications relative to the status-quo.
Big thanks to Vercel for their work on this library.
It's helped me a lot.
