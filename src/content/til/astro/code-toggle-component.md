---
title: Astro Code Toggle Component
createdAt: 2025-02-06T08:43:51.000Z
updatedAt: 2025-02-06T08:43:51.000Z
publishedAt: 2025-02-06T08:43:51.000Z
tags:
  - astro
draft: false
---

I built an Astro component called `CodeToggle.astro` for my [experimental site](https://www.thoughteddies.com).
The idea was to create a simple wrapper around a React (or other interactive component) in an MDX file so that the source of that rendered component could be nicely displayed as a highlighted code block on the click of a toggle.
Usage looks like this:

```tsx
import { default as TailwindCalendarV1 } from './components/TailwindCalendar.v1';
import TailwindCalendarV1Source from './components/TailwindCalendar.v1?raw';

<CodeToggle source={TailwindCalendarV1Source}>
  <TailwindCalendarV1 client:load />
</CodeToggle>;
```

The implementation of `CodeToggle.astro` looked like this

```tsx
---
import { Code } from "astro/components";
import { Code as CodeIcon } from "lucide-react";

interface Props {
  source: string;
  lang?: string;
  children: astroHTML.JSX.Element;
}

const { source, lang = "tsx" } = Astro.props;
---

<div class="relative">
  <div class="mb-4">
    <slot />
  </div>

  <div class="not-prose">
    <details class="group">
      <summary
        class="flex items-center gap-2 font-mono text-xs px-2 py-1 rounded-md
            bg-[var(--color-bg-code)] text-[var(--color-ink-light)] opacity-80
            hover:opacity-100 hover:text-[var(--color-ink)]
            cursor-pointer transition-all duration-200 w-fit"
      >
        <CodeIcon className="w-3 h-3" />
        <span class="select-none group-open:hidden">Show Source</span>
        <span class="select-none hidden group-open:block">Hide Source</span>
      </summary>
      <div class="mt-3 rounded-md overflow-hidden">
        <Code code={source} lang={lang as any} theme="monokai" />
      </div>
    </details>
  </div>
</div>
```

This approach was relatively straightforward and I thought I was using the `<Code>` component in a sensible way.
I actually published my [first post](https://www.thoughteddies.com/notes/2025/llm-tailwind-react) for the site using this component and thought things were going well.

Right after I attempted to publish a [new post](https://www.thoughteddies.com/notes/2025/document-citations), I started running into strange build issues

```
02:37:59   ├─ /notes/2025/llm-tailwind-react/index.html
highlighter.codeToHtml is not a function
  Hint:
    This issue often occurs when your MDX component encounters runtime errors.
  Stack trace:
    at file:///vercel/path0/dist/chunks/index_C97_OQzq.mjs:69:34
Error: Command "npm run build" exited with 1
```

I reverted a few commits locally, but the problem persisted.

From some debugging, it seemed the issue stemmed from my attempts to use `shiki`, a syntax highlighting package, in multiple ways.
Why this all of a sudden became a problem, I was still unsure.

After some more poking around, searching GitHub and experimenting with different LLM outputs, I came up with these changes:

```diff
diff --git a/src/components/prose/CodeToggle.astro b/src/components/prose/CodeToggle.astro
index 88a758d..166c324 100644
--- a/src/components/prose/CodeToggle.astro
+++ b/src/components/prose/CodeToggle.astro
@@ -1,6 +1,7 @@
 ---
-import { Code } from "astro/components";
 import { Code as CodeIcon } from "lucide-react";
+import { createHighlighter } from "shiki";
+import type { BundledLanguage } from "shiki";

 interface Props {
   source: string;
@@ -9,6 +10,16 @@ interface Props {
 }

 const { source, lang = "tsx" } = Astro.props;
+
+const highlighter = await createHighlighter({
+  themes: ["monokai"],
+  langs: [lang],
+});
+
+const html = highlighter.codeToHtml(source, {
+  lang: lang as BundledLanguage,
+  theme: "monokai",
+});
 ---

 <div class="relative">
@@ -28,9 +39,7 @@ const { source, lang = "tsx" } = Astro.props;
         <span class="select-none group-open:hidden">Show Source</span>
         <span class="select-none hidden group-open:block">Hide Source</span>
       </summary>
-      <div class="mt-3 rounded-md overflow-hidden">
-        <Code code={source} lang={lang as any} theme="monokai" />
-      </div>
+      <div class="mt-3 rounded-md overflow-hidden" set:html={html} />
     </details>
   </div>
 </div>
```

With that approach, the build issues resolved.
I can't say I quite understand _why_ I started having this issue but hopefully this post helps anyone who runs into the same.
