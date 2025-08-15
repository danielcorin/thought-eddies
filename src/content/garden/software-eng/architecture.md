---
draft: false
title: Architecture
toc: true
---

## Avoid unproductive complexity

It can be fun to play with new technology, but be thoughtful when picking spots to try something new. Consider who will need to support the system and whether the additional complexity unnecessarily increases the burden on your teammates.

## Know what your systems cost to run

If you use cloud providers' infrastructure, it's easy to lose track of what you spend to run your systems. Periodically audit your spend as an engineering team. Knowing what you spend on infrastructure and why will position you well to answer any questions about your teams' costs.

## Adapt your code to be vendor-agnostic\*

\*Loosely held.
Design your system to agnostic to vendors wherever possible.
Avoid adopting nomenclature of a third party throughout your systems.
Keep this at the system's edges.
For example, at the edge of your system, you may have a DynamoDB record.
In the internals of your app, map to a different type.

## Design self-healing systems

Expect things to break when you design them and decide how your system will behave _when_ they do. Use queues and retries to avoid involving your oncall for as long as tolerable by the business.
When broken systems are restored, all the system to proceed without requiring oncall intervention.
If oncall _must_ get involved, proactively write admin tools to assist with mitigation.
If you find you're missing tools that would have helped after an incident, build them for next time.
