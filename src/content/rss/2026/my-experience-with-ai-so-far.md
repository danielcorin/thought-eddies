---
title: 'My Experience with AI So Far'
date: 2026-11-14T18:42:42-05:00
draft: false
---

Going from experimenting with LLMs to coding with LLMs and coding with agents has been a several-year journey. With that journey came new ways of working and getting my computer to do what I want it to do.

I would say this roughly kicked off for me around when I wrote [this post](/posts/2023/playing-with-language-models/), which marked the end of a roughly three-year hiatus from writing on this blog.

If you look at my post volume alone, you'll see something happened. I was inspired.

In my career up until that point, my job was to write software. Before LLMs, I typed the software out or copied and pasted from similar or template code, Stack Overflow, documentation, or used code generators.

When LLMs got even a little good at writing code, I rapidly switched to running most of my code generation through them. It wasn't so much that the code was correct as that creation for me is more of a diffuse process, or like sculpting. Getting something started is the hardest part. From there, refining, sculpting, and steering feel more natural. LLMs solved this painful cold start for me in a way that allowed me to do more almost immediately. Not because they were doing all my work or making me more productive but because they gave me something to critique and improve upon. Or often throw away, if the idea didn't feel right or work the way I needed it to.

LLMs unlocked one of the last remaining barriers between me and creation using a computer — the removal of the need to write every line of code. Most of my projects are not production software. But I put tremendous time, care and refinement into a number of my projects nonetheless. I like my software to work with me, not against me. I know what that means to me, and with LLMs and more recently coding agents, this is all feasible given the time and skills I have to commit to the pursuit.

