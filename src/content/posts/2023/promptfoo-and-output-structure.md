---
title: Promptfoo and standardizing output structure across models
createdAt: 2023-07-27T23:20:00.000Z
updatedAt: 2023-07-27T23:20:00.000Z
publishedAt: 2023-07-27T23:20:00.000Z
tags:
  - language_models
  - promptfoo
draft: false
---

`promptfoo` is a Javascript library and CLI for testing and evaluating LLM output quality.
It's straightforward to [install](https://www.promptfoo.dev/docs/installation) and get up and running quickly.
As a first experiment, I've used it to compare the output of three similar prompts that specify their output structure using different modes of schema definition.
To get started

```sh
mkdir prompt_comparison
cd prompt_comparison
promptfoo init
```

The scaffold creates a `prompts.txt` file, and this is where I wrote a parameterized prompt to classify and extract data from a support message.

```text
Given the following input and schema, output JSON only in adherence with the schema.

Input:
{{input}}

Schema:
{{schema}}

JSON Output:
```

The more interesting part is the `promptfooconfig.yaml` file which specifies the different inputs and schemas:

```yaml
prompts: [prompts.txt]
providers:
  - openai:gpt-3.5-turbo-16k
  - openai:gpt-4
tests:
  - description: Pydantic
    vars:
      input: "Hi there, I recently made a purchase on your website, but I received the wrong item. I'm very disappointed and would like to return it for a refund. Can you please assist me with this issue?"
      schema: |
        class MessageTypeEnum(str, Enum):
            inquiry = "inquiry"
            complaint = "complaint"
            feedback = "feedback"
            suggestion = "suggestion"
            other = "other"


        class SupportMessage(BaseModel):
            order_id: Optional[str] = Field("extracted order id if provided", default=None)
            message_type: MessageTypeEnum

    assert:
      - type: is-json
  - description: JSON schema
    vars:
      input: "Hi there, I recently made a purchase on your website, but I received the wrong item. I'm very disappointed and would like to return it for a refund. Can you please assist me with this issue?"
      schema: |
        {
          "type": "object",
          "properties": {
            "order_id": {
              "type": "string",
              "nullable": true
            },
            "message_type": {
              "type": "string",
              "enum": ["inquiry", "complaint", "feedback", "suggestion", "other"]
            }
          }
        }
    assert:
      - type: is-json
  - description: Protobuf
    vars:
      input: "Hi there, I recently made a purchase on your website, but I received the wrong item. I'm very disappointed and would like to return it for a refund. Can you please assist me with this issue?"
      schema: |
        enum MessageTypeEnum {
          INQUIRY = 0;
          COMPLAINT = 1;
          FEEDBACK = 2;
          SUGGESTION = 3;
          OTHER = 4;
        }

        message SupportMessage {
          string order_id = 1;
          MessageTypeEnum message_type = 2;
        }
    assert:
      - type: is-json
```

Since we're keeping `input` constant, the output is a matrix of result that vary by `schema` and `provider`.

<table>
  <tr>
    <th>Provider</th>
    <th>Schema</th>
    <th>Output</th>
  </tr>
  <tr>
    <td>gpt-3.5-turbo-16k</td>
    <td>Pydantic</td>
    <td>{
"message_type": "complaint"
}
    </td>
  </tr>
  <tr>
  <tr>
    <td>gpt-3.5-turbo-16k</td>
    <td>JSON</td>
    <td>{
"message_type": "complaint"
}
    </td>
  </tr>
  <tr>
    <td>gpt-3.5-turbo-16k</td>
    <td>Protobuf</td>
    <td>{
"order_id": "",
"message_type": "COMPLAINT"
}
    </td>
  </tr>
  <tr>
    <td>gpt-4</td>
    <td>Pydantic</td>
    <td>{
"order_id": null,
"message_type": "complaint"
}
    </td>
  </tr>
  <tr>
  <tr>
    <td>gpt-4</td>
    <td>JSON</td>
    <td>{
"order_id": null,
"message_type": "complaint"
}
    </td>
  </tr>
  <tr>
    <td>gpt-4</td>
    <td>Protobuf</td>
    <td>{
"order_id": "",
"message_type": 1
}
    </td>
  </tr>
</table>

This is a lot of variety!
However, the results could be helpful as we think about the output we actually want and the model we plan to use.
We see `order_id` is sometimes omitted, sometimes the empty string `""` and sometimes `null`.
We also see `message_type` shows up as the upper and lowercase version of "complaint" as well as the corresponding protobuf enum integer value `1`.

It would be nice if there was more consistency.

It would be useful (if possible) to write prompts that yield object schema with consistent structure across models.
We could try and prompt engineer in this direction or try and create a dataset and fine tune.

Some minor changes to the prompt yield consistency across all schemas and models for the input.

```text
Given the following input and schema, correctly output JSON only in adherence with the schema.
Enums should be outputted as lowercase strings.
Omitted or missing values should be included with value `null`.

Input:
{{input}}

Schema:
{{schema}}

JSON Output:
```

With the new prompt, all outputs become

```json
{
  "order_id": null,
  "message_type": "complaint"
}
```
