---
title: Removing the First Line of a File
createdAt: 2023-09-04T12:39:00.000Z
updatedAt: 2023-09-04T12:39:00.000Z
publishedAt: 2023-09-04T12:39:00.000Z
tags:
  - tail
  - sed
draft: false
---

I usually use

```sh
tail -n +2
```

to get all the first line of a file but today I learned you can also accomplish the same task with

```sh
sed '1d'
```

Both also work for removing more than just the first line of an input.
To remove the first three lines

```sh
sed '1,3d'
```

is equivalent to

```sh
tail -n +4
```

It seems like `tail` is recommended for larger files though, since it doesn't process the entire file.
