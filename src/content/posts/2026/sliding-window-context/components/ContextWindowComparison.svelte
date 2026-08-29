<script lang="ts">
  import { fly } from "svelte/transition";
  import { flip } from "svelte/animate";

  type Role = "user" | "assistant" | "tool";
  interface TurnDef {
    id: number;
    tokens: number; // thousands of tokens
    role: Role;
    label: string;
  }

  // Realistic-ish numbers. A 200k model window; Slice keeps active context in
  // an ~80k target / ~100k hard-prune band (real defaults), while the compaction
  // baseline fills most of the window before fusing everything into a summary.
  const WINDOW_K = 200; // full model context window
  const WINDOW_PX = 300; // pixel height that represents the full window
  const PREFIX_K = 6; // system prompt / setup — always kept

  // Slice (sliding window)
  const TARGET_K = 80; // prune recent turns back down to this
  const HARD_MAX_K = 100; // start pruning once active context exceeds this
  const MAX_TURNS = 50; // never keep more than this many recent turns

  // Compaction baseline
  const COMPACT_AT_K = 170; // compact once the next turn would exceed this
  const SUMMARY_K = 22; // size of the carried-over summary

  // A long coding session. Turn sizes vary the way real turns do (a bare reply
  // is small; a turn with big file reads / diffs is large).
  const SIZES = [
    7, 4, 9, 3, 6, 12, 5, 8, 4, 10, 6, 3, 11, 7, 5, 9, 4, 8, 6, 13, 5, 7, 3, 10,
    8, 4, 9, 6, 11, 5, 7, 4, 12, 6, 8, 3, 10, 5, 9, 7, 4, 11, 6, 8, 5, 9, 3, 7,
  ];
  const FLAVORS: { role: Role; label: string }[] = [
    { role: "user", label: "feature request" },
    { role: "tool", label: "grep" },
    { role: "tool", label: "read file" },
    { role: "assistant", label: "plan" },
    { role: "tool", label: "edit" },
    { role: "tool", label: "run tests" },
    { role: "assistant", label: "reply" },
    { role: "user", label: "follow-up" },
  ];
  const turns: TurnDef[] = SIZES.map((k, i) => ({
    id: i + 1,
    tokens: k,
    role: FLAVORS[i % FLAVORS.length].role,
    label: FLAVORS[i % FLAVORS.length].label,
  }));

  let step = $state(0);
  let playing = $state(false);
  let reduce = $state(false);

  const revealed = $derived(turns.slice(0, step));
  const dur = $derived(reduce ? 0 : 240);

  function heightPx(k: number): number {
    return Math.max(3, (k / WINDOW_K) * WINDOW_PX);
  }
  function zone(k: number): "cool" | "warm" | "hot" {
    const p = k / WINDOW_K;
    return p < 0.55 ? "cool" : p < 0.8 ? "warm" : "hot";
  }
  function blkClass(b: Block): string {
    return b.kind === "turn" ? b.turn.role : b.kind;
  }
  function blkTitle(b: Block): string {
    if (b.kind === "prefix") return "system prefix — always kept";
    if (b.kind === "summary") return `${b.covered} turns fused into a summary`;
    return `turn ${b.turn.id} · ${b.turn.label} · ${b.turn.tokens}k`;
  }
  function blkLabel(b: Block): string | null {
    if (b.kind === "summary") return `⟳ summary · ${b.covered} turns`;
    return null;
  }

  // As the conversation accumulates, the agent occasionally realizes it needs an
  // earlier tool result that has already scrolled out of the window. It searches
  // the index and pulls that turn back in via a tool call — which happens at the
  // most recent turn. So a recall injects the old turn at the bottom of the
  // stream, after which it rolls up and ages out like any other message. Each
  // event fires automatically once `step` reaches its `at`; `turnId` points at a
  // tool call that is safely pruned by then.
  const RECALL_EVENTS = [
    { at: 16, turnId: 3 }, // "read file" from the start of the session
    { at: 27, turnId: 6 }, // an earlier "run tests"
    { at: 39, turnId: 13 }, // an earlier "edit"
  ];
  interface StreamItem {
    key: string;
    tokens: number;
    role: Role;
    label: string;
    recalled: boolean;
  }
  // The full message stream in arrival order: each revealed turn, plus any
  // recalled turn injected right after the turn at which it was searched.
  const stream = $derived.by(() => {
    const items: StreamItem[] = [];
    for (let i = 1; i <= step; i++) {
      const t = turns[i - 1];
      items.push({
        key: `t${t.id}`,
        tokens: t.tokens,
        role: t.role,
        label: t.label,
        recalled: false,
      });
      for (const e of RECALL_EVENTS) {
        if (e.at !== i) continue;
        const src = turns[e.turnId - 1];
        items.push({
          key: `r${e.turnId}@${e.at}`,
          tokens: src.tokens,
          role: src.role,
          label: src.label,
          recalled: true,
        });
      }
    }
    return items;
  });
  // Every base turn plus every recall the agent injects over the run.
  const totalMessages = turns.length + RECALL_EVENTS.length;

  // Sliding window (Slice): pinned prefix + most recent messages that fit the
  // token/turn budget. Active context sawtooths inside the 80k–100k band.
  const sliding = $derived.by(() => {
    const rev = stream;
    const allK = PREFIX_K + rev.reduce((s, t) => s + t.tokens, 0);
    const over = allK > HARD_MAX_K || rev.length > MAX_TURNS;
    if (!over) {
      return { kept: rev, omitted: 0, activeK: allK };
    }
    const kept: StreamItem[] = [];
    let sum = PREFIX_K;
    for (let i = rev.length - 1; i >= 0; i--) {
      const candidate = sum + rev[i].tokens;
      if (kept.length >= MAX_TURNS) break;
      if (candidate > TARGET_K && kept.length > 0) break;
      sum = candidate;
      kept.unshift(rev[i]);
    }
    return { kept, omitted: rev.length - kept.length, activeK: sum };
  });

  // Recalled messages that are still live in the active window (for the note).
  const recalledActive = $derived(sliding.kept.filter((i) => i.recalled));

  // Compaction (Codex baseline): fill toward the ceiling, then fuse the
  // whole conversation into a carried-over summary and start over.
  type Block =
    | { id: string; kind: "prefix"; tokens: number }
    | { id: string; kind: "summary"; tokens: number; covered: number }
    | { id: string; kind: "turn"; tokens: number; turn: TurnDef };

  const compaction = $derived.by(() => {
    let ctx: Block[] = [{ id: "prefix", kind: "prefix", tokens: PREFIX_K }];
    let sum = PREFIX_K;
    let compactions = 0;
    for (const t of revealed) {
      if (sum + t.tokens > COMPACT_AT_K) {
        compactions += 1;
        const prevSummary = ctx.find((b) => b.kind === "summary") as
          | Extract<Block, { kind: "summary" }>
          | undefined;
        const turnCount = ctx.filter((b) => b.kind === "turn").length;
        const covered = turnCount + (prevSummary?.covered ?? 0);
        ctx = [
          ctx[0],
          {
            id: `summary-${compactions}`,
            kind: "summary",
            tokens: SUMMARY_K,
            covered,
          },
        ];
        sum = PREFIX_K + SUMMARY_K;
      }
      ctx = [
        ...ctx,
        { id: `turn-${t.id}`, kind: "turn", tokens: t.tokens, turn: t },
      ];
      sum += t.tokens;
    }
    const liveTurns = ctx.filter((b) => b.kind === "turn").length;
    return { ctx, activeK: sum, compactions, liveTurns };
  });

  // Slice indexes every completed turn into SQLite FTS5, so the searchable
  // index grows without bound even as the active window stays flat.
  const indexed = $derived(revealed.length);

  const targetPct = (TARGET_K / WINDOW_K) * 100;
  const hardMaxPct = (HARD_MAX_K / WINDOW_K) * 100;
  const compactPct = (COMPACT_AT_K / WINDOW_K) * 100;

  function stepFwd() {
    if (step < turns.length) step += 1;
  }
  function stepBack() {
    playing = false;
    if (step > 0) step -= 1;
  }
  function reset() {
    playing = false;
    step = 0;
  }
  function togglePlay() {
    if (step >= turns.length) step = 0;
    playing = !playing;
  }

  $effect(() => {
    if (!playing) return;
    if (step >= turns.length) {
      playing = false;
      return;
    }
    const t = setTimeout(() => (step += 1), 420);
    return () => clearTimeout(t);
  });

  $effect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduce = mq.matches;
    const onChange = () => (reduce = mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  });
