---
title: Hugo Page Bundles
createdAt: 2024-09-30T18:42:00.000Z
updatedAt: 2024-09-30T18:42:00.000Z
publishedAt: 2024-09-30T18:42:00.000Z
tags:
  - hugo
  - meta
draft: false
---

Hugo allows you to store your images with your content using a feature called [page bundles](https://gohugo.io/content-management/page-bundles/).
I was loosely familiar with the feature, but Claude explained to me how I could use it to better organize posts on this site and the images I add to them.
Previously, I defined a `_static` directory at the root of this site and mirrored my entire `content` folder hierarchy inside `_static/img`.
This approach works ok and is pretty useful if I want to share images across posts, but jumping between these two mirrored hierarchies became a bit tedious while I was trying to add images to the markdown file I generated from a Jupyter notebook (`.ipynb` file).
Using page bundles, I could store the images right next to the content like this:

```text
content/til/fastai/lesson2-rowing-classifier/
├── images
│   ├── lesson2-rowing-classifier_18_4.png
│   └── lesson2-rowing-classifier_27_4.png
├── index.md
└── lesson2-rowing-classifier.ipynb
```

With this structure, I can reference images in the post like this:

```md
![png](images/lesson2-rowing-classifier_18_4.png)
```

A bit nicer than needing to use the longer path

```md
![png](/img/til/fastai/lesson2-rowing-classifier/lesson2-rowing-classifier_18_4.png)
```

I ended up using a [script](https://github.com/danielcorin/blog/blob/main/scripts/convert_notebook.py) to convert the notebook into a markdown file and manage the associated images, but this was a nice pattern to learn about.
