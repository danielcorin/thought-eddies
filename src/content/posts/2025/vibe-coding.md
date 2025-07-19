---
title: "Vibe Coding in early 2025"
createdAt: 2025-04-06T09:50:16-04:00
updatedAt: 2025-07-18T09:50:16-04:00
draft: false
tags:
- vibe_coding
- agents
---

This post is an edit and repost of my [rant from Bluesky](https://bsky.app/profile/danielcorin.com/post/3llhwuxml2k25)

## Some problems with vibe coding

Having done a lot of vibe coding lately, I think I'll move away from it (for now) as a primary approach to build any software that I care about, even a little bit.
Current agents eventually fail to adhere to some prompt despite various attempts and approaches.
Whenever this happens and I look in the codebase I am usually mortified by what I find.

You might argue I need to use rules better or something like that.
I would say that isn't vibe coding as I understand it.
I interpret vibe coding as the agent addressing whatever whim I have in the realm of the possible, figuring it out for me.
Mostly, I end up with spaghetti codebases that the agent cannot untangle and that I don't want to untangle.

Agents have a strong tendency to start generating code.
Give one a task and it is off to the races.
In a new project, this approach isn't the worst thing.
In a project with existing functionality, this becomes a problem due to a combination of lack of context and lack of effective planning.
The two go hand in hand.

Agents use search to look around a codebase to find relevant files to pull into context.
You can also use rules, documentation, or READMEs to define how an agent should structure the codebase.
At some point, often unbeknownst to you, the agent fails to pull a relevant file into the context window or misses reading a rule it should follow.

Initially, this oversight doesn't manifest as a problem.
The agent does what it does best: writes some code to solve the problem.
No shared states available in the React app?
No problem, it'll write some hooks for you.
You validate the behavior in the browser.
Looks good?
Commit and ship.
You can get away with doing this and never reading the code...for a while.

Now the codebase has fragmented state.
You come back to the codebase 15 commits later.
The application has grown considerably -- agents are good at a lot of code.
You prompt the agent to make more changes using the state and it fails.
Try some follow up prompts, debug, add MCPs to pull in more context.
Why isn't it working?

Finally you crack open the code.
What are you even looking at?
Probably something that feels like thousands of lines of a legacy codebase, even if you wrote the whole thing that week.
You can use the model to find which code deals with the problem you currently have.
You'll probably find that state is everywhere.
State in hooks.
State in redux.
State in zustand.
You really should have written more rules to define your codebase conventions.

But it's too late.
Even if you had reasonable codebase conventions, for every convention rule you do write there will be one the model eventually misses.
The agent will invisibly write working code that makes decisions on your behalf, filling in under specified requirements, and eventually you will have a tangled mess of a codebase.

The code the agent writes will work and appear to meet your requirements, but if you don't read or at least skim the code (and have some idea what you're looking at), you're not going to realize when the model deviates in its approach from what you consider reasonable.

This deviation becomes a problem only later when you realize it's happened but at that point the agent has made more poor decisions based on this initial one.

With current agents, I don't believe all of these problems can be anticipated.
I don't believe you can rule-write your way out of them because you rarely know what the X0,000 line codebase should look like when it's only X,000 lines.
You can write code that remains flexible and is refactorable, but today, you can only rely on yourself to know if the agent has deviated from the rules you wrote.
Agents don't follow instructions consistently enough to be expected to follow them without verification of the code itself.

When I notice an agent isn't following instructions as I'd hoped, I could evaluate the plan and pull in more context in case the agent missed something.
To be able to do a good job of that, I need to know the codebase, at least architecturally.
I need to know how state is managed, what libraries are used, how the file hierarchy is organized.

I need to know these things in case the model misses something when generating code, so I can step in and make corrections or at least steer it back in the right direction.
If I only find out the model has been doing something like weird state duplication and synchronization _after_ the agent finally stops being able to make progress, it's going to be painful to get back on track.

The agent cannot be prompted to code itself out of the hole it digs.
I've tried.
I've told the model to identify duplication and refactor.
I've read the code and identified the points of duplication then told the model where and prompted for a refactor.
State of the art agents fail.

So where do I go from here?
I've actually had immense success writing code using agents and models with my hands on the wheel.
For production code, this has always been the only viable option.
But for personal projects, I now appreciate the ceiling vibe coding places upon them.

I can vibe code a fun game but eventually, I may not be able to add more features due to the unmaintainable sprawl the model eventually creates.

There is a small cost here. I have to be a touch more thoughtful as I build something to ensure the agent is staying on the rails.

In doing so I understand how my project works, learn new things as I collaborate with the agent, and keep the code in a state where it can continue to be extended.
I'll definitely progress more slowly than fully embracing the vibes but I won't fly off the rails either.

For now, I'm out on pure vibe coding but I'll still be using models and agents often to help me write code.

---

Reply on [Bluesky](https://bsky.app/profile/danielcorin.com/post/3llhwuxn6lu25)
