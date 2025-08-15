---
draft: false
title: 'System Prompts'
---

{{< chat model="claude-3.5-sonnet" >}}
[
{
"role": "system",
"content": [
{
"type": "text",
"text": "Prose only. No lists. Format the output as follows\n\n- a tl;dr summary of the body (Titled \"Summary\")\n- a thoughtful and measured response (\"Response\")"
}
]
},
{
"role": "user",
"content": [
{
"type": "text",
"text": "your question!"
}
]
},
{
"role": "assistant",
"content": [
{
"type": "text",
"text": "the response!"
}
]
}
]
{{< /chat >}}

with a prefill of "Here's is your response:" for Anthropic models
