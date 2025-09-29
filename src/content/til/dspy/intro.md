---
title: 'Intro to DSPy'
createdAt: 2025-09-28T18:43:52.208843
updatedAt: 2025-09-28T18:43:52.208843
publishedAt: 2025-09-28T18:43:52.208843
tags: ['dspy']
draft: false
---

The viral "how many r's are there in the word 'strawberry'?" problem is a great motivating example to experiment with the capabilities of [DSPy](https://github.com/stanfordnlp/dspy), an increasingly popular, powerful library for running inference with language models.
While the counting letters problem itself is a poor application of a language model, using DSPy to experiment helps us build intuition for how to make a language model perform better at a specific task, using manual and language model-based optimization approaches.

```python
import dspy
import pandas as pd

from dspy.evaluate import Evaluate
```

```python
gpt_4_1_nano_lm = dspy.LM('openai/gpt-4.1-nano-2025-04-14')

```

A `Signature` is the foundational primitive in DSPy.
Personally, I think of a signature (or typed object) as the standard primitive of interacting with any language model in general.

Unless you are building a pure chatbot, to stitch the functionality of the LLM into your application, you're going to need to impose structure on the outputs of the LLM.

Imposing structure on the inputs helps too.
The better these are labeled, the more likely the output for the model will be aligned with the correct answer you're looking for.

If you don't buy that, let's see if I can convince you it is true.

A `Signature` is just one part of a functioning LLM application.
The next most important primitive of building with a language model is a dataset.

Once you know your inputs and outputs to the model, you need to figure out if the inference the model is doing is correct, based on your own measurement of what that means.
Without doing this, you won't know if your prompt and inputs combination results in inference with the correct output.

The `Signature` forces you to think about what information is relevant and what the shape of the answer looks like.
Systematizing and automating inference with this process allows you to experiment with and evolve the signature while guarding against regressions.

With that context, let's create a DSPy signature to count the number of occurrences of a specific letter in a given word, modelling off the "how many r's are there in the word 'strawberry'" example.

```python
class CountLetterInWord(dspy.Signature):
    """Count the number of occurrences of a specific letter in a given word."""

    word: str = dspy.InputField(desc="The word to search in")
    letter: str = dspy.InputField(desc="The letter to count")
    count: int = dspy.OutputField(desc="The number of times the `letter` appears in the `word`")
```

```python
count_letter = dspy.Predict(CountLetterInWord)
```

With a `Signature` and `Predict` classes defined, we can now map inputs to outputs using the LLM.

```python
with dspy.settings.context(lm=gpt_4_1_nano_lm):
    result = count_letter(word='basketball', letter='b')

result
```

    Prediction(
        count=2
    )

The model got this one right!

From here, let's use the system dictionary (`/usr/share/dict/words`) to create a dataset of words and their letter counts.
We'll use this dataset to evaluate the performance of different signatures, models, and eventually optimization approaches.

```python
import csv
import os
import random

# Read words from system dictionary
with open('/usr/share/dict/words', 'r') as f:
    words = [word.strip().lower() for word in f.readlines() if word.strip()]

# Sample 400 words randomly
sample_words = random.sample(words, min(400, len(words)))

# Create dataset
dataset = []
for word in sample_words:
    # Pick a random letter from the word
    letter = random.choice(word)
    # Count occurrences of that letter in the word
    count = word.count(letter)
    dataset.append([word, letter, count])

```

For a bit more data diversity, let's also add 100 rows where the letter is not in the word.

```python
# Add 100 rows where the letter is not in the word
for _ in range(100):
    word = random.choice(sample_words)
    # Find a letter that's not in the word
    alphabet = 'abcdefghijklmnopqrstuvwxyz'
    available_letters = [letter for letter in alphabet if letter not in word]
    if available_letters:
        letter = random.choice(available_letters)
        dataset.append([word, letter, 0])

# Create the dataset directory if it doesn't exist
os.makedirs('dataset', exist_ok=True)

# Write the dataset to CSV
with open('dataset/word_letter_dataset.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['word', 'letter', 'count'])
    writer.writerows(dataset)

print(f"Updated dataset with {len(dataset)} rows total")
```

Now, let's load the dataset we created and start to experiment

```python
df = pd.read_csv('dataset/word_letter_dataset.csv')
df.head()
```

|     | word      | letter | count |
| --- | --------- | ------ | ----- |
| 0   | uniate    | t      | 1     |
| 1   | ridiculer | r      | 2     |
| 2   | market    | e      | 1     |
| 3   | subsident | n      | 1     |
| 4   | irisation | i      | 3     |

Using DSPy's `Evaluate` class, we can create a list of examples and a simple metric to evaluate the performance of our signature and model against the labeled dataset.
Remember, given our `CountLetterInWord` signature, the inputs are `word` and `letter` and the output generated using LLM inference is `count`.
Our dataframe loaded from the csv has all three of these values, so we can use the `Evaluate` class to determine how often our model inference is (based on the `Signature`) actually outputs the correct answer.

Let's try running inference on 50 random examples from the dataset.

```python
sampled_df = df.sample(n=50, random_state=42)

examples = []

for _, row in sampled_df.iterrows():
    examples.append(dspy.Example(
        word=row['word'],
        letter=row['letter'],
        count=row['count']
    ).with_inputs('word', 'letter'))

def letter_count_metric(example, prediction, trace=None):
    return example.count == prediction.count


evaluator = Evaluate(
    devset=examples,
    metric=letter_count_metric,
    num_threads=1,
)
```

```python
with dspy.settings.context(lm=gpt_4_1_nano_lm):
    results = evaluator(count_letter)
```

    2025/09/28 17:03:14 INFO dspy.evaluate.evaluate: Average Metric: 36 / 50 (72.0%)

Inference from `gpt-4.1-nano-2025-04-14` gets 72% of the examples correct.
Not bad but room for improvement.

Here's an example of a failure:

```python
print('Error for standard inference:\n')
for i, result in enumerate(results.results):
    example, prediction, correct = result
    predicted = prediction.count
    actual = example.count
    word = example.word
    letter = example.letter

    if not correct:
        print(result)
        break
```

    Error for standard inference:

    (Example({'word': 'thermogeography', 'letter': 'e', 'count': 2}) (input_keys={'word', 'letter'}), Prediction(
        reasoning="I need to count how many times the letter 'e' appears in the word 'thermogeography'. I will examine each letter in the word and check if it matches 'e'. The word is 'thermogeography', which contains the following letters: t, h, e, r, m, o, g, r, a, p, h, y. The letter 'e' appears once in the third position. Therefore, the total count of 'e' in the word is 1.",
        count=1
    ), False)

## Improving accuracy

"Chain of thought" or "reasoning" has become such a common pattern to improve the performance of language models that DSPy has a built-in class for it.
These approaches both effectively mean prompting to get the model to output more tokens moving in the direction of the correct answer.
Doing this improves the performance of the model.
It kind of makes sense.
It's kind of surprising.
Given how the models are built today, it seems to work in a lot of scenarios.

We can wrap our signature in the `ChainOfThought` class in DSPy which will elicit a chain of thought from the LLM and capture it in a field called `reasoning` as the first output field.
It's important that the field is the first output field as the reasoning leads the model in the direction of the correct answer.

```python
count_letter_cot = dspy.ChainOfThought(CountLetterInWord)
```

```python
with dspy.settings.context(lm=gpt_4_1_nano_lm):
    cot_results = evaluator(count_letter_cot)
```

    2025/09/28 17:48:16 INFO dspy.evaluate.evaluate: Average Metric: 43 / 50 (86.0%)

Better already!

We can now look at some of the failures and see the model's reasoning process as well:

```python
print('Error results for chain of thought:\n')
for i, result in enumerate(cot_results.results):
    example, prediction, correct = result
    predicted = prediction.count
    actual = example.count
    word = example.word
    letter = example.letter

    if not correct:
        print(result)
        break
```

    Error results for chain of thought:

    (Example({'word': 'voicelike', 'letter': 'e', 'count': 2}) (input_keys={'word', 'letter'}), Prediction(
        reasoning="The task is to count how many times the letter 'e' appears in the word 'voicelike'. I will examine the word and count each occurrence of 'e'. The word 'voicelike' contains the letter 'e' at the end, and it appears once in the word.",
        count=1
    ), False)

The reasoning is faulty.
In fact it's not really reasoning at all and it's not leading the model to the correct answer.

Why is this?
A good first place to look is the prompt that DSPy sent to the model.
This pulls back the curtain on the `Signature` abstraction to show us the actual prompting being sent to the model.

Writing DSPy code is still just prompting the LLM, but it's convenient and clever prompting wired into a powerful abstraction.
By focusing on the inputs, outputs, and their types and descriptions, DSPy allows you to focus on the most important parts that influence the quality of the inference but still mostly work with code not prompts.

```python
print(count_letter_cot.history[-1]['messages'][0]['content']) # system message
print(count_letter_cot.history[-1]['messages'][1]['content']) # user message
```

    Your input fields are:
    1. `word` (str): The word to search in
    2. `letter` (str): The letter to count
    Your output fields are:
    1. `reasoning` (str):
    2. `count` (int): The number of times the `letter` appears in the `word`
    All interactions will be structured in the following way, with the appropriate values filled in.

    [[ ## word ## ]]
    {word}

    [[ ## letter ## ]]
    {letter}

    [[ ## reasoning ## ]]
    {reasoning}

    [[ ## count ## ]]
    {count}        # note: the value you produce must be a single int value

    [[ ## completed ## ]]
    In adhering to this structure, your objective is:
            Count the number of occurrences of a specific letter in a given word.
    [[ ## word ## ]]
    anisosepalous

    [[ ## letter ## ]]
    s

    Respond with the corresponding output fields, starting with the field `[[ ## reasoning ## ]]`, then `[[ ## count ## ]]` (must be formatted as a valid Python int), and then ending with the marker for `[[ ## completed ## ]]`.

The prompt structure makes sense but the reasoning the model did to get to the answer did not.

Let's modify the signature to include a step-by-step explanation of how we want to model to reason to figure out the answer for this problem.

```python
class CountLetterInWordStrategic(dspy.Signature):
    """
    Count the number of occurrences of a specific letter in a given word.

    To accomplish this task, for each letter in the word, check if it matches the target letter.
    For example, if we are looking for the letter 'a' in the word 'banana':

    1. b - this is not an 'a'
    2. a - this is an 'a'
    3. n - this is not an 'a'
    4. a - this is an 'a'
    5. n - this is not an 'a'
    6. a - this is an 'a'

    We count 3 'a's in the word 'banana'
    """

    reasoning: str = dspy.OutputField(desc="A step-by-step explanation of the reasoning process")
    word: str = dspy.InputField(desc="The word to search in")
    letter: str = dspy.InputField(desc="The letter to count")
    count: int = dspy.OutputField(desc="The number of times the `letter` appears in the `word`")
```

```python
count_letter_strategic = dspy.Predict(CountLetterInWordStrategic)
with dspy.settings.context(lm=gpt_4_1_nano_lm):
    results = evaluator(count_letter_strategic)
```

    2025/09/28 17:49:49 INFO dspy.evaluate.evaluate: Average Metric: 48 / 50 (96.0%)

Way better!

So what did this addition of the Python docstring do?
We can check the prompt and see the difference:

```python
print(count_letter_strategic.history[-1]['messages'][0]['content']) # system message
print(count_letter_strategic.history[-1]['messages'][1]['content']) # user message
```

    Your input fields are:
    1. `word` (str): The word to search in
    2. `letter` (str): The letter to count
    Your output fields are:
    1. `reasoning` (str): A step-by-step explanation of the reasoning process
    2. `count` (int): The number of times the `letter` appears in the `word`
    All interactions will be structured in the following way, with the appropriate values filled in.

    [[ ## word ## ]]
    {word}

    [[ ## letter ## ]]
    {letter}

    [[ ## reasoning ## ]]
    {reasoning}

    [[ ## count ## ]]
    {count}        # note: the value you produce must be a single int value

    [[ ## completed ## ]]
    In adhering to this structure, your objective is:
            Count the number of occurrences of a specific letter in a given word.

            To accomplish this task, for each letter in the word, check if it matches the target letter.
            For example, if we are looking for the letter 'a' in the word 'banana':

            1. b - this is not an 'a'
            2. a - this is an 'a'
            3. n - this is not an 'a'
            4. a - this is an 'a'
            5. n - this is not an 'a'
            6. a - this is an 'a'

            We count 3 'a's in the word 'banana'
    [[ ## word ## ]]
    anisosepalous

    [[ ## letter ## ]]
    s

    Respond with the corresponding output fields, starting with the field `[[ ## reasoning ## ]]`, then `[[ ## count ## ]]` (must be formatted as a valid Python int), and then ending with the marker for `[[ ## completed ## ]]`.

Adding the docstring gets DSPy add the section "In adhering to this structure, your objective is: ..." to the prompt.

We can also inspect the reasoning from one of the inferences to see the difference:

```python
print(results.results[0][1].reasoning)
```

    The word provided is "repand" and the letter to count is "p". I will examine each letter in the word to see if it matches "p". The first letter is "r", which does not match. The second letter is "e", which does not match. The third letter is "p", which matches. The fourth letter is "a", which does not match. The fifth letter is "n", which does not match. The sixth letter is "d", which does not match. Therefore, the total count of "p" in "repand" is 1.

While the model didn't strictly adhere to the example in our instructions, it followed the prompt instructions enough to inspect each letter individually as part of the reasoning process.

Improving the prompt in this manner can be useful in simple examples, but what if you're not exactly sure how to improve the prompt?

DSPy offers an approach called teleprompting where the model use a subset of a labeled dataset for training, evaluate the results with a signature you define, then optimize the results by providing correct examples to the model as part of the prompt as well as rewriting the instructions with the LLM itself to try and improve the results.

What I've just described is an approach called [MIPROv2](https://dspy.ai/api/optimizers/MIPROv2/).

Let's try it out with with 150 training examples and 50 test examples (same as our initial set size).
We'll use the `count_letter_cot` signature to start with which gives the model space to reason about the problem but doesn't impose the opinionated instructions we added for `count_letter_strategic`.

```python
# Create train and test sets
# Split data to ensure no overlap between train and test sets
df_shuffled = df.sample(frac=1, random_state=42).reset_index(drop=True)

train_data = [dspy.Example(word=row['word'], letter=row['letter'], count=row['count']).with_inputs('word', 'letter')
              for _, row in df_shuffled.iloc[:150].iterrows()]

test_data = [dspy.Example(word=row['word'], letter=row['letter'], count=row['count']).with_inputs('word', 'letter')
             for _, row in df_shuffled.iloc[150:200].iterrows()]
```

```python
from dspy.teleprompt import MIPROv2
```

```python
mipro_optimizer = MIPROv2(
    metric=letter_count_metric,
    auto="light",
    seed=42
)

with dspy.settings.context(lm=gpt_4_1_nano_lm):
    # Optimize the CountLetterCOT module
    print("Optimizing with MIPROv2...")
    optimized_count_letter = mipro_optimizer.compile(
        count_letter_cot,
        trainset=train_data,
        valset=test_data,
    )

    mipro_results = evaluator(optimized_count_letter)


print(f"MIPROv2 optimized results: {mipro_results}")

```

```text collapse={13-217}
2025/09/28 17:55:16 INFO dspy.teleprompt.mipro_optimizer_v2:
RUNNING WITH THE FOLLOWING LIGHT AUTO RUN SETTINGS:
num_trials: 10
minibatch: False
num_fewshot_candidates: 6
num_instruct_candidates: 3
valset size: 50

2025/09/28 17:55:16 INFO dspy.teleprompt.mipro_optimizer_v2:
==> STEP 1: BOOTSTRAP FEWSHOT EXAMPLES <==
2025/09/28 17:55:16 INFO dspy.teleprompt.mipro_optimizer_v2: These will be used as few-shot example candidates for our program and for creating instructions.

2025/09/28 17:55:16 INFO dspy.teleprompt.mipro_optimizer_v2: Bootstrapping N=6 sets of demonstrations...


Optimizing with MIPROv2...
Bootstrapping set 1/6
Bootstrapping set 2/6
Bootstrapping set 3/6


    4%|▍         | 6/150 [00:00<00:02, 57.11it/s]


Bootstrapped 4 full traces after 6 examples for up to 1 rounds, amounting to 6 attempts.
Bootstrapping set 4/6


    3%|▎         | 4/150 [00:00<00:02, 69.03it/s]


Bootstrapped 3 full traces after 4 examples for up to 1 rounds, amounting to 4 attempts.
Bootstrapping set 5/6


    2%|▏         | 3/150 [00:00<00:02, 69.29it/s]


Bootstrapped 2 full traces after 3 examples for up to 1 rounds, amounting to 3 attempts.
Bootstrapping set 6/6


    4%|▍         | 6/150 [00:00<00:02, 71.73it/s]
2025/09/28 17:55:16 INFO dspy.teleprompt.mipro_optimizer_v2:
==> STEP 2: PROPOSE INSTRUCTION CANDIDATES <==
2025/09/28 17:55:16 INFO dspy.teleprompt.mipro_optimizer_v2: We will use the few-shot examples from the previous step, a generated dataset summary, a summary of the program code, and a randomly selected prompting tip to propose instructions.


Bootstrapped 4 full traces after 6 examples for up to 1 rounds, amounting to 6 attempts.


2025/09/28 17:55:16 INFO dspy.teleprompt.mipro_optimizer_v2:
Proposing N=3 instructions...

2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2: Proposed Instructions for Predictor 0:

2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2: 0: Count the number of occurrences of a specific letter in a given word.

2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2: 1: Given a word and a specific letter, analyze and explain how many times the letter appears in the word. Provide a step-by-step reasoning process showing the positions where the letter occurs and then indicate the total count of these occurrences.

2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2: 2: You are a linguistics researcher analyzing letter patterns in words. Given a specific word and a target letter, carefully reason through the positions of the letter within the word, explaining your thought process step by step. Then, accurately count how many times this letter appears in the word and provide both your reasoning and the total count. Be detailed in your explanation to ensure clarity and transparency.

2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2:

2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2: ==> STEP 3: FINDING OPTIMAL PROMPT PARAMETERS <==
2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2: We will evaluate the program over a series of trials with different combinations of instructions and few-shot examples to find the optimal combination using Bayesian Optimization.

2025/09/28 17:55:17 INFO dspy.teleprompt.mipro_optimizer_v2: == Trial 1 / 10 - Full Evaluation of Default Program ==


Average Metric: 45.00 / 50 (90.0%): 100%|██████████| 50/50 [00:07<00:00,  6.80it/s]

2025/09/28 17:55:24 INFO dspy.evaluate.evaluate: Average Metric: 45 / 50 (90.0%)
2025/09/28 17:55:24 INFO dspy.teleprompt.mipro_optimizer_v2: Default program score: 90.0

/Users/danielcorin/dev/dsp-letters/.venv/lib/python3.13/site-packages/optuna/_experimental.py:32: ExperimentalWarning: Argument ``multivariate`` is an experimental feature. The interface can change in the future.
    warnings.warn(
2025/09/28 17:55:24 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 2 / 10 =====



Average Metric: 37.00 / 50 (74.0%): 100%|██████████| 50/50 [00:03<00:00, 13.02it/s]

2025/09/28 17:55:28 INFO dspy.evaluate.evaluate: Average Metric: 37 / 50 (74.0%)





2025/09/28 17:55:28 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 74.0 with parameters ['Predictor 0: Instruction 1', 'Predictor 0: Few-Shot Set 4'].
2025/09/28 17:55:28 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0]
2025/09/28 17:55:28 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 90.0
2025/09/28 17:55:28 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:28 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 3 / 10 =====


Average Metric: 48.00 / 50 (96.0%): 100%|██████████| 50/50 [00:09<00:00,  5.50it/s]

2025/09/28 17:55:37 INFO dspy.evaluate.evaluate: Average Metric: 48 / 50 (96.0%)
2025/09/28 17:55:37 INFO dspy.teleprompt.mipro_optimizer_v2: [92mBest full score so far![0m Score: 96.0
2025/09/28 17:55:37 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 96.0 with parameters ['Predictor 0: Instruction 2', 'Predictor 0: Few-Shot Set 0'].
2025/09/28 17:55:37 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0]
2025/09/28 17:55:37 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:37 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:37 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 4 / 10 =====



Average Metric: 37.00 / 50 (74.0%): 100%|██████████| 50/50 [00:04<00:00, 11.10it/s]

2025/09/28 17:55:41 INFO dspy.evaluate.evaluate: Average Metric: 37 / 50 (74.0%)
2025/09/28 17:55:41 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 74.0 with parameters ['Predictor 0: Instruction 2', 'Predictor 0: Few-Shot Set 4'].
2025/09/28 17:55:41 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0]
2025/09/28 17:55:41 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:41 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:41 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 5 / 10 =====



Average Metric: 37.00 / 50 (74.0%): 100%|██████████| 50/50 [00:00<00:00, 4406.06it/s]

2025/09/28 17:55:42 INFO dspy.evaluate.evaluate: Average Metric: 37 / 50 (74.0%)
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 74.0 with parameters ['Predictor 0: Instruction 1', 'Predictor 0: Few-Shot Set 4'].
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0, 74.0]
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 6 / 10 =====



Average Metric: 37.00 / 50 (74.0%): 100%|██████████| 50/50 [00:00<00:00, 4720.02it/s]

2025/09/28 17:55:42 INFO dspy.evaluate.evaluate: Average Metric: 37 / 50 (74.0%)
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 74.0 with parameters ['Predictor 0: Instruction 2', 'Predictor 0: Few-Shot Set 4'].
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0, 74.0, 74.0]
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:42 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 7 / 10 =====



Average Metric: 38.00 / 50 (76.0%): 100%|██████████| 50/50 [00:04<00:00, 10.89it/s]

2025/09/28 17:55:46 INFO dspy.evaluate.evaluate: Average Metric: 38 / 50 (76.0%)
2025/09/28 17:55:46 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 76.0 with parameters ['Predictor 0: Instruction 0', 'Predictor 0: Few-Shot Set 2'].
2025/09/28 17:55:46 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0, 74.0, 74.0, 76.0]
2025/09/28 17:55:46 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:46 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:46 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 8 / 10 =====



Average Metric: 37.00 / 50 (74.0%): 100%|██████████| 50/50 [00:04<00:00, 10.77it/s]

2025/09/28 17:55:51 INFO dspy.evaluate.evaluate: Average Metric: 37 / 50 (74.0%)
2025/09/28 17:55:51 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 74.0 with parameters ['Predictor 0: Instruction 1', 'Predictor 0: Few-Shot Set 5'].
2025/09/28 17:55:51 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0, 74.0, 74.0, 76.0, 74.0]
2025/09/28 17:55:51 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:51 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:51 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 9 / 10 =====



Average Metric: 31.00 / 50 (62.0%): 100%|██████████| 50/50 [00:04<00:00, 10.89it/s]

2025/09/28 17:55:56 INFO dspy.evaluate.evaluate: Average Metric: 31 / 50 (62.0%)
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 62.0 with parameters ['Predictor 0: Instruction 2', 'Predictor 0: Few-Shot Set 3'].
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0, 74.0, 74.0, 76.0, 74.0, 62.0]
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: ========================


2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 10 / 10 =====



Average Metric: 37.00 / 50 (74.0%): 100%|██████████| 50/50 [00:00<00:00, 3075.77it/s]

2025/09/28 17:55:56 INFO dspy.evaluate.evaluate: Average Metric: 37 / 50 (74.0%)
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 74.0 with parameters ['Predictor 0: Instruction 1', 'Predictor 0: Few-Shot Set 5'].
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0, 74.0, 74.0, 76.0, 74.0, 62.0, 74.0]
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: =========================


2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: ===== Trial 11 / 10 =====



Average Metric: 48.00 / 50 (96.0%): 100%|██████████| 50/50 [00:00<00:00, 4883.34it/s]

2025/09/28 17:55:56 INFO dspy.evaluate.evaluate: Average Metric: 48 / 50 (96.0%)
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Score: 96.0 with parameters ['Predictor 0: Instruction 2', 'Predictor 0: Few-Shot Set 0'].
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Scores so far: [90.0, 74.0, 96.0, 74.0, 74.0, 74.0, 76.0, 74.0, 62.0, 74.0, 96.0]
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Best score so far: 96.0
2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: =========================


2025/09/28 17:55:56 INFO dspy.teleprompt.mipro_optimizer_v2: Returning best identified program with score 96.0!





2025/09/28 17:55:56 INFO dspy.evaluate.evaluate: Average Metric: 48 / 50 (96.0%)


MIPROv2 optimized results: EvaluationResult(score=96.0, results=<list of 50 results>)
```

The results are just as good as our manual prompt improvements.

So what did the model do?

```python
optimized_count_letter
```

    predict = Predict(StringSignature(word, letter -> reasoning, count
        instructions='You are a linguistics researcher analyzing letter patterns in words. Given a specific word and a target letter, carefully reason through the positions of the letter within the word, explaining your thought process step by step. Then, accurately count how many times this letter appears in the word and provide both your reasoning and the total count. Be detailed in your explanation to ensure clarity and transparency.'
        word = Field(annotation=str required=True json_schema_extra={'desc': 'The word to search in', '__dspy_field_type': 'input', 'prefix': 'Word:'})
        letter = Field(annotation=str required=True json_schema_extra={'desc': 'The letter to count', '__dspy_field_type': 'input', 'prefix': 'Letter:'})
        reasoning = Field(annotation=str required=True json_schema_extra={'prefix': "Reasoning: Let's think step by step in order to", 'desc': '${reasoning}', '__dspy_field_type': 'output'})
        count = Field(annotation=int required=True json_schema_extra={'desc': 'The number of times the `letter` appears in the `word`', '__dspy_field_type': 'output', 'prefix': 'Count:'})
    ))

In this case, it looks like the optimizer added specific instructions that seems to result in better performance of the task by the model

> You are a linguistics researcher analyzing letter patterns in words. Given a specific word and a target letter, carefully reason through the positions of the letter within the word, explaining your thought process step by step. Then, accurately count how many times this letter appears in the word and provide both your reasoning and the total count. Be detailed in your explanation to ensure clarity and transparency.

Let's see how this prompt translates into the type of reasoning the model does

```python
with dspy.settings.context(lm=gpt_4_1_nano_lm):
    result = optimized_count_letter(word='basketball', letter='b')

result
```

    Prediction(
        reasoning='The word is "basketball," which contains the following letters: b, a, s, k, e, t, b, a, l, l. I need to find all instances of the letter "b" within this word. The first letter is "b," which matches the target letter. The second "b" appears as the seventh letter in the word. No other "b" characters are present. Therefore, the total count of "b" in "basketball" is 2.',
        count=2
    )

Not quite the same as the approach we instructed in `count_letter_strategic` but it seems to have achieved the same result without our explicit instructions.

The model, helped by DSPy, figured this out iteratively, in a self-improving loop.

I'm going to wrap up here but there's more to explore with DSPy.

- Several other [optimizers](https://dspy.ai/learn/optimization/optimizers/)
- Local models via the [LiteLLM](https://dspy.ai/api/integrations/LiteLLM/) integration

I'll aim to do this in another post soon.
