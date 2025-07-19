---
title: Quickstart `supervisor` guide
createdAt: 2016-04-12T12:15:00.000Z
updatedAt: 2016-04-12T12:15:00.000Z
tags:
  - code
  - supervisor
draft: false
aliases:
  - /code/2016/04/14/quickstart-supervisor.html
  - /posts/2016-04-12-quickstart-supervisor
---

`supervisor` is a UNIX utility to managing and respawning long running Python processes to ensure they are always running. Or according to its website:

> Supervisor is a client/server system that allows its users to monitor and control a number of processes on UNIX-like operating systems.

### Installation
`supervisor` can be installed with `pip`

```sh
$ pip install supervisor
```

Given a script `test_proc.py`, start the process under `supervisor` as

```sh
$ sudo supervisorctl start test_proc
```

Now it will run forever and you can see the process running with

```sh
$ sudo supervisorctl status
test_proc      RUNNING    pid 5586, uptime 0:00:11
```

You can stop the process with

```sh
$ sudo supervisorctl stop test_proc
```

Logs, by default, are written to `/var/log/supervisor`

The `supervisor` configuration can be found at `/etc/supervisor/supervisor.conf`

Configurations can be added to the `supervisor.conf` file for specific apps. Below we specify a configuration for the `test_proc` process, using a rotating file logger with two backups for both `stdout` amd `stderr` and a max file size of 100KBs.

```sh
[program:test_proc]
stdout_logfile=/var/log/supervisor/test_proc-stdout.log
stdout_logfile_maxbytes=100KB
stdout_logfile_backups=2
stderr_logfile=/var/log/supervisor/test_proc-stderr.log
stderr_logfile_maxbytes=100KB
stderr_logfile_backups=2
```

After the script runs for a while, the output logs will look something like this:

```sh
-rw-r--r-- 1 root root   101K Apr 14 18:50 test_proc-stdout.log.2
-rw-r--r-- 1 root root   101K Apr 14 19:09 test_proc-stdout.log.1
-rw-r--r-- 1 root root    32K Apr 14 19:15 test_proc-stdout.log
```

More configurations for `supervisor` can be found [here](http://supervisord.org/configuration.html#program-x-section-example).
