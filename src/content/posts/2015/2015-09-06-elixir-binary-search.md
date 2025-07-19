---
title: Elixir binary search
createdAt: 2015-09-06T19:08:00.000Z
updatedAt: 2015-09-06T19:08:00.000Z
tags:
  - code
  - elixir
draft: false
aliases:
  - /code/2015/09/06/elixir-binary-search.html
  - /posts/2015-09-06-elixir-binary-search
---

A few days ago, I saw a Guess my word game on the front page of Hacker News. Before spoiling the fun for myself by checking out the comments, I decided to try my hand at writing a solution in Elixir. Afterwards, I generalized the code to choose its own word from the UNIX dictionary and then "guess" it, applying a binary search based on the feedback of whether each guess was alphabetically greater or less than the word itself.

```elixir
defmodule Words do
  @doc """
  Module for read a list of words from a text file.
  Contains functions for `split`ting the list and `find`ing a word
  """
  def read(filename) do
    filename
    |> File.read!()
    |> String.split()
  end

  def split(list) do
    mid = div(length(list), 2)
    Enum.split(list, mid)
  end

  def find(word, words) do
    {first_half, second_half} = split(words)

    guess = (List.last(first_half) || List.first(second_half))
    |> String.downcase

    cond do
      word < guess ->
        IO.puts("Less than: #{guess}")
        find(word, first_half)
      word > guess ->
        IO.puts("Greater than: #{guess}")
        find(word, second_half)
      :else ->
        IO.puts("Found word: #{guess}")
        word
    end
  end
end

defmodule Random do
  @doc """
  Module for choosing a psudo-random element from a list
  """
  def init do
    :random.seed(:os.timestamp)
  end
  def random_element(list) do
    Enum.at(list, :random.uniform(length(list)) - 1)
  end
end

# Entry point

# Set the random seed
Random.init
# Choose a random word
word = Random.random_element(words)
# Read the UNIX words dictionary
words = Words.read("/usr/share/dict/words")
IO.puts("Word is: #{word}")
# Perform the binary search to "guess" the word
Words.find(word, words)
```

Example output:

```sh

$ iex words.exs

Word is: barruly
Less than: modificatory
Less than: eagerness
Less than: canari
Greater than: asthenosphere
Less than: bifoliolate
Greater than: barad
Less than: beguilement
Less than: batzen
Less than: basaltic
Greater than: barmbrack
Greater than: barreler
Less than: bartholomew
Greater than: barrio
Found word: barruly

```

Something I encountered worth mentioning is how Elixir compares strings that have different capitalization. Capital letters are "less than" their lower case versions:

```elixir

iex> "B" < "b"
true

```

Knowing this, we use `String.downcase` in our implementation to avoid comparison issues in the binary search. Binary search has a time complexity of log₂(N).

Given that the UNIX dictionary has 235,886 words

```sh
$ cat /usr/share/dict/words | wc -l
235886
```

the fact the our algorithm took 14 steps to "guess" the word is plausible given

O(log₂(235886)) ≈ O(17.85)

which is the number of steps we would expect it to take to guess our word.
