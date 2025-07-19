---
title: Querying S3 with Presto
createdAt: 2016-04-11T17:19:00.000Z
updatedAt: 2016-04-11T17:19:00.000Z
tags:
  - code
  - presto
  - s3
draft: false
aliases:
  - /code/2016/04/11/querying-s3-with-presto.html
  - /posts/2016-04-11-querying-s3-with-presto
---

Querying S3 with Presto
=======================

This post assumes you have an AWS account and a Presto instance (standalone or cluster) running. We'll use the Presto CLI to run the queries against the [Yelp dataset](https://www.yelp.com/dataset_challenge). The dataset is a JSON dump of a subset of Yelp's data for businesses, reviews, checkins, users and tips.

### Configure Hive metastore

Configure the Hive metastore to point at our data in S3. We are using the docker container [inmobi/docker-hive](https://github.com/InMobi/docker-hive)

```sh
$ docker pull inmobi/docker-hive
$ docker run -p 9083:9083 -d inmobi/docker-hive

# get the container id
$ docker ps | grep docker-hive | awk '{print $1}'

# exec into the container
$ docker exec -it <container_id> bash

# start Hive
$ ./etc/hive-bootstrap.sh
```

Modify `/usr/local/hadoop/etc/hadoop/core-site.xml` and add the following so we can connect to S3:

```xml
<property>
    <name>fs.s3.awsAccessKeyId</name>
    <value>your access key</value>
</property>

<property>
    <name>fs.s3.awsSecretAccessKey</name>
    <value>your secret key</value>
</property>
```

Run Hive and `CREATE` an `EXTERNAL TABLE` that points to to S3. Note: supply the path to the S3 folder container the `.json` file. Here, we create a relational-like table out of the JSON, which we will unpack with Presto.

```sh
$ hive
hive> CREATE EXTERNAL TABLE yelp_reviews (json_body string)
    stored as textfile
    location "s3://<path to S3 folder containing yelp_academic_dataset_review.json>";
```

### Configure Presto to read from Hive

Specify a `properties` file for Presto to use to connect to Hive.

`hive.properties`

```sh
connector.name=hive-hadoop2
hive.metastore.uri=thrift://<ip of machine hosting container>:9083
hive.s3.connect-timeout=2m
hive.s3.max-backoff-time=10m
hive.s3.max-error-retries=50
hive.metastore-refresh-interval=1m
hive.s3.max-connections=500
hive.s3.max-client-retries=50
hive.s3.socket-timeout=2m
hive.metastore-cache-ttl=20m
hive.s3.staging-directory=/tmp/
hive.s3.use-instance-credentials=true
```

Save and close this file and distribute it to the `catalog` folder of the coordinator and all workers. Then restart the coordinator and workers:

```sh
$ ./presto-server-0.142/bin/launcher.py restart
```

### Query S3 with Presto

Open the Presto shell on the coordinator:

```sh
$ ./presto
```

Let's find the reviews with the most "funny" votes in the dataset.

```sh
presto> WITH x AS (
    SELECT CAST(json_extract_scalar(json_body, '$.votes.funny') AS BIGINT) AS funny,
    json_extract_scalar(json_body, '$.business_id') AS business_id,
    json_extract_scalar(json_body, '$.text') AS text
    FROM yelp_reviews)
SELECT *
FROM x
ORDER BY funny DESC;
```

This should give a nice intro to querying S3 and using some of Presto's tools to work with JSON.
