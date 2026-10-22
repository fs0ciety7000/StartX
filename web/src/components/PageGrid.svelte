<script lang="ts">
  import Icon from './Icon.svelte';
  import WidgetFrame from './WidgetFrame.svelte';
  import { drag, MIME } from './dnd.svelte.ts';
  import { activePage, moveWidget, ui } from '../lib/config/store.svelte.ts';

  let width = $state(window.innerWidth);
  const page = $derived(activePage());
  // Wide screens get the page's columns; narrower ones collapse but keep proportions readable.
  const cols = $derived(width < 720 ? 1 : width < 1180 ? Math.min(2, page.columns) : page.columns);
</script>

<svelte:window bind:innerWidth={width} />

<main id="contenu" class="grid" style:--cols={cols} class:one={cols === 1} tabindex="-1" aria-label={`Page ${page.name}`}>
  {#key page.id}
    {#each page.widgets as widget, i (widget.id)}
      <WidgetFrame {widget} {page} {cols} index={i} />
    {/each}
  {/key}

  {#if ui.editing}
    <button
      type="button"
      class="add"
      class:over={drag.over === '__end'}
      style:grid-column={`span ${Math.min(cols, 1)}`}
      onclick={() => (ui.picker = true)}
      ondragover={(e) => {
        if (!drag.id) return;
        e.preventDefault();
        drag.over = '__end';
      }}
      ondragleave={() => drag.over === '__end' && (drag.over = null)}
      ondrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer?.getData(MIME) || drag.id;
        if (id) moveWidget(id, page.id, null);
        drag.over = null;
      }}
    >
      <Icon name="plus" size={22} />
      <span>Ajouter un widget</span>
      <span class="meta">ou déposer ici</span>
    </button>
  {:else if !page.widgets.length}
    <div class="empty">
      <p class="lead">Page vide.</p>
      <button class="btn btn-primary" type="button" onclick={() => ((ui.editing = true), (ui.picker = true))}
        ><Icon name="plus" /> Ajouter un widget</button
      >
    </div>
  {/if}
</main>

<style>
  .grid {
    width: 100%;
    max-width: var(--maxw);
    margin: 0 auto;
    padding: clamp(20px, 3vw, 40px) var(--gutter) var(--space-7);
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    grid-auto-rows: var(--row);
    grid-auto-flow: row dense;
    gap: var(--gap);
    outline: none;
  }
  .grid.one {
    grid-auto-rows: minmax(var(--row), auto);
  }
  .add {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-2);
    min-height: var(--row);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--border-strong);
    color: var(--text-secondary);
    transition: all var(--motion-base) var(--ease-standard);
  }
  .add:hover,
  .add.over {
    color: var(--accent);
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .empty {
    grid-column: 1 / -1;
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    padding: var(--space-7) 0;
    color: var(--text-secondary);
  }
</style>
