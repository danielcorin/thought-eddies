---
title: Summarizing webpages with language models
createdAt: 2024-05-11T14:51:15.000Z
updatedAt: 2024-05-11T14:51:15.000Z
publishedAt: 2024-05-11T14:51:15.000Z
tags:
  - html2text
draft: false
---

Similar to (and perhaps more simply than) analyzing Youtube video transcripts
with language models, I wanted to apply a similar approach to webpages like
articles, primarily for the purposes of determining the subject content of
lengthy pieces and experimenting to see if this is useful at all.

The [`html2text`](https://github.com/aaronsw/html2text) script is good at
extracting content from html.
When combined with a few other CLIs, we can prompt
the language model to create a summary for the cleaned HTML page.

This was my first attempt:

```sh
curl -s "<url>" | html2text | llm "summarize this article"
```

which gave me the following error

```text
Traceback (most recent call last):
  File "/opt/homebrew/bin/llm", line 8, in <module>
    sys.exit(cli())
             ^^^^^
  File "/opt/homebrew/Cellar/llm/0.13.1_2/libexec/lib/python3.12/
  site-packages/click/core.py", line 1157, in __call__
    return self.main(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/homebrew/Cellar/llm/0.13.1_2/libexec/lib/python3.12/
  site-packages/click/core.py", line 1078, in main
    rv = self.invoke(ctx)
         ^^^^^^^^^^^^^^^^
  File "/opt/homebrew/Cellar/llm/0.13.1_2/libexec/lib/python3.12/
  site-packages/click/core.py", line 1688, in invoke
    return _process_result(sub_ctx.command.invoke(sub_ctx))
                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/homebrew/Cellar/llm/0.13.1_2/libexec/lib/python3.12/
  site-packages/click/core.py", line 1434, in invoke
    return ctx.invoke(self.callback, **ctx.params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/homebrew/Cellar/llm/0.13.1_2/libexec/lib/python3.12/
  site-packages/click/core.py", line 783, in invoke
    return __callback(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/homebrew/Cellar/llm/0.13.1_2/libexec/lib/python3.12/
  site-packages/llm/cli.py", line 268, in prompt
    prompt = read_prompt()
             ^^^^^^^^^^^^^
  File "/opt/homebrew/Cellar/llm/0.13.1_2/libexec/lib/python3.12/
  site-packages/llm/cli.py", line 156, in read_prompt
    stdin_prompt = sys.stdin.read()
                   ^^^^^^^^^^^^^^^^
  File "<frozen codecs>", line 322, in decode
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xba in position 640:
invalid start byte
```

I solved that with this modification

```sh
curl -s "<url>" | html2text | iconv -f ISO-8859-1 -t UTF-8 | llm
"summarize this article"
```
