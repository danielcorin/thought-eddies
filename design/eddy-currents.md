# Eddy currents

The homepage footer is a quiet signature for Thought Eddies. Readers should
notice the circulation, then be able to use the footer links without visual
interference. This is the third design for the band: after a suminagashi
fluid simulation and a field of filaments around fixed gyres, the user asked
for a fresh redesign around the concept of eddy currents. A pointer
interaction was built, made smooth, and then removed at the user's request;
the band is now purely ambient.

## Direction

An eddy is what a current does when something gets in its way. The band is
now a slow stream running left to right. Two unseen stones part the flow and
shed alternating eddies that drift downstream and dissolve. Fine streaks of
dye laid across the stream wind into each eddy and show which way it turns,
and the streaks themselves travel with the water so the direction of flow
is always legible. The stones are only implied: a quiet disc the dye flows
around, with a faint shadow line trailing behind.

The pointer does nothing: the water ignores the mouse entirely. Narrow
screens get one stone, fewer lines, and a quieter centre behind the stacked
footer links. All colour comes from the
page's ink and background variables, with a gradual fade into the content
above.

## How it is drawn

The water is an analytic velocity field: a uniform stream with a gentle
meander, potential flow around each stone, and compact Scully vortices for
the shed eddies.
Every eddy moves in a straight line from where it was born, so the CPU
keeps a short list of them and the GPU only ever sees positions and
strengths. The first frame already shows a developed street because the
stones shed for a simulated minute before the band first draws.

Two passes per frame:

1. A trace pass walks each pixel backwards through the current field for
   twenty seconds (forty midpoint steps) to find where its dye came from.
   It runs at three quarters of CSS resolution and packs the source
   coordinates as two 16-bit values into an ordinary RGBA8 texture, so no
   float texture extensions are needed.
2. A display pass interpolates those coordinates by hand and evaluates the
   dye pattern at full resolution: lines of dye with per-line weight and a
   broken rhythm of streaks, antialiased from screen-space derivatives.
   Where the dye is wound finer than a few pixels it becomes a soft wash;
   where the mapping is torn along a dividing streamline it becomes a
   fainter shadow line. Both prevent shimmer and moiré.

Nothing accumulates between frames, so the picture is exact every frame, a
still frame is as settled as a running one, and context restoration simply
rebuilds and continues.

## Pointer interaction, removed

Earlier revisions let a moving pointer drag a trail of dipole elements
through the water. Making it smooth taught two things worth keeping: a
frozen-field back-trace amplifies any change in a moving source by the
whole trace history, so a fast-moving source must be gated by its age; and
dropping or merging elements at capacity visibly pops the picture, so
eviction has to fade. The user then asked for the pointer's impact to be
removed, so the trail, its uniforms, its listeners, and the full-refresh
mode that served it are gone. The band renders at a fixed 30 fps.

## Runtime constraints

- Lazy initialization near the footer; animation stops offscreen or in hidden
  tabs.
- Animation is capped at 30 fps, with a lower pixel ratio on constrained
  devices and further resolution reductions if sustained frame times are
  too high.
- Reduced motion displays a still frame of the developed street, identical
  across reloads thanks to a seeded shedding rhythm.
- Reduced data, unavailable WebGL, missing high-precision fragment floats,
  an incomplete framebuffer, and rendering failure all use a soft CSS wash.
- The decoration is hidden from assistive technology, does not receive
  pointer events, and does not react to the pointer. Footer links retain
  their existing semantics and keyboard behavior.

## Verification

The production build passes. Astro diagnostics report no errors, warnings,
or hints across 210 files, and the component passes Prettier's check.
Production-preview browser checks verified lazy initialization, a measured
30 fps, that moving the pointer across the band leaves the field unchanged,
offscreen pausing, unchanged reduced-motion frames, mobile resizing, both
themes, a seamless top edge during the theme transition, context loss and
restoration, keyboard navigation, and the reduced-data, no-WebGL, and
no-derivative fallbacks. A per-frame probe that reads the canvas back after
every display pass confirms the image changes by the same small, steady
amount whether or not the mouse is moving. No browser errors were recorded.
These checks used local headless Chromium with GPU acceleration, not
physical devices.

Captures and scripts are kept in `/private/tmp/eddy-stream/`
(`preview.mjs`, `verify.mjs`, `perframe.mjs`, `gputime.mjs`,
`verification.json`). The previous filament design is preserved at
`/private/tmp/eddy-redesign/`.
