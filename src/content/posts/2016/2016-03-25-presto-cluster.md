---
title: Creating a Presto Cluster
createdAt: 2016-03-25T17:19:00.000Z
updatedAt: 2016-03-25T17:19:00.000Z
tags:
  - code
  - presto
draft: false
aliases:
  - /code/2016/03/25/presto-cluster.html
  - /posts/2016-03-25-presto-cluster
---

Creating a Presto Cluster
=========================

I first came across [Presto](https://prestodb.io/) when researching data virtualization - the idea that all of your data can be  integrated regardless of its format or storage location. One can use scripts or periodic jobs to mashup data or create regular reports from several independent sources. However, these methods don't scale well, especially when the queries change frequently or the data is ingested in realtime. Presto allows one to query a variety of data sources using SQL and presents the data in a standard table format, where it can be manipulated and `JOIN`ed like traditional relational data.

In Facebook's words:

> Presto is an open source distributed SQL query engine for running interactive analytic queries against data sources of all sizes ranging from gigabytes to petabytes.

There is a guide for how to download and setup Presto [here](https://prestodb.io/docs/current/installation.html). Additionally, there is a well documented [list of connectors][connectors_link] for querying a wide variety of data sources (including Redis and Kafka!). However, the documentation on how to setup a cluster (coordinator and workers) is a little sparse.

This guide assumes you have machines runnning Java 8 that can interact with each other over port 8080. Some of the documentation for installation from Facebook is repeated for the sake of having all the instructions in one place. Additionally, you'll need to have data sources to which Presto can connect. See the full list on the [connectors page][connectors_link].

### Install Presto

Download Presto. These instructions are for version 0.142. You can find the most recent version and more deployment information [here](https://prestodb.io/docs/current/installation/deployment.html).

```sh
$ wget https://repo1.maven.org/maven2/com/facebook/presto/presto-server/0.142/presto-server-0.142.tar.gz
$ tar zxvf presto-server-0.142.tar.gz
```

Download the CLI for the coordinator and name it `presto`

```sh
$ wget https://repo1.maven.org/maven2/com/facebook/presto/presto-cli/0.142/presto-cli-0.142-executable.jar
$ mv presto-cli-0.142-executable.jar presto
$ chmod +x presto
```

### Create configure files

Create `etc` folder in `presto-server-0.142` directory
Create `config.properties`, `jvm.config`, `log.properties`, and `node.properties` files.

Install `uuid` to generate a `node.id`

```sh
$ sudo apt-get install uuid
$ uuid
7fd6390a-f2dc-11e5-a834-0eb3775013cf
```

`node.properties`

```sh
node.environment=production
node.id=<generated uuid>
node.data-dir=/home/ubuntu/data
```

`jvm.config`

```sh
-server
-Xmx16G
-XX:+UseG1GC
-XX:G1HeapRegionSize=32M
-XX:+UseGCOverheadLimit
-XX:+ExplicitGCInvokesConcurrent
-XX:+HeapDumpOnOutOfMemoryError
-XX:OnOutOfMemoryError=kill -9 %p
```

This is the configuration for the coordinator:

Coordinator `config.properties`

```sh
coordinator=true
node-scheduler.include-coordinator=false
http-server.http.port=8080
query.max-memory=50GB
query.max-memory-per-node=2GB
discovery-server.enabled=true
discovery.uri=<coordinator_ip>:8080
```

The above files can be configured as needed for your specific cluster. The options `node-scheduler.include-coordinator=false` and `coordinator=true` indicate that the node is the coordinator and tells the coordinator not to do any of the computation work itself and to use the workers. After configuring the coordinator, you need to configure workers to add some resources to the cluster. If you were to try and run a query now, you would see something like:

```sh
Query 20160324_223423_00000_pdnyh failed: No worker nodes available
```

 For the workers, you need to create all the same files as above, but the `config.properties` file needs to look similar to the one below.

Worker `config.properties`

```sh
coordinator=false
http-server.http.port=8080
query.max-memory=50GB
query.max-memory-per-node=2GB
discovery.uri=<coordinator_ip>:8080
```

Next we will create the `catalog` folder which tells Presto how to connect to various data sources. This folder goes inside the `etc` folder **on all nodes of the cluster** including the coordinator. An example folder structure might look like:

```sh
etc/
├── catalog
│   ├── cassandra.properties
│   ├── hive.properties
│   ├── kafka.properties
│   ├── mysql.properties
│   ├── postgresql.properties
│   └── redshift.properties
├── config.properties
├── jvm.config
├── log.properties
└── node.properties
```

Consult the [connectors page][connectors_link] on how to write theses `properties` files. It may help to version control this folder to make it more easily distributable.

### Start Presto

Now that we've set up our coordinator and worker node(s), we can start the cluster. First SSH into and start the coordinator node:

```sh
$ ./presto-server-0.142/bin/launcher.py start
Running as 4292
```

SSH into and start the worker node(s):

```sh
$ ./presto-server-0.142/bin/launcher.py start
Running as 3000
```

Once you start the workers, you can use the Presto CLI on the coordinator to ensure the workers are connected:

```sh
$ ./presto
presto> select * from system.runtime.nodes;
                node_id                |        http_uri        | node_version |
--------------------------------------+------------------------+--------------+-
    ffb969e8-f049-11e5-a8dd-0e144badbcb1 | http://10.0.0.216:8080 | 0.142        |
    fc991558-ec5a-11e5-a15a-0eb3775013cf | http://10.0.0.70:8080  | 0.142        |
    46001b10-fdcc-11e5-9797-0e75f1fc6277 | http://10.0.0.15:8080  | 0.142        |
    c2334f0c-f04f-11e5-9e77-0e144badbcb1 | http://10.0.0.211:8080 | 0.142        |
```

Now you can use the Presto CLI on the coordinator to query data sources in the `catalog` using the Presto workers.

[connectors_link]: https://prestodb.io/docs/current/connector.html
