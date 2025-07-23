---
title: Javascript Promises
createdAt: 2023-11-11T11:50:58.000Z
updatedAt: 2023-11-11T11:50:58.000Z
publishedAt: 2023-11-11T11:50:58.000Z
tags:
  - javascript
  - promises
  - callbacks
  - async-await
  - partly_ai_authored
  - ai_teaches
draft: false
---

In Javascript, using `async`/`await` is a cleaner approach compared to use of callbacks.
Occasionally, you run into useful but older modules that you'd like to use in the more modern way.


Take [`fluent-ffmpeg`](https://www.npmjs.com/package/fluent-ffmpeg/v/1.7.0), a 10 year old package that uses callbacks to handle various events like `start`, `progress`, `end` and `error`.

Using callbacks, we have code that looks like this:

```javascript
const ffmpeg = require('fluent-ffmpeg');

function convertVideo(inputPath, outputPath, callback) {
  ffmpeg(inputPath)
    .output(outputPath)
    .on('end', () => {
      console.log('Conversion finished successfully.');
      callback(null, 'success'); // Pass 'success' string to callback
    })
    .on('error', (err) => {
      console.error('Error occurred:', err);
      callback(err);
    })
    .run();
}

// Usage of the convertVideo function with a callback to receive 'success' string
convertVideo('/path/to/input.avi', '/path/to/output.mp4', (error, result) => {
  if (!error && result === 'success') {
    console.log('Video conversion completed:', result);
  } else {
    console.log('Video conversion failed:', error);
  }
});
```

Using a promise, we use `async`/`await` as well:

```javascript
const ffmpeg = require('fluent-ffmpeg');

function convertVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .on('end', () => {
        console.log('Conversion finished successfully.');
        resolve('success'); // Resolve the promise with 'success' string
      })
      .on('error', (err) => {
        console.error('Error occurred:', err);
        reject(err);
      })
      .run();
  });
}

// Async function to use the Promise-based conversion function
async function main() {
  try {
    const result = await convertVideo('/path/to/input.avi', '/path/to/output.mp4');
    console.log('Video conversion completed:', result);
  } catch (err) {
    console.error('Video conversion failed:', err);
  }
}

// Run the async function
main();
```

With the approach using a promise, we gain the ability to use this callback-based library with more traditional flow control.
