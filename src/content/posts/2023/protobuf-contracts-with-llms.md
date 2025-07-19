---
title: Protobuf contracts with LLMs
createdAt: 2023-05-27T21:58:14.000Z
updatedAt: 2023-05-27T21:58:14.000Z
publishedAt: 2023-05-27T21:58:14.000Z
tags:
  - language_models
  - protobuf
draft: false
---


I've [written](/posts/2023/figuring-out-how-to-use-llms-in-production) [several](/posts/2023/shaping-llm-responses) [posts](/posts/2023/language-model-schema-and-object-gen) on using JSON and [Pydantic](https://docs.pydantic.dev/latest/) schemas to structure LLM responses.
Recently, I've done some work using a similar approach with protobuf message schemas as the data contract.
Here's an example to show what that looks like.

## Example

Imagine we have the following questionnaire that we send out to new employees when they join our company so their teammates can get to know them better.

1. What are your hobbies or interests outside of work? Are there any particular activities or hobbies that you enjoy doing in your free time?
2. Are there any unique talents or skills that you possess that your teammates might find interesting or helpful?
3. What is one thing you would like your teammates to know about you that may not be immediately apparent?
4. Are there any favorite books, movies, or TV shows that you enjoy? Feel free to share a few recommendations with your teammates.
5. What is one interesting or memorable travel experience you've had? It could be an adventure, a cultural immersion, or simply a unique encounter that left a lasting impression. Share a brief description with your teammates.

For fun, we want to reward those who read and engage with these emails because we think it helps with team building, so we want to periodically do some trivia using all employees' answers to these questions.
An example of one of these trivia questions could be "who has the unique talent that they can juggle bowling pins?".
If we have a lot of employees, it would become cumbersome to manage all this data, but it's important to do so for our trivia game.
We don't want to have to re-read response emails each week to create our trivia.
We want the employee, the question and their answer readily available.

Let's say a new employee, Alice, sent the following response to our question email:

> to: dan.corin@newco.com
> from: alice.example@newco.com
>
> Hi Dan,
> Excited to join the team! Please find my answers inline.
>
> What are your hobbies or interests outside of work? Are there any particular activities or hobbies that you enjoy doing in your free time?
>
> Answer: Outside of work, I love exploring ancient ruins in far-flung corners of the world. I'm an avid scuba diver and have even discovered hidden underwater caves.
>
> Are there any unique talents or skills that you possess that your teammates might find interesting or helpful?
>
> Answer: I have a knack for mastering exotic languages. Currently, I'm fluent in six languages, including Klingon and Elvish!
>
> What is one thing you would like your teammates to know about you that may not be immediately apparent?
>
> Answer: I'm a passionate salsa dancer and have won several dance competitions. If we ever have a team celebration, you can count on me to bring the dance floor to life!
>
> Are there any favorite books, movies, or TV shows that you enjoy? Feel free to share a few recommendations with your teammates.
>
> Answer: I'm a big fan of fantasy and adventure. One of my favorite book series is "The Name of the Wind" by Patrick Rothfuss. For movies, I highly recommend "Crouching Tiger, Hidden Dragon" and "Indiana Jones and the Last Crusade."

Let's extract the questions we asked Alice and her responses using a schema that will make it easy to generate some trivia about her later from an "employee fun fact database".

This code will do the job pretty well:

```python
import openai

system_prompt = '''
We asked an employee the following questions and received an email in response.

1. What are your hobbies or interests outside of work? Are there any particular activities or hobbies that you enjoy doing in your free time?
2. Are there any unique talents or skills that you possess that your teammates might find interesting or helpful?
3. What is one thing you would like your teammates to know about you that may not be immediately apparent?
4. Are there any favorite books, movies, or TV shows that you enjoy? Feel free to share a few recommendations with your teammates.
5. What is one interesting or memorable travel experience you've had? It could be an adventure, a cultural immersion, or simply a unique encounter that left a lasting impression. Share a brief description with your teammates.

Extract the questions and their answers and respond with JSON adhering to the following protobuf schema:

message QuestionnaireResponse {
  // email address of new employee answering the questions
  string employee_email_address = 1;
  // list of questions answered by the new employee
  repeated TriviaQuestion questions = 2;
}

message TriviaQuestion {
  string question = 1;
  string answer = 2;
  // using the question and answer, write a trivia question about the employee but do not include the employee's name. for example, if the question is "What is your favorite baseball team" and the answer is "The New York Yankees" then the trivia question could be "Whose favorite baseball team is the New York Yankees?"
  string trivia_question = 3;
}
'''

prompt = '''
to: dan.corin@newco.com
from: alice.example@newco.com

Hi Dan,
Excited to join the team! Please find my answers inline.

What are your hobbies or interests outside of work? Are there any particular activities or hobbies that you enjoy doing in your free time?
Answer: Outside of work, I love exploring ancient ruins in far-flung corners of the world. I'm an avid scuba diver and have even discovered hidden underwater caves.

Are there any unique talents or skills that you possess that your teammates might find interesting or helpful?
Answer: I have a knack for mastering exotic languages. Currently, I'm fluent in six languages, including Klingon and Elvish!

What is one thing you would like your teammates to know about you that may not be immediately apparent?
Answer: I'm a passionate salsa dancer and have won several dance competitions. If we ever have a team celebration, you can count on me to bring the dance floor to life!

Are there any favorite books, movies, or TV shows that you enjoy? Feel free to share a few recommendations with your teammates.
Answer: I'm a big fan of fantasy and adventure. One of my favorite book series is "The Name of the Wind" by Patrick Rothfuss. For movies, I highly recommend "Crouching Tiger, Hidden Dragon" and "Indiana Jones and the Last Crusade."

JSON response:
'''

completion = openai.ChatCompletion.create(
  model="gpt-3.5-turbo",
    messages=[
      {"role": "system", "content": system_prompt},
      {"role": "user", "content": prompt},
    ],
    temperature=1.0,
  )

result = completion.choices[0].message.content
print(result)
```

