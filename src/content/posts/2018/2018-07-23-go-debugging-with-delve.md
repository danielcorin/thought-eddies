---
title: Debugging go code with delve
createdAt: 2018-07-23T20:10:00.000Z
updatedAt: 2018-07-23T20:10:00.000Z
tags:
  - code
  - go
  - delve
draft: false
aliases:
  - /code/2018/07/23/go-debugging-with-delve.html
  - /posts/2018-07-23-go-debugging-with-delve
---

> [Delve](https://github.com/derekparker/delve) is a debugger for the Go programming language. The goal of the project is to provide a simple, full featured debugging tool for Go.

If we run our go service using a `Makefile`, with a command like `make run`, it can hard to find where to hook in and call `dlv debug`. We can get around this issue by `attach`ing the delve debugger to our running service instead. First set a breakpoint in the code, on the code path you intend to trigger by adding the statement `runtime.Breakpoint()`. Don't forget to `import` the `runtime` package.

Now, in one window run:

```sh
make run
```

In another, run:

```sh
dlv attach $(ps aux | grep mygoproj | grep -v "grep" | awk '{ print $2 }')
```

`mygoproj` is the name of our service. The above command grabs our process id and hooks the delve debugger up to it.

Now that we're in the debugger, type `c` for `continue`. If your breakpoint is in the main thread, delve will jump to it. If you need to make an external call to trigger the codepath, go ahead and do that now (with `curl` otherwise) and delve will jump to your breakpoint.

Consider the following code:

```go
func (h *handler) Hello(ctx context.Context, request *mygoprojgen.HelloRequest) (*mygoprojgen.HelloResponse, error) {
    requestEnt := mappergen.HelloRequestFromThrift(*request)
    message := fmt.Sprintf("Hello, %v!", requestEnt.Name)
    runtime.Breakpoint()
    return &mygoprojgen.HelloResponse{Message: &message}, nil
}
```

We trigger the codepath with [yab](https://github.com/yarpc/yab):

```sh
yab -y idl/mygoproj/yabs/Debug--hello.yab
```

Delve drops us into the code at the breakpoint:

```sh
(dlv) c
> mygoproj/handler/debug.(*handler).Hello() ./.tmp/.goroot/src/mygoproj/handler/debug/debug.go:44 (PC: 0x20518f0)
Warning: debugging optimized function
    39:
    40: func (h *handler) Hello(ctx context.Context, request *mygoprojgen.HelloRequest) (*mygoprojgen.HelloResponse, error) {
    41:     requestEnt := mappergen.HelloRequestFromThrift(*request)
    42:     message := fmt.Sprintf("Hello, %v!", requestEnt.Name)
    43:     runtime.Breakpoint()
=>  44:     return &mygoprojgen.HelloResponse{Message: &message}, nil
    45: }
    46:
    47: func (h *handler) GetSecret(ctx context.Context) (*mygoprojgen.SecretResponse, error) {
    48:     secret, err := h.secretClient.Read(ctx, "/mygoproj/test_secret")
    49:     if err == nil {
(dlv)
```

We can now explore what's going on in the program. Typing `help` will show everything delve can do. I use `args` and `locals` to see the variables that exist within the function containing the breakpoint:

```sh
(dlv) args
ctx = context.Context(*context.valueCtx) 0xc420b8cc18
h = (*mygoproj/handler/debug.handler)(0xc4206ebbf0)
request = (*mygoproj/.gen/go/growth/mygoproj/mygoproj.HelloRequest)(0xc4204bc0c8)
~r2 = (*mygoproj/.gen/go/growth/mygoproj/mygoproj.HelloResponse)(0xc420a029f0)
~r3 = (unreadable invalid interface type: key not found)
(dlv) locals
message = "Hello, John Doe!"
requestEnt = mygoproj/entity.HelloRequest {Name: "John Doe"}
(dlv)
```

If we want to see the value of a variable we can `print` it (`p` for short):

```sh
(dlv) p requestEnt
mygoproj/entity.HelloRequest {
    Name: "John Doe",}
```

We can also drill down into structs using dotted paths:

```sh
(dlv) p requestEnt.Name
"John Doe"
```

We can even cast values:

```sh
(dlv) p []byte(requestEnt.Name)
[]uint8 len: 8, cap: 8, [74,111,104,110,32,68,111,101]
```

To allow the program to continue, type `c` or `continue` again. To exit the debugger, type `exit` or `Ctrl-d`.

The nice part about using delve this way is it doesn't have a dependence on any one IDE or editor. Happy hacking.
