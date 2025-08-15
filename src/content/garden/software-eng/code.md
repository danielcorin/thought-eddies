---
draft: false
title: Code
toc: true
---

## Encode your standards

Make your code look how you would want future contributions to look. Documentation of standards and scaffolding both help, but a lot of code is copy-pasted.
With this approach, when your code is copied, new contributions will adhere to your standards by default.
Supplement with a code formatter or linter that enforces rules automatically through an IDE, version control or builds.
This approaches also helps avoid discussion about style and formatting in code review.

## Deploy often

Deploy code when it merges.
If your deploy introduces an issue, it will be easier to identify the offending change.
Deploy automatically on merges if possible, but limit these to business hours to avoid unintentionally creating issues after hours.
An oncall engineer can always deploy manually if they need to.
