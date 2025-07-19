---
title: Creating a Go module
createdAt: 2016-04-22T09:40:00.000Z
updatedAt: 2016-04-22T09:40:00.000Z
tags:
  - code
  - go
draft: false
aliases:
  - /code/2016/04/22/first-go-module.html
  - /posts/2016-04-22-first-go-module
---

Creating a Go module
====================

We're going to create a CLI tool for sending a message to a channel in Slack using the command line. This post is similar to my earlier post: [Creating an Elixir Module](/posts/2016/2016-01-28-first-elixir-module). We'll be using the [chat.postMessage](https://api.slack.com/methods/chat.postMessage) Slack API endpoint. Also, make sure you have a [Slack API token](https://api.slack.com/tokens).

Our CLI syntax will be:

```sh
$ ./slack -message 'hello world!' -channel @slackbot
```

First, make sure you have your `$GOPATH` set properly.

```sh
export GOPATH="/path/to/go/"
```

Next, set your Slack token as an environment variable:

```sh
export SLACK_TOKEN=<token>
```

Typically, developers will use one folder for all of their Go code, and create new folders within for each new project. My structure looks like this:

```sh
    go
    ├── bin
    ├── pkg
    └── src
```

Make a folder called `slack` within `src`, then inside that folder create the following files and folders as well:

```sh
    slack/
    ├── api
    │   └── slack.go
    └── main.go
```

Using the builtin Go command line parser [`flag`](https://golang.org/pkg/flag/), we will write our `main.go` file to parse the message and channel from the command line.

`slack/main.go`

```go

package main

import (
    "slack/api"
    "flag"
)

func main() {
    msg := flag.String("message", "", "The `message` to send the `channel`")
    channel := flag.String("channel", "", "The `channel` to send the `message`")
    flag.Parse()
    api.SendMsg(*msg, *channel)
}

```

This sets us up with a CLI parser which will take our provided arguments and pass them to the `SendMsg` function, which we will define now.

Make sure you have set the environment variable `SLACK_TOKEN` with your token.

`slack/api/slack.go`

```go

package api

import (
    "fmt"
    "net/http"
    "net/url"
    "os"
)

const slackUrl string = "https://slack.com/api/"
const chatPostMsg string = "chat.postMessage"

func SendMsg(msg, channel string) {
    token := getToken()
    // keys and values for query string parameters used in the API call
    paramMap := map[string]string{
        "token": token,
        "as_user": "true",
        "text": msg,
        "channel": channel,
    }
    url := buildUrl(slackUrl+chatPostMsg, paramMap)
    resp, err := http.Post(url, "application/json", nil)
    // handle and error calling `http.Post`
    if err != nil {
        fmt.Println(err)
        fmt.Println("failed to post")
    }
    // handle non-200 status codes
    if resp.StatusCode == 200 {
        fmt.Println("Sent message!")
        fmt.Println(fmt.Sprintf("%s <- %s", channel, msg))
    } else {
        fmt.Println("Failed to send message.")
        fmt.Println(resp)
    }
}

// Build the URL using the parameters map and builtin URL library
func buildUrl(urlString string, args map[string] string) string {
    u, err := url.Parse(urlString)
    if err != nil {
        fmt.Println("Error parsing URL string")
    }
    v := url.Values{}
    for key, value := range args {
        v.Set(key, value)
    }
    u.RawQuery = v.Encode()
    return u.String()
}

// check that token is set in environment
func getToken() string {
    token := os.Getenv("SLACK_TOKEN")
    if token == "" {
        fmt.Println("Environment variable `SLACK_TOKEN` not set")
        fmt.Println("Set with:")
        fmt.Println("\texport SLACK_TOKEN=<token>")
        panic("Exiting")
    }
    return token
}

```

With these two files written, we can go the to `slack` folder and test the program:

```sh
$ go run main.go -channel @slackbot -message 'hello!'
```

If all goes well, you will see the output:

```sh
Sent message!
@slackbot <- hello!
```

and the message will show up from you to slackbot in the Slack app.

To build the program as a standalone, distributable binary run:

```sh
$ go build -o slack
```

This creates a binary file called `slack` in the folder, which can be run with:

```sh
$ ./slack -message 'hello world!' -channel @slackbot
```

That's it!

Thanks to [Hans Li](https://www.linkedin.com/in/haanns) for the help with testing!
