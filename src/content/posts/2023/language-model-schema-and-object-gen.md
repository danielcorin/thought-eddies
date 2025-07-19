---
title: Language model schema extraction and object generation
createdAt: 2023-03-04T13:01:17.000Z
updatedAt: 2023-03-04T13:01:17.000Z
publishedAt: 2023-03-04T13:01:17.000Z
tags:
  - language_models
  - gpt3
  - chatgpt
  - json_schema
  - python
  - openai
draft: false
---

If you want to try running these examples yourself, check out my writeup on using a [clean Python setup](/posts/2023/clean-python-setup).

I spent the week hacking on a language model use case for structured data generation.
It turns out the structured data we hoped to generate didn't have a well-defined schema.
For the language model to have any chance of success, it felt important to construct a schema definition as guide for the structure of the output.
However, manually extracting a schema definition for a complex object can be tedious.
We were able to use the language model for this task.

## Using a language model to extract a JSON Schema by example

By feeding in several (PII sanitized) example objects and instruct the language model to define a [JSON schema](https://json-schema.org/) for those object, we were able to get most of the way to extracting a universal schema definition for these objects using `text-davinci-003`.

Here's a simple example of how you can do this:

```python
import json
import os

import openai
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.environ.get("OPENAI_API_KEY")

def call_model(prompt):
  response = openai.Completion.create(
    model="text-davinci-003",
    prompt=prompt,
    temperature=0,
    max_tokens=2000,
  )
  return response.choices[0].text

def main():
  prompt = """
Extract a JSON schema that adheres to the structure of all of the following objects and is generic as possible.
Use `$ref`s where it makes sense.

Example object1:
{
  "id": 1,
  "name": "Smartphone",
  "description": "A high-end smartphone with cutting-edge features.",
  "price": 999.99,
  "brand": "Samsung",
  "category": "electronics",
  "tags": ["smartphone", "high-end", "Samsung"],
  "image": "https://example.com/smartphone.jpg",
  "variants": [
    {
      "id": 1,
      "name": "128GB",
      "price": 999.99,
      "image": "https://example.com/smartphone-128gb.jpg",
      "options": [
        {
          "name": "Color",
          "values": ["black", "silver"]
        },
        {
          "name": "Carrier",
          "values": ["Verizon", "AT&T", "T-Mobile"]
        }
      ]
    }
  ]
}

Example object 2:
{
  "id": 2,
  "name": "T-Shirt",
  "description": "A classic cotton t-shirt for everyday wear.",
  "price": 19.99,
  "brand": "Hanes",
  "category": "clothing",
  "tags": ["t-shirt", "cotton", "Hanes"],
  "image": "https://example.com/t-shirt.jpg",
  "variants": [
    {
      "id": 1,
      "name": "Small",
      "price": 19.99,
      "image": "https://example.com/t-shirt-small.jpg",
      "options": [
        {
          "name": "Color",
          "values": ["white", "black", "gray"]
        }
      ]
    },
    {
      "id": 2,
      "name": "Medium",
      "price": 19.99,
      "image": "https://example.com/t-shirt-medium.jpg",
      "options": [
        {
          "name": "Color",
          "values": ["white", "black", "gray"]
        }
      ]
    },
    {
      "id": 3,
      "name": "Large",
      "price": 19.99,
      "image": "https://example.com/t-shirt-large.jpg",
      "options": [
        {
          "name": "Color",
          "values": ["white", "black", "gray"]
        }
      ]
    }
  ]
}

Example object 3:
{
  "id": 3,
  "name": "The Great Gatsby",
  "description": "A classic novel by F. Scott Fitzgerald.",
  "price": 12.99,
  "brand": "Penguin Books",
  "category": "books",
  "tags": ["fiction", "classic", "F. Scott Fitzgerald"],
  "image": "https://example.com/great-gatsby.jpg",
  "variants": []
}


JSON Schema:
  """

  print(json.dumps(json.loads(call_model(prompt)), indent=2))

if __name__ == "__main__":
  main()
```

The output schema I got for my run of the language model is as follows:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer"
    },
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "price": {
      "type": "number"
    },
    "brand": {
      "type": "string"
    },
    "category": {
      "type": "string"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "image": {
      "type": "string"
    },
    "variants": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/variant"
      }
    }
  },
  "required": [
    "id",
    "name",
    "description",
    "price",
    "brand",
    "category",
    "tags",
    "image",
    "variants"
  ],
  "definitions": {
    "variant": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer"
        },
        "name": {
          "type": "string"
        },
        "price": {
          "type": "number"
        },
        "image": {
          "type": "string"
        },
        "options": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/option"
          }
        }
      },
      "required": [
        "id",
        "name",
        "price",
        "image",
        "options"
      ]
    },
    "option": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "name",
        "values"
      ]
    }
  }
}
```

You may argue this schema isn't perfect structurally or that there are better ways to define schemas for JSON objects, but I think that is besides the point for the moment.
This schema is an extremely helpful starting point and I separately validated that all the objects I passed into the prompt adhere to this schema.
In my experience, the more variety in the examples you provide in the prompt, the better the result from the language model.
The main limiting factor for improvements with this method is the [maximum number of request tokens](https://platform.openai.com/docs/models/gpt-3-5) allowable by the model.

## Structured data generation

Returning to the original claim and promise -- let's use a language model for structured data generation.
Say I wanted to create some items for this e-commerce website using the schema the language model extracted.
I could write some JSON by hand.
I could build a fancy UI form and using autocompletion to help speed up filling in all the fields.
I could build a file uploader and design an file upload schema then transform all my product descriptions to match that, then transform the uploaded file into the JSON schema.
All of the above are time-consuming and often error prone, yet I've seen production systems that have made use of all of these approaches.
I know in the end I need objects with my schema described above, so let's see if we can go straight from product descriptions to valid JSON objects.

Take [this product](https://www.apple.com/newsroom/2005/09/07Apple-Introduces-iPod-nano/) announcement from Apple for the iPod Nano.
Let's write a prompt for the language model to extract the product data:

```python
import json
import os

