---
date: '2024-04-21T10:25:33Z'
title: 'Craft, constraints and software in the real world'
draft: false
tags:
---

This article,
[I love programming but I hate the programming industry](https://www.deathbyabstraction.com/I-love-programming-but-I-hate-the-programming-industry),
is a lively addition to the conversation on the expectations placed on software
developers in corporate environments. My experience working at medium-large
software companies has been that there is always a give and take between
building features that make money and satisfy business needs, and having a sense
that you've built software thoughtfully, that can endure and scale -- software
built with craft. The balance between these two can vary widely but is a
necessary tension in a business environment.

I've come to view the dissonance one feels as an author of software in a
money-making environment as a mismatch in what success looks like between an
author of software who cares about the craft of writing software and a business
operator who is responsible for engineering user behavior in service of an
organization's goals (usually making money).

Maybe it's trite, but I think the comparison of a table made out of high-quality
wood and a mass-manufactured table made out of press board is apt. There is a
large overlap in function but only the one made with quality is likely to stand
the test of time. However, a lot of people need tables and lower quality table
can be made quickly, purchased more cheaply, and sold in larger volumes.

It can be easy to convince yourself that the cheap things you get today are
going to work well enough for now and into the forseeable future. In practice,
there is a tradeoff between resources in the present and the future, time and
money often being some of the most often considered.

Businesses typically operate in highly competitive environments where there is a
strong push to do things today because the future isn't guaranteed. Software
developers for a business are not always aligned with this mentality. Someone
writing software might want to dedicate more time to considering whether a
system will be maintainable or scalable because if the business requires that,
it's often easier to plan for it upfront rather than trying to retrofit into a
live system for a business whose systems are having scaling growing pains.

This area is one where software developers and business operators often find
themselves at odds. Business operators frequently want to ship the minimal
viable product because the sooner something goes to market, the sooner you will
know if your ideas work and what to try next. Business operators also aren't
directly responsible for making software scale, so they're much more likely to
push for the thing they are responsible for -- growing the business.

Software developers are responsible for the systems. This is includes designing
architectures, building systems and shipping products to users and making sure
they scale (don't break when a lot of people use them at the same time). If the
business they are a part of runs out of money and can no longer operate, there
won't be anything to scale. If the business does succeed, the developers and the
business may pay a cost for corners they cut to get to where they are.

One common difficult growing businesses encounter is when a single SQL data
store starts to fail under the load of too many use cases. These types of
databases can only scale vertically, meaning you can increase the size of the
machine you run your database on, but if you can't find a bigger machine, you
will struggle to scale further without making larger changes to your application
architecture. Adopting a different type of database (like a NoSQL database[^1])
earlier requires a certain amount of foresight, but also is a tradeoff in
flexibility. With a NoSQL data base, you can't run arbitrary queries against all
your data at the same time. You usually need to design your tables to support
known query patterns. This preparation for "scale" may end up being unnecessary
if you never actually _need_ to scale the product because it doesn't achieve
success but it preparation for scale will likely slow down the pace at which you
can change the product in response to feedback from customers.

You need to consider whether this tradeoff will undermine your ability to
succeed at building the product. I've seen teams struggle with quantifying these
tradeoffs, especially when the long-term existence of the business is in
question. Saying "we don't know if we're going to exist in the next `N` months"
often wins the day when advocating against investing in software scalability in
favor of a leaner MVP. However, playing the "this will never need to scale" card
is also dangerous if it's not necessarily true. Not taking any time to consider
technical challenges you might encounter in the future can lead to a lot of pain
and lost time down the road. Time is finite and you want to spend it doing the
most valuable work you can.

In the [ZIRP](https://en.wikipedia.org/wiki/Zero_interest-rate_policy) era, this
phenomenon occurred quite often. Companies deployed billions in capital to start
or compete in industries that (nearly) disappeared after just a few years. In
2018, Bird (among many other companies), began deploying thousands of electric
scooters in major cities around the world at single-digit dollar rental prices.
The startup achieved multi-billion dollar valuations at paces
[never seen before](https://qz.com/1305719/electric-scooter-company-bird-is-the-fastest-startup-ever-to-become-a-unicorn).
Bird captured the attention of many in the technology world due to the breakneck
speed at which they were building, scaling and deploying. They were re-writing
the rules for how quickly a company could scale. At the time, Uber, the
incumbent king of blitzscaling, felt threatened enough by this business that it
decided to [acquire](https://www.wired.com/story/uber-acquires-jump-bike/) the
electric bike share company, JUMP and launch an electric scooter service under
that brand. These companies were punting products out the door as fast they
could get employees to build something customers could use. These are not the
types of environment conducive to building with craft. The goal here was to get
customers to use a product as quickly as possible, then figure out everything
else later. Whether it was effective is a separate conversation -- it was a
business strategy.

On the other side of the argument, building beautiful, scalable systems for a
business that never acquires any customers may be an exercise in craftsmanship,
but software developers can only work for so long without needing money to
support themselves and getting paid typically requires you work for an
organization that can afford to pay its employees[^2].

Business is messy and a competitive business environment imposes demands on
companies to produce in ways that are often at odds with high-quality
craftsmanship. Spend five minutes reading about how difficult it is to make a
living as an artist and that will be made clear.

While the demand for skills in building software are high, the demand for
software craftsmanship less so, at least in the explicit sense. For most
businesses, software is a means to an end to deliver a product to users.

Users do recognize craftsmanship in software[^3], even if they don't exactly
know why they prefer well designed experiences to lean MVPs. It's the feeling of
ease you get when you use something that just works. Or the absence of the
frustration you all to frequently experience in an age with countless mediocre,
carelessly constructed products. Apple built its empire or things Just
Working[^4].

I think demands of faster-than-ever pace placed upon businesses (both internally
by executives and externally by markets and investors) make it difficult to
invest in craftsmanship. This is not to say no one does it, but it requires more
upfront investment to continuously make decisions that prioritize the quality of
your product given the constraints of running a business. It requires vision for
why craftsmanship is essential to your business's success.

Craftsmanship implies quality -- something that is difficult to preserve as one
does more of a thing. Craftsmanship takes times -- if it were easy, it would be
undifferentiated. This is also not to say it's impossible to scale something of
high quality, just that's it harder than scaling if one doesn't focus as much on
quality or makes too many compromises prioritizing scale or speed. Many more
businesses seem to prefer the pursuit of the largest possible total addressable
market over the highest quality product. I imagine this is because they perceive
this approach as the best way to make the most money.

Writing software in a corporate setting, to some degree, does always reduce a
software developer down to a cog in a machine. You're employed to empower the
organization to make more money. Hopefully your expertise is valued, but it
might not be. You may have been hired merely because someone with a budget was
able to staff a team to work on a project that recently was given funding. You
likely will be asked to do a lot given difficult constrains resulting in lower
software quality than you aspire to write.

If what your doing has implications in the real world, it's more complicated
than just software and it's messy in one way or another. As someone who studied
Physics, I often find myself searching for simple and elegant solutions to
software problems that uniformly capture designed behavior and edge cases alike.
The author's articulated desire resonates with me

> I want every how - from the programming language and paradigm, architecture,
> down to every line of code and piece of syntax - to be informed by the why of
> the system that is being built. And I want that why to be a reflection of a
> genuine existing need, not some bullshit business metric which pretty much
> exists for its own sake.

I would argue that many small companies begin with this somewhat idealist
approach and goal in mind. The "genuine existing need" to be addressed are the
business' customer needs. If a business is successful enough, it may try to do
more of what it is already doing or expand to do more related things. From these
ambitions it invents and borrows from prior art, systems to implement the
execution of its goals at a greater scale. Success in business seem to lead to
the proverbial "bullshit business metric".

It's difficult to maintain a culture of building with craft. It many not be
flashy or attention grabbing and it inevitably will require compromise. A great
outcome would be if you can build something excellent, sell it at a fair price
and earn enough to live and continue to run your business.

After writing this, I saw Karri's tweet and felt like he expressed a lot of
similar sentiments in his comments:

{{< x user="karrisaarinen" id="1783976321854717985" >}}

[^1]:
    A distributed database that can distribute and query data across more than
    one machine and scale beyond the constraints imposed by a single machine that
    SQL struggles with.

[^2]:
    During the ZIRP era, companies often paid employees with investor dollars
    rather than company profits, because the companies weren't actually making any
    money. This was the model of the last decade in tech which has rapidly
    disappeared with the increase in interests rates.

[^3]:
    This requires contributions not just from developers but everyone
    participating in the product lifecycle.

[^4]:
    Though there are times where it has failed to meet the quality bar it has
    become known for.
