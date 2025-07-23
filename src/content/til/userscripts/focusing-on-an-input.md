---
title: Improving User Experience with Auto-Focus in 2FA Input
createdAt: 2023-09-06T00:05:00.000Z
updatedAt: 2023-09-06T00:05:00.000Z
publishedAt: 2023-09-06T00:05:00.000Z
tags:
  - javascript
  - userscripts
draft: false
---

There is a website I log into often that I protect with 2FA.
One thing that bothers me about this process is that the 2FA screen does not immediately focus to the input, so I can immediately start entering my 2FA code.
Today, I tackled that problem.

The most recent experience I've had writing userscripts was with a closed source browser extension.
A few minutes of search and I discovered [Violentmonkey](https://github.com/violentmonkey/violentmonkey), an open source option with no tracking software.

My goal was to focus on a an input field (that fortunately had an `id`) on page load.
I created a new userscript with the following content:

```js
// ==UserScript==
// @name        Focus 2FA input - coolwebsite.com
// @namespace   Violentmonkey Scripts
// @match       https://coolwebsite.com/login/
// @grant       none
// @version     1.0
// @author      -
// @description 9/5/2023, 7:51:16 PM
// ==/UserScript==
```

Next, I wrote some simple Javascript that I tested successfully in the console.

```js
document.getElementById("the-code").focus();
```

Unfortunately, this didn't work.
After logging `document.getElementById("the-code")`, I determined the page hadn't loaded yet to run this code.
I tried a few different variants of waiting for the page to load, but eventually got it working with this beauty

```js
(function() {
    'use strict';

    function focusOnLoad() {
        var inputElement = document.getElementById("the-code");
        if (inputElement) {
            inputElement.focus();
        }
    }

    window.addEventListener('load', function() {
        // Delay to ensure the page is fully loaded
        setTimeout(focusOnLoad, 2000);
    });
})();
```

It's been a while since I've written JavaScript that needs to be supported by the browser natively without a transpiler, so this doesn't look so fun, but it gets the job done.
I had to play with increasing the `setTimeout` delay, since the target site was doing some kind of bizarre redirect (or maybe was just loading that slowly).
