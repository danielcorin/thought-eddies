---
title: Go closures
createdAt: 2017-02-15T21:00:00.000Z
updatedAt: 2017-02-15T21:00:00.000Z
tags:
  - code
  - go
draft: false
aliases:
  - /code/2017/02/15/go-closures.html
  - /posts/2017-02-15-go-closures
---

Say we need a map to store various versions of a configuration in Go. Here is a simple example of the structure:

```go
envs := map[string]string{
    "dev":  "1",
    "prod": "2",
}
```

Given this config map, we need to create an additional map that uses the same strings as the keys, but has functions for values. The catch is that the body of each function needs to make use of the value from its corresponding key. For example, `functions["prod"]` should have a value of type `func() string` and the body of that function should make use of the value, `envs["prod"]`. Here's a concrete example:

```go
package main

import (
    "fmt"
)

func main() {
    envs := map[string]string{
        "dev":  "1",
        "prod": "2",
    }
    functions := map[string]func() string{}
    for env, value := range envs {
        functions[env] = func() string {
            return value
        }
    }
    for _, function := range functions {
        fmt.Printf("%s\n", function())
    }
}
```

Playground code [here](https://play.golang.org/p/HovGDCz2pm).

The intent of the above is to create a `map[string]func()` where `functions["dev"]` returns `1` and `functions["prod"]` returns `2`. However, the above code prints the following when run:

```sh
1
1
```

It turns out, the variable `value` isn't bound to the function until after exiting the loop. Because of this, all `func`s in `functions` return the value that `value` has during the last iteration of the loop. You can add a print statement to show that this is the case. Interestingly, adding a print statement also changes the order over which the map is iterated:

```go
package main

import (
    "fmt"
)

func main() {
    envs := map[string]string{
        "dev":  "1",
        "prod": "2",
    }
    functions := map[string]func() string{}
    for env, value := range envs {
    fmt.Println(value)
        functions[env] = func() string {
            return value
        }
    }
    for _, function := range functions {
        fmt.Printf("%s\n", function())
    }
}
```

Output:

```sh
1
2
2
2
```

We confirm that both functions return the value that `value` has during the last iteration of the loop.

We can use a closure to get the behavior we want. That is, that each function returns the correct value from the initial map:

```go
package main

import (
    "fmt"
)

func main() {
    envs := map[string]string{
        "dev":  "1",
        "prod": "2",
    }
    functions := map[string]func() string{}
    for env, value := range envs {
        // create a function that returns a function
        // then invoke it with the loop variable
        functions[env] = func(value string) func() string {
            return func() string {
                return value
            }
        }(value)

    }
    for _, function := range functions {
        fmt.Printf("%s\n", function())
    }
}
```

Playground code [here](https://play.golang.org/p/fZFCsux7ci).

Output:

```sh
2
1
```

Using the closure allows us to bind the loop variable to the function that we assign to the `functions` map, and we get our desired result.
