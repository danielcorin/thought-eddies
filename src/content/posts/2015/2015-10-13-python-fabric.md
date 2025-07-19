---
title: Python Fabric
createdAt: 2015-10-13T07:26:00.000Z
updatedAt: 2015-10-13T07:26:00.000Z
tags:
  - code
  - python
draft: false
aliases:
  - /code/2015/10/13/python-fabric.html
  - /posts/2015-10-13-python-fabric
---

To help facilitate my blogging workflow, I wanted to go from written to published post quickly. My general workflow for writing a post for [this blog][MyBlog] looks like this:

1. Create a post in `_posts`
2. Write the post
3. Run `fab sync`

Here is the repo

`fab sync` is a custom command that uses the magic of [Fabric][Fabric] to stage, commit and push changes in my blog repo to Github. Next, Fabric uses an ssh session in the Python process to connect to the server on which my blog is hosted, pull down the newest changes from the blog repo and finally, build the Jekyll blog so that the changes are immediately reflected on this site.

A nice part about Fabric is it requires relatively little code to accomplish a lot. It also integrates with the system ssh `config` so you don't need to supply server credentials in yet another place, you can just configure the Fabric env `hosts`.

```python

from __future__ import with_statement
from fabric.api import local, run, cd, env, abort
from fabric.contrib.console import confirm

import os

# path to blog on my server
from local_config import BLOG_DIR

env.BLOG_DIR = BLOG_DIR
env.use_ssh_config = True

# specfic Host from ssh config
env.hosts = ['dod']

def add():
    '''
    Check git branch status.
    If branch is dirty, add all unstaged files.
    '''
    res = local('git status', capture=True)
    if 'Untracked files' in res or 'Changes not staged for commit' in res:
        print res
        if confirm('Changes not staged. Add files?'):
            local('git add .')
        else:
            abort('Aborted. Changes not staged.')


def commit():
    local("git commit")


def push(b_from='origin', b_to='master'):
    local("git push -u {} {}".format(b_from, b_to))


def deploy():
    '''
    Pull down changes from repo and build the blog on the server
    '''
    code_dir = env.BLOG_DIR
    with cd(code_dir):
        res = run("git pull")
        if not 'Already up-to-date.' in res:
            run("jekyll build")


def sync():
    add()
    commit()
    push()
    deploy()


```

[MyBlog]: https://github.com/danielcorin/my-blog
[Fabric]: http://www.fabfile.org/

Happy automating!
