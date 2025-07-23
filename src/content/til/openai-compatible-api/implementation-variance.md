---
title: OpenAI Compatible API Implementation Variance
createdAt: 2025-05-29T21:02:05.000Z
updatedAt: 2025-05-29T21:02:05.000Z
publishedAt: 2025-05-29T21:02:05.000Z
tags:
  - openai_compatible_api
draft: false
---

Lots of language model providers implement the OpenAI API spec.
These look similar in shape but often behave differently in subtle ways.
Anthropic's [prefill sequences](/til/prompting/prefill-and-stop-sequences) are one such example.

I wasn't able to find a canonical definition of this spec.
In practice, we can show the basic shape of the API for chatting with a few examples.

OpenAI:

```sh
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
      {"role": "user", "content": "Hi"},
      {"role": "assistant", "content": ""}
    ]
  }'
```

```json
{
  "id": "chatcmpl-BcibN0BPNN8ysOymTxonvePn0m3n6",
  "object": "chat.completion",
  "created": 1748567613,
  "model": "gpt-4.1-2025-04-14",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today? 😊",
        "refusal": null,
        "annotations": []
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 10,
    "total_tokens": 22,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "audio_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "audio_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0
    }
  },
  "service_tier": "default",
  "system_fingerprint": "fp_799e4ca3f1"
}
```

Anthropic:

```sh
curl https://api.anthropic.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{
    "model": "claude-4-sonnet-20250514",
    "messages": [
      {"role": "user", "content": "Hi"},
      {"role": "assistant", "content": ""}
    ]
  }' | jq .
```

```json
{
  "id": "msg_016bT3QYFyNLL1NXvwLiM8oh",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How are you doing today? Is there anything I can help you with?"
      }
    }
  ],
  "created": 1748567742,
  "model": "claude-sonnet-4-20250514",
  "object": "chat.completion",
  "usage": {
    "completion_tokens": 20,
    "prompt_tokens": 8,
    "total_tokens": 28
  }
}
```

Gemini:

```sh
curl https://generativelanguage.googleapis.com/v1beta/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -d '{
    "model": "gemini-2.0-flash",
    "messages": [
      {"role": "user", "content": "Hi"},
      {"role": "assistant", "content": ""}
    ]
  }' | jq .
```

```json
[
  {
    "error": {
      "code": 400,
      "message": "Unable to submit request because it has an empty text parameter. Add a value to the parameter and try again. Learn more: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini",
      "status": "INVALID_ARGUMENT"
    }
  }
]
```

OpenAI and Anthropic respond quite similarly.

```diff
--- openai.json
+++ anthropic.json
@@ -3,34 +3,19 @@
     {
       "finish_reason": "stop",
       "index": 0,
-      "logprobs": null,
       "message": {
-        "annotations": [],
-        "content": "Hello! How can I help you today? 😊",
-        "refusal": null,
+        "content": "Hello! How are you doing today? Is there anything I can help you with?",
         "role": "assistant"
       }
     }
   ],
-  "created": 1748567613,
-  "id": "chatcmpl-BcibN0BPNN8ysOymTxonvePn0m3n6",
-  "model": "gpt-4.1-2025-04-14",
+  "created": 1748567742,
+  "id": "msg_016bT3QYFyNLL1NXvwLiM8oh",
+  "model": "claude-sonnet-4-20250514",
   "object": "chat.completion",
-  "service_tier": "default",
-  "system_fingerprint": "fp_799e4ca3f1",
   "usage": {
-    "completion_tokens": 10,
-    "completion_tokens_details": {
-      "accepted_prediction_tokens": 0,
-      "audio_tokens": 0,
-      "reasoning_tokens": 0,
-      "rejected_prediction_tokens": 0
-    },
-    "prompt_tokens": 12,
-    "prompt_tokens_details": {
-      "audio_tokens": 0,
-      "cached_tokens": 0
-    },
-    "total_tokens": 22
+    "completion_tokens": 20,
+    "prompt_tokens": 8,
+    "total_tokens": 28
   }
 }
```

And we get an error from Gemini.

Why?

We actually did something a little strange here.
We send an empty assistant message in our API request.

Typically, you'd send the most recent user message, expecting the model to respond with a new assistant message.
OpenAI and Anthropic handle this gracefully.
Gemini throws an error.

While the OpenAI compatible API spec is very useful for using different models in the same context, some variance in implementations pops up here and there on the margins.

If I find more occurrences of these, I'll create a series or something.
