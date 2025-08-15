---
title: 'Things I used to believe'
draft: false
toc: true
---

These are some things I believed about software engineering and personal development that proved not to be as true as I thought they were.
Most of this is written from the perspective of my experience working as a software engineering professional.

## I'm not the type of person who is good at `X`

This mentality held me back.
I may not be a person who is good at X _yet_, but this type of thought process has usually ensured I don't get good at X for longer.
You're generally the worst at a skill when you get started.
As you learn and apply a skill, you get better.
This is how you go from not being good or feeling confident to becoming more skilled and effective.
There are no shortcuts, only more and less effective ways to use your time.
Figure out what works for you, how you best learn, and what excites and motivates you.
Lean into that.

## There is generally one good way to build a backend microservice

My first job as an engineer building production software was at Uber in 2016.
Uber engineering had a highly opinionated approach to developing microservices that had been "battle tested at scale".
It was heavily inspired by the Clean/Onion architecture, and there was a well written internal document on how to apply approach and reason about structuring an application such that you'd be flexible to scale and rapid change.
I internalized this approach as the _one true way_ to build.
I'm lucky it was a relatively good approach, but having had several more professional experiences since then, I no longer believe in applying such a one-size-fits all approach.
This type of architecture remains my favorite for production microservices, but it requires enough investment that if you're prototyping or extremely time constrained, it's likely more effort than it's worth.
It's a versatile pattern, but not one to be applied thoughtless.
Being willing to be less rigid in applying this pattern everywhere helped me grow as an engineer.

## If we'd only had the right requirements, we could have built it right the first time

This statement is true but also near impossible to accomplish in the real world.
If you work in a dynamic business, you will likely never have all the requirements you'd want to build a software system that will ship in several months.
Just as you as the engineer are figuring out how to design the system, the business is figuring out the business model, product and design are figuring out the user journey and experience, and other contributors are figuring out how their responsibilities fit into the greater whole of the project.
A change or new learning from any part of the team could trigger necessary adjustments elsewhere.
The team can either ignore these new learnings and ship a less effective product, or incorporate it and make adjustments to the initial plan as needed.
Unfortunately, a change like this can require many teams to rework existing assumptions and plans and this may feel wasteful, but if the goal is to build the best product possible, it can this be the right decision.
I've never seen a straight line journey to getting through a complex project.
Becoming comfortable and expecting changes to plans will save you frustration and help you design better, in anticipation of inevitable changes to original plans.

## You need 100% unit test coverage

At Uber, I was a member of a team with a 100% unit test coverage policy.
I didn't have prior examples to compare to, so I just wrote tests for all my code.
Sometimes, getting to 100% required unusually testing approaches, and occasionally I would need to `nocover` lines to ensure the build wouldn't flag a decrease in coverage percentage.
There are pros and cons to this approach, but like any "best practice", it's not to be applied without consideration.
There are also diminishing returns to unit testing every line of code.
This is not to say you should skip testing edge cases or exception paths, but that not all tests are created equal.
If it takes you two hours to get that last line of test coverage, those two hours might have been better spent elsewhere.
I still am a proponent of 100% test coverage, but only to highlight unintentionally missed covered lines.
I support the use `nocover` to make this approach more realistic along with comments as to why the test wasn't worth writing, especially if you went down a rabbit hole trying.
This practice helps future you and future contributors.

## Dynamically typed languages are better than statically typed languages

The first language I wrote code in was Java in college.
Several months later, I learned Python, and it was like a breath of fresh air.
Writing code was all of a sudden far easier.
I could mostly focus on logic without getting bogged down in types.
I was encountering so many new things at the same time that removing types from the picture allowed me to get more comfortable writing and running code.
What I didn't have an appreciation for at the time was that a lack of compile time type checking introduces an entirely new class of errors to a program.
I couldn't have an appreciation for this because I barely had a concept of the difference between an error at compile time versus an error at runtime.
By avoiding types, writing code became easier.
Maintaining the code would be harder, but I needed to learn that from experience.
For what it's worth, Python is often still the first language I reach for when I need to code something up quickly.
