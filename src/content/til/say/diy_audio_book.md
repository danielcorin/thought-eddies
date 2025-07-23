---
title: Using open-interpreter to create a DIY audiobook with say
createdAt: 2023-09-16T17:03:25.000Z
updatedAt: 2023-09-16T17:03:25.000Z
publishedAt: 2023-09-16T17:03:25.000Z
tags:
  - open_interpreter
  - python
  - audio_books
  - partly_ai_authored
  - say
draft: false
---

I used open-interpreter to read an epub file and create a DIY audio book.

Open-interpreter suggested that I use the `bs4` and `ebooklib` libraries.
It recommended an API to create audio files from text, but I was easily able to switch this out for the free and local alternative, `say` on macOS.
As I worked (let the model write code), it was easier to copy the code to a separate file and make modifications.
However, the initial prototype built by open-interpreter accomplish the majority of the work.
I was able to go from an epub file to 48 audio tracks on my phone in 15 minutes or so.
Open-interpreter was a joy to collaborate with.
My main wish for it at this point is for it to write the code it generates to a notebook that I can collaborate it in.
This would allow me to help open-interpreter resolve issues it gets stuck on, and maintain a copy of the source that I can revisit in future sessions, or eventually turn the code into a more fully formed program.

Here is the code, largely copied out from open-interpreter with a few changes by me.
I wrote the parallelization of the audio file generation with Cursor's OpenAI-based code generation and manually wrote `text_to_speech` using `say`.

```python
import concurrent.futures
import ebooklib
import os

from bs4 import BeautifulSoup
from ebooklib import epub

def read_epub(file):
    book = epub.read_epub(file)
    content = []
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            content.append(item.get_content())
    return content

epub_content = read_epub('my_book.epub')
print('Number of items in the EPUB file:', len(epub_content))


def extract_text(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    return soup.get_text()

sample_text = extract_text(epub_content[0])
print('Sample text:', sample_text[:500])

def split_text(text, length=15000):
    return [text[i:i+length] for i in range(0, len(text), length)]

# Extract all text and split it into chunks
all_text = ''.join([extract_text(content) for content in epub_content])
text_chunks = split_text(all_text)

print('Number of text chunks:', len(text_chunks))

def text_to_speech(text, file):
    os.system(f'say -v Tessa -r 240 -o {file} "{text}"')

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    futures = []
    for i, chunk in enumerate(text_chunks):
        if not os.path.exists(f'audio_chunks/chunk_{i}.aiff'):
            future = executor.submit(text_to_speech, chunk, f'audio_chunks/chunk_{i}.aiff')
            futures.append(future)
        else:
            success = True

    for future in concurrent.futures.as_completed(futures):
        success = future.result()
        if not success:
            print(f'Failed to convert chunk {i} to speech after multiple retries.')
            break

print('All text chunks have been converted to speech.')
```
