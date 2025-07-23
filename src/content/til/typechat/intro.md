---
title: Intro to TypeChat
createdAt: 2023-08-05T14:31:12.000Z
updatedAt: 2023-08-05T14:31:12.000Z
publishedAt: 2023-08-05T14:31:12.000Z
tags:
  - language_models
  - typescript
  - typechat
  - node
draft: false
---

## First attempt

I made an attempt to setup [TypeChat](https://github.com/microsoft/TypeChat) to see what's happening on the Node/TypeScript side of language model prompting.
I'm less familiar with TypeScript than Python, so I expected to learn some things during the setup.
The project provides [example projects](https://github.com/microsoft/TypeChat/tree/main/examples/) within the repo, so I tried to pattern off of one of those to get the [sentiment classifier](https://github.com/microsoft/TypeChat/tree/main/examples/sentiment) example running.

I manage `node` with [`asdf`](https://asdf-vm.com/).
I'd like to do this with `nix` one day but I'm not quite comfortable enough with that yet to prevent it from become its own rabbit hole.
I installed TypeScript globally (`npm install -g typescript`) to my `asdf` managed version of node, then put the version I was using in `.tool-version` in my project.

```text
nodejs 19.3.0
```

In my project folder, I also installed TypeChat:

```sh
npm install typechat
```

In `src/main.ts` I wrote the following:

```ts
import path from 'path';
import dotenv from 'dotenv';
import {
  createLanguageModel,
  createJsonTranslator,
  processRequests,
} from 'typechat';

dotenv.config({ path: path.join(__dirname, '../.env') });

const model = createLanguageModel(process.env);

interface SentimentResponse {
  sentiment: 'negative' | 'neutral' | 'positive'; // The sentiment of the text
}

const schema = `
interface SentimentResponse {
    sentiment: "negative" | "neutral" | "positive";  // The sentiment of the text
}
`;

const translator = createJsonTranslator<SentimentResponse>(
  model,
  schema,
  'SentimentResponse'
);

// Process requests interactively or from the input file specified on the command line
processRequests('😀> ', process.argv[2], async (request) => {
  const response = await translator.translate(request);
  if (!response.success) {
    console.log(response);
    return;
  }
  console.log(`The sentiment is ${response.data.sentiment}`);
});
```

I made some small modifications to the [original source](https://github.com/microsoft/TypeChat/blob/main/examples/sentiment/src/main.ts) to reduce the number of imports.
I also inlined the schema rather than reading it from another file in the filesystem.
This was causing issues after compiling the project.
I also created a `.env` file containing

```text
OPENAI_MODEL=gpt-3.5-turbo-16k
```

Finally, I created a `tsconfig.js` file with configs similar to those from the [example project](https://github.com/microsoft/TypeChat/blob/main/examples/sentiment/src/tsconfig.json):

```json
{
  "compilerOptions": {
    "target": "es2021",
    "lib": ["es2021"],
    "module": "node16",
    "types": ["node"],
    "outDir": "dist", // updated from "../dist"
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "inlineSourceMap": true
  }
}
```

With this code and supporting files in place, I complied the project and ran it:

```sh
tsc
node dist/main.js
```

The prompt appears but submitting an input, I ran into a cryptic runtime issue:

```sh
😀> have a great day
{
  success: false,
  message: "JSON validation failed: File '/schema.ts' is not a module.\n" +
    '{\n' +
    '  "sentiment": "positive"\n' +
    '}'
}
```

Interestingly, it seems we're making a successful call to the language model but are having issues unpacking the response.
Poking around some issues in the project, there appears to be [something similar](https://github.com/microsoft/TypeChat/issues/77) currently open.
With a bit more time I might be able to work through this issue, but I'm not seeing a substantial improvement in developer experience over [Marvin](https://github.com/prefecthq/marvin) or [OpenAI functions](https://platform.openai.com/docs/guides/gpt/function-calling) with [Pydantic](https://github.com/pydantic/pydantic).

## Get it running

To try and give the project a fair change to show what I can do, I cloned the Github repo and setup the project.
This approach seems to work.

```sh
❯ npm install
❯ node examples/sentiment/dist/main.js
😀> have a great day
The sentiment is positive
```

Next, I copied the `sentiment` folder and renamed it "recipe" with the goal to try and make some changes to implement extraction of a recipe, as I have experimented with [before](/posts/2023/using-marvin-for-structured-data-extraction).
In doing this, I found a solution to the issue I had previously run into.
Each of the example projects has the following `postbuild` script in its `package.json`:

```json
{
  "scripts": {
    "build": "tsc -p src",
    "postbuild": "copyfiles -u 1 src/**/*Schema.ts src/**/*.txt dist"
  }
}
```

This script actually copies the TypeScript schema into the `dist` folder for when the program runs.
A little hacky 🙃.

I modified the `main.ts` to paste a [recipe](https://www.bonappetit.com/recipe/basque-burnt-cheesecake) I found into the schema extraction code.

```ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  createLanguageModel,
  createJsonTranslator,
  processRequests,
} from 'typechat';
import { Recipe } from './recipeSchema';

// TODO: use local .env file.
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const model = createLanguageModel(process.env);
const schema = fs.readFileSync(path.join(__dirname, 'recipeSchema.ts'), 'utf8');
const translator = createJsonTranslator<Recipe>(model, schema, 'Recipe');

const recipe = `
Unsalted butter (for pan)
2 lb. cream cheese, room temperature
1½ cups sugar
6 large eggs
2 cups heavy cream
1 tsp. kosher salt
1 tsp. vanilla extract
⅓ cup all-purpose flour
Sherry (for serving; optional)
SPECIAL EQUIPMENT
A 10"-diameter springform pan
Preparation
Step 1
Place a rack in middle of oven; preheat to 400°. Butter pan, then line with 2 overlapping 16x12" sheets of parchment, making sure parchment comes at least 2" above top of pan on all sides. Because the parchment needs to be pleated and creased in some areas to fit in pan, you won’t end up with a clean, smooth outer edge to the cake; that’s okay! Place pan on a rimmed baking sheet.

Step 2
Beat cream cheese and sugar in the bowl of a stand mixer fitted with the paddle attachment on medium-low speed, scraping down sides of bowl, until very smooth, no lumps remain, and sugar has dissolved, about 2 minutes.

Step 3
Increase speed to medium and add eggs one at a time, beating each egg 15 seconds before adding the next. Scrape down sides of bowl, then reduce mixer speed to medium-low. Add cream, salt, and vanilla and beat until combined, about 30 seconds.

Step 4
Turn off mixer and sift flour evenly over cream cheese mixture using a fine-mesh sieve. Beat on low speed until incorporated, about 15 seconds. Scrape down sides of bowl (yet again) and continue to beat until batter is very smooth, homogenous, and silky, about 10 seconds.

Step 5
Pour batter into prepared pan. Bake cheesecake until deeply golden brown on top and still very jiggly in the center, 60–65 minutes.

Step 6
Let cool slightly (it will fall drastically as it cools), then unmold. Let cool completely. Carefully peel away parchment from sides of cheesecake. Slice into wedges and serve at room temperature, preferably with a glass of sherry alongside.

Do Ahead: Cheesecake be made 1 day ahead. Cover and chill. Be sure to let cheesecake sit for several hours at room temperature to remove chill before serving.
`;

// Process requests interactively or from the input file specified on the command line
processRequests('😀> ', process.argv[2], async (_request) => {
  const response = await translator.translate(recipe);
  if (!response.success) {
    console.log(response.message);
    return;
  }
  console.log(response.data);
});
```

where `recipeSchema.ts` is

```ts
export interface Recipe {
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
}
```

This works!
I was lazy and kept the interactive prompt.

```sh
❯ node examples/recipe/dist/main.js
😀> go
{
  title: 'Cheesecake',
  description: 'A delicious and creamy cheesecake recipe',
  ingredients: [
    'Unsalted butter (for pan)',
    '2 lb. cream cheese, room temperature',
    '1½ cups sugar',
    '6 large eggs',
    '2 cups heavy cream',
    '1 tsp. kosher salt',
    '1 tsp. vanilla extract',
    '⅓ cup all-purpose flour',
    'Sherry (for serving; optional)'
  ],
  instructions: [
    'Place a rack in middle of oven; preheat to 400°. Butter pan, then line with 2 overlapping 16x12" sheets of parchment, making sure parchment comes at least 2" above top of pan on all sides. Because the parchment needs to be pleated and creased in some areas to fit in pan, you won’t end up with a clean, smooth outer edge to the cake; that’s okay! Place pan on a rimmed baking sheet.',
    'Beat cream cheese and sugar in the bowl of a stand mixer fitted with the paddle attachment on medium-low speed, scraping down sides of bowl, until very smooth, no lumps remain, and sugar has dissolved, about 2 minutes.',
    'Increase speed to medium and add eggs one at a time, beating each egg 15 seconds before adding the next. Scrape down sides of bowl, then reduce mixer speed to medium-low. Add cream, salt, and vanilla and beat until combined, about 30 seconds.',
    'Turn off mixer and sift flour evenly over cream cheese mixture using a fine-mesh sieve. Beat on low speed until incorporated, about 15 seconds. Scrape down sides of bowl (yet again) and continue to beat until batter is very smooth, homogenous, and silky, about 10 seconds.',
    'Pour batter into prepared pan. Bake cheesecake until deeply golden brown on top and still very jiggly in the center, 60–65 minutes.',
    'Let cool slightly (it will fall drastically as it cools), then unmold. Let cool completely. Carefully peel away parchment from sides of cheesecake. Slice into wedges and serve at room temperature, preferably with a glass of sherry alongside.'
  ],
  prepTime: 0,
  cookTime: 65,
  servings: 8
}
```

## Evolving the schema

From here, we can make some schema modifications then re-run `npm run build` from the `examples/recipes` to see the impact of our changes.
I changed `recipeSchema.ts` to be

```ts
type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
};

export interface Recipe {
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
}
```

Re-running, gives the following, which looks pretty great!

```js
{
  title: 'Cheesecake',
  description: 'Creamy and delicious cheesecake recipe',
  ingredients: [
    { name: 'Unsalted butter (for pan)', quantity: 1, unit: 'pan' },
    {
      name: 'lb. cream cheese, room temperature',
      quantity: 2,
      unit: 'lb'
    },
    { name: 'sugar', quantity: 1.5, unit: 'cups' },
    { name: 'large eggs', quantity: 6, unit: '' },
    { name: 'heavy cream', quantity: 2, unit: 'cups' },
    { name: 'kosher salt', quantity: 1, unit: 'tsp' },
    { name: 'vanilla extract', quantity: 1, unit: 'tsp' },
    { name: 'all-purpose flour', quantity: 0.33, unit: 'cup' },
    { name: 'Sherry (for serving; optional)', quantity: 0, unit: '' }
  ],
  instructions: [
    'Place a rack in middle of oven; preheat to 400°. Butter pan, then line with 2 overlapping 16x12" sheets of parchment, making sure parchment comes at least 2" above top of pan on all sides. Because the parchment needs to be pleated and creased in some areas to fit in pan, you won’t end up with a clean, smooth outer edge to the cake; that’s okay! Place pan on a rimmed baking sheet.',
    'Beat cream cheese and sugar in the bowl of a stand mixer fitted with the paddle attachment on medium-low speed, scraping down sides of bowl, until very smooth, no lumps remain, and sugar has dissolved, about 2 minutes.',
    'Increase speed to medium and add eggs one at a time, beating each egg 15 seconds before adding the next. Scrape down sides of bowl, then reduce mixer speed to medium-low. Add cream, salt, and vanilla and beat until combined, about 30 seconds.',
    'Turn off mixer and sift flour evenly over cream cheese mixture using a fine-mesh sieve. Beat on low speed until incorporated, about 15 seconds. Scrape down sides of bowl (yet again) and continue to beat until batter is very smooth, homogenous, and silky, about 10 seconds.',
    'Pour batter into prepared pan. Bake cheesecake until deeply golden brown on top and still very jiggly in the center, 60–65 minutes.',
    'Let cool slightly (it will fall drastically as it cools), then unmold. Let cool completely. Carefully peel away parchment from sides of cheesecake. Slice into wedges and serve at room temperature, preferably with a glass of sherry alongside.'
  ],
  prepTime: 0,
  cookTime: 65,
  servings: 8
}
```

## Takeaways

Once I got the project working and better understood the approach, TypeChat was enjoyable to use.
I like TypeScript based on the limited amount that I've used it so far.
Digging into the project a bit more clarified for me that it isn't really breaking any new ground.
It's a TypeScript approach to imposing schema on the outputs of language models - something that is mostly being done in Python these days.
Because TypeScript requires a build step, the need to move `*.ts` files into the `dist` folder is pretty dirty at the moment.
With Python, do can do this in a bit of a cleaner if you use `inspect.getsource` add the source code of the target unpack-class into the prompt.

Big thanks to the folks at Microsoft who worked on this project and shared it with the world!
