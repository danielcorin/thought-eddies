---
title: Amazon Bedrock On Demand Throughput Error
createdAt: 2025-06-30T21:11:22.000Z
updatedAt: 2025-06-30T21:11:22.000Z
publishedAt: 2025-06-30T21:11:22.000Z
tags:
  - amazon_bedrock
  - claude
draft: false
---

I was working with Amazon Bedrock to run LLM inference.
AWS has its fair share of complexity -- VPCs, subnets, security groups, etc.

On the surface, running inference on Amazon Bedrock is straightforward.
A simple script might look like this (assuming you have proper environment variables set):

```python
bedrock = boto3.client('bedrock-runtime', region_name='us-east-2')

messages = [{"role": "user", "content": [{"text": "What is 2+2?"}]}]

res = bedrock.converse(modelId="anthropic.claude-3-5-sonnet-20241022-v2:0", messages=messages)
print(res['output']['message']['content'][0]['text'])
```
We can find this model name in the `us-east-2` [model catalog](https://us-east-2.console.aws.amazon.com/bedrock/home?region=us-east-2#/model-catalog/serverless/anthropic.claude-3-5-sonnet-20241022-v2:0) (requires sign in).

[Anthropic's documentation](https://docs.anthropic.com/en/api/claude-on-amazon-bedrock) also mentions these model names.

I was working with SageMaker and dealing with a restrictive VPC setup, but when I tried to run the inference above, I got the following error:

```
An error occurred (ValidationException) when calling the Converse operation: Invocation of model ID anthropic.claude-3-5-sonnet-20241022-v2:0 with on-demand throughput isn't supported
```
This was confusing specifically because I wasn't sure if I was having AWS permissions and access issues or inference issues.

It turned out, prefixing the model id with `us.`, i.e.gs `us.anthropic.claude-3-5-sonnet-20241022-v2:0` was all I needed to get things working for my setup.

```python
bedrock = boto3.client('bedrock-runtime', region_name='us-east-2')

messages = [{"role": "user", "content": [{"text": "What is 2+2?"}]}]

res = bedrock.converse(modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0", messages=messages)
print(res['output']['message']['content'][0]['text'])
```

Hopefully, this is helpful if you're calling Bedrock through a VPC endpoint.
