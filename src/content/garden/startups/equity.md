---
title: 'Equity'
draft: false
toc: true
date: '2024-06-01'
---

_Note: This is not financial advice.
I wrote this in 2021 as I tried to reason about, understand, and document some of the patterns I was seeing in tech startups/scale-ups.
I think much of this thought process is still relevant for private companies offering equity as part of their compensation packages. I mostly discuss my thought process through the lens of RSUs as that is what I am most familiar with. Some of this may apply to options, but I can't say with confidence that all of it does._

## Receiving an offer with startup equity

Tech startups often offer stock options or RSUs as part of their compensation packages to make up for the fact that they (generally) want to pay lower cash salaries than other (usually public) companies competing to hire from the same pool of candidates.
This practice makes some sense.
The company is typically trying to grow quickly and has raised investor capital to do so.
Instead of giving you that cash, they want to invest their cash in the business and if the business is successful, you'll (hopefully) be rewarded many times over with the value of your equity when you have the opportunity to sell it.

There's nothing inherently wrong or devious about this practice.
It's a value tradeoff: less money today for a chance at more tomorrow.
However, the way these companies deliver these offers, particularly to junior engineers who don't necessarily have experience with equity-based compensation, leaves a lot to be desired.
It usually looks something like this.

> Hey Dan, we're excited to offer you the role of software engineer at NewCo.
> We think you'll be a huge addition to our team as we scale to additional markets.
> We'd like to offer you a base salary of $123,456 per year and 3,700 RSUs vesting over 4 years.
> We think this is a generous offer and above market rate for similar roles.
> The offer expires on Wednesday, so be sure to get back to us soon!
>
> Best,
>
> Bart from recruiting

While it's a privilege to be offered a job, the way in which an offer like this is presented is extremely frustrating.
The recruiter has offered some number RSUs, knowing (or even worse, not knowing) that I now have to ask follow-up questions just to begin to understand the value of the offer.
I find this disrespectful.

This practice is akin to a store placing a price tag on a t-shirt that reads `◆82`.
What is the value of `◆`?
I don't really want to have to go to the register just to understand the dollar cost of the item I'm thinking about purchasing.
Bart is leaving me to do all the work to determine the worth of these RSUs.
There might be some public information available that help me infer the value of this equity, but most of the time, _everything_ is left to you, the candidate, to navigate and figure out on your own, often under the pressure of an offer with a deadline (sometimes referred to as an exploding offer).
When I visit a store, no one expects me to check the market value of a t-shirt so I can estimate the actual dollar price of `◆82` in monetary terms I can comprehend.

In reality, after all the time invested in sourcing candidates and conducting interviews, NewCo may want to hire me far more than the store wants to sell me a t-shirt.
So why are they making it so hard for me to figure out what's in it for me if I work there?
Having gone through this dance multiple times, I usually give the benefit of the doubt and follow up once, or maybe twice if I'm really interested in the role.
But for folks without as much experience and/or in a tough job market (like in 2024 when I am posting this), you may not have better alternatives or the time to do this legwork.

## What is the equity worth?

So, what questions do you ask to figure out what the RSUs are actually worth? You could reply "Hi Bart, what are the RSUs worth?" but Bart's incentives aren't aligned with yours.
He wants to close you and will give you the biggest number he possibly can at which to value the RSUs.
The number you're after is your percentage ownership of the company calculated from the number of RSUs you are being offered.

If you can't get that number specifically, you need to do some math.
The math isn't hard, but getting the numbers might be.
The numbers you should ask for are

- total number of outstanding shares
- last 409a valuation of the company
- last preferred valuation of the company

If you know the total number of shares, you can calculate percentage ownership

```text
offered RSUs / total number of shares
```

Now you can make your own determination of what you think the RSUs are worth.
Multiply percentage ownership by the amount you think the company is worth.
That's the hypothetical of your RSUs (after they vest and minus taxes, sorry).

I hear you, you have no idea how to value a private company.
The VCs are historically not great at this either, but we can use their behavior and investment terms to help us get a ballpark idea of what our shares _could_ be worth.

The preferred valuation of the company is the most recent value at which some group of private investors bought shares in the company.
Take that valuation and multiply it by your percentage ownership (really big number times a very small one) and that's one number to look at when valuing your equity.

Do the same thing with the last 409a valuation, keeping in mind that this value per share will likely be lower than the preferred share price.
A 409a valuation is a theoretical valuation calculated by an independent auditor which aims to estimate what the company is approximately worth at that point in time.
Investors are usually thinking about what the company could be worth in the future, when the business is more mature.

If the company raises more money, it's possible the preferred valuation could change.
If the company receives another 409a valuation, that could change as well.
Ultimately, these numbers are all hopes and dreams.
You'll only ever receive money from your equity if you can find someone to buy it from you.

## Selling startup equity

You can monetize your startup equity in several ways (this is not an exhaustive list):

1. You're given the chance to sell your shares through a "tender offer".
   External investors approach your company with the intention to acquire shares.
   Instead of issuing new shares or selling unallocated shares, the company allows employees to sell their (vested) shares to the investors, providing an opportunity for employee liquidity.
   The investor sets the price at which they will buy your shares.
   You can either accept or decline, and it's typically a one-time event with restrictions on the number of units you can sell.
2. The company is bought by a public company and your equity converts to shares of the acquiring company. You can then sell those converted shares in the public markets.
   The conversion of your equity to shares of the new company stock is unpredictable.
   It depends on the deal your leadership negotiates.
3. Your company goes public (IPOs) and, after what is usually a 6-month employee lockup, you can sell your shares in the public market during an allowed trading window at the current market price.
4. You can sell equity on secondary markets. However, there are several caveats.
   You need to check if there are any restrictions in your offer against participating in secondary market sales (some companies explicitly prohibit it and many have the right of first refusal for a sale).
   Most secondary market bids are for options only.
   RSUs typically have conditions that make them unappealing for purchase on secondary markets.
   Also, RSUs are not shares of the company.
   They only become shares after they fully vest and in the case of most private companies at the time of this writing, that only happens after a liquidity event.

## Where to go from here

At this point, you might be justifiably overwhelmed by the entire process of valuing startup equity, and that's understandable.
When accepting equity in a private company, there are no guarantees.
Be aware of what your opportunities for liquidity might look like and keep in mind that the "value" you perceive your shares to have may end up being pennies on the dollar and could even diminish to zero.

This whole discussion is **not** to suggest that you shouldn't work at a private company.
Such companies can be some of the most exciting places to work with incredible opportunities for growth.
Like anything, there are tradeoffs and where there is higher risk, there can often be the opportunity for greater returns.
If you do accept an offer like this one, go in with your eyes wide open, understanding the risks, hoping for the best, and preparing for the worst.
