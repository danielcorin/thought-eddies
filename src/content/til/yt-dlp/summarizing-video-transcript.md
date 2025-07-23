---
title: Summarizing Youtube video transcripts with language models
createdAt: 2024-05-11T13:59:05.000Z
updatedAt: 2024-05-11T13:59:05.000Z
publishedAt: 2024-05-11T13:59:05.000Z
tags:
  - yt-dlp
draft: false
---

You can download a Youtube video transcript with
[`yt-dlp`](https://github.com/yt-dlp/yt-dlp).

```sh
yt-dlp --write-auto-sub --skip-download --sub-format vtt --output transcript "<video_url>"
```

This will output a file called `transcript.en.vtt`. That file can be cleaned
like this, to remove all formatting and metadata except the transcript text.

```sh
cat transcript.en.vtt | grep : -v | awk '!seen[$0]++'
```

This approach is useful for simple way to pipe the contents of a Youtube video
into an LLM, my motivation for finding a way to accomplish this task.

Here is a script that pulls the transcript of a video then summarizes it using
[`llm`](https://github.com/simonw/llm).

```sh
#!/bin/zsh

if [ $# -eq 0 ]
  then
    echo "No arguments supplied. Please provide a YouTube URL as an argument."
    exit 1
fi
yt-dlp --write-auto-sub --skip-download --sub-format vtt --output transcript "$1" >/dev/null 2>&1
cat transcript.en.vtt | grep : -v | awk '!seen[$0]++' | llm "write a short summary of the contents of this youtube video transcript"
rm transcript.en.vtt
```

Run it like this

```sh
./summarize.sh <youtube_url>
```

## Adding support for questions

To further customize the script, you can add support for a second argument to the command, which can serve as an additional prompt (usually some kind of question about the prior context) to the model.

```sh
#!/etc/profiles/per-user/danielcorin/bin/zsh

if [ $# -eq 0 ]
  then
    echo "No arguments supplied. Please provide a YouTube URL as an argument."
    exit 1
fi

youtube_url="$1"
prompt="write a short summary of the contents of this youtube video transcript"

if [ $# -eq 2 ]
  then
    prompt="$2"
fi

yt-dlp --write-auto-sub --skip-download --sub-format vtt --output transcript "$youtube_url" >/dev/null 2>&1
cat transcript.en.vtt | grep : -v | awk '!seen[$0]++' | llm -m claude-3-haiku "$prompt"
rm transcript.en.vtt
```

For example:

```sh
❯ yt-summary "https://www.youtube.com/watch?v=8SF_h3xF3cE" "does the lecturer discuss how to withhold a test set using the fastai library?"
Yes, the lecturer mentions the importance of withholding a validation set when training machine learning models. Specifically, he states:

"It's so critical that fast ai won't let you train a model with that one. So you actually have to tell it how to create a validation set, how to set aside some data."

He explains that the validation set is used to evaluate the accuracy of the trained model, separate from the training data. This is a key concept in machine learning to avoid overfitting to the training data.

The lecturer doesn't go into the specific details of how to create the validation set using the fastai library, but he does emphasize that it's a critical step that the fastai library handles for you.
```
