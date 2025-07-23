---
title: Intro to Astro
createdAt: 2024-12-29T11:24:49.000Z
updatedAt: 2024-12-29T11:24:49.000Z
publishedAt: 2024-12-29T11:24:49.000Z
tags:
  - astro
  - javascript
  - web
draft: false
---

I'm aiming to setup a space for more interactive UX experiments.
My current Hugo blog has held up well with my scale of content but doesn't play nicely with modern Javascript frameworks, where most of the open source energy is currently invested.

Astro seemed like a promising option because it supports Markdown content along with plug-and-play approach to many different [frameworks](https://docs.astro.build/en/guides/integrations-guide/) like React, Svelte and Vue.
More importantly, there is a precedent for flexibility when the Next Big Thing emerges which makes Astro a plausible test bed for new concepts without requiring a brand new site or a rewrite.
At least, this was my thought process when I decided to try it out.

Astro is an open source project with just under 850 committers and with top level sponsors of Sentry, Netlify and IDX (Google) at the time of this writing.

## Getting started

Let's get started at the project [homepage](https://astro.build/).
It tells us we can create a project with

```sh
npm create astro@latest
```

This walked me through a helpful set of setup steps

```sh
(node:63417) ExperimentalWarning: CommonJS module /opt/homebrew/lib/node_modules/npm/node_modules/debug/src/node.js is loading ES Module /opt/homebrew/lib/node_modules/npm/node_modules/supports-color/index.js using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
Need to install the following packages:
create-astro@4.11.0
Ok to proceed? (y) y


> npx
> create-astro


 astro   Launch sequence initiated.

   dir   Where should we create your new project?
         ./thought-eddies

  tmpl   How would you like to start your new project?
         A basic, minimal starter

  deps   Install dependencies?
         Yes

   git   Initialize a new git repository?
         Yes

 ██████  Project initializing...
         ■ Template copied
         ▶ Dependencies installing with npm...
         □ Git

```

Move into the project directory and you can run the dev server with

```sh
npm run dev
```

The first things I notice is the builtin debug tool in the bottom center of the page.

The page reads

> To get started, open the `src/pages` directory in your project.

so I am going to do that.
I found a file at `src/pages/index.astro`.
When I opened that the structure was unfamiliar, so I installed the [VS Code Astro plugin](https://marketplace.visualstudio.com/items?itemName=astro-build.astro-vscode) to get some syntax highlighting to help better understand what I was looking at.

Knowing that Astro supports React, I decided to try that out first.
[This guide](https://docs.astro.build/en/guides/integrations-guide/react/) instructed me to run

```
npx astro add react
```

which did all the work and code changes which was a nice developer experience.

## Create and wire up a React component "island"

I decided I wanted to add a D3 chart in a React component.
First, I created a file in `src/components/SimpleD3Chart.tsx` the the following contents.

```tsx
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const SimpleD3Chart = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState([4, 8, 15, 16, 23, 42]);

  useEffect(() => {
    if (!svgRef.current) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const xScale = d3
      .scaleBand()
      .domain(data.map((_, i) => i.toString()))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', (_, i) => xScale(i.toString()) || 0)
      .attr('y', (d) => yScale(d))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => yScale(0) - yScale(d))
      .attr('fill', 'steelblue');

    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    svg
      .append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));
  }, [data]);

  const handleInputChange = (index: number, value: string) => {
    const newValue = Math.max(0, parseInt(value) || 0);
    const newData = [...data];
    newData[index] = newValue;
    setData(newData);
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        {data.map((value, index) => (
          <input
            key={index}
            type="number"
            min="0"
            value={value}
            onChange={(e) => handleInputChange(index, e.target.value)}
            style={{ width: '60px', marginRight: '0.5rem' }}
          />
        ))}
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default SimpleD3Chart;
```

This component is a bar graph with six values, which also exposes number selectors for each bar.
The user can interactively raise/lower the numeric value and the graph updates accordingly.
We can test this out by adding it to the `src/components/Welcome.astro` file.

```diff
---
import astroLogo from '../assets/astro.svg';
import background from '../assets/background.svg';
+ import SimpleD3Chart from '../components/SimpleD3Chart';
---

<div id="container">
	<img id="background" src={background.src} alt="" fetchpriority="high" />
	<main>
    // ...
	<main>
		<section id="hero">
			<a href="https://astro.build"
				><img src={astroLogo.src} width="115" height="48" alt="Astro Homepage" /></a
			>
			<h1>
				To get started, open the <code><pre>src/pages</pre></code> directory in your project.
			</h1>
			<section id="links">
				// ...
			</section>
+			<SimpleD3Chart client:load />
		</section>
	</main>
```

I found that to be pretty straightforward.

Next, I'll be working to setup an interactive digital garden like space for UI/UX experiments.
