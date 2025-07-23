---
title: Protobuf Zip Imports in Python
createdAt: 2024-08-03T10:18:43.000Z
updatedAt: 2024-08-03T10:18:43.000Z
publishedAt: 2024-08-03T10:18:43.000Z
tags:
  - protobuf
  - python
  - zipimport
draft: false
githubUrl: 'https://github.com/danielcorin/toys/tree/main/protobuf-zip-imports'
---

In Python, the most straightforward path to implementing a gRPC server for a Protobuf service is to use `protoc` to generate code that can be imported in a server, which then defines the service logic.

Let's take a simple example Protobuf service:

```proto
syntax = "proto3";

package simple;

message HelloRequest {
  string name = 1;
}

message HelloResponse {
  string message = 1;
}

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloResponse);
}
```

Next, we run some variant of `python -m grpc_tools.protoc` to generate code (assuming we've installed `grpcio` and `grpcio-tools`).
Here's an example for `.proto` files in a `protos` folder:

```sh
python -m grpc_tools.protoc --python_out=. --grpc_python_out=. --proto_path=protos protos/*.proto
```

This command outputs the following files

```sh
simple_pb2_grpc.py
simple_pb2.py
```

Within `simple_pb2_grpc.py` we see this import

```python
import simple_pb2 as simple__pb2
```
This import can be problematic because it assumes that the generated code exists at the root of the project.
If you want to keep your project structure organized, you probably want to put the generated code into a subfolder and gitignore it.
The `protoc` tool doesn't seem to support any options for Python code that will write these import statements differently.
This limitation leaves us with only a few options:

1. As first mentioned, generate the code at the root of the project and deal with the suboptimal structure

```sh
python -m grpc_tools.protoc --python_out=. --grpc_python_out=. --proto_path=protos protos/*.proto
```

then in `src/server.py` do the following imports

```python
import simple_pb2
import simple_pb2_grpc
```

We now have `simple_pb2_grpc.py` and `simple_pb2.py` in the project root and the server runs

```sh
❯ python -m src.server
Server started, listening on port 50051
```

2. Re-write the generated code to fix the imports for the package structure we want

```sh
❯ sed -i '' 's/import simple_pb2 as simple__pb2/from gen.protos import simple_pb2 as simple__pb2/' gen/protos/simple_pb2_grpc.py
```

Now the import is

```python
from gen.protos import simple_pb2 as simple__pb2
```

and we can run the server

```sh
❯ python -m src.server
Server started, listening on port 50051
```

3. Augment the PYTHONPATH to add the target folder of the generated code to allow the generated imports to work

```sh
mkdir -p gen/protos
python -m grpc_tools.protoc --python_out=gen/protos --grpc_python_out=gen/protos --proto_path=protos protos/*.proto
```

If we add these imports

```python
# Import the generated code from gen/protos
from gen.protos import simple_pb2, simple_pb2_grpc
```

to a `src/server.py` file then run it

```sh
python -m src.server
```

we still an error like this

```sh
python -m src.server
Traceback (most recent call last):
  File "<frozen runpy>", line 198, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "/Users/danielcorin/dev/toys/protobuf-zip-imports/src/server.py", line 8, in <module>
    from gen.protos import simple_pb2, simple_pb2_grpc
  File "/Users/danielcorin/dev/toys/protobuf-zip-imports/gen/protos/simple_pb2_grpc.py", line 6, in <module>
    import simple_pb2 as simple__pb2
ModuleNotFoundError: No module named 'simple_pb2'
make: *** [serve] Error 1
```

However, we can get this to work if we augment PYTHONPATH.
This approach allows the import in the generated code and the package import in the server to both work.

```python
# from src/server.py
from gen.protos import simple_pb2, simple_pb2_grpc

# from gen/protos/simple_pb2_grpc.py
import simple_pb2 as simple__pb2
```

It runs.

```sh
❯ export PYTHONPATH=gen/protos
❯ python -m src.server
Server started, listening on port 50051
```

## Generating code to a zip archive

All of the aforementioned approaches require some degree of compromise in package structure or environment setup.
This approach is no different, but I like it best, because it does not require modifying the generated code, the PYTHONPATH or creating what can feel like a mess in the project root, especially when you have many different protobuf services.

The approach is to create a zip archive of the Python generated code -- something `protoc` supports out of the box.

```sh
python -m grpc_tools.protoc -I./protos --python_out=./gen.zip --grpc_python_out=./gen.zip protos/*.proto
```

This command creates `gen.zip` at the root of the project.
When unarchived, we can see it contains these files:

```sh
❯ unzip gen.zip
Archive:  gen.zip
 extracting: simple_pb2.py
 extracting: simple_pb2_grpc.py
```

To make the imports work in our server, we can use `zipimport`

```python
import zipimport

# Import the generated code from gen.zip
importer = zipimport.zipimporter("gen.zip")
simple_pb2 = importer.load_module("simple_pb2")
simple_pb2_grpc = importer.load_module("simple_pb2_grpc")
```

and our server runs

```sh
python -m src.server
Server started, listening on port 50051
```

The final `src/server.py` code looks like this.

```python
import socket
import sys
from concurrent import futures
import grpc
import zipimport

# Import the generated code from gen.zip
importer = zipimport.zipimporter("gen.zip")
simple_pb2 = importer.load_module("simple_pb2")
simple_pb2_grpc = importer.load_module("simple_pb2_grpc")


class Greeter(simple_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        return simple_pb2.HelloResponse(message=f"Hello, {request.name}!")


def serve(port=50051):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("localhost", port))
    except socket.error:
        print(f"Error: Port {port} is already in use")
        sys.exit(1)

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    simple_pb2_grpc.add_GreeterServicer_to_server(Greeter(), server)
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"Server started, listening on port {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
```

You can also find this approach in project form [here](https://github.com/danielcorin/toys/tree/main/protobuf-zip-imports).
