<script lang="ts">
  import Brand from './Brand.svelte';
  import Icon from './Icon.svelte';
  import { activePage, app, goToPage, redo, ui, undo } from '../lib/config/store.svelte.ts';

  const page = $derived(activePage());
  const index = $derived(app.config.pages.findIndex((p) => p.id === page.id));
</script>

<header class="top" class:editing={ui.editing}>
  <div class="bar">
    <Brand onclick={() => goToPage(0)} />
    <span class="path mono" aria-label="Page courante"
      ><span class="muted">~/</span>{page.name}<span class="idx muted">:{index + 1}</span></span
    >

    {#if ui.editing}
      <p class="edit-hint">
        <span class="pulse" aria-hidden="true"></span>
        <span class="mono">mode édition</span>
        <span class="muted hide-sm">· glisse <Icon name="grip" size={12} /> pour réorganiser · <kbd>Ctrl</kbd>+<kbd>Z</kbd> annule</span>
      </p>
    {/if}

    <div class="actions">
      {#if ui.editing}
        <button class="icon-btn" type="button" title="Annuler (Ctrl+Z)" onclick={undo}><Icon name="undo" /></button>
        <button class="icon-btn flip" type="button" title="Rétablir (Ctrl+Maj+Z)" onclick={redo}><Icon name="undo" /></button>
        <button class="btn btn-ghost" type="button" onclick={() => (ui.picker = true)}
          ><Icon name="plus" /> <span class="hide-sm">Widget</span></button
        >
        <button class="btn btn-primary" type="button" onclick={() => (ui.editing = false)}><Icon name="check" /> Terminé</button>
      {:else}
        <button class="tool" type="button" title="Modifier la page (e)" onclick={() => (ui.editing = true)}>
          <Icon name="pencil" /><span class="hide-sm">Modifier</span><kbd class="hide-sm">e</kbd>
        </button>
      {/if}
      <button class="icon-btn" type="button" title="Réglages ( , )" aria-label="Réglages" onclick={() => (ui.settings = 'general')}
        ><Icon name="gear" /></button
      >
      <button
        class="icon-btn"
        type="button"
        title="Raccourcis clavier ( ? )"
        aria-label="Raccourcis clavier"
        onclick={() => (ui.help = true)}><Icon name="keyboard" /></button
      >
    </div>
  </div>
</header>

<style>
  .top {
    position: sticky;
    top: 0;
    z-index: 30;
    padding: var(--space-3) var(--gutter) 0;
    pointer-events: none;
  }
  .bar {
    pointer-events: auto;
    max-width: var(--maxw);
    margin-inline: auto;
    display: flex;
    align-items: center;
    gap: var(--space-5);
    height: 52px;
    padding-inline: var(--space-4) var(--space-2);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, transparent);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
    backdrop-filter: blur(14px) saturate(1.2);
    transition:
      border-color var(--motion-base) var(--ease-standard),
      box-shadow var(--motion-base) var(--ease-standard);
  }
  .editing .bar {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--accent) 8%, transparent),
      var(--shadow-raised);
  }
  .path {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    padding-left: var(--space-4);
    border-left: 1px solid var(--border-subtle);
    line-height: 20px;
  }
  .idx {
    margin-left: 1px;
  }
  .edit-hint {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--accent);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
  }
  .edit-hint :global(svg) {
    display: inline;
    vertical-align: -2px;
  }
  .pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse var(--motion-loop) var(--ease-standard) infinite;
    flex: none;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: auto;
  }
  .tool {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    height: 34px;
    padding-inline: 10px;
    border-radius: var(--radius-md);
    font-size: var(--fs-small);
    color: var(--text-secondary);
  }
  .tool:hover {
    color: var(--text-primary);
    background: var(--bg-elevated);
  }
  .flip :global(svg) {
    transform: scaleX(-1);
  }
  @media (max-width: 760px) {
    .hide-sm,
    .path {
      display: none;
    }
    .bar {
      gap: var(--space-3);
    }
  }
</style>