import openai
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.environ.get("OPENAI_API_KEY")

def call_model(prompt):
  response = openai.Completion.create(
    model="text-davinci-003",
    prompt=prompt,
    temperature=0,
    max_tokens=2000,
  )
  return response.choices[0].text

def main():
  # pulled from https://www.apple.com/newsroom/2005/09/07Apple-Introduces-iPod-nano/
  description = """
SAN FRANCISCO—September 7, 2005—Apple® today introduced the iPod® nano, a revolutionary full-featured iPod that holds 1,000 songs yet is thinner than a standard #2 pencil and less than half the size of competitive players. The iPod nano features an ultra-portable, lightweight design with a gorgeous color screen, Apple’s patent pending Click Wheel and the ability to hold 1,000 songs or 25,000 photos. iPod nano works seamlessly with the iTunes® Music Store, the world’s number one digital music service. The iPod nano is available immediately in a 4GB model priced at just $249 and a 2GB model priced at just $199, with both models available in stunning white or black designs.
“iPod nano is the biggest revolution since the original iPod,” said Steve Jobs, Apple’s CEO. “iPod nano is a full-featured iPod in an impossibly small size, and it’s going to change the rules for the entire portable music market.”
iPod nano is the perfect combination of innovative design, storage capacity and ease of use. Thinner than a standard #2 pencil and weighing only 1.5 ounces, iPod nano comes in two models—the 4GB iPod nano holds up to 1,000 songs and the 2GB iPod nano holds up to 500 songs. iPod nano features Apple’s innovative Click Wheel for precise, one-handed navigation, and its ultra-portable design fits into even the smallest pocket making it easy to take iPod nano to the gym, in the car, traveling, commuting or anywhere you go.
The most fashionable and wearable iPod ever, the iPod nano features optional accessories including lanyard headphones, which integrate the headphone cables into the lanyard, so users can wear their iPod nano around their neck without dangling headphone cables. For customers looking to personalize their iPod nano with colors, an optional set of iPod nano Tubes in pink, purple, blue, green and clear offers fashionable protection in a sheer casing while enabling full operation of all functions including the Click Wheel. Optional armbands available in gray, pink, blue, red and green allow users to wear their iPod nano as the ultimate fashion and sports accessory.
iPod nano features the same 30-pin dock connector as the iPod and iPod mini, allowing it to work effortlessly with a wide range of over 1,000 accessories developed for iPod, including home stereo speakers and iPod car adapters for an incredible music experience at home or in the car.
Featuring seamless integration with the iTunes Music Store and the iTunes digital music jukebox, iPod nano includes Apple’s patent pending Auto-Sync technology that automatically downloads a user’s digital music collection, photos or Podcasts onto iPod nano and keeps it up-to-date whenever iPod nano is plugged into a Mac® or Windows computer using USB 2.0. With its stunning, high-resolution color screen, iPod nano allows users to display album art while playing music, view photo slideshows or play games in full color. iPod nano features up to 14 hours battery life* and completely skip-free playback, as well as new stopwatch, world clock and screen lock applications.
Pricing & Availability
The 4GB and 2GB white and black models of iPod nano for Mac or Windows are available worldwide immediately for a suggested retail price of $249 (US) and $199 (US) respectively, through the Apple Store® (www.apple.com), Apple’s retail stores and Apple Authorized Resellers. All iPod nano models include earbud headphones, a USB 2.0 cable and a CD with iTunes for Mac and Windows computers.
New optional accessories designed for iPod nano with the following suggested retail prices include: Lanyard headphones for $39 (US), armbands in five colors each for $29 (US), dock for $29 (US) and a set of iPod nano Tubes in five different colors for $29 (US) and will be available within the next 30 days.
  """

  prompt = """
Output a JSON object that adheres to the following JSON schema given a specification of a product.

Schema:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer"
    },
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "price": {
      "type": "number"
    },
    "brand": {
      "type": "string"
    },
    "category": {
      "type": "string"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "image": {
      "type": "string"
    },
    "variants": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/variant"
      }
    }
  },
  "required": [
    "id",
    "name",
    "description",
    "price",
    "brand",
    "category",
    "tags",
    "image",
    "variants"
  ],
  "definitions": {
    "variant": {
      "type": "object",
      "properties": {
        "id": {
          "type": "integer"
        },
        "name": {
          "type": "string"
        },
        "price": {
          "type": "number"
        },
        "image": {
          "type": "string"
        },
        "options": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/option"
          }
        }
      },
      "required": [
        "id",
        "name",
        "price",
        "image",
        "options"
      ]
    },
    "option": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "name",
        "values"
      ]
    }
  }
}

Specification: <description>

JSON Object:
  """.replace("<description>", description)

  print(json.dumps(json.loads(call_model(prompt)), indent=2))

