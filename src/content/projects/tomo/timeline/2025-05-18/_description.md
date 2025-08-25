My simple configuration UI required the user to have a reasonably good understanding of the OpenAI API and knowledge of the different provider URLs for using it.
I baked some of that knowledge into the app, adding an early version of a provider selector.
I kept an option for a custom provider so URLs I didn't add myself could still be easily supported.
I also added a "test connection" button which sent an API request to the configured provider and validated the URL and API key were working.
This saved me a bunch of time and frustration when testing.