</script>

<figure class="cwc" class:reduce>
  <div class="cwc-bar">
    <div class="cwc-turncount">
      <span class="cwc-turncount-num">{stream.length}</span> / {totalMessages} messages
    </div>
    <div class="cwc-controls">
      <button
        type="button"
        onclick={reset}
        disabled={step === 0}
        aria-label="Reset">Reset</button
      >
      <button
        type="button"
        onclick={stepBack}
        disabled={step === 0}
        aria-label="Step back"
      >
        ‹ Back
      </button>
      <button type="button" class="cwc-play" onclick={togglePlay}>
        {playing ? "❚❚ Pause" : "▶ Play"}
      </button>
      <button
        type="button"
        onclick={stepFwd}
        disabled={step === turns.length}
        aria-label="Step forward"
      >
        Step ›
      </button>
    </div>
  </div>

  <div class="cwc-panels">
    <!-- Sliding window -->
    <section class="panel">
      <header class="panel-head">
        <div class="panel-title">
          <h4>Sliding window</h4>
          <span class="panel-tag">slice</span>
        </div>
        <div class="readout {zone(sliding.activeK)}">
          <span class="readout-num">{sliding.activeK}k</span>
          <span class="readout-pct"
            >{Math.round((sliding.activeK / WINDOW_K) * 100)}%</span
          >
        </div>
      </header>

      <div class="window" style={`height:${WINDOW_PX}px`}>
        <div class="guide target" style={`top:${targetPct}%`}>
          <span class="guide-label">target {TARGET_K}k</span>
        </div>
        <div class="guide hardmax" style={`top:${hardMaxPct}%`}>
          <span class="guide-label">prune {HARD_MAX_K}k</span>
        </div>
        <div class="stack">
          <div
            class="blk prefix"
            style={`height:${heightPx(PREFIX_K)}px`}
            title="system prefix — always kept"
          ></div>
          {#each sliding.kept as item (item.key)}
            <div
              class={`blk ${item.recalled ? "recalled" : item.role}`}
              style={`height:${item.recalled ? Math.max(22, heightPx(item.tokens)) : heightPx(item.tokens)}px`}
              title={item.recalled
                ? `recalled from index · ${item.label} · ${item.tokens}k`
                : `${item.label} · ${item.tokens}k`}
              in:fly={{ y: 8, duration: dur }}
              out:fly={{ y: -12, duration: dur }}
              animate:flip={{ duration: dur }}
            >
              {#if item.recalled}
                <span class="blk-label">🔎 recalled</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <footer class="status">
        <span class="stat"
          ><span class="dot cool"></span>{sliding.kept.length} turns in context</span
        >
        <span class="stat idx">
          <span class="idx-icon">🔎</span> searchable index
          {#key indexed}
            <strong class="idx-count" in:fly={{ y: -7, duration: dur }}
              >{indexed}</strong
            >
          {/key}
          turns
        </span>
        {#if recalledActive.length}
          <span class="stat recall-note" in:fly={{ y: -7, duration: dur }}>
            <span class="idx-icon">🔎</span> agent searched the index → pulled
            back
            <strong>{recalledActive.map((i) => i.label).join(", ")}</strong>
          </span>
        {/if}
      </footer>
    </section>

    <!-- Compaction -->
    <section class="panel">
      <header class="panel-head">
        <div class="panel-title">
          <h4>Compaction</h4>
          <span class="panel-tag">codex</span>
        </div>
        <div class="readout {zone(compaction.activeK)}">
          <span class="readout-num">{compaction.activeK}k</span>
          <span class="readout-pct"
            >{Math.round((compaction.activeK / WINDOW_K) * 100)}%</span
          >
        </div>
      </header>

      <div class="window" style={`height:${WINDOW_PX}px`}>
        <div class="guide compact" style={`top:${compactPct}%`}>
          <span class="guide-label">compact {COMPACT_AT_K}k</span>
        </div>
        <div class="stack">
          {#each compaction.ctx as b (b.id)}
            <div
              class="blk {blkClass(b)}"
              style={`height:${heightPx(b.tokens)}px`}
              title={blkTitle(b)}
              in:fly={{ y: 8, duration: dur }}
              out:fly={{ y: -12, duration: dur }}
              animate:flip={{ duration: dur }}
            >
              {#if blkLabel(b)}
                <span class="blk-label">{blkLabel(b)}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <footer class="status">
        <span class="stat"
          ><span class="dot {zone(compaction.activeK)}"
          ></span>{compaction.liveTurns} turns in context</span
        >
        <span class="stat muted">
          {#if compaction.compactions}
            compacted <strong>{compaction.compactions}×</strong> · no index, detail
            lost
          {:else}
            no searchable index
          {/if}
        </span>
      </footer>
    </section>
  </div>

  <div class="legend">
    <span class="legend-item"><span class="sw user"></span> user</span>
    <span class="legend-item"><span class="sw assistant"></span> assistant</span
    >
    <span class="legend-item"><span class="sw tool"></span> tool call</span>
    <span class="legend-item"><span class="sw recalled"></span> recalled</span>
    <span class="legend-item"><span class="sw summary"></span> summary</span>
  </div>
</figure>

<style>
  .cwc {
    margin: var(--spacing-lg) 0;
    font-family: var(--font-prose);
    color: var(--color-ink);
  }

  .cwc-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    margin-bottom: var(--spacing-sm);
  }
  .cwc-turncount {
    font-size: var(--text-sm);
    color: var(--color-ink-light);
    font-family: var(--font-mono);
  }
  .cwc-turncount-num {
    color: var(--color-ink);
    font-weight: 600;
  }
  .cwc-controls {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .cwc-controls button {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    background: var(--color-bg);
    color: var(--color-ink);
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      color 0.15s ease;
  }
  .cwc-controls button:hover:not(:disabled) {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .cwc-controls button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .cwc-controls .cwc-play {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .cwc-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .panel {
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    background: var(--color-bg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-head {
    margin: 0;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-code);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    line-height: 1;
  }
  .panel-title {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    min-width: 0;
    flex: 0 1 auto;
    overflow: hidden;
  }
  .panel-title h4 {
    margin: 0;
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--color-ink);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .panel-tag {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-ink-light);
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .readout {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    font-family: var(--font-mono);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .readout-num {
    font-size: var(--text-lg);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .readout-pct {
    font-size: var(--text-xs);
    padding: 0.05rem 0.3rem;
    border-radius: 0.3rem;
    font-variant-numeric: tabular-nums;
  }
  .readout.cool .readout-num {
    color: #2fa36b;
  }
  .readout.cool .readout-pct {
    background: color-mix(in srgb, #2fa36b 18%, transparent);
    color: #2fa36b;
  }
  .readout.warm .readout-num {
    color: #d9902b;
  }
  .readout.warm .readout-pct {
    background: color-mix(in srgb, #d9902b 20%, transparent);
    color: #d9902b;
  }
  .readout.hot .readout-num {
    color: #e05a44;
  }
  .readout.hot .readout-pct {
    background: color-mix(in srgb, #e05a44 20%, transparent);
    color: #e05a44;
  }

  .window {
    position: relative;
    background: repeating-linear-gradient(
      to top,
      color-mix(in srgb, var(--color-ink) 4%, transparent) 0,
      color-mix(in srgb, var(--color-ink) 4%, transparent) 1px,
      transparent 1px,
      transparent 20px
    );
  }

  .guide {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px dashed
      color-mix(in srgb, var(--color-ink-light) 70%, transparent);
    z-index: 2;
    pointer-events: none;
  }
  .guide.compact {
    border-top-color: color-mix(in srgb, #e05a44 75%, transparent);
  }
  .guide-label {
    position: absolute;
    right: 0.3rem;
    top: 0.15rem;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--color-ink-light);
    background: var(--color-bg);
    padding: 0 0.2rem;
  }
  .guide.compact .guide-label {
    color: #e05a44;
  }

  .stack {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0 0.4rem 0.4rem;
    z-index: 1;
  }

  .blk {
    position: relative;
    border-radius: 0.2rem;
    border-left: 3px solid var(--color-border);
    background: color-mix(in srgb, var(--color-ink) 8%, var(--color-bg));
    overflow: hidden;
    display: flex;
    align-items: center;
  }
  .blk-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    line-height: 1;
    color: var(--color-ink-light);
    padding: 0 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .blk.user {
    border-left-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 16%, var(--color-bg));
  }
  .blk.assistant {
    border-left-color: var(--color-ink-light);
    background: color-mix(in srgb, var(--color-ink) 12%, var(--color-bg));
  }
  .blk.tool {
    border-left-color: #2fa36b;
    background: color-mix(in srgb, #2fa36b 15%, var(--color-bg));
  }
  .blk.prefix {
    border-left-color: var(--color-ink);
    background: color-mix(in srgb, var(--color-ink) 22%, var(--color-bg));
  }
  .blk.summary {
    border-left-color: #e05a44;
    background: color-mix(in srgb, #e05a44 18%, var(--color-bg));
  }
  .blk.summary .blk-label {
    color: #b64230;
    font-weight: 600;
  }
  .blk.recalled {
    border-left-color: #d9902b;
    border-left-style: solid;
    background: color-mix(in srgb, #d9902b 16%, var(--color-bg));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #d9902b 32%, transparent);
    animation: recall-in 0.7s ease-out;
  }
  .blk.recalled .blk-label {
    color: #a9701c;
    font-weight: 600;
  }
  @keyframes recall-in {
    0% {
      box-shadow:
        inset 0 0 0 2px #d9902b,
        0 0 0 4px color-mix(in srgb, #d9902b 45%, transparent);
    }
    100% {
      box-shadow: inset 0 0 0 1px color-mix(in srgb, #d9902b 32%, transparent);
    }
  }
  .reduce .blk.recalled {
    animation: none;
  }

  .status {
    border-top: 1px solid var(--color-border);
    padding: 0.5rem 0.6rem;
    background: var(--color-bg-code);
    font-size: var(--text-xs);
    color: var(--color-ink-light);
    display: flex;
    align-items: flex-start;
    align-content: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    row-gap: 0.3rem;
    flex-wrap: wrap;
    min-height: 3.4rem;
    /* Panels share a grid row and stretch to equal height. When the other
       panel's footer wraps to a second line, this one grows; let the footer
       fill that extra height so no bare gap shows below it. */
    flex: 1 0 auto;
  }
  .status strong {
    color: var(--color-ink);
  }
  .stat {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
  }
  .stat .dot {
    align-self: center;
  }
  .stat.muted {
    opacity: 0.85;
  }
  .stat.recall-note {
    flex-basis: 100%;
    color: #a9701c;
  }
  .stat.recall-note strong {
    color: #a9701c;
  }
  .idx-icon {
    font-size: 0.75rem;
  }
  .idx-count {
    display: inline-block;
    color: var(--color-accent);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot.cool {
    background: #2fa36b;
  }
  .dot.warm {
    background: #d9902b;
  }
  .dot.hot {
    background: #e05a44;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex-wrap: wrap;
    margin-top: var(--spacing-sm);
    font-size: var(--text-xs);
    color: var(--color-ink-light);
    font-family: var(--font-mono);
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .sw {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 0.15rem;
    border-left: 3px solid var(--color-border);
  }
  .sw.user {
    border-left-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 16%, var(--color-bg));
  }
  .sw.assistant {
    border-left-color: var(--color-ink-light);
    background: color-mix(in srgb, var(--color-ink) 12%, var(--color-bg));
  }
  .sw.tool {
    border-left-color: #2fa36b;
    background: color-mix(in srgb, #2fa36b 15%, var(--color-bg));
  }
  .sw.recalled {
    border-left-color: #d9902b;
    background: color-mix(in srgb, #d9902b 16%, var(--color-bg));
  }
  .sw.summary {
    border-left-color: #e05a44;
    background: color-mix(in srgb, #e05a44 18%, var(--color-bg));
  }
  .legend-note {
    margin-left: auto;
    opacity: 0.85;
  }

  .reduce :global(*) {
    transition: none !important;
  }

  @media (max-width: 720px) {
    .cwc-panels {
      grid-template-columns: 1fr;
    }
    .legend-note {
      margin-left: 0;
      flex-basis: 100%;
    }
  }
</style>
