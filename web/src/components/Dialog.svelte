<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    open,
    onclose,
    title,
    side = false,
    wide = false,
    children,
    head,
  }: { open: boolean; onclose: () => void; title: string; side?: boolean; wide?: boolean; children: Snippet; head?: Snippet } = $props();

  let el: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  });
</script>

<dialog
  bind:this={el}
  class:side
  class:wide
  aria-label={title}
  {onclose}
  onclick={(e) => {
    // Click on the backdrop (the dialog box itself, outside the panel) closes.
    if (e.target === el) onclose();
  }}
>
  {#if open}
    <div class="panel">
      <header class="head">
        <h2>{title}</h2>
        {@render head?.()}
        <button type="button" class="icon-btn" aria-label="Fermer" title="Fermer (Échap)" onclick={onclose}><Icon name="x" /></button>
      </header>
      <div class="content">{@render children()}</div>
    </div>
  {/if}
</dialog>

<style>
  dialog {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    max-width: none;
    max-height: none;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  dialog:not([open]) {
    display: none;
  }
  dialog::backdrop {
    background: color-mix(in srgb, var(--bg-base) 55%, transparent);
    -webkit-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
  }
  dialog.side::backdrop {
    background: color-mix(in srgb, var(--bg-base) 25%, transparent);
    backdrop-filter: none;
  }
  .panel {
    width: min(560px, calc(100vw - 32px));
    max-height: min(780px, calc(100dvh - 48px));
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    background: var(--bg-overlay);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-overlay);
    animation: pop var(--motion-slow) var(--ease-emphasized);
  }
  .wide .panel {
    width: min(860px, calc(100vw - 32px));
  }
  .side {
    place-items: stretch end;
  }
  .side .panel {
    width: min(420px, 100vw);
    max-height: none;
    height: calc(100dvh - 24px);
    margin: 12px;
    animation: slide var(--motion-slow) var(--ease-emphasized);
  }
  .side.wide .panel {
    width: min(620px, 100vw);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.985);
    }
  }
  @keyframes slide {
    from {
      opacity: 0;
      transform: translateX(24px);
    }
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-4) var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-subtle);
    flex: none;
    flex-wrap: wrap;
  }
  h2 {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 500;
    letter-spacing: -0.02em;
    margin-right: auto;
  }
  .content {
    overflow-y: auto;
    padding: var(--space-5);
    display: grid;
    gap: var(--space-5);
    align-content: start;
    scrollbar-width: thin;
  }
  @media (max-width: 560px) {
    .side .panel {
      margin: 0;
      height: 100dvh;
      border-radius: 0;
    }
  }
</style>