My first "big" project I started on coincided roughly with the release of Cursor. Before Cursor, I was prompting ChatGPT and copying code in and out of it. With Cursor, the copying was no longer necessary. All the work happened in the editor. And the removal of that friction and the progress it enabled emboldened me to build an Electron app I called [Delta](https://github.com/danielcorin/delta).

The inspiration for Delta was from a pattern I had noticed experimenting with LLMs and some local models. What I had observed was that deeper into conversations, the models seemed to become much more interesting and "deep" compared to the first few turns of the conversation where they seemed more reserved or generic.

With Delta, I aimed to capture interesting conversations and make it easy to "fork" off of them and take them in different directions. This made it easy to reuse interesting chats for multiple purposes where the model stayed interesting. It was tough and slow thinking back on it. And it lacked a lot of polish. But at the time, I couldn't believe how much progress I was making. It was alluring and compelling and addicting. I was making my ideas real and the code wasn't getting in my way. And I say that as someone who, at the time, was writing code for a living. I was better at writing code than most of the general population.

I pushed Delta to a reasonable stopping point. I don't think I ever managed to notarize it or distribute a build. But I learned a lot from it, and more importantly, though it was interesting to build, it never became something I used every day. It served a niche but didn't really fit how I worked.

[Tomo](https://github.com/danielcorin/Tomo) was the first app I built that I really used. The concept was simple. How can I make it as fast as possible to prompt an LLM with a question in the context of what I am doing?

I still use Tomo to this day, even as agents have become better and more powerful. It supports the OpenAI chat completions API and so it can route to today's models. It makes direct API calls using only the context I provide. It can't get much faster. I rely on it for low-latency question answering given text and image context from my machine. It's just a chat, not an agent.

With Tomo and the improvement of agents, I became more ambitious. I pushed hard for UI/UX polish and started to better understand my personal design tastes. I also released the app and added a proper update feature using Sparkle and an R2 bucket, with release notes.

I remember how nervous I was when I decided to try to add the app update feature. I wasn't very familiar with Xcode and Apple's docs are tough to read. But the agent (I think probably Claude Code, though I remember starting the project using Cursor, so something like Sonnet 3.5-3.7 or early Opus 4) carried me. I had the feature built in a few hours one Sunday. This was another milestone that reinforced the reward of ambition when working with these new AI tools.

Working on Tomo happened during a period of hyperfocus. I had an idea and the tools were helping me get there. But I was still dedicating 10s of hours to the development, painstakingly testing and correcting the model and buffing out rough edges. I wanted to build the tool badly and I expended a lot of effort doing it. I wouldn't call the process easy — just easier than ever before at that point in time. And given my computer and software skills, now possible and feasible for me to do because I was ready to invest the time and energy and the tools allowed for it.

The next notable event I can recall is my discovery of Tim Kellogg's project [Strix](https://timkellogg.me/blog/2025/12/15/strix), his personal agent. I didn't really understand what he was building and reading his blog posts was an odd experience (I believe the agent wrote them) but I felt a pull to try it out.

From this emerged my (private) project "Filae", a personal agent (that named itself, of course) built on top of the Claude Agent SDK and thus, sharing my Claude Max subscription tokens. The project would have never worked without that. It would have cost too much and the cost alone would have prevented me from experimenting as much as I did.

Filae started as a command line chat that kept a record of all chats and updated files based on conversations I had with it. Effectively, these files were the agent's memory. This pattern already existed in a few different forms, most notably at the time, RAG (which often used vector stores) and `CLAUDE.md` / `AGENTS.md` files which were special files the agents always loaded. MCPs and nascent skills also provided agents more ways to load external context. But much hadn't been figured out yet and the agents were only ok at using them and they were often context inefficient, especially MCPs.

Tim's personal agent architecture enumerated all the relevant files that the agent should know about and how to use them in the system prompt. And since they were just files on the file system, agents were already good at working with them.

Another interesting wrinkle of the system was that its conversation was "stateless". This meant every message to the agent actually reconstructed the prompt from scratch, pulling in everything the agent might need, including recent messages, to respond. Notably, it did not work by continuously appending messages to a list of messages, which would have eventually grown too long and filled the context window. It was a sliding window of context and it worked quite well.

Working with this agent and eventually building another (based on [Pi](https://github.com/earendil-works/pi)) transformed my perception of what was possible in terms of agent autonomy. After starting with the CLI chat, I wired the agent into Matrix so I could chat with it from my phone. Then I put it on a Fly.io VM. Then I wired up GitHub CI and gave it the ability to modify and commit to its own repo, triggering a restart of the process with the new code.

The self-modifying system became foundational for what I aimed for when building future agentic systems. Pi was early to getting this right. But it's not just about the harness. It's about your harness development loop. Can the system modify and restart itself? Can it introspect on itself and debug iteratively? The agent system is the system best positioned to help you debug it once the model becomes smart enough. We seem to have reached that point.

Eventually, I moved my agents over to Slack and added tool calls as threaded messages in response to my prompts. Slack ended up freezing my free account for too much activity. So I built [threads.space](https://github.com/danielcorin/threads.space), my personal chat app for friends and family to work with agents.

I also moved my agents to a MacBook homelab. Agent restarts now took a second or two and didn't require a VM deployment. And with top-end hardware I could start to work on more ambitious projects and host them, marginally, for free.

I gave the agents a GitHub account and a Cloudflare account and started building things. I would explore various paths, like how I could expose a service on the MacBook to the public internet with a Cloudflare tunnel.

I would frequently code with agents while walking around and going about my day. This started sometime around January or February with Matrix and continued as I improved my tools and refined friction out of my workflows.

I captured the stuff that was working in skills. This allowed me to do things like prompt the agent to create a custom website showing realtime arriving and departing subway trains at the stations nearest to my apartment from my phone with a few prompts. With D1, R2, and Durable Objects I could make pretty much anything that came to mind.

In a pre-agent world, I'd thought of software as valuable. It took time and care to make, and to make it well; it still does. But agents have introduced a new kind of software. Disposable software. More like a tissue than a book. And I was making (or using) lots of _that_.

Using Threads, I would chat with my agent to build and deploy web apps. I had my own auth server in front of my apps to keep them private. Then the agents could manage accounts and I could also collaborate with friends and family in Threads to iterate on and modify ideas further. It was a great setup and was my daily driver through October/November of this year.

I'd been preferring Claude Code and Codex for developing personal macOS/iOS apps since about June. I didn't use Threads for these because I didn't feel like setting up Xcode on that machine and I shipped so often, TestFlight wasn't going to allow me to distribute the apps to my phone as often as I would have wanted to. Also, I needed to test the Mac apps as I built them so dev on the machine I was primarily working on rather than the homelab made enough sense.

I was running up against most of the problems people managing multiple agents run into. Managing multiple agents, across multiple projects. Trying to figure out which needs your attention, when. Trying not to completely lose track of all context while you work. Idea fractals leading to far too many threads being pulled at the same time.

I had been running out of Ghostty for a while with 8-10 panes at the same time, but it had become unmanageable. I tried cmux for a few days and it felt bad but I liked some of the ideas.

So, with Opus 5.5, I started prompting my way to the thing I wanted, working with SwiftUI because native feels nice, and eventually adding a mobile app networked to my machine with Tailscale. And so far it hasn't stopped working. I haven't stopped being able to get it to do what I want.

The agents build my app and my app manages my agents. My app, "Agents", became my personal daily driver on day two of its existence. It combines much of my personal learnings and preferences for how I like to use my software. It's native, has hotkeys for basically everything, builds a CLI for first-class agent support for agents to interact with and operate it. I especially love that my agents have the ability to use the app how I use it.

They can open terminals, start servers, and show me what is going on in the browser. Every part of the app I allow my agents to operate immediately feels more useful. Managing multiple panes of varied types is not much fun, but having the agent do it as I need is as easy as anything else these days. And most importantly, I can build the system in the system, an important mark of something which will last (until it builds its replacement).

In a way, this system felt too easy to build. Too easy in that if I was able to build the core of the functionality in two days with a decent amount of polish in about a week, so could thousands of other people if they were sufficiently motivated.

From this, I've developed further conviction behind the thesis that building software is now like making food at a restaurant. Most people can cook something edible for themselves, but it's rarely as good or well-executed as at a great restaurant. And there are some restaurants that sell tons of fast, cheap food that isn't that great but people still buy it because it is what they need: available or inexpensive.

If you make software now, you better know who you are selling to and why they won't make the same software themselves or switch to buying from someone else the moment they have the chance.

But it is the greatest moment ever to be building software for yourself.
