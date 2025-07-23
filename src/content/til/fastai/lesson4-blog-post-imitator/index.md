---
title: 'Practical Deep Learning, Lesson 4, Language Model Blog Post Imitator'
createdAt: 2024-11-04T17:57:00.000Z
updatedAt: 2024-11-04T17:57:00.000Z
publishedAt: 2024-11-04T17:57:00.000Z
tags:
  - language_models
  - course.fast.ai
draft: false
githubUrl: 'https://github.com/danielcorin/fastbook_projects/tree/main/blog_post_imitator'
series: Fast.ai Course
toc: true
---

In this notebook/post, we're going to be using the markdown content from my [blog](https://github.com/danielcorin/blog) to try a language model.
From this, we'll attempt to prompt the model to generate a post for a topic I might write about.

Let's import `fastai` and disable warnings since these pollute the notebook a lot when I'm trying to convert these notebooks into posts (I am writing this as a notebook and converting it to a markdown file with [this script](https://github.com/danielcorin/blog/blob/8181116943a7e4a8583edcf9d64c2b08b41cbf34/scripts/convert_notebook.py)).

```python
from fastai.text.all import *
from pathlib import Path
```

```python
import warnings
warnings.filterwarnings('ignore')
```

## Loading the data

The written content in my blog is markdown (.md) files.
You can see the raw contents of any of these posts by appending `/index.md` to the end of the URL on any post on this site.
They look something like

```md
---
<frontmatter key values>
---

<the rest of the post with code, links, images, shortcodes, etc.>
```

To get started, I modeled my approach after the one used in [chapter 10](https://github.com/fastai/fastbook/blob/master/10_nlp.ipynb), which looks something like

```python
get_imdb = partial(get_text_files, folders=['train', 'test', 'unsup'])

dls_lm = DataBlock(
    blocks=TextBlock.from_folder(path, is_lm=True),
    get_items=get_imdb, splitter=RandomSplitter(0.1)
).dataloaders(path, path=path, bs=128, seq_len=80)
```

There were a few modifications I needed to make with the approach.
For starters, we were loading `.md` files rather than text files, so initially I tried to do this with

```python
path = Path("./data/content")
files = get_files(path, extensions='.md', recurse=True)
for f in files[:3]:
    print(f)
```

    data/content/posts/2013/2013-07-05-qc.md
    data/content/posts/2024/models-writing-about-coding-with-models.md
    data/content/posts/2024/vlms-hallucinate.md

However, these seemed to cause opaque and confusing issues with `DataBlock` or `DataLoaders` that manifested something like this

```
---------------------------------------------------------------------------
TypeError                                 Traceback (most recent call last)
Cell In[209], line 10
      3 # First, create a tokenizer
      4 text_processor = TextBlock.from_folder(path, is_lm=True)
      6 dls_lm = DataBlock(
      7     blocks=text_processor,
      8     get_items=get,
      9     splitter=RandomSplitter(0.1)
---> 10 ).dataloaders(
     11     path,
     12     path=path,
     13     bs=128,
     14     seq_len=80,
     15 )

File ~/dev/lab/fastbook_projects/blog_post_generator/.venv/lib/python3.12/site-packages/fastai/data/block.py:157, in DataBlock.dataloaders(self, source, path, verbose, **kwargs)
    151 def dataloaders(self,
    152     source, # The data source
    153     path:str='.', # Data source and default `Learner` path
    154     verbose:bool=False, # Show verbose messages
    155     **kwargs
    156 ) -> DataLoaders:
--> 157     dsets = self.datasets(source, verbose=verbose)
    158     kwargs = {**self.dls_kwargs, **kwargs, 'verbose': verbose}
...
    387     self.types.append(type(x))
--> 388 types = L(t if is_listy(t) else [t] for t in self.types).concat().unique()
    389 self.pretty_types = '\n'.join([f'  - {t}' for t in types])

TypeError: 'NoneType' object is not iterable
```

To workaround this challenge, I changed all the file extensions to `.txt`.
This allowed the model to load and tokenize the dataset.

Next, I had an issue with encoding

```
    return f.read()
           ^^^^^^^^
  File "<frozen codecs>", line 322, in decode
UnicodeDecodeError: 'utf-8' codec can't decode byte 0x89 in position 0: invalid start byte
```

I solved this in the `copy_and_rename_files` function with

```python
src_file.read_text(encoding=encoding)
```

There is also a function called `clean_content` which I will address later.

````python
import re


def clean_content(text):
    # Handle code blocks with language specifiers
    text = re.sub(r'```(\w+)?\n(.*?)```', lambda m: f'<CODE>{m.group(2)}</CODE>', text, flags=re.DOTALL)

    # Replace single backticks
    text = re.sub(r'`([^`]+)`', r'<INLINE_CODE>\1</INLINE_CODE>', text)

    return text

def copy_and_rename_files():
    src_dir = Path("./data/content")
    dst_dir = Path("./data/cleaned_content")

    if not dst_dir.exists():
        dst_dir.mkdir(parents=True)

    for src_file in src_dir.rglob("*.md"):
        try:
            content = None
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    content = src_file.read_text(encoding=encoding)
                    if content.startswith('---'):
                        # Remove markdown frontmatter
                        parts = content.split('---', 2)
                        if len(parts) >= 3:
                            content = parts[2]
                    break
                except UnicodeDecodeError:
                    continue

            if content is None:
                print(f"Skipping {src_file}: Unable to decode with supported encodings")
                continue

            content = clean_content(content)

            rel_path = src_file.relative_to(src_dir)
            dst_file = dst_dir / rel_path.with_suffix('.txt')
            dst_file.parent.mkdir(parents=True, exist_ok=True)
            dst_file.write_text(content, encoding='utf-8')

        except Exception as e:
            print(f"Error processing {src_file}: {str(e)}")

copy_and_rename_files()
````

## Training the model

With the needed adjustments to the dataset made, and the model-ready content now in the `data/cleaned_content` folder, we can load and tokenize that data with `fastai`.

We validate that we can read the files paths with our code

```python
path = Path("./data/cleaned_content")
files = get_text_files(path)
for f in files[:3]:
    print(f)
```

    data/cleaned_content/posts/2013/2013-07-05-qc.txt
    data/cleaned_content/posts/2024/language-model-based-aggregators.txt
    data/cleaned_content/posts/2024/making-your-vision-real.txt

Then we create a `DataBlock` and view the loaded, tokenized content

```python
get = partial(get_text_files, folders=['posts', 'til', 'logs', 'projects'])

text_processor = TextBlock.from_folder(path, is_lm=True)

dls_lm = DataBlock(
    blocks=text_processor,
    get_items=get,
    splitter=RandomSplitter(0.1)
).dataloaders(
    path,
    path=path,
    bs=128,
    seq_len=512,
)
```

<style>
    /* Turns off some styling */
    progress {
        /* gets rid of default border in Firefox and Opera. */
        border: none;
        /* Needs to be in here for Safari polyfill so background images work as expected. */
        background-size: auto;
    }
    progress:not([value]), progress:not([value])::-webkit-progress-bar {
        background: repeating-linear-gradient(45deg, #7e7e7e, #7e7e7e 10px, #5c5c5c 10px, #5c5c5c 20px);
    }
    .progress-bar-interrupted, .progress-bar-interrupted::-webkit-progress-bar {
        background: #F44336;
    }
</style>

```python
dls_lm.show_batch(max_n=2)
```

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>text</th>
      <th>text_</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>xxbos xxmaj i 've been wanting to create a chat component for this site for a while , because i really do n't like quoting conversations and manually formatting them each time . \n xxmaj when using a model playground , usually there is a code snippet option that generates xxmaj python code you can copy out intro a script . \n xxmaj using that feature , i can now copy the message list and paste it as xxup json into a xxmaj hugo shortcode and get results like this : \n\n\n { { &lt; chat model="gpt-4o - mini " &gt; } } \n [ \n▁ { \n▁ " role " : " system " , \n▁ " content " : [ \n▁ { \n▁ " type " : " text " , \n▁ " text " : " you should respond with the understanding they are an experienced software</td>
      <td>xxmaj i 've been wanting to create a chat component for this site for a while , because i really do n't like quoting conversations and manually formatting them each time . \n xxmaj when using a model playground , usually there is a code snippet option that generates xxmaj python code you can copy out intro a script . \n xxmaj using that feature , i can now copy the message list and paste it as xxup json into a xxmaj hugo shortcode and get results like this : \n\n\n { { &lt; chat model="gpt-4o - mini " &gt; } } \n [ \n▁ { \n▁ " role " : " system " , \n▁ " content " : [ \n▁ { \n▁ " type " : " text " , \n▁ " text " : " you should respond with the understanding they are an experienced software engineer</td>
    </tr>
    <tr>
      <th>1</th>
      <td>xxunk / aka \n [ sublime xxup cli ] : https : / / xxrep 3 w xxunk / docs / 2 / xxunk xxbos i built a [ site](https : / / xxunk / ) to host a language model generated kid ’s book i built using chatgpt and xxmaj midjourney . xxmaj the plot was sourced from my book xxunk to see how a language model would perform writing a xxunk with an unusual plot . \n xxmaj it prompted some interesting conversations about the role of xxunk and art in culture on the [ xxunk xxunk : / / news.ycombinator.com / xxunk ) . \n\n xxmaj tech : xxmaj react , xxmaj next.js , openai , xxmaj midjourney , xxmaj vercel \n\n [ source code](https : / / github.com / danielcorin / adventure - of - xxunk / ) xxbos i wrote a tiny site to use</td>
      <td>/ aka \n [ sublime xxup cli ] : https : / / xxrep 3 w xxunk / docs / 2 / xxunk xxbos i built a [ site](https : / / xxunk / ) to host a language model generated kid ’s book i built using chatgpt and xxmaj midjourney . xxmaj the plot was sourced from my book xxunk to see how a language model would perform writing a xxunk with an unusual plot . \n xxmaj it prompted some interesting conversations about the role of xxunk and art in culture on the [ xxunk xxunk : / / news.ycombinator.com / xxunk ) . \n\n xxmaj tech : xxmaj react , xxmaj next.js , openai , xxmaj midjourney , xxmaj vercel \n\n [ source code](https : / / github.com / danielcorin / adventure - of - xxunk / ) xxbos i wrote a tiny site to use to</td>
    </tr>
  </tbody>
</table>

That looks good, so we create a learner then run the same approach as is done in Chapter 10, checkpointing as we go.
We don't _have_ to do it this way -- we could just call `fit_one_cycle` the number of times we want -- but it was helpful for me to validate the process end-to-end once more.

```python
learn = language_model_learner(
    dls_lm, AWD_LSTM, drop_mult=0.3,
    metrics=[accuracy, Perplexity()]
).to_fp16()
```

```python
learn.fit_one_cycle(1, 2e-2)
```

<style>
    /* Turns off some styling */
    progress {
        /* gets rid of default border in Firefox and Opera. */
        border: none;
        /* Needs to be in here for Safari polyfill so background images work as expected. */
        background-size: auto;
    }
    progress:not([value]), progress:not([value])::-webkit-progress-bar {
        background: repeating-linear-gradient(45deg, #7e7e7e, #7e7e7e 10px, #5c5c5c 10px, #5c5c5c 20px);
    }
    .progress-bar-interrupted, .progress-bar-interrupted::-webkit-progress-bar {
        background: #F44336;
    }
</style>

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: left;">
      <th>epoch</th>
      <th>train_loss</th>
      <th>valid_loss</th>
      <th>accuracy</th>
      <th>perplexity</th>
      <th>time</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>4.923746</td>
      <td>4.835233</td>
      <td>0.222222</td>
      <td>125.867935</td>
      <td>00:12</td>
    </tr>
  </tbody>
</table>

```python
learn.save('1epoch')
```

    Path('data/cleaned_content/models/1epoch.pth')

```python
learn = learn.load('1epoch')
```

Now, we do the bulk of the fine-tuning.

```python
learn.unfreeze()
learn.fit_one_cycle(10, 2e-3)
```

<style>
    /* Turns off some styling */
    progress {
        /* gets rid of default border in Firefox and Opera. */
        border: none;
        /* Needs to be in here for Safari polyfill so background images work as expected. */
        background-size: auto;
    }
    progress:not([value]), progress:not([value])::-webkit-progress-bar {
        background: repeating-linear-gradient(45deg, #7e7e7e, #7e7e7e 10px, #5c5c5c 10px, #5c5c5c 20px);
    }
    .progress-bar-interrupted, .progress-bar-interrupted::-webkit-progress-bar {
        background: #F44336;
    }
</style>

<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: left;">
      <th>epoch</th>
      <th>train_loss</th>
      <th>valid_loss</th>
      <th>accuracy</th>
      <th>perplexity</th>
      <th>time</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>3.721324</td>
      <td>4.359152</td>
      <td>0.278559</td>
      <td>78.190788</td>
      <td>00:12</td>
    </tr>
    <tr>
      <td>1</td>
      <td>3.582399</td>
      <td>3.972712</td>
      <td>0.338368</td>
      <td>53.128395</td>
      <td>00:13</td>
    </tr>
    <tr>
      <td>2</td>
      <td>3.452389</td>
      <td>3.608671</td>
      <td>0.379557</td>
      <td>36.916973</td>
      <td>00:13</td>
    </tr>
    <tr>
      <td>3</td>
      <td>3.307291</td>
      <td>3.372669</td>
      <td>0.413889</td>
      <td>29.156248</td>
      <td>00:13</td>
    </tr>
    <tr>
      <td>4</td>
      <td>3.221604</td>
      <td>3.291163</td>
      <td>0.422917</td>
      <td>26.874105</td>
      <td>00:13</td>
    </tr>
    <tr>
      <td>5</td>
      <td>3.131132</td>
      <td>3.213343</td>
      <td>0.436892</td>
      <td>24.862070</td>
      <td>00:13</td>
    </tr>
    <tr>
      <td>6</td>
      <td>3.047300</td>
      <td>3.147552</td>
      <td>0.447179</td>
      <td>23.278996</td>
      <td>00:13</td>
    </tr>
    <tr>
      <td>7</td>
      <td>2.978492</td>
      <td>3.120242</td>
      <td>0.455946</td>
      <td>22.651857</td>
      <td>00:14</td>
    </tr>
    <tr>
      <td>8</td>
      <td>2.921093</td>
      <td>3.109544</td>
      <td>0.458030</td>
      <td>22.410818</td>
      <td>00:14</td>
    </tr>
    <tr>
      <td>9</td>
      <td>2.876113</td>
      <td>3.107162</td>
      <td>0.458464</td>
      <td>22.357492</td>
      <td>00:12</td>
    </tr>
  </tbody>
</table>

```python
learn.save_encoder('finetuned')
```

## Experimenting with the Result

With the fine-tuned model, we can run inference!
We define the beginning of the content we want the model to output in `TEXT`, then we call `learn.predict` for the number of tokens we want the model to output and set temperature to determine the randomness/creativity of the output.

```python
TEXT = "I am interacting with a language model as a thought partner to"
N_WORDS = 256
TEMP = 0.75
pred = learn.predict(TEXT, N_WORDS, temperature=TEMP)
```

<style>
    /* Turns off some styling */
    progress {
        /* gets rid of default border in Firefox and Opera. */
        border: none;
        /* Needs to be in here for Safari polyfill so background images work as expected. */
        background-size: auto;
    }
    progress:not([value]), progress:not([value])::-webkit-progress-bar {
        background: repeating-linear-gradient(45deg, #7e7e7e, #7e7e7e 10px, #5c5c5c 10px, #5c5c5c 20px);
    }
    .progress-bar-interrupted, .progress-bar-interrupted::-webkit-progress-bar {
        background: #F44336;
    }
</style>

```python
print(pred)
```

    i am interacting with a language model as a thought partner to train .
     I think it should be more difficult to use Sonnet but it is often difficult to get to because i am a very familiar language model .

     In this way , i wanted to use the phrase Sonnet > rather than just see the phrase as a word .
     He 's also using the word " prompt " , which is a word word that is used in art , then as a title to describe a language model that extract structured data from an individual 's experience .
     I 've used this idea to describe how a language model has a structure with a single structure and i can try and solve this with the following following Sonnet code : i n't have such a thead for a language model .
     Being like this is an easy way to design an [ initial Sonnet ] .
     In another example , where you would have written a single word to explicitly describe a language model , i had to use the following word usage : < inline_code >
     < / INLINE_CODE > : The word i used to read the script in a language model and then describe the word as an JSON object .

     This working was quite different from my JSON code and Python CODE >

     the most recent model to use this PYTHON code

The output is a little wild but it _kinda sorta_ makes sense and isn't too bad for a model I trained in a couple minutes on my MacBook.

I tweaked several parts of the approach in effort to improve the model's output quality.
Jumping back to the `clean_content` function, I found that removing the markdown frontmatter and replacing triple backticks with single tokens seemed to make the output make a bit more sense.
When this fine-tuned model tries to generate code, it makes little sense and does strange things like emit tokens with triple words like `importimportimport`.
I have a feeling this deficiency may be because the base model wasn't trained on much source code.

So there we have it.
A simple language model fine-tuned on my blog posts.
This was a helpful experience for getting a feel for some feature engineering.

If you liked this post, be sure to check out some of my other notebooks I've built while working through the FastAI Course linked below.
