---
title: Go and UNIX files
createdAt: 2019-01-06T00:00:00.000Z
updatedAt: 2019-01-06T00:00:00.000Z
tags:
  - code
  - unix
  - go
draft: false
aliases:
  - /code/2019/01/06/unix-files-with-spaces.html
  - /posts/2019-01-06-unix-files-with-spaces
---

I ran into an odd UNIX filename issue while writing Go code the other day.

Here's a simplified example:

Let's read a JSON file and unmarshal its contents into a `struct` in go. First, let's set an environment variable with our file name to avoid hardcoded constants in our program.

```sh
export MY_FILE="/Users/dancorin/Desktop/test.json "
```

Now, let's read the file into our struct:

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "os"
)

// Stuff struct holds the json contents
type Stuff struct {
    Test string `json:"test"`
}

func main() {
    stuff := Stuff{}
    place := os.Getenv("MY_FILE")
    data, err := ioutil.ReadFile(place)
    if err != nil {
        panic(err)
    }
    json.Unmarshal(data, &stuff)
    fmt.Printf("%+v\n", stuff)
}
```

```sh
❯ go run program.go
panic: open /Users/dancorin/Desktop/test.json : no such file or directory

goroutine 1 [running]:
main.main()
    /Users/dancorin/Desktop/program.go:20 +0x156
exit status 2
```

Looks like Go couldn't find my file.

```sh
❯ pwd
/Users/dancorin/Desktop
❯ ls test*
test.json
```

The file definitely exists. What about its permissions?

```sh
❯ ls -ltrah test*
-rw-r--r--  1 dancorin  staff    18B May  9 15:56 test.json
```

Looks like the file is readable by my program too. So, what is happening?

```sh
❯ cat test.json
{"test": "stuff"}
```

I can see the file contents too.

```sh
❯ cat /Users/dancorin/Desktop/test.json
{"test": "stuff"}
```

I am using the proper path. Let's check that Go is trying to read the correct file path.

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "os"
)

// Stuff struct holds the JSON contents
type Stuff struct {
    Test string `json:"test"`
}

func main() {
    stuff := Stuff{}
    place := os.Getenv("MY_FILE")
    fmt.Printf("PLACE: %s\n", place)
    data, err := ioutil.ReadFile(place)
    if err != nil {
        panic(err)
    }
    json.Unmarshal(data, &stuff)
    fmt.Printf("%+v\n", stuff)
}
```

Running the code:

```sh
❯ go run program.go
PLACE: /Users/dancorin/Desktop/test.json
panic: open /Users/dancorin/Desktop/test.json : no such file or directory

goroutine 1 [running]:
main.main()
    /Users/dancorin/Desktop/program.go:21 +0x202
exit status 2
```

The value of the environment variable seems to be correct.

Let's see if we can find any weird characters hiding in the string:

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "os"
)

// Stuff struct holds the JSON contents
type Stuff struct {
    Test string `json:"test"`
}

func main() {
    stuff := Stuff{}
    place := os.Getenv("MY_FILE")
    fmt.Printf(">%s<\n", place)
    data, err := ioutil.ReadFile(place)
    if err != nil {
        panic(err)
    }
    json.Unmarshal(data, &stuff)
    fmt.Printf("%+v\n", stuff)
}
```

```sh
❯ go run program.go
>/Users/dancorin/Desktop/test.json <
panic: open /Users/dancorin/Desktop/test.json : no such file or directory

goroutine 1 [running]:
main.main()
    /Users/dancorin/Desktop/program.go:21 +0x202
exit status 2
```

It looks like there is an unexpected space showing up in ` >/Users/dancorin/Desktop/test.json <`. Where is this coming from?

When we set our environment variable, it seems like we accidentally added a trailing space.

```sh
export MY_FILE="/Users/dancorin/Desktop/test.json "
```

Go is trying to tell us this:

```sh
panic: open /Users/dancorin/Desktop/test.json : no such file or directory
```

It's just not _that_ obvious that there is a space in there. Something like the following could have helped:

```sh
panic: open "/Users/dancorin/Desktop/test.json ": no such file or directory
```

UNIX makes this issue a little more confusing because it has no problem allowing you to create filenames with trailing spaces. We can resolve our issue by running

```sh
❯ cp test.json "test.json "

❯ go run program.go
>/Users/dancorin/Desktop/test.json <
{Test:stuff}
```

Or, better yet, we can fix our `export` command:

```sh
export MY_FILE="/Users/dancorin/Desktop/test.json"
```

I hope you never run into this one!
