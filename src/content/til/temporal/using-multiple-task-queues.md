---
title: Using Multiple Temporal Task Queues
createdAt: 2024-04-29T20:29:04.000Z
updatedAt: 2024-04-29T20:29:04.000Z
publishedAt: 2024-04-29T20:29:04.000Z
tags:
  - temporal
draft: false
githubUrl: 'https://github.com/danielcorin/toys/tree/main/temporal_task_queues'
---

Temporal gives you flexibility to define different task queues to route workflows and activities to specific workers.
When a worker starts up, it is configured to consume from a specific task queue by name, along with the activities and workflows it is capable of running.

For example:

```python
import asyncio
import concurrent.futures

from activities import my_good_activity
from temporalio.client import Client
from temporalio.worker import Worker
from workflows import MyGoodWorkflow


async def main():
    client = await Client(...)

    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as activity_executor:
        worker = Worker(
            client,
            task_queue="my-task-queue",
            workflows=[MyGoodWorkflow],
            activities=[my_good_activity],
            activity_executor=activity_executor,
        )
        await worker.run()

if __name__ == "__main__":
    print("Starting worker")
    asyncio.run(main())
```

Let's say we wanted to execute the workflows using one task queue and the activities with another.
We could write two separate workers, like this.

For workflows:

```python
import asyncio
import concurrent.futures

from temporalio.client import Client
from temporalio.worker import Worker
from workflows import MyGoodWorkflow


async def main():
    client = await Client(...)

    worker = Worker(
        client,
        task_queue="my-workflow-task-queue",
        workflows=[MyGoodWorkflow],
        activities=[],
    )
    await worker.run()

if __name__ == "__main__":
    print("Starting workflow worker")
    asyncio.run(main())
```

For activities:

```python
import asyncio
import concurrent.futures

from activities import my_good_activity
from temporalio.client import Client
from temporalio.worker import Worker


async def main():
    client = await Client(...)

    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as activity_executor:
        worker = Worker(
            client,
            task_queue="my-activity-task-queue",
            workflows=[],
            activities=[my_good_activity],
            activity_executor=activity_executor,
        )
        await worker.run()

if __name__ == "__main__":
    print("Starting activity worker")
    asyncio.run(main())
```

If we run each of these workers independently

```python
python -m run_workflow_worker
```

```python
python -m run_activity_worker
```

now we can start a workflow and the two worker processes will execute the workflow and activity code:

```python
import asyncio
import uuid

from temporalio.client import Client
from workflows import MyGoodWorkflow, MyWorkflowGoodArgs


async def main():
    client = await Client(...)

    result = await client.execute_workflow(
        MyGoodWorkflow.run,
        MyWorkflowArgs(
            arg1="good",
            arg2="workflow",
        ),
        id=str(uuid.uuid4()),
        task_queue="my-workflow-task-queue",
    )

    print(f"Workflow completed with result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
```

If we did it right, when we run a workflow, we can see each task queue show up separately in the Temporal UI.

![Temporal UI showing different task queue names](/img/til/temporal/queue-ui.png)

Note: the Temporal [`samples-python`](https://github.com/temporalio/samples-python) has a [multi-language example](https://github.com/temporalio/samples-python/tree/main/activity_worker) of this pattern using Python and Go.
