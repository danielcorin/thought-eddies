---
title: Threading Macros
createdAt: 2023-06-21T09:43:00.000Z
updatedAt: 2023-06-21T09:43:00.000Z
tags:
  - clojure
draft: false
---

The threading macro in Clojure provides a more readable way to compose functions together.
It's a bit like a Bash pipeline.
The following function takes a string, splits on a `:` and trims the whitespace from the result.
The threading macro denoted by `->` passes the threaded value as the first argument to the functions.

```clojure
(defn my-fn
  [s]
  (-> s
    (str/split #":") ;; split by ":"
    second ;; take the second element
    (str/trim) ;; remove whitespace from the string
    )
  )
```

There is another threading macro denoted by `->>` which passes the threaded value as the last argument to the functions.
For example:

```clojure
(defn my-fn
  [s]
  (->> s
      (re-find #"\[(.*?)\]") ;; find the string inside square brackets
      second ;; take the second value: the captured string
      str/lower-case ;; make the string lower case
    )
  )
```

Comparing the two examples, the first

```clojure
(str/split my-str #":")
```

takes the threading value as the first parameter to the function whereas the second example

```clojure
(re-find #"\[(.*?)\]" my-str)
```

takes the threading value as the second parameter.

Threading macros are useful but they don't work for everything.
If some of your functions need the argument passed first and others need it passed last, there may not be a good solution with a threading macro.
You can sometimes workaround this mismatch by a wrapping function to make it accept a single argument or reposition the argument based on where the threaded value.
