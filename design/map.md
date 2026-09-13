# Map page refinement

Readers use the map to discover related writing and follow a point back to its entry. Preserve the full-screen canvas, existing positions and category colors, warm background, Futura headings, and light/dark themes. This direction follows the existing site and the request for polish.

## Decisions

- Introduce the visualization with a compact title and a plain-language explanation of dots, connections, and size. Show the map snapshot date so its coverage is clear.
- Group Find, Topics, and Filters at the upper left. Use one scrollable explore panel at a time. Keep a compact color legend visible and reserve space for it in the initial mobile plot.
- Provide explicit zoom, reset, and gesture instructions. Limit wheel zoom to the canvas so panels and entry details can scroll normally. Redraw from the latest committed state even when updates share an animation frame.
- Add title search over the visible entries as a keyboard-accessible way to locate a point. Selecting a search result centers it and opens a readable detail card with a direct link. Cards have an explicit close control and return focus to the canvas on dismissal.
- Keep type/year controls effective during history playback. Pause on filter changes and entry selection. Group dated entries into UTC publishing days; scrub and step by day, with the endpoint at the latest mapped entry. Playback starts only when requested.
- Give history a full-width player on mobile. Make room for both history and an open explore panel, with internal scrolling. Keep pan and pinch gestures on the canvas.
- Use a loading fallback and plain-language empty states with filter reset actions.

## Review

Independent review found the composition and theme treatments coherent, with no material layout gap. Corrected its singular-count finding in history. Its suggestion to label the mobile site navigation was left for a site-wide navigation change; this pass preserves the shared navigation component.

Captures and browser verification scripts are under `/private/tmp/map-polish/`. Review captures cover desktop, mobile, both themes, filters, history, and selected-entry cards.

The map snapshot was rebuilt with all 597 eligible non-draft entries. `mise run rebuild-map` starts Ollama when needed, downloads the embedding model if missing, reuses cached embeddings, and regenerates the dataset. It stops only the server it started. The command and deployment steps are documented in the README.

## Verification

Production build and Astro diagnostics pass. Browser checks passed for counts and filters, topic highlighting, title search and empty results, entry links, focus and Escape behavior, zoom/reset/pan/wheel, panel scrolling without zoom, touch selection and pinch, filtered history stepping, endpoint coverage, daily keyboard scrubbing, play/pause/speed, preserving history when selecting an entry, and panel bounds from 320px to 1280px including landscape. No browser errors were reported. Light and dark themes were visually inspected.

The full-site build still reports existing remote-embed fetch warnings in unrelated content when network access is restricted.
