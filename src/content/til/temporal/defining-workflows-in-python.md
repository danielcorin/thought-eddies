---
title: Importing Activities for a Temporal Workflow in Python
createdAt: 2023-08-27T09:58:08.000Z
updatedAt: 2023-08-27T09:58:08.000Z
publishedAt: 2023-08-27T09:58:08.000Z
tags:
  - temporal
  - python
draft: false
---

A spot where I slipped up in trying to adopt Temporal in an existing Python project and then again in starting a new Python project was in defining a Workflow that invokes an Activity that calls a third party library.
Temporal outputs an error message with a long stacktrace that I vaguely understood but didn't immediately know the solution to

```sh
...
raise RestrictedWorkflowAccessError(f"{self.name}.{name}")
temporalio.worker.workflow_sandbox._restrictions.RestrictedWorkflowAccessError: Cannot access http.server.BaseHTTPRequestHandler.responses from inside a workflow. If this is code from a module not used in a workflow or known to only be used deterministically from a workflow, mark the import as pass through.
```

The message itself is very informative "mark the import as pass through", but requires a follow up search to find the right snippet to get right.
I also overlooked the note about importing Activities in Python, mentioned in the [Getting Started Guide](https://learn.temporal.io/getting_started/python/hello_world_in_python/#create-a-workflow).

```python
# Import activity, passing it through the sandbox without reloading the module
with workflow.unsafe.imports_passed_through():
    from activities import say_hello
```
