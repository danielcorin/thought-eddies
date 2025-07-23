---
title: FastHTML Loading Spinner
createdAt: 2024-09-08T12:18:23.000Z
updatedAt: 2024-09-08T12:18:23.000Z
publishedAt: 2024-09-08T12:18:23.000Z
tags:
  - fasthtml
draft: false
githubUrl: 'https://github.com/danielcorin/toys/tree/main/fasthtml-loading-spinner'
---

I've enjoyed using [`fasthtml`](https://fastht.ml/) to deploy small, easily hosted webpages for little apps I've been building.
I'm still getting used to it but it almost no effort at all to deploy.
Recently, I built an app that would benefit from having a loading spinner upon submitting a form, but I couldn't quite figure out how I would do that with [`htmx`](https://htmx.org/) in FastHTML, so I built a small project to experiment with various approaches.
This is what I came up with:


```python
import time
from fasthtml.common import *

app, rt = fast_app(
    hdrs=(
        Style("""
            body {
                padding-top: 2rem;
                width: 70%;
                margin: 0 auto;
            }
            input {
                width: 100%;
                padding: 10px;
                margin-top: 10px;
            }
            button {
                width: 100%;
                padding: 10px;
                margin-top: 10px;
                border: none;
                cursor: pointer;
            }
            .indicator {
                display: none;
            }
            .htmx-request .indicator {
                display: inline-block;
            }
            .button-content {
                display: inline-block;
            }
            .htmx-request .button-content {
                display: none;
            }
        """),
    )
)

STORED_CONTENT = ""


@app.get("/")
def home():
    return Titled(
        "Input Demo",
        Div(
            P(f"Stored content: {STORED_CONTENT}", id="content"),
            Form(
                Input(
                    type="text",
                    name="user_input",
                    placeholder="Enter some text",
                    id="user_input",
                    _required=True,
                    minlength=3,
                ),
                Button(
                    Span("Submit", _class="button-content"),
                    Span(
                        "Loading...",
                        aria_busy="true",
                        _class="indicator",
                    ),
                    type="submit",
                    id="submit_button",
                ),
                hx_post="/submit",
                hx_target="#content",
                hx_disabled_elt="#user_input, #submit_button",
            ),
        ),
    )


@app.post("/submit")
async def submit(request):
    global STORED_CONTENT
    form_data = await request.form()
    STORED_CONTENT = form_data.get("user_input", "")
    time.sleep(1)
    return f"Stored content: {STORED_CONTENT}"
```

The app creates a page with a form with a single text input.
Submitting the form sends the contents of the input field to the backend where it is stored in memory (disappears on server restart).
I added a few niceties like client-side input validation and input/button disabling, but the main thing is the button loading animation.
Here's how that works:

When the form is submitted, `htmx-request` gets added to `<form>`.
Using this CSS flips the visibility of the button copy and the bars loading animation

```css
.indicator {
    display: none;
}
.htmx-request .indicator {
    display: inline-block;
}
.button-content {
    display: inline-block;
}
.htmx-request .button-content {
    display: none;
}
```

By adding `hx-disabled-elt="#user_input, #submit_button"`, `disabled=""` gets added to both the `<input>` and the `<button>`, preventing the content from being modified mid-submit or accidental double submission.
Finally, `hx-target="#content"` replaces the contents of the `<p>` with the result returned by the server.

A more [generic selector approach](https://htmx.org/attributes/hx-disabled-elt/) is documented but it appears to only work for a single selector according to [this issue](https://github.com/bigskysoftware/htmx/issues/2660).

I also came across the [`hx-indicator`](https://htmx.org/attributes/hx-indicator/) attribute while trying to figure out a working approach.
While initially promising, it seemed redundant because the class `htmx-request` is already added to the form when it's submitted and the indicator `<img>` is nested within the form.
I also found [this approach](https://thevalleyofcode.com/htmx/8-loading-indicator) also using the `htmx-indicator` class.
Both of these approaches work, but work by toggling the visibility of an indicator loading element only.
I wanted to swap the standard copy with an indicator while the request was in flight.

This approach isn't what I would call easy, but it does get the job done.
If you have more experience with `htmx` and know of a simpler way to accomplish the above, I'd love to hear from you.