The output is:

```json
{
  "employee_email_address": "alice.example@newco.com",
  "qas": [
    {
      "question": "What are your hobbies or interests outside of work? Are there any particular activities or hobbies that you enjoy doing in your free time?",
      "answer": "Outside of work, I love exploring ancient ruins in far-flung corners of the world. I'm an avid scuba diver and have even discovered hidden underwater caves."
    },
    {
      "question": "Are there any unique talents or skills that you possess that your teammates might find interesting or helpful?",
      "answer": "I have a knack for mastering exotic languages. Currently, I'm fluent in six languages, including Klingon and Elvish!"
    },
    {
      "question": "What is one thing you would like your teammates to know about you that may not be immediately apparent?",
      "answer": "I'm a passionate salsa dancer and have won several dance competitions. If we ever have a team celebration, you can count on me to bring the dance floor to life!"
    },
    {
      "question": "Are there any favorite books, movies, or TV shows that you enjoy? Feel free to share a few recommendations with your teammates.",
      "answer": "I'm a big fan of fantasy and adventure. One of my favorite book series is \"The Name of the Wind\" by Patrick Rothfuss. For movies, I highly recommend \"Crouching Tiger, Hidden Dragon\" and \"Indiana Jones and the Last Crusade.\""
    }
  ]
}
```

## Extending the use case

With this structured JSON response from the LLM, we can unmarshal it into a protobuf in our codebase to ensure it complies with the defined schema, then insert it into our employee fun fact database for when it's time to do trivia.
We can go a bit further though.
With the above approach and structure, when it comes time to do trivia, we will still need to take the question and answer pair and rewrite it as a trivia question.
For example, a trivia question using the above data for question 2 could be "Who is fluent in six languages, including Klingon and Elvish?" where the correct answer is "Alice".
We can instruct the language model using our schema to write the trivia questions for us, so when it comes time to do trivia, we just pluck one out of the database.

Let's modify our system prompt to be

```text
We asked an employee the following questions and received an email in response.

1. What are your hobbies or interests outside of work? Are there any particular activities or hobbies that you enjoy doing in your free time?
2. Are there any unique talents or skills that you possess that your teammates might find interesting or helpful?
3. What is one thing you would like your teammates to know about you that may not be immediately apparent?
4. Are there any favorite books, movies, or TV shows that you enjoy? Feel free to share a few recommendations with your teammates.
5. What is one interesting or memorable travel experience you've had? It could be an adventure, a cultural immersion, or simply a unique encounter that left a lasting impression. Share a brief description with your teammates.

Extract the questions and their answers and respond with JSON adhering to the following protobuf schema:

message QuestionnaireResponse {
  // email address of new employee answering the questions
  string employee_email_address = 1;
  // list of questions answered by the new employee
  repeated TriviaQuestion questions = 2;
}

message TriviaQuestion {
  // true if employee answered the question
  // false if the employee did not answer the question
  bool answered = 1;
  string question = 2;
  string answer = 3;
  // using the question and answer, write a trivia question about the employee but do not include the employee's name. for example, if the question is "What is your favorite baseball team" and the answer is "The New York Yankees" then the trivia question could be "Whose favorite baseball team is the New York Yankees?"
  string trivia_question = 4;
}
```

Take note of the comment above the `trivia_question` field:

> using the question and answer, write a trivia question about the employee but do not include the employee's name. for example, if the question is "What is your favorite baseball team" and the answer is "The New York Yankees" then the trivia question could be "Whose favorite baseball team is the New

These comments in the protobuf help steer the model to generate trivia questions for us.
Running the code again, the JSON output includes trivia questions that we could ask verbatim:

```json
{
  "employee_email_address": "alice.example@newco.com",
  "questions": [
    {
      "question": "What are your hobbies or interests outside of work? Are there any particular activities or hobbies that you enjoy doing in your free time?",
      "answer": "Outside of work, I love exploring ancient ruins in far-flung corners of the world. I'm an avid scuba diver and have even discovered hidden underwater caves.",
      "trivia_question": "Whose hobby includes exploring ancient ruins and discovering hidden underwater caves?"
    },
    {
      "question": "Are there any unique talents or skills that you possess that your teammates might find interesting or helpful?",
      "answer": "I have a knack for mastering exotic languages. Currently, I'm fluent in six languages, including Klingon and Elvish!",
      "trivia_question": "Who is fluent in six languages, including Klingon and Elvish?"
    },
    {
      "question": "What is one thing you would like your teammates to know about you that may not be immediately apparent?",
      "answer": "I'm a passionate salsa dancer and have won several dance competitions. If we ever have a team celebration, you can count on me to bring the dance floor to life!",
      "trivia_question": "Who is a passionate salsa dancer and has won several dance competitions?"
    },
    {
      "question": "Are there any favorite books, movies, or TV shows that you enjoy? Feel free to share a few recommendations with your teammates.",
      "answer": "I'm a big fan of fantasy and adventure. One of my favorite book series is \"The Name of the Wind\" by Patrick Rothfuss. For movies, I highly recommend \"Crouching Tiger, Hidden Dragon\" and \"Indiana Jones and the Last Crusade.\"",
      "trivia_question": "Whose favorite book series includes \"The Name of the Wind\" and favorite movies include \"Crouching Tiger, Hidden Dragon\" and \"Indiana Jones and the Last Crusade?\""
    }
  ]
}
```

The final result is a structure that can be used by a production system combined with generative capabilities and natural language understanding.
