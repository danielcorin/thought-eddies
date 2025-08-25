With the core UX in place, I was ready to add configuration to allow the user to choose different models.
As a simple chat app, I imagined the user might choose from a few different models depending on the task.

These tasks could include simple things most models can do like

- extract the text from this image
- translate this text to Spanish
- summarize this article

to more complex tasks like writing SQL queries to paste into a query tool or writing Python code to run in Jupyter running in the browser on a remote server.

To easily support model selection, I decided to support any model exposed using the OpenAI Chat Completion API, an unofficial standard that many providers have adopted to lower the switching cost for a developer to try their model using existing code (e.g. [Openrouter](https://openrouter.ai/docs/quickstart), [Anthropic](https://docs.anthropic.com/en/api/openai-sdk), [Deepseek](https://api-docs.deepseek.com/))

This API supports text and images which is all that is required for the functionality of the app.

In the background, you can notice support for rendering the assistant's response as markdown.
