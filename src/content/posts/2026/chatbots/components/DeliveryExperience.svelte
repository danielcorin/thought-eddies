<script lang="ts">
  import { tick } from "svelte";

  type Variant = "classic" | "chat";
  type Role = "user" | "assistant";
  type MessageKind = "text" | "picker";

  export interface ChatMessage {
    role: Role;
    kind?: MessageKind;
    content: string;
    code?: string;
  }

  const optionLetters = ["A", "B", "C"] as const;

  interface Props {
    variant?: Variant;
    exampleId?: string;
    messages?: ChatMessage[];
  }

  let {
    variant = "classic",
    exampleId,
    messages = [],
  }: Props = $props();
  const resolvedExampleId = $derived(exampleId ?? `delivery-${variant}`);

  const today = new Date();
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  function addCalendarDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function addBusinessDays(date: Date, days: number): Date {
    const next = new Date(date);
    let added = 0;
    while (added < days) {
      next.setDate(next.getDate() + 1);
      const day = next.getDay();
      if (day !== 0 && day !== 6) added++;
    }
    return next;
  }

  const twoDayWeekday = weekdayFormatter.format(addCalendarDays(today, 2));
  const noRushDeadline = dateFormatter.format(addBusinessDays(today, 7));

  const deliveryOptions = [
    {
      id: "one-day",
      label: "1 day",
      detail: "Tomorrow",
      price: "$14.99",
      savedMessage: "See you tomorrow.",
    },
    {
      id: "two-day",
      label: "2 day",
      detail: twoDayWeekday,
      price: "$5.99",
      savedMessage: `See you ${twoDayWeekday}.`,
    },
    {
      id: "no-rush",
      label: "No rush",
      detail: "Whenever",
      price: "Free",
      savedMessage: `See you whenever (by ${noRushDeadline}).`,
    },
  ];

  function normalizeText(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[.,;:!?]+$/g, "")
      .replace(/\s+/g, " ");
  }

  const optionMatchPhrases: string[][] = [
    ["a", "1", "1 day", "1 day delivery", "one day", "tomorrow"],
    [
      "b",
      "2",
      "2 day",
      "2 day delivery",
      "two day",
      twoDayWeekday.toLowerCase(),
    ],
    ["c", "no rush", "no rush delivery", "whenever"],
  ].map((phrases) => phrases.map(normalizeText));

  function matchOptionIndex(input: string): number {
    const normalized = normalizeText(input);
    if (!normalized) return -1;

    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`);

    const matches = optionMatchPhrases.reduce<number[]>(
      (acc, phrases, idx) => {
        if (phrases.some((phrase) => pattern.test(phrase))) {
          acc.push(idx);
        }
        return acc;
      },
      []
    );

    return matches.length === 1 ? matches[0] : -1;
  }

  const initialMessages = $derived(messages);

  let selectedOption = $state("two-day");
  let deliverySaved = $state(false);
  const selectedDelivery = $derived(
    deliveryOptions.find((option) => option.id === selectedOption) ??
      deliveryOptions[0]
  );
  let reply = $state("");
  let chatMessages = $state<ChatMessage[]>([]);
  let selectionComplete = $state(false);
  let pickedOptionId = $state<string | null>(null);
  let messagesElement = $state<HTMLDivElement | undefined>(undefined);
  const visibleMessages = $derived(
    chatMessages.length > 0 ? chatMessages : initialMessages
  );

  function saveDelivery() {
    deliverySaved = false;

    requestAnimationFrame(() => {
      deliverySaved = true;
    });
  }

  function resetClassic() {
    deliverySaved = false;
    selectedOption = "two-day";
  }

  async function scrollMessagesToEnd() {
    await tick();

    if (messagesElement) {
      messagesElement.scrollTop = messagesElement.scrollHeight;
    }
  }

  async function handleChatSubmit(event: SubmitEvent) {
    event.preventDefault();

    const userReply = reply.trim();
    if (!userReply || selectionComplete) return;

    reply = "";
    let assistantResponse = "Sorry, I can't do that.";

    const idx = matchOptionIndex(userReply);
    if (idx !== -1) {
      const option = deliveryOptions[idx];
      selectionComplete = true;
      pickedOptionId = option.id;
      selectedOption = option.id;
      assistantResponse = `Thanks! ${option.savedMessage}`;
    }

    chatMessages = [
      ...visibleMessages,
      {
        role: "user" as const,
        kind: "text" as const,
        content: userReply,
      },
      {
        role: "assistant" as const,
        kind: "text" as const,
        content: assistantResponse,
      },
    ];

    await scrollMessagesToEnd();
  }

  function resetChat() {
    chatMessages = [];
    selectionComplete = false;
    pickedOptionId = null;
    reply = "";
  }

  async function handlePickerSelect(optionId: string) {
    if (selectionComplete) return;

    const idx = deliveryOptions.findIndex((option) => option.id === optionId);
    if (idx === -1) return;

    const option = deliveryOptions[idx];
    selectionComplete = true;
    pickedOptionId = option.id;
    selectedOption = option.id;

    chatMessages = [
      ...visibleMessages,
      {
        role: "user" as const,
        kind: "text" as const,
        content: `${optionLetters[idx]}`,
      },
      {
        role: "assistant" as const,
        kind: "text" as const,
        content: `Thanks! ${option.savedMessage}`,
      },
    ];

    await scrollMessagesToEnd();
  }
</script>

<figure class="delivery-example" aria-label="Delivery selection UX example">
  {#if variant === "classic"}
    <section
      class:delivery-saved={deliverySaved}
      class="checkout-demo"
      aria-labelledby={`${resolvedExampleId}-title`}
    >
      <div class="checkout-header">
        <div>
          <p class="eyebrow">Package delivery</p>
          <h3 id={`${resolvedExampleId}-title`}>Choose a delivery speed</h3>
        </div>
        <button
          type="button"
          class="reset-button"
          onclick={resetClassic}
          aria-label="Reset selection"
          title="Reset selection"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 4 3 9 8 9" />
          </svg>
        </button>
      </div>

      <div
        class="option-list"
        role="radiogroup"
        aria-labelledby={`${resolvedExampleId}-title`}
      >
        {#each deliveryOptions as option}
          <label
            class="delivery-option"
            for={`${resolvedExampleId}-${option.id}`}
          >
            <input
              id={`${resolvedExampleId}-${option.id}`}
              type="radio"
              name={resolvedExampleId}
              value={option.id}
              bind:group={selectedOption}
              disabled={deliverySaved}
            />
            <span class="option-copy">
              <span class="option-label">{option.label}</span>
              <span class="option-detail">{option.detail}</span>
            </span>
            <span class="option-price">{option.price}</span>
          </label>
        {/each}
      </div>

      <button class="primary-action" type="button" onclick={saveDelivery}>
        <span class="done-mark" aria-hidden="true"></span>
        <span>{deliverySaved ? "Done" : "Save delivery"}</span>
      </button>

      <p class="done-status" aria-live="polite">
        {deliverySaved
          ? `Delivery saved. ${selectedDelivery.savedMessage}`
          : ""}
      </p>
    </section>
  {:else}
    <section class="chat-demo" aria-label="Delivery chatbot example">
      <div class="chat-window">
        <div class="chat-topbar">
          <span class="status-dot" aria-hidden="true"></span>
          <span>Delivery assistant</span>
          <button
            type="button"
            class="reset-button"
            onclick={resetChat}
            aria-label="Reset conversation"
            title="Reset conversation"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <polyline points="3 4 3 9 8 9" />
            </svg>
          </button>
        </div>

        <div class="messages" aria-live="polite" bind:this={messagesElement}>
          {#each visibleMessages as message}
            <div
              class:user-message={message.role === "user"}
              class:assistant-message={message.role === "assistant"}
              class:has-picker={message.kind === "picker"}
              class:has-code={message.code !== undefined}
              class="message"
            >
              <p>{message.content}</p>

              {#if message.code !== undefined}
                <pre class="code-block"><code>{message.code}</code></pre>
              {/if}

              {#if message.kind === "picker"}
                <div
                  class="inline-picker"
                  role="radiogroup"
                  aria-label="Delivery options"
                >
                  {#each deliveryOptions as option, i}
                    <button
                      type="button"
                      class="picker-option"
                      class:is-selected={pickedOptionId === option.id}
                      role="radio"
                      aria-checked={pickedOptionId === option.id}
                      disabled={selectionComplete}
                      onclick={() => handlePickerSelect(option.id)}
                    >
                      <span class="picker-letter" aria-hidden="true">
                        {optionLetters[i]}
                      </span>
                      <span class="picker-copy">
                        <span class="picker-label">
                          {option.label} delivery
                        </span>
                        <span class="picker-detail">{option.detail}</span>
                      </span>
                      <span class="picker-price">{option.price}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <form class="reply-row" onsubmit={handleChatSubmit}>
          <label class="sr-only" for={`${resolvedExampleId}-reply`}>
            Reply to delivery assistant
          </label>
          <input
            id={`${resolvedExampleId}-reply`}
            type="text"
            bind:value={reply}
            disabled={selectionComplete}
          />
          <button type="submit" disabled={selectionComplete}>Send</button>
        </form>
      </div>
    </section>
  {/if}
</figure>

<style>
  .delivery-example {
    margin: var(--spacing-lg) auto;
    max-width: 42rem;
    color: var(--color-ink);
    font-family: var(--font-prose);
  }

  .checkout-demo,
  .chat-demo {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-code);
    overflow: hidden;
  }

  .checkout-demo {
    padding: var(--spacing-md);
  }

  .checkout-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .eyebrow,
  h3,
  p {
    margin: 0;
  }

  .eyebrow {
    color: var(--color-ink-light);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
  }

  h3 {
    color: var(--color-ink);
    font-family: var(--font-prose);
    font-size: var(--text-lg);
    line-height: 1.25;
  }

  .option-list {
    display: grid;
    gap: var(--spacing-sm);
  }

  .delivery-option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    min-height: 4.25rem;
    padding: 0.8rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg);
    cursor: pointer;
    transition:
      border-color 150ms ease,
      background-color 150ms ease,
      box-shadow 150ms ease;
  }

  .delivery-option:hover:not(:has(input:disabled)) {
    border-color: var(--color-ink-light);
  }

  .delivery-option:has(input:checked) {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg));
    box-shadow: 0 0 0 1px var(--color-accent);
  }

  .delivery-option:has(input:focus-visible) {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .delivery-option:has(input:disabled) {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .delivery-option input {
    width: 1rem;
    height: 1rem;
    accent-color: var(--color-accent);
  }

  .option-copy {
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }

  .option-label {
    font-size: var(--text-base);
    font-weight: 700;
  }

  .option-detail {
    color: var(--color-ink-light);
    font-size: var(--text-sm);
  }

  .option-price {
    color: var(--color-ink);
    font-size: var(--text-sm);
    font-weight: 700;
    white-space: nowrap;
  }

  .primary-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    width: 100%;
    min-height: 2.75rem;
    margin-top: var(--spacing-md);
    border: 1px solid var(--color-ink);
    border-radius: 6px;
    background: var(--color-ink);
    color: var(--color-bg);
    cursor: pointer;
    font: 700 var(--text-sm) / 1 var(--font-prose);
    transition:
      transform 120ms ease,
      opacity 150ms ease,
      box-shadow 150ms ease;
  }

  .primary-action:hover {
    opacity: 0.9;
  }

  .primary-action:active {
    transform: translateY(1px);
  }

  .primary-action:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .done-mark {
    display: none;
    position: relative;
    width: 1rem;
    height: 1rem;
    border: 1px solid currentColor;
    border-radius: 999px;
  }

  .done-mark::after {
    content: "";
    position: absolute;
    left: 0.3rem;
    top: 0.18rem;
    width: 0.3rem;
    height: 0.55rem;
    border: solid currentColor;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0);
    transform-origin: center;
  }

  .delivery-saved .done-mark {
    display: inline-block;
    animation: done-pop 220ms ease-out both;
  }

  .delivery-saved .done-mark::after {
    animation: done-check 180ms ease-out 120ms both;
  }

  .done-status {
    min-height: 1.35rem;
    margin-top: var(--spacing-xs);
    color: var(--color-ink-light);
    font-size: var(--text-sm);
    text-align: center;
  }

  .chat-window {
    display: grid;
    height: 26rem;
    grid-template-rows: auto minmax(0, 1fr) auto;
    background: var(--color-bg-code);
  }

  .chat-topbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-code);
    color: var(--color-ink-light);
    font-size: var(--text-sm);
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .status-dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: var(--color-accent);
    box-shadow: 0 0 0 3px
      color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .reset-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.85rem;
    height: 1.85rem;
    margin-left: auto;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--color-ink-light);
    cursor: pointer;
    transition:
      border-color 150ms ease,
      background-color 150ms ease,
      color 150ms ease,
      transform 200ms ease;
  }

  .reset-button:hover {
    border-color: var(--color-border);
    background: var(--color-bg);
    color: var(--color-ink);
  }

  .reset-button:active svg {
    transform: rotate(-180deg);
    transition: transform 280ms ease;
  }

  .reset-button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .reset-button svg {
    transition: transform 200ms ease;
  }

  .messages {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    min-height: 0;
    padding: var(--spacing-md);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .message {
    max-width: min(88%, 30rem);
    padding: 0.65rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 1.15rem;
    font-size: var(--text-sm);
    line-height: 1.5;
    overflow-wrap: anywhere;
    animation: message-in 220ms ease-out both;
  }

  .message p {
    white-space: pre-line;
  }

  .assistant-message {
    align-self: flex-start;
    background: var(--color-bg);
    border-bottom-left-radius: 0.35rem;
  }

  .user-message {
    align-self: flex-end;
    background: color-mix(in srgb, var(--color-accent) 18%, var(--color-bg));
    border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-bg));
    color: var(--color-ink);
    border-bottom-right-radius: 0.35rem;
  }

  .message.has-picker,
  .message.has-code {
    max-width: min(94%, 32rem);
  }

  .code-block {
    margin: 0.6rem 0 0;
    padding: 0.75rem 0.85rem;
    border-radius: 0.65rem;
    background: var(--color-bg-code);
    border: 1px solid var(--color-border);
    color: var(--color-ink);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.5;
    overflow-x: auto;
  }

  .code-block code {
    font: inherit;
    white-space: pre;
  }

  .message.has-picker p {
    margin-bottom: 0.65rem;
  }

  .inline-picker {
    display: grid;
    gap: 0.4rem;
  }

  .picker-option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: center;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-code);
    color: var(--color-ink);
    cursor: pointer;
    text-align: left;
    font: inherit;
    transition:
      border-color 150ms ease,
      background-color 150ms ease,
      box-shadow 150ms ease;
  }

  .picker-option:hover:not(:disabled) {
    border-color: var(--color-ink-light);
  }

  .picker-option:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .picker-option.is-selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg));
    box-shadow: 0 0 0 1px var(--color-accent);
  }

  .picker-option:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .picker-option.is-selected:disabled {
    opacity: 1;
  }

  .picker-letter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 4px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    font-size: var(--text-xs);
    font-weight: 700;
  }

  .picker-option.is-selected .picker-letter {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #ffffff;
  }

  .picker-copy {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }

  .picker-label {
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .picker-detail {
    color: var(--color-ink-light);
    font-size: var(--text-xs);
  }

  .picker-price {
    font-weight: 700;
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  @keyframes message-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .reply-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--spacing-sm);
    padding: 0.85rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-code);
  }

  .reply-row input {
    width: 100%;
    height: 2.65rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg);
    color: var(--color-ink);
    font: inherit;
    padding: 0 0.85rem;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .reply-row input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px
      color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .reply-row button {
    height: 2.65rem;
    padding: 0 var(--spacing-md);
    border: 1px solid var(--color-ink);
    border-radius: 6px;
    background: var(--color-ink);
    color: var(--color-bg);
    cursor: pointer;
    font: 700 var(--text-sm) / 1 var(--font-prose);
    transition:
      transform 120ms ease,
      opacity 150ms ease;
  }

  .reply-row button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .reply-row button:active:not(:disabled) {
    transform: translateY(1px);
  }

  .reply-row button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .reply-row input:disabled,
  .reply-row button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @keyframes done-pop {
    0% {
      transform: scale(0.7);
      opacity: 0;
    }

    70% {
      transform: scale(1.12);
      opacity: 1;
    }

    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes done-check {
    from {
      transform: rotate(45deg) scale(0);
    }

    to {
      transform: rotate(45deg) scale(1);
    }
  }

  @media (max-width: 640px) {
    .delivery-example {
      margin: var(--spacing-md) auto;
    }

    .checkout-demo {
      padding: 0.85rem;
    }

    .delivery-option {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .option-price {
      grid-column: 2;
      justify-self: start;
    }

    .chat-window {
      height: min(29rem, calc(100svh - var(--spacing-lg)));
      min-height: min(24rem, calc(100svh - var(--spacing-lg)));
    }

    .message {
      max-width: 100%;
    }

    .reply-row {
      grid-template-columns: 1fr;
    }
  }
</style>
