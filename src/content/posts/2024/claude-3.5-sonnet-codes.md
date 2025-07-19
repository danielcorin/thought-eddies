---
title: Claude 3.5 Sonnet Codes Really Well
createdAt: 2024-06-23T01:10:36.000Z
updatedAt: 2024-06-23T01:10:36.000Z
publishedAt: 2024-06-23T01:10:36.000Z
tags:
  - claude-3.5-sonnet
  - tactic
draft: false
githubUrl: 'https://github.com/danielcorin/tactic'
---

One of my favorite things to do with language models is to use them to write code.
I've been wanting to build a variation on tic-tac-toe involving a bit of game theory.
I called it "Tactic".
I wasn't even really sure if the game would be any more interesting than tic-tac-toe itself, which reliably ends in draws for any players who understand the basics of the game.
Rather than explain too much, I'll show the prompt I wrote for `claude-3.5-sonnet` using [Workbench](https://console.anthropic.com/workbench).
Try it yourself!
You will probably receive a response quite similar to what I got.
Related: I need to start saving my model conversations in a consistent format.

> Hi! I want to create a simple game using web technology. The game is a variation on tic-tac-toe. It will use the same board but the mechanics of playing are slightly changed.
>
> The game has two players.
> Each player proposes two moves then submits them.
> The server receives these two moves then awards the square to a player only that player was the only one of the two to propose the move. If both players propose a move at the same position, neither player gets the square. If neither player proposes a move at a square, nothing happens.
>
> We will start simple. The game cannot start until two players connect to the web server. Manage these two connections over a websocket. When both players join, match them on the server, then notify the client whether it is playing as X or O.
> From here, both players will need to submit moves. Each should select two unoccupied spots from the board, then click a "lock" button in the UI.
> Once, both players select lock, the server should determine the new board state based on the logic described above, then send the new board state to both players.
> This process repeats until on player gets tic-tac-toe or it's not longer possible for either player to win.
>
> When it's no longer possible for either player to win, the client should display a "new game" button to both players on the client. If either player clicks this button, a new game with an empty board should begin.
>
> Please write client and server side code for this game, including any html and css


Claude outputted code for the following files
- `server.js`
- `public/index.html`
- `public/styles.css`
- `public/script.js`

then instructed me to run

```sh
npm init -y
npm install express socket.io
```

This prompt alone got me surprisingly close to a working version of the game.
I pasted these files into Cursor, then followed Claude's directions to initialize the project.
I started the server then opened two browser tabs.
Both clients connected and matched after the second client connected.
I started clicking the cells of the board and they appeared selected but they did not show a marker (e.g. "X" or "O").
I prompted Claude to fix this.
Next, I started trying to submit moves.
The server seemed to be receiving the moves but not notifying the clients of the new board state after calculating it.
I asked Cursor in chat (also using Sonnet) to look at `server.js` and `public/script.js` to figure out why the clients weren't updating.

> look at @script.js and @server.js and help me figure out why my clients aren't receiving the boardUpdate event

Claude responded with

> The issue seems to be with the way you're trying to emit the 'boardUpdate' event to a specific room in your server.js file. The `io.to(gameId).emit('boardUpdate', { board: newBoard, turn: game.turn });` line is trying to emit an event to a room that doesn't exist.
>
> In Socket.IO, rooms are a way of broadcasting an event to a specific group of sockets. You can add a socket to a room using the `socket.join(room)` method. However, in your code, you never add the sockets to a room.

Then, it suggested a code change to `server.js` to fix this, which just worked.

At this point, the game was basically working.

Claude feels like a powerful tool to me.
I wrote less than 1% of the code characters in this project myself.
I molded the project using prompts and my vision for the finished product.

Claude writes code in seconds and the code seems to be mostly correct.
When the code isn't correct, you can often use Claude to find and correct the issue by describing the problem you are seeing.

## Takeaways

We've seen LLMs writing code for a while now, with varied levels of competence.
I haven't played much with models that are fine-tuned to write code, so it's possible I am late to the party here, but this version of Sonnet is _so good_.
I think it's the best model I've used to write code.
I've seen many folks building cool stuff with "[Artifacts](https://www.youtube.com/watch?v=rHqk0ZGb6qo)" which I haven't even had a chance to touch yet (edit: [I tried it out](/posts/2024/claude-artifacts)), but seeing Claude create a working, non-trivial, multi-file project in a single prompt impressed me.
It was a joy to use in Cursor to refine and improve the idea further.

## To the skeptics

I've frequently heard experienced engineers say projects like this one are easy for anyone who knows how to code.
I've made several attempts, both with and without models to get a prototype of this idea working, and got stuck at various points along the way each time.
Undoubtedly, the false starts partially contributed to my ability to get it working this time.
It's also possible if I had spent a bit more time on any of those occasions, I might have gotten to a working prototype sooner.
For me, the bottom line is Claude helped me ship this to the degree that I had hoped to and meaningfully decreased the time from idea to "thing in the world".

[Here is the code](https://github.com/danielcorin/tactic) in case you are interested in looking around.
