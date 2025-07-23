---
title: 'With MCP, Dates are a Footgun'
createdAt: 2025-07-06T10:14:04.000Z
updatedAt: 2025-07-06T10:14:04.000Z
publishedAt: 2025-07-06T10:14:04.000Z
tags:
  - mcp
draft: false
---

[Model Context Protocol](https://modelcontextprotocol.com/) servers have become a popular way to expose software services for LLMs.
Prior to this post, I'd not spent nearly enough time with them to have a strong opinion of their pros and cons, so I set out to change that.

## Claude, build an MCP server, please

Using the [`fastmcp`](https://gofastmcp.com/) library, I set up a simple, toy MCP server.
The server exposes one tool (a toy example), which expects a `state`, `start` and `end` date and returns a list of generated events.

```python
#!/Users/danielcorin/dev/mcp_dates/.venv/bin/python

from fastmcp import FastMCP
from datetime import datetime, timezone
from typing import Optional, Dict, Any

mcp = FastMCP("Date Search Server 📅")


@mcp.tool
def search_dates(state: str, end: int, start: Optional[int] = None) -> Dict[str, Any]:
    end_dt = datetime.fromtimestamp(end, tz=timezone.utc)

    if start is None:
        # Default to 30 days before end time
        start = end - (30 * 24 * 60 * 60)

    start_dt = datetime.fromtimestamp(start, tz=timezone.utc)

    # Validate inputs
    if start >= end:
        return {
            "error": "Start time must be before end time",
            "start_epoch": start,
            "end_epoch": end,
        }

    results = []

    # Generate some sample data points within the time range
    current_time = start
    while current_time < end:
        # Add some sample events/dates for the state
        sample_dt = datetime.fromtimestamp(current_time, tz=timezone.utc)
        results.append(
            {
                "date": sample_dt.isoformat(),
                "epoch": current_time,
                "state": state.upper(),
                "event": f"Sample event in {state.upper()}",
                "description": f"Event occurred on {sample_dt.strftime('%Y-%m-%d %H:%M:%S')} UTC",
            }
        )
        # Increment by random intervals (1-7 days)
        current_time += (24 * 60 * 60) * (hash(str(current_time)) % 7 + 1)

    return {
        "state": state.upper(),
        "search_range": {
            "start": {
                "epoch": start,
                "datetime": start_dt.isoformat(),
            },
            "end": {
                "epoch": end,
                "datetime": end_dt.isoformat(),
            },
        },
        "results_count": len(results),
        "results": results,
    }


if __name__ == "__main__":
    mcp.run()
```

With this setup (and properly installed dependencies) I can run the server in a few different ways.

```sh
fastmcp run main.py:mcp
```

or just

```sh
python main.py
```

I chose the latter.
Maybe not "production ready" but I just wanted to try things out.

The server started successfully.

To validate further, I ran the MCP inspector

```sh
npx @modelcontextprotocol/inspector python main.py
```

After opening <http://localhost:6274/#tools> and clicking connect, I was able to list the `search_dates` tool and run it.

With that confirmed, I added the MCP server to Claude code, so I could start experimenting with an agent driving

```sh
claude mcp add mcp-dates -- /Users/danielcorin/dev/mcp_dates/main.py
```

It took me a while to figure out a working combination of the shebang in the server and using the absolute path in the `claude mcp add` command.

Debugging this issue wasn't straightforward.

The `/mcp` command in Claude Code also yielded limited useful information.

```sh
╭─────────────────────────────────────────────────────────────────╮
│ Manage MCP servers                                              │
│                                                                 │
│ ❯ 1. mcp-dates  ✘ failed · Enter to view details                │
│                                                                 │
│ ※ Tip: Run claude --debug to see logs inline, or view log files │
│  in                                                             │
│   /Users/danielcorin/Library/Caches/claude-cli-nodejs/-Users-da │
│ nielcorin-dev-new-proj                                          │
╰─────────────────────────────────────────────────────────────────╯
   Esc to exit
```

Running `claude --debug` showed errors like

```
[DEBUG] Reading config from /Users/danielcorin/.claude.json
[DEBUG] Config parsed successfully from /Users/danielcorin/.claude.json
[DEBUG] MCP server "mcp-dates": Connection failed: Error: spawn ENOEXEC
[DEBUG] MCP server "mcp-dates": Error message: spawn ENOEXEC
[DEBUG] MCP server "mcp-dates": Error stack: Error: spawn ENOEXEC
    at ChildProcess.spawn (node:internal/child_process:421:11)
    at Object.spawn (node:child_process:763:9)
    at Function.T02 [as default] (file:///opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js:320:156285)
    at file:///opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js:1340:792
    at new Promise (<anonymous>)
    at Ia1.start (file:///opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js:1340:728)
    at an1.connect (file:///opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js:1338:14717)
    at an1.connect (file:///opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js:1338:20896)
    at file:///opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js:1385:5694
    at Q (file:///opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js:526:13327)
[ERROR] MCP server "mcp-dates" Connection failed: spawn ENOEXEC
```

which also doesn't really indicate what the issue is.

Eventually, I figured out I was pointing to a process that didn't exist or couldn't be run in the way I was trying to run it.

## Call tools with an agent

With the MCP server running and added to Claude Code, I could now prompt it to use the tool.

```sh
> search dates for CA from 9:21am April 1 1994 ET to 11:44pm
  June 4th ET
  ⎿  ⧉ Selected 1 lines from ../mcp_dates/main.py in Cursor

⏺ I'll search for dates in CA from April 1, 1994 9:21am ET to
  June 4, 1994 11:44pm ET using the available MCP dates tool.

⏺ mcp-dates:search_dates (MCP)(state: "CA", start:
                              "765138060", end: 770691840)

╭─────────────────────────────────────────────────────────────────╮
│ Tool use                                                        │
│                                                                 │
│   mcp-dates:search_dates(state: "CA", start: "765138060",       │
│   end: 770691840) (MCP)                                         │
│                                                                 │
│ Do you want to proceed?                                         │
│ ❯ 1. Yes                                                        │
│  2. Yes, and don't ask again for mcp-dates:search_dates         │
│  commands in /Users/danielcorin/dev/new-proj                    │
│   3. No, and tell Claude what to do differently (esc)           │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

You may think the way I prompted doesn't make sense, but what happens doesn't seem easily avoidable regardless of how you prompt.

First, look at the LLM's restatement of the problem, according to my prompt:

> I'll search for dates in CA from April 1, 1994 9:21am ET to June 4, 1994 11:44pm ET using the available MCP dates tool.

This looks correct in that the LLM seems to correctly restate the date range I prompted for.

Now look at the epoch times in the tool call the LLM is proposing.

```sh
❯ date -d @765138060
Thu Mar 31 13:21:00 EST 1994

❯ date -d @770691840
Fri Jun  3 21:04:00 EDT 1994
```

These dates are _close_ to what I asked for but wrong.

Based on my experience with LLMs, this doesn't surprise me at all.
We're using the model to run inference to create something that looks like a proper tool call and in the process, hoping it converts the date strings to epoch times by inference alone.

Let's skip the conversation about why this is confusing and problematic, especially for non-experts being asked to use agents connected to MCP servers to try and increase their productivity.
Would they even notice the subtly incorrect epoch times outputted by the model?
Would you?

## Just add another tool

We can add another tool that allows the agent to parse the date string to epoch time.
Then the model can help prevent itself from making this mistake.

```python
@mcp.tool
def parse_date(date_string: str) -> Dict[str, Any]:
    parsed_date = dateparser.parse(
        date_string, settings={"RETURN_AS_TIMEZONE_AWARE": True}
    )

    if parsed_date is None:
        return {"error": "Could not parse the date string", "input": date_string}

    epoch_time = int(parsed_date.timestamp())

    return {
        "input": date_string,
        "epoch": epoch_time,
        "datetime": parsed_date.isoformat(),
        "human_readable": parsed_date.strftime("%Y-%m-%d %H:%M:%S %Z"),
    }
```

Let's run the agent with the same prompt:

```sh
> search dates for CA from 9:21am April 1 1994 ET to 11:44pm
  June 4th ET
  ⎿  ⧉ Selected 18 lines from ../mcp_dates/main.py in Cursor

⏺ I'll help you search for dates in CA from April 1, 1994
  9:21am ET to June 4th 11:44pm ET. Let me first parse those
  dates to get the epoch timestamps, then search.

⏺ mcp-dates:parse_date (MCP)(date_string: "April 1 1994 9:21am
                             ET")
  ⎿  {
       "input": "April 1 1994 9:21am ET",
       "epoch": 765210060,
     … +3 lines (ctrl+r to expand)

⏺ mcp-dates:parse_date (MCP)(date_string: "June 4th 11:44pm
                            ET")
  ⎿  {
       "input": "June 4th 11:44pm ET",
       "epoch": 1749098640,
     … +3 lines (ctrl+r to expand)

⏺ Now I'll search for dates in CA within that time range:

⏺ mcp-dates:search_dates (MCP)(state: "CA", start:
                              "765210060", end: 1749098640)

╭─────────────────────────────────────────────────────────────────╮
│ Tool use                                                        │
│                                                                 │
│   mcp-dates:search_dates(state: "CA", start: "765210060",       │
│   end: 1749098640) (MCP)                                        │
│                                                                 │
│ Do you want to proceed?                                         │
│ ❯ 1. Yes                                                        │
│  2. Yes, and don't ask again for mcp-dates:search_dates         │
│  commands in /Users/danielcorin/dev/new-proj                    │
│   3. No, and tell Claude what to do differently (esc)           │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

The agent recognizes it needs to parse the natural language dates into

```sh
❯ now 765210060
Fri Apr  1 09:21:00 EST 1994

❯ now 1749098640
Thu Jun  5 00:44:00 EDT 2025
```

The behavior of the library I choose with the timezone is a bit unintuitive here

```python
>>> int(dateparser.parse('June 4th 10:44pm ET').timestamp())
1749095040
>>> int(dateparser.parse('June 4th 10:44pm').timestamp())
1749091440
```

```
❯ now 1749095040
Wed Jun  4 23:44:00 EDT 2025

❯ now 1749091440
Wed Jun  4 22:44:00 EDT 2025
```

But how this library works is beside the point.
We're now two layers into dealing with this date parsing conversion issue and we've hit "edge cases" almost immediately with each proposed solution.

## End user experience

Users of products like this will not like this inconsistency once they figure out what is happening.
Behavior like this breaks trust.

When users learn they cannot trust the tool to do what they expect and what they've asked it to, some will not keep using it.

It is a lot to expect an end user to validate data returned from a tool call in a potentially unfamiliar data format.

It _could_ be reasonable to give to a technical user with the explicit understanding that these types of things are a problem (like the "LLMs can't do math" conversation).

Asking a non-technical end user to use an agent equipped with MCP tools is inviting them to think they've solved problems where the agent makes subtle and undetected errors.
In the worst cases, important decisions made be made with the assumption that the agent's process was correct.

Here, we show it's easy for that not to be the case.

## Not exceptional behavior

I did not have to repeat the experiments above to experience the problematic behaviors.
These issues happened the first time I tried each example.

Could I find a better date parsing library? Probably.

Could I patch these edge cases as well? Likely.

Is it easy to make an MCP server that doesn't make subtle, difficult-to-detect errors? It wasn't for me.

Tools (APIs) that support dates are quite common.
This investigation was inspired by using a Slack MCP with exactly the same issue.

This issue is in the wild today.

This issue interfered with my ability to use an agent to solve a problem _last week_.

After figuring out what the issue was after several hours of debugging, I realized it would have been far better to use the agent to write code to solve the problem.

I would have had something to show for my time.

I would have been able to reliably debug my issues.

And I would have been able to reuse the code to solve the same problem in the future.

## Takeaways

Agents equipped with tools from MCP servers can be useful, but effective use requires scaling the learning curve, developing experience with LLMs to understand their limitations, and verifying the process used to derive the result.

Leaning on an agent to write code to use to solve your problem is a more stable way to incrementally make progress to the goal while verifying correctness along the way and allowing for easier reuse.

Agents with equipped with tools from MCP servers remain useful for 1-off tasks where strict correctness is either not critical or is easily verified.
