---
title: Taking Browser Screenshots with Deno
createdAt: 2025-01-19T17:15:05.000Z
updatedAt: 2025-01-19T17:15:05.000Z
publishedAt: 2025-01-19T17:15:05.000Z
tags:
  - deno
  - puppeteer
  - astral
draft: false
---

Today, I needed to turn SVGs into PNGs.
I decided to use Deno to do it.
Some cursory searching showed [Puppeteer](https://pptr.dev/) should be up to the task.
I also found [`deno-puppeteer`](https://deno.land/x/puppeteer@16.2.0) which seemed like it would provide a reasonable way to make this work.

To start, let's set up a `deno` project

```sh
deno init deno-browser-screenshots
deno-browser-screenshots
```

## Using `puppeteer`

Now, add some code to render an SVG with Chrome via `puppeteer`.

```ts
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const svgString = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#87CEEB"/>
  <circle cx="256" cy="256" r="100" fill="#FFD700"/>
  <path d="M 100 400 Q 256 300 412 400" stroke="#1E90FF" stroke-width="20" fill="none"/>
</svg>`;

if (import.meta.main) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 512, height: 512 });
    await page.setContent(svgString);

    await page.screenshot({
      path: "output.png",
      clip: {
        x: 0,
        y: 0,
        width: 512,
        height: 512,
      },
    });

    await browser.close();
  } catch (error) {
    console.error("Error occurred:", error);
    console.error("Make sure Chrome is installed and the path is correct");
    throw error;
  }
}
```

When we run this code, we get the following error

```sh
deno run -A main.ts
```

```
Error occurred: Error: Could not find browser revision 1022525. Run "PUPPETEER_PRODUCT=chrome deno run -A --unstable https://deno.land/x/puppeteer@16.2.0/install.ts" to download a supported browser binary.
    at ChromeLauncher.launch (https://deno.land/x/puppeteer@16.2.0/src/deno/Launcher.ts:99:30)
    at eventLoopTick (ext:core/01_core.js:175:7)
    at async file:///Users/danielcorin/dev/lab/deno-puppeteer/main.ts:12:21
Make sure Chrome is installed and the path is correct
error: Uncaught (in promise) Error: Could not find browser revision 1022525. Run "PUPPETEER_PRODUCT=chrome deno run -A --unstable https://deno.land/x/puppeteer@16.2.0/install.ts" to download a supported browser binary.
      if (missingText) throw new Error(missingText);
                             ^
    at ChromeLauncher.launch (https://deno.land/x/puppeteer@16.2.0/src/deno/Launcher.ts:99:30)
    at eventLoopTick (ext:core/01_core.js:175:7)
    at async file:///Users/danielcorin/dev/lab/deno-puppeteer/main.ts:12:21
```

Using `npm`'s `puppeteer`, we can install Chrome via `npx`

```sh
npx puppeteer browsers install chrome
```

However, this still did not resolve the error for me.
It turns out the `npx` command install the browser to `~/.cache/puppeteer`.

To use it, we need the following modifications to our code to provide an `executablePath`.

```ts
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const svgString = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#87CEEB"/>
  <circle cx="256" cy="256" r="100" fill="#FFD700"/>
  <path d="M 100 400 Q 256 300 412 400" stroke="#1E90FF" stroke-width="20" fill="none"/>
</svg>`;

if (import.meta.main) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
      executablePath: Deno.env.get("HOME") +
        "/.cache/puppeteer/chrome/mac_arm-131.0.6778.108/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 512, height: 512 });
    await page.setContent(`
      <style>
        body { margin: 0; background: transparent; }
        svg { display: block; }
      </style>
      ${svgString}
    `);

    await page.screenshot({
      path: "output.png",
      clip: {
        x: 0,
        y: 0,
        width: 512,
        height: 512,
      },
    });

    await browser.close();
  } catch (error) {
    console.error("Error occurred:", error);
    console.error("Make sure Chrome is installed and the path is correct");
    throw error;
  }
}
```
With that, the code runs successfully and we get `output.png` in our working directory.

## Using `astral`

There is another, Deno-native library called [`astral`](https://github.com/lino-levan/astral) (no relation to the [Python tooling company](https://astral.sh/)).
I was curious to see how the DX compared for this simple use case.

The following code worked for me without issue

```ts
import { launch } from "jsr:@astral/astral";

const svgString = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#87CEEB"/>
  <circle cx="256" cy="256" r="100" fill="#FFD700"/>
  <path d="M 100 400 Q 256 300 412 400" stroke="#1E90FF" stroke-width="20" fill="none"/>
</svg>`;

if (import.meta.main) {
  try {
    const browser = await launch();
    const page = await browser.newPage();

    await page.setViewportSize({ width: 512, height: 512 });
    await page.setContent(`
      <style>
        body { margin: 0; background: transparent; }
        svg { display: block; }
      </style>
      ${svgString}
    `);

    const screenshot = await page.screenshot();
    Deno.writeFileSync("output_astral.png", screenshot);

    await browser.close();
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}
```

On first run, `astral` manages the downloading of Chrome for you.

```sh
deno run -A main_astral.ts
```

```
Downloading chrome 125.0.6400.0                                                    100.00%
Download complete (chrome version 125.0.6400.0)
Inflating /Users/danielcorin/Library/Caches/astral/125.0.6400.0                                        100.00%
Browser saved to /Users/danielcorin/Library/Caches/astral/125.0.6400.0
```

This code works but unexpectedly outputs a PNG with size 1024 x 1024 and I'm not entirely sure why.

Adding the following not-very-nice-looking code seemed to fix this issue - maybe there is a better way.

```ts
    await page.unsafelyGetCelestialBindings().Emulation
      .setDeviceMetricsOverride({
        width: 512,
        height: 512,
        deviceScaleFactor: 1,
        mobile: false,
      });
```

With each approach, there were different rough edges.
Both were able to fit my use case with a few tweaks.
