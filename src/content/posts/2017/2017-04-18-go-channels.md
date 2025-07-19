---
title: Go channels
createdAt: 2017-04-18T21:30:00.000Z
updatedAt: 2017-04-18T21:30:00.000Z
tags:
  - code
  - go
draft: false
aliases:
  - /code/2017/04/18/go-channels.html
  - /posts/2017-04-18-go-channels
---

Go uses goroutines to execute multiple bits of code at the same time. Channels allow for the aggregation of the results of these concurrent calls after they have finished.

Consider a case where we want to make several `GET` requests to a server. The server takes some time to process each request, in many cases can handle many simultaneous connections. In a language like Python, we might do the following to make several requests:

<figure>
<figcaption>client.py</figcaption>

```python
import requests
import time

start = time.time()
for _ in range(10):
    r = requests.get('http://localhost:8080/inc')
    print r.content
print('Time elapsed: %.2f seconds' % (time.time() - start))
```

</figure>

If the server takes an average of 100ms to respond, it will take us about one second to do ten requests in native Python.

Let's run the above Python code against the following Go HTTP server. The server prints the (random) request delay and a global counter it maintains to keep track of how many requests have been made. It responds to the caller with the string: "The count is `count`".

<figure>
<figcaption>server.go</figcaption>

```go
package main

import (
    "fmt"
    "log"
    "math/rand"
    "net/http"
    "time"
)

var counter int

func main() {
    http.HandleFunc("/inc", func(w http.ResponseWriter, r *http.Request) {
        duration := time.Duration(rand.Float64()*200) * time.Millisecond
        fmt.Println("Sleeping for: ", duration)
        time.Sleep(duration)
        counter++
        msg := fmt.Sprintf("The count is: %d", counter)
        fmt.Println(msg)
        fmt.Fprintf(w, msg)
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
```
</figure>

We run the server to accept incoming requests:

```sh
go run server.go
```

Then we run the Python script:

```sh
python client.py
```

which outputs the following:

```sh
The count is: 1
The count is: 2
The count is: 3
The count is: 4
The count is: 5
The count is: 6
The count is: 7
The count is: 8
The count is: 9
The count is: 10
Time elapsed: 0.96 seconds
```

Our server output looks something like this:

```sh
Sleeping for:  120ms
The count is: 1
Sleeping for:  188ms
The count is: 2
Sleeping for:  132ms
The count is: 3
Sleeping for:  87ms
The count is: 4
Sleeping for:  84ms
The count is: 5
Sleeping for:  137ms
The count is: 6
Sleeping for:  13ms
The count is: 7
Sleeping for:  31ms
The count is: 8
Sleeping for:  19ms
The count is: 9
Sleeping for:  60ms
The count is: 10
```

The total elapsed time is about what we would expect. Ten requests at approximately 100ms each, gives us about one second for all requests. However, our Python script spends most of its time waiting for a response from the server which is sleeping. What would happen if we kicked off all ten requests to the server at the same time? We might expect this to be a problem. After all, if Python only can make one request at a time, why should our server be able to process more than one request at a time. For this to work in Python we need to use something like [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) or [asyncio](https://docs.python.org/3/library/asyncio.html). It turns out that Go's builtin `net/http` library [uses goroutines](https://golang.org/src/net/http/server.go?s=83696:83751#L2668) to handle multiple incoming requests at once. Let's trying making our requests in a similar manner, using goroutines to kick off all the requests at once, with the following Go code:

<figure>
<figcaption>client.go</figcaption>

```go
package main

import (
    "fmt"
    "io/ioutil"
    "net/http"
    "time"
)

func main() {
    start := time.Now()
    routineCount := 10
    // create a go routine to make the HTTP request
    // pass a channel into which the response will be written
    channel := make(chan string)
    for i := 0; i < routineCount; i++ {
        go request(channel)
    }
    // read the responses from the channel
    for i := 0; i < routineCount; i++ {
        fmt.Println(<-channel)
    }
    secs := time.Since(start).Seconds()
    fmt.Printf("Time elapased: %.2f seconds", secs)
}

func request(channel chan<- string) {
    resp, err := http.Get("http://localhost:8080/inc")
    if err != nil {
        fmt.Println(err)
        return
    }
    defer resp.Body.Close()
    body, _ := ioutil.ReadAll(resp.Body)
    channel <- fmt.Sprintf(string(body))
}

```
</figure>

When we run this code against the same (restarted) server, we get the following output:

```sh
$ go run threads.go
The count is: 1
The count is: 2
The count is: 3
The count is: 4
The count is: 5
The count is: 6
The count is: 7
The count is: 8
The count is: 9
The count is: 10
Time elapased: 0.19 seconds
```

With goroutines, the program runs about five times faster than our ten synchronous requests in Python. Look what happens on the server side:

```sh
Sleeping for:  87ms
Sleeping for:  132ms
Sleeping for:  120ms
Sleeping for:  188ms
Sleeping for:  84ms
Sleeping for:  137ms
Sleeping for:  13ms
Sleeping for:  31ms
Sleeping for:  19ms
Sleeping for:  60ms
The count is: 1
The count is: 2
The count is: 3
The count is: 4
The count is: 5
The count is: 6
The count is: 7
The count is: 8
The count is: 9
The count is: 10
```

This time on the server side, all the sleep durations are printed first, then the counter is incremented afterwards. So what happens is the server accepts all ten requests then all threads start sleeping. As each of the threads wakes up, they start incrementing the counter respectively and returning to the client callers. The responses on the client side look about the same as they did when we made the requests in series, but this time the total time elapsed was only 0.19 seconds. This corresponds to the longest sleep time printed by the server: 188ms. So, by using goroutines, we have reduced the runtime of our program from the sum of the time of all requests to the time of just the longest request. Not bad.

Another cool part about using goroutines in this scenario is that we can scale the number of threads to accomplish even more in the same amount of time. Keep in mind, even though creating goroutines is cheap, creating too many of them to make a large number of requests against an HTTP server all at once may cause the server to run out of resources or limit the number of connections it will accept. On my machine, scaling up `routineCount` to 300 is no problem for the server. However, at around 400, some of the requests start getting lost and at 800 I start seeing the following error:

```sh
Get http://localhost:8080/inc: read tcp [::1]:59928->[::1]:8080: read: connection reset by peer
```

From a more detailed explanation on what happens when we make too many concurrent requests, check out this [Stack Overflow post](http://stackoverflow.com/questions/37774624/go-http-get-concurrency-and-connection-reset-by-peer).
