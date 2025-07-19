---
title: Tracking a call stack in Go with context
createdAt: 2018-04-06T21:00:00.000Z
updatedAt: 2018-04-06T21:00:00.000Z
tags:
  - code
  - go
draft: false
aliases:
  - /code/2018/04/06/go-context.html
  - /posts/2018-04-06-go-context
---

The use of `context` in Go can help you pass metadata through your program with helpful, related information about a call.
Let's build an example where we set a context key, "stack", which keeps a history of the function names called over the lifetime of the context.
As we pass the context object through a few layers of functions, we'll append the name of the function to the value of the context key `"stack"`.

```go
package main

import (
    "context"
    "fmt"
)

func main() {
    ctx := context.Background()
    Handler(ctx)

}

func Handler(ctx context.Context) {
    ctx = buildStackContext(ctx, "Handler")
    Service(ctx)
}

func Service(ctx context.Context) {
    ctx = buildStackContext(ctx, "Service")
    Gateway(ctx)
}

func Gateway(ctx context.Context) {
    ctx = buildStackContext(ctx, "Gateway")
    // print the final value of "stack" on the context
    fmt.Println(ctx.Value("stack"))
}

func buildStackContext(ctx context.Context, name string) context.Context {
    // check if "stack" is initialized on the context
    value, ok := ctx.Value("stack").(string)
    if !ok {
        return context.WithValue(ctx, "stack", name)
    }
    return context.WithValue(
        ctx,
        "stack",
        fmt.Sprintf("%s:%s", value, name),
    )
}

```
<https://play.golang.org/p/Q-2AmWQ-bf6>

In the code above, we initialize an empty context in our `main` function, then pass it down into some methods: `Handler`, `Service` and `Gateway` respectively.
In `Gateway`, we print the final value of the `"stack"` key on the context object, which is `Handler:Service:Gateway`.
You'll notice we've had to hardcode the names of the functions ourselves which are appended to the `"stack"` context variable when we explicitly pass them into `buildStackContext`.
However, we can improve this.
By inspecting the Go runtime, we can programmatically look up the name of the function that calls `buildStackContext` and append that to the `"stack"` variable in the context:

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "strings"
)

func main() {
    ctx := context.Background()
    Handler(ctx)

}

func Handler(ctx context.Context) {
    ctx = buildStackContext(ctx)
    Service(ctx)
}

func Service(ctx context.Context) {
    ctx = buildStackContext(ctx)
    Gateway(ctx)
}

func Gateway(ctx context.Context) {
    ctx = buildStackContext(ctx)
    // print the final value of "stack" on the context
    fmt.Println(ctx.Value("stack"))
}

func buildStackContext(ctx context.Context) context.Context {
    var name string
    // inspect the runtime for the name of the caller
    pc, _, _, ok := runtime.Caller(1)
    details := runtime.FuncForPC(pc)
    if ok && details != nil {
        name = details.Name()
        // break down the name,
        // otherwise the package name will be included as well
        // for example: "main.Handler"
        split := strings.Split(name, ".")
        name = split[len(split)-1]
    }

    // check if "stack" is initialized on the context
    value, ok := ctx.Value("stack").(string)
    if !ok {
        return context.WithValue(ctx, "stack", name)
    }

    return context.WithValue(
        ctx,
        "stack",
        fmt.Sprintf("%s:%s", value, name),
    )
}

```
<https://play.golang.org/p/AXOPYBr5SKF>


The above code yields the same output, `Handler:Service:Gateway`, but it allows us to arbitrarily add more function calls or change function names and still get the expected stack of function calls:

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "strings"
)

func main() {
    ctx := context.Background()
    Consumer(ctx)

}

func Consumer(ctx context.Context) {
    ctx = buildStackContext(ctx)
    Service(ctx)
}

func Service(ctx context.Context) {
    ctx = buildStackContext(ctx)
    Gateway(ctx)
}

func Gateway(ctx context.Context) {
    ctx = buildStackContext(ctx)
    Client(ctx)
}

func Client(ctx context.Context) {
    ctx = buildStackContext(ctx)
    // print the final value of "stack" on the context
    fmt.Println(ctx.Value("stack"))
}

func buildStackContext(ctx context.Context) context.Context {
    var name string
    // inspect the runtime for the name of the caller
    pc, _, _, ok := runtime.Caller(1)
    details := runtime.FuncForPC(pc)
    if ok && details != nil {
        name = details.Name()
        // break down the name, otherwise the package name will be included as well
        // for example: "main.Handler"
        split := strings.Split(name, ".")
        name = split[len(split)-1]
    }

    // check if "stack" is initialized on the context
    value, ok := ctx.Value("stack").(string)
    if !ok {
        return context.WithValue(ctx, "stack", name)
    }

    return context.WithValue(
        ctx,
        "stack",
        fmt.Sprintf("%s:%s", value, name),
    )
}

```
<https://play.golang.org/p/Eb8eZ5AfWke>

The above prints: `Consumer:Service:Gateway:Client`.
Using `context` in this way can provide useful namespacing in logs, making it easier to distinguish homogeneous log statements.
