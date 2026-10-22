<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { activePage, addWidget, ui } from '../lib/config/store.svelte.ts';
  import { widgets } from '../lib/widgets/registry.ts';

  const list = [...widgets.values()];
</script>

<Dialog open={ui.picker} onclose={() => (ui.picker = false)} title={`Ajouter à « ${activePage().name} »`} wide>
  <ul class="cards" role="list">
    {#each list as d (d.type)}
      <li>
        <button
          type="button"
          class="card"
          onclick={() => {
            ui.picker = false;
            ui.editing = true;
            addWidget(d.type);
          }}
        >
          <span class="ico" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"><path d={d.icon} /></svg
            >
          </span>
          <span class="txt">
            <span class="name">{d.label}</span>
            <span class="desc">{d.description}</span>
          </span>
          <span class="size mono">{d.size.w}×{d.size.h}</span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="hint">
    Un widget de plus, c’est un dossier dans <code>web/src/widgets/</code> : voir
    <a href="https://github.com/fs0ciety7000/StartX/blob/main/docs/WIDGETS.md" target="_blank" rel="noopener">docs/WIDGETS.md</a>.
  </p>
</Dialog>

<style>
  .cards {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-3);
  }
  .card {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) var(--space-4);
    align-items: start;
    text-align: left;
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    transition: all var(--motion-base) var(--ease-standard);
  }
  .card:hover {
    border-color: var(--accent);
    background: var(--bg-elevated);
    transform: translateY(-2px);
  }
  .ico {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--accent) 12%, var(--bg-elevated));
    color: var(--accent);
  }
  .txt {
    display: grid;
    gap: 4px;
  }
  .name {
    font-weight: 550;
  }
  .desc {
    font-size: var(--fs-small);
    color: var(--text-secondary);
    line-height: 1.45;
  }
  .size {
    grid-column: 2;
    font-size: 10.5px;
    color: var(--text-muted);
  }
</style>