if __name__ == "__main__":
  main()
```

The output when run:

```json
{
  "id": 1,
  "name": "iPod nano",
  "description": "The iPod nano is a revolutionary full-featured iPod that holds 1,000 songs yet is thinner than a standard #2 pencil and less than half the size of competitive players.",
  "price": 249,
  "brand": "Apple",
  "category": "Music Player",
  "tags": [
    "ultra-portable",
    "lightweight",
    "gorgeous color screen",
    "Click Wheel"
  ],
  "image": "https://www.apple.com/v/ipod-nano/a/img/overview/ipod_nano_large.jpg",
  "variants": [
    {
      "id": 1,
      "name": "4GB",
      "price": 249,
      "image": "https://www.apple.com/v/ipod-nano/a/img/overview/ipod_nano_large.jpg",
      "options": [
        {
          "name": "Color",
          "values": [
            "White",
            "Black"
          ]
        }
      ]
    },
    {
      "id": 2,
      "name": "2GB",
      "price": 199,
      "image": "https://www.apple.com/v/ipod-nano/a/img/overview/ipod_nano_large.jpg",
      "options": [
        {
          "name": "Color",
          "values": [
            "White",
            "Black"
          ]
        }
      ]
    }
  ]
}
```

Pretty cool.
Is this perfect?
No.
The `id`s aren't really what you'd want.
Maybe you'd also want it to extract data for the last sentence about the lanyard headphones and armbands (bonus points if you even noticed that).
Those image urls are broken.
I'm not even sure where they came from.
I don't think I'd necessarily want Apple's copy "gorgeous color screen" on my third party reseller website.
What is impressive and exciting is how trivial this capability is to build with a language model.

A fun note: the data schema and example JSON objects I used were [generated by ChatGPT](https://sharegpt.com/c/ETkymML).

## What's next?

- In the middle of last week, OpenAI released a ChatGPT API (`gpt-3.5-turbo`). I spent some time trying to port a similar type of data generation use case to the new API, but in the end, wasn't able to get as good results. I'd like to write up what this experience was like and do some more investigation on the API's capabilities.
- I still haven't had the chance to try and deploy pre-trained models from [Hugging Face](https://huggingface.co/) or investigating different types of models, but that is still something I am hoping to find the time to do.
- Writing up some more summaries and commentary on content I've enjoyed reading.
