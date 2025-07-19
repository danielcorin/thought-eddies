---
title: Auto-GPT
description: Experimenting with Auto-GPT
createdAt: 2023-04-23T20:37:05.000Z
updatedAt: 2023-04-23T20:37:05.000Z
publishedAt: 2023-04-23T20:37:05.000Z
tags:
  - language_models
  - python
draft: false
---

[Auto-GPT](https://github.com/Significant-Gravitas/Auto-GPT) is a popular project on Github that attempts to build an autonomous agent on top of an LLM.
This is not my first time using Auto-GPT.
I used it shortly after it was released and gave it a second try a week or two later, which makes this my third, zero-to-running effort.

I installed it

```sh
python -m venv env
. env/bin/activate
pip install -r requirements.txt
```

and then ran it

```sh
python -m autogpt --debug
```

and provided my goals through the prompt screens.
They also get persisted to `ai_settings.yaml`:

```yaml
ai_goals:
- Identify stocks, ETF and/or equities to purchase
- Develop a list of trades to make to achieve the target portfolio allocation
- Continuously evaluate portfolio performance and make adjustments as needed
ai_name: Finance-GPT
ai_role: an AI designed to help me allocate my financial portfolio
```

And off I went.

The first loop of the agent yielded the following:

> THOUGHTS:  I need to determine the current state of the financial market to make informed decisions about portfolio allocation. I will start by conducting a Google search.
>
> REASONING:  To make informed decisions about portfolio allocation, I need to have up-to-date information about the financial market. Conducting a Google search is a quick and
> efficient way to gather this information.
>
> PLAN:
>
> - Conduct a Google search to gather information about the current state of the financial market
> - Analyze the information gathered to make informed decisions about portfolio allocation
>
> CRITICISM:  I need to ensure that the information I gather is reliable and up-to-date. I also need to be careful not to rely too heavily on any one source of information.
>
> NEXT ACTION:  COMMAND = google ARGUMENTS = {'input': 'current state of the financial market'}

I let the agent do its thing and next it wanted to analyze of the information in the results.
It next wanted to search for "best performing stocks and ETFs in the current market".
Once it did that, it downloaded the results of a Forbes article.
Unfortunately, that was pretty much the end of this test as it continuously tried to download the same Forbes article, even when I prompted after several failed attempts to "find some mutual funds that might be worth purchasing".

So, I started over, this time with the intent of being much more specific and intervening when things weren't going well.
It felt like I wasn't making much progress on the previous run.
I ran the script again with the same goals.
This time it struggled to make a decision on what to do next.

>PLAN:
>
> - Analyze the current state of the portfolio
> - Identify areas that need adjustment
> - Determine which stocks, ETFs, or equities to purchase
> - Execute trades
> - Continuously evaluate portfolio performance and make adjustments as needed
>
> CRITICISM:  We need to ensure that we are making informed decisions based on sound financial principles. We should also be mindful of the risks associated with investing and take
> steps to mitigate them.
>
> NEXT ACTION:  COMMAND = do_nothing ARGUMENTS = {}

I tried to steer it back on course with no luck.

> SYSTEM:  Human feedback: find me some tickers worth investing in
>
> THOUGHTS:  Before we can determine which tickers to invest in, we need to analyze the current state of the portfolio and identify any areas that need adjustment. We can then use that information to determine which stocks, ETFs, or equities to purchase. Once we have a list of trades to make, we can execute them and continuously evaluate the portfolio performance to make adjustments as needed.
>
> REASONING:  Analyzing the current state of the portfolio is a good starting point as it will give us a clear picture of where we stand and what changes need to be made. This will help us make informed decisions about which stocks, ETFs, or equities to purchase. Once we have a list of trades to make, we can execute them and continuously evaluate the portfolio performance to make adjustments as needed.
>
> PLAN:
>
> - Analyze the current state of the portfolio
> - Identify areas that need adjustment
> - Determine which stocks, ETFs, or equities to purchase
> - Execute trades
> - Continuously evaluate portfolio performance and make adjustments as needed
>
> CRITICISM:  We need to ensure that we are making informed decisions based on sound financial principles. We should also be mindful of the risks associated with investing and take
> steps to mitigate them.
>
> NEXT ACTION:  COMMAND = do_nothing ARGUMENTS = {}
>

Let's give it another shot with a completely different type of task.

> AI Name: Chef-GPT
>
> Chef-GPT here!  I am at your service.
>
> Describe your AI's role:  For example, 'an AI designed to autonomously develop and run businesses with the sole goal of increasing your net worth.'
>
> Chef-GPT is: an AI that helps me find recipes for a dinner party
>
> Enter up to 5 goals for your AI:  For example: Increase net worth, Grow Twitter Account, Develop and manage multiple businesses autonomously'
>
> Enter nothing to load defaults, enter nothing when finished.
>
> Goal 1: Decide on 3 appetizer course
>
> Goal 2: Decide on 2 main courses
>
> Goal 3: Decide on 2 desserts
>
> Goal 4: Make a grocery list with all needed ingredients
>

I'll save you the burden of more transcript reading.
Auto-GPT does a web search to look up recipes, finds an article, parses that article with the intent of answering the question "Which appetizer recipes are easy to prepare and can be made in advance?", but can't get past that.
Because the website doesn't answer the posed question (a question Auto-GPT came up with), it seems it can't extract useful information from content that seems to contain a useful answer to the high level goal.

Given our struggle here, I decided to simplify further, in the direction of something much closer to what I would ask a voice assistant like Siri.

> AI Name: Chef-GPT
> Chef-GPT here!  I am at your service.
>
> Describe your AI's role:  For example, 'an AI designed to autonomously develop and run businesses with the sole goal of increasing your net worth.'
>
> Chef-GPT is: an AI designed to help me find what to cook tonight
>
> Enter up to 5 goals for your AI:  For example: Increase net worth, Grow Twitter Account, Develop and manage multiple businesses autonomously'
>
> Enter nothing to load defaults, enter nothing when finished.
>
> Goal 1: Find a simple and healthy recipe
>
> Goal 2: Write the recipe to a file on my computer

Auto-GPT searches and finds a website that seems like it could have the answer

> NEXT ACTION:  COMMAND = browse_website ARGUMENTS = {'url': 'https://www.foodnetwork.com/healthy/packages/healthy-every-week/quick-and-simple', 'question': 'Find a simple and healthy recipe'}
>
> ...
>
> SYSTEM:  Command browse_website returned: ("Answer gathered from website: The text does not provide information on finding a simple and healthy recipe ...)

but it can't seem to extract the "answer" on the website.
I let it loop, searching the same site a few times before it came up with an answer.

> 'Please make Tuscan vegetable soup for dinner tonight. Here is the recipe: https://www.foodnetwork.com/recipes/food-network-kitchen/tuscan-vegetable-soup-recipe-1972763

Unfortunately, that's not a real link.
Google found something similar though <https://www.foodnetwork.com/recipes/ellie-krieger/tuscan-vegetable-soup-recipe-1957503>.
I'm not sure if the Food Network reorganized their site or if the model hallucinated the link.

## Takeaways

Right now, Auto-GPT is a cool toy and gives glimpses of what agents might look like when we have improved models or design them with different architectures.
However, it's difficult to operate and at present, I'm not aware of strategies that can be used to debug it beyond trying new prompts and providing additional feedback.
Maybe I've missed important steps, but this experience has been similar to my previous two in that that agent can do a lot of activities but presently, it seems it can't really accomplish much.
I will be sticking with using LMs as a tool in my own workflows rather than become a tool in it's for now.
