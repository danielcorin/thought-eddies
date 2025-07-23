---
title: Adding an llms.txt file to Hugo
createdAt: 2025-02-25T22:02:00.000Z
updatedAt: 2025-02-25T22:02:00.000Z
publishedAt: 2025-02-25T22:02:00.000Z
tags:
  - hugo
  - language_models
  - llms.txt
  - markdown
draft: false
---

Today, I set out to add an [llms.txt](https://llmstxt.org/) to this site.
I've made a few similar additions in the past with [raw post markdown files](/til/hugo/raw-markdown-pages) and [a search index](/search.json).
Every time I try and change something with `outputFormats` in Hugo, I forget one of the steps, so in writing this up, finally I'll have it for next time.

## Steps

First, I added a new output format in my `config.toml` file:

```toml
[outputFormats.TXT]
mediaType = "text/plain"
baseName = "llms"
isPlainText = true
```

Then, I added this format to my home outputs:

```toml
[outputs]
home = ["HTML", "RSS", "JSON", "SearchIndex", "TXT"]
```

Finally, I created a template file at `layouts/_default/index.txt` that renders my site content in a structured markdown per the spec recommendations.

```
# {{ .Site.Title }}

> {{ .Site.Params.description }}

## Content
{{ range $type := .Site.Params.front_page_content }}
### {{ title $type }}

{{ range (where $.Site.RegularPages "Type" $type) }}- [{{ .Title }}]({{ .Permalink }}index.md): Published {{ .Date.Format "2006-01-02" }}
{{ end }}{{ end }}
```

Now, when I build my site, it generates an `llms.txt` file at the root that contains a Markdown list of the content on this site.
This makes it easy for language models to understand my site without dealing with HTML markup.
