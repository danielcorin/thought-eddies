---
title: Add Alt Text to an Image with an LLM and Cursor
createdAt: 2024-11-15T15:35:21.000Z
updatedAt: 2024-11-15T15:35:21.000Z
publishedAt: 2024-11-15T15:35:21.000Z
tags:
  - cursor
  - accessibility
draft: false
---

Using Cursor, we can easily get a first pass at creating alt text for an image using a language model.
It's quite straightforward using a multi-modal model/prompt.
For this example, we'll use `claude-3-5-sonnet-20241022`.

![A screenshot showing a prompt to Cursor asking it to generate alt text for an image](images/prompt.png)

Here's what it generates.

![A screenshot showing Cursor's generated alt text for an image. The alt text describes a diagram with multiple conversation branches and discusses caching approaches in Python applications](images/generation.png)

The first half is pretty good.

I settled on:

> A diagram showing multiple conversation branches exploring different approaches to adding caching to a Python application

Using the same approach, I generated alt text for the images in this post as well.

I could see models being helpful accessibility aids for sites that haven't yet made efforts to make their content broadly accessible.
