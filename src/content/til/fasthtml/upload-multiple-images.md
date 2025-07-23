---
title: Upload Multiple Images with FastHTML
createdAt: 2024-08-28T19:27:38.000Z
updatedAt: 2024-08-28T19:27:38.000Z
publishedAt: 2024-08-28T19:27:38.000Z
tags:
  - fasthtml
  - starlette
draft: false
---

I've been experimenting with [FastHTML](https://fasthtml.ml/) for making quick demo apps, often involving language models.
It's a pretty simple but powerful framework, which allows me to deploy a client and server in a single `main.py` -- something I appreciate a lot for little projects I want to ship quickly.
I currently use it how you might use [`streamlit`](https://streamlit.io/).

I ran into an issue where I was struggling to submit a form with multiple images.

I started with an app that could receive a single image upload from [this example](https://github.com/AnswerDotAI/fasthtml-example/blob/35d8fc268d6bb6b8d6d22d6af0b48c656190aa26/file_upload_form_example/main.py#L4).

These examples assume the code is in a `main.py` file and run with

```sh
uvicorn main:app --reload
```

```python
from fasthtml.common import *

app, rt = fast_app()


@rt("/")
def get():
    inp = Input(type="file", name="image", multiple=False, required=True)
    add = Form(
        Group(inp, Button("Upload")),
        hx_post="/upload",
        hx_target="#image-list",
        hx_swap="afterbegin",
        enctype="multipart/form-data",
    )
    image_list = Div(id="image-list")
    return Title("Image Upload Demo"), Main(
        H1("Image Upload"), add, image_list, cls="container"
    )


@rt("/upload")
async def upload_image(image: UploadFile):
    contents = await image.read()
    print(contents)
    filename = image.filename
    return filename
```

The contents of the images prints in the console and the filename shows up in the browser.

To support multiple files/images, I tried the following:

```python
from fasthtml.common import *
import uvicorn
import os

app, rt = fast_app()


@rt("/")
def get():
    inp = Input(type="file", name="images", multiple=True, required=True)
    add = Form(
        Group(inp, Button("Upload")),
        hx_post="/upload",
        hx_target="#image-list",
        hx_swap="afterbegin",
        enctype="multipart/form-data",
    )
    image_list = Div(id="image-list")
    return Title("Image Upload Demo"), Main(
        H1("Image Upload"), add, image_list, cls="container"
    )


@rt("/upload")
async def upload_image(images: List[UploadFile]):
    print(images)
    filenames = []
    for image in images:
        contents = await image.read()
        filename = image.filename
        filenames.append(filename)
    return filenames
```

When we pick and upload multiple files, this code breaks, but with the print statement we can see the data we uploaded.

```text
[UploadFile(filename=None, size=None, headers=Headers({})), UploadFile(filename=None, size=None, headers=Headers({}))]
```

Not quite what I expected.

After a bit of searching, I learned that a `fasthtml` function signature can be any compatible [`starlette`](https://www.starlette.io/) function signature ([source](https://github.com/AnswerDotAI/fasthtml/blob/1807dca0e2adea77b3db8ba870f796d7f2c21015/examples/adv_app.py#L70)).
With this knowledge, I tried the following approach:

```python
from fasthtml.common import *

app, rt = fast_app()


@rt("/")
def get():
    inp = Input(
        type="file", name="images", multiple=True, required=True, accept="image/*"
    )
    add = Form(
        Group(inp, Button("Upload")),
        hx_post="/upload",
        hx_target="#image-list",
        hx_swap="afterbegin",
        enctype="multipart/form-data",
    )
    image_list = Div(id="image-list")
    return Title("Image Upload Demo"), Main(
        H1("Image Upload"), add, image_list, cls="container"
    )


@rt("/upload")
async def upload_image(request: Request):
    form = await request.form()
    images = form.getlist("images")
    print(images)
    filenames = []
    for image in images:
        contents = await image.read()
        filenames.append(image.filename)
    return filenames
```

This approach successfully rendered the titles of two images when I uploaded them in a single request as expected.
