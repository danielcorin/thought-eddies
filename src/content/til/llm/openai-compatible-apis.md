---
title: Calling Deepseek with `llm` using OpenAI Compatible APIs
createdAt: 2025-01-01T08:16:40.000Z
updatedAt: 2025-01-01T08:16:40.000Z
publishedAt: 2025-01-01T08:16:40.000Z
tags:
  - llm
  - deepseek
draft: false
---

Deepseek V3 was recently released: a [cheap](https://api-docs.deepseek.com/quick_start/pricing/), reliable, supposedly GPT-4 class model.

Quick note upfront, according to the [docs](https://api-docs.deepseek.com/quick_start/pricing/), there will be non-trivial price increases in February 2025:

- Input price (cache miss) is going up to `$0.27` / 1M tokens from `$0.14` / 1M tokens (~2x)
- Output price is going up to `$1.10` / 1M tokens from `$0.28` /1M tokens (~4x)

> From now until 2025-02-08 16:00 (UTC), all users can enjoy the discounted prices of DeepSeek API

To get started

- [register for an account](https://platform.deepseek.com/)
- [create an API key](https://platform.deepseek.com/api_keys)
- [add some funds](https://platform.deepseek.com/top_up)

Deepseek exposes an [OpenAI compatible API](https://api-docs.deepseek.com/).
Because of this, it's easy to call via curl, Python, or Node.js using OpenAI's clients and a `base_url` override, as shown in Deepseek's documentation.

A little searching also revealed the [`llm`](https://github.com/simonw/llm) CLI tool can support making calls to OpenAI compatible APIs with a `extra-openai-models.yaml` [configuration file](https://github.com/simonw/llm/blob/000e984def983aa36384a24df42d4dbb558b5bb1/docs/other-models.md#openai-compatible-models).
[Here](https://github.com/search?q=repo%3Asimonw%2Fllm++extra-openai-models.yaml&type=code) are several examples of how a config file like this might look.

To make this all work, I stored my Deepseek API key so `llm` knows about it with

```sh
llm keys set deepseek
```

then created a file at `~/Library/Application\ Support/io.datasette.llm/extra-openai-models.yaml` containing

```yaml
# https://api-docs.deepseek.com/
- model_id: deepseek-v3 # my name for calling the model, e.g. `llm -m deepseek-v3`
  model_name: deepseek-chat # the name Deepseek using in their documentation
  api_base: 'https://api.deepseek.com/v1'
  api_key_name: deepseek # which we set earlier
```

With that in place, I can now call the model

```sh
❯ llm -m deepseek-v3 'hi 🙂 who I am speaking with?'
Hi there! 😊 You're speaking with an AI assistant here to help answer your questions or chat about whatever’s on your mind. How can I assist you today?
```

```sh
❯ llm -m deepseek-v3 'write jq extract the `user_name` field from the first 10 items of jsonl but nothing more. no talk, no code fences; just code'
jq -s '.[0:10][] | .user_name'
```

Per the [release notes](https://api-docs.deepseek.com/news/news1226) from Deepseek, the model does yet seem to support multi-modality

> This is just the beginning! Look forward to multimodal support and other cutting-edge features in the DeepSeek ecosystem.
