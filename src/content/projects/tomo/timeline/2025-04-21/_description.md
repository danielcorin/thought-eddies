Around the one week mark, I finally had the UX at a point where I was ready to start making calls to an actual LLM.
I had held off on implementing this for a relatively long time.

I didn't want to waste time or tokens running inference earlier when the UX didn't work at all.
I had already done hours of experimentation with different scrolling approaches.

Initially, I had wanted to autoscroll as the content streamed from the API, but if the user scrolled away, the autoscroll would stop.
If the user scrolled back to the bottom while the content was still streaming, the autoscroll would start again.
This approach proved tough to implement, but when I finally got it working, I didn't like it at all.

This screenshot shows the streamed response from a multi-modal chat message sent to `claude-3-7-sonnet`.
The image in the message is a picture of the app itself.
Those colors were what I was seeing on my machine - not the washed out, faded ones which came from taking window screenshots of the app with transparency.
