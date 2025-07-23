---
title: Using devbox for a local PostgreSQL database
createdAt: 2024-03-03T20:24:39.000Z
updatedAt: 2024-03-03T20:24:39.000Z
publishedAt: 2024-03-03T20:24:39.000Z
tags:
  - devbox
  - postgres
  - chinook
  - nix
draft: false
---

[Devbox](https://www.jetpack.io/devbox/), is an interesting, nix-based tool for setting up reproducible development environments.
I recently needed to quickly setup a postgres database and load the [Chinook dataset](https://github.com/xivSolutions/ChinookDb_Pg_Modified/blob/master/chinook_pg_serial_pk_proper_naming.sql) to play around with some queries.
I could have used Docker, but I am not a fan of its UI or how heavyweight it has become (looking into `podman` is also on my todo list) and I've been using nix a lot lately, which is what led me to the devbox project.
After installing `devbox`, I setup a project

```sh
mkdir test-db
cd test-db
devbox init
devbox add postgresql
```

Next, I ran

```sh
devbox services up
```

but was getting the following error

```sh
pg_ctl: directory "/Users/.../.devbox/virenv/postgresql/data" is not a database cluster directory
```

It turns out `data` was an empty directory.

I initialized a database in this spot

```sh
rm -rf .devbox/virtenv/postgresql/data
initdb -D .devbox/virtenv/postgresql/data
```

then ran the command again and that seemed to solve the issue.

Finally, I created the database and added the data

```sh
createdb chinook
psql chinook -f out.sql
```

Note: since I never specified `-U`, I create all of these things as my system user, not as the typical `postgres` user.
This seems to work fine for `devbox` but keep this in mind if you are running the database for an app that uses a consistent user name.

Lastly, we can check to see all the data is loaded as we expect

```sh
❯ psql -h localhost -d chinook
psql (15.6)
Type "help" for help.

chinook=# \dt
               List of relations
 Schema |      Name      | Type  |    Owner
--------+----------------+-------+-------------
 public | actor          | table | danielcorin
 public | album          | table | danielcorin
 public | artist         | table | danielcorin
 public | category       | table | danielcorin
 public | customer       | table | danielcorin
 public | employee       | table | danielcorin
 public | film           | table | danielcorin
 public | film_actor     | table | danielcorin
 public | film_category  | table | danielcorin
 public | genre          | table | danielcorin
 public | invoice        | table | danielcorin
 public | invoice_line   | table | danielcorin
 public | media_type     | table | danielcorin
 public | playlist       | table | danielcorin
 public | playlist_track | table | danielcorin
 public | track          | table | danielcorin
(16 rows)
```
