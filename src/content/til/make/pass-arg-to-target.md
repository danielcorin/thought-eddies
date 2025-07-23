---
title: Passing an arg to a make target
createdAt: 2023-10-14T08:32:03.000Z
updatedAt: 2023-10-14T08:32:03.000Z
publishedAt: 2023-10-14T08:32:03.000Z
tags:
  - make
draft: false
---

Given the following make target

```makefile
.PHONY: my_target
my_target:
    @python scripts/my_script.py $(arg)
```

one can the argument with an argument in the following manner

```sh
make my_target arg=my_arg
```

I used this approach to run a python script to create the file for this post

```sh
make til p=make/pass-arg-to-target
```

for the following make target

```makefile
.PHONY: til
til:
	@python scripts/til.py $(p)
```

It's also possible to prepend the variable

```sh
p=make/pass-arg-to-target make til
```
