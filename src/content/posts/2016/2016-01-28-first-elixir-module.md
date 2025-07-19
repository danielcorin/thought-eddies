---
title: Creating an Elixir module
createdAt: 2016-01-28T07:23:00.000Z
updatedAt: 2016-01-28T07:23:00.000Z
tags:
  - code
  - elixir
draft: false
aliases:
  - /code/2016/01/28/first-elixir-module.html
  - /posts/2016-01-28-first-elixir-module
---

Creating an Elixir module
=========================

To get a better handle on Elixir, I developed a simple CLI tool for sending files in [Slack](https://slack.com/).

To create a new project, run

```sh
$ mix new slack_bot
```

This creates a new Elixir project which looks like this

```sh
├── README.md
├── config
│   └── config.exs
├── lib
│   └── slack_bot.ex
├── mix.exs
└── slack_bot
    ├── slack_bot_helper.exs
    └── slack_bot_test.exs
```

Navigate to the `lib` folder and create a folder inside it called `slack_bot`. We will use this folder for our code (`slack_bot.exs`) will remain empty. Then, create the files `bot.ex` and `cli.ex`. `cli.ex` will be the entry point to our application. `bot.ex` will contain the code for the specific Slack functions.

```sh
├── README.md
├── config
│   └── config.exs
├── lib
│   ├── slack_bot
│   │   ├── bot.ex
│   │   └── cli.ex
│   └── slack_bot.ex
├── mix.exs
└── slack_bot
    ├── slack_bot_helper.exs
    └── slack_bot_test.exs
```

Our app is going to need to make HTTP requests and parse JSON into Elixir data structures. We can use [`HTTPoison`](https://github.com/edgurgel/httpoison) and [`Poison`](https://github.com/devinus/poison) for these functions, respectively.

Open `mix.exs` and modify the `application` and `deps` functions to look like this:

```elixir
def application do
  [applications: [:logger, :poison, :httpoison]]
end

defp deps do
  [{:httpoison, "~> 0.8.0"}, {:poison, "~> 2.0"}]
end
```

These lines define our app dependencies and instruct our program to use them.

Install the dependencies with

```sh
$ mix deps.get
```

Now open the `mix.ex` file. Since we are creating a CLI, modify the `project` function to look like this:

```elixir
def project do
  [app: :slack_bot,
   version: "0.0.1",
   elixir: "~> 1.1",
   escript: [main_module: SlackBot.CLI], # this line is new
   build_embedded: Mix.env == :prod,
   start_permanent: Mix.env == :prod,
   deps: deps]
end
```

First, we will create our CLI parser, which is the entry point we defined in the `mix.exs` file. Open `lib/slack_bot/cli.ex` and add the following code:

```elixir
defmodule SlackBot.CLI do
  def main(args) do
    args |> parse_args |> process
  end

  def process({[], _, _}) do
    IO.puts "No arguments given."
  end

  def process({options, remaining, invalid}) do
    opts = Enum.into(options, %{})
    case opts do
      %{file: file, channel: channel} ->
        SlackBot.Bot.upload_file(file, channel)
      _ ->
        IO.puts "No match found for #{inspect opts}"
    end
  end

  def parse_args(args) do
    OptionParser.parse(args,
      switches: [
        channel: :string,
        file: :string
      ],
      aliases: [
        c: :channel,
        f: :file
      ]
    )
  end

end
```

This module defines our CLI behavior. Our `main` function is the entry point of the module. We take the input arguments to the program and pipe (`|>`) them through a series of functions to validate and execute the real work of the program.We use an `OptionParser` and parse for two flags, `--channel` and `--file` as defined in the `switches` list. We also alias these flags to the abbreviated versions `-c` and `-f` respectively. Finally, we process the arguments and if they meet our expected conditions (both flags present), we call our function to upload the file (`SlackBot.Bot.upload_file`), which we will define now.

Open `lib/slack_bot/bot.ex` and add the following code:

```elixir
defmodule SlackBot.Bot do
  @url_upload "https://slack.com/api/files.upload"

  def url_with_params(url, params) do
    param_string = Enum.map(params, fn {key, value} -> Enum.join([key, value], "=") end)
    |> Enum.join("&")
    "#{url}?#{param_string}"
  end

  def get_token() do
    System.get_env("SLACK_TOKEN")
  end

  def upload_file(path_to_file, channels) do
    IO.puts "Sending #{path_to_file} to #{channels}"
    params = %{
      "token" => get_token(),
      "file" => path_to_file,
      "channels" => channels
    }
    url = url_with_params(@url_upload, params)
    HTTPoison.post!(url, {:multipart, [{"name", "value"}, {:file, path_to_file}]})
    IO.puts "Sent!"
  end

end
```

According to the Slack API documentation for [files.upload](https://api.slack.com/methods/files.upload), we pass three query parameters in our POST request to their API: a token, a file and a comma seperated value list of channels. When we call `upload_file` from our `CLI` module, we grab our Slack API token (assumed to be set as an environment variable `SLACK_TOKEN`; visit [Slack](https://api.slack.com/tokens) to get a token) and pass in our file path and channel arguments from the `CLI`. Next, we build our URL, injecting the query parameters:

```sh
https://slack.com/api/files.upload?token=<token>&file=<file>&channels=<channels>
```

Examples for parameters:

```sh
token: xxxx-yyyyyyyyyy-zzzzzzzzzzz-aaaaaaaaaaa-xxxxxxxxxx
channels: @chris,#dev
file: ../dev/ui.pdf
```

Once we have our URL, we use `HTTPoison` to make a POST request to Slack, using an `enctype` of `multipart/form-data`. I had no idea what this meant, but got some help from this `HTTPoison` [Github issue](https://github.com/edgurgel/httpoison/issues/47).

Lastly, run

```sh
$ mix escript.build
```

to compile the script to binary and run it like this:

```sh
$ ./slack_bot -c @chris -f ~/Downloads/that_one.gif
```

Hope you enjoy!
