<script lang="ts">
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';
  import { app, findWidget, moveWidget, removeWidget, resizeWidget, ui, updateWidget } from '../lib/config/store.svelte.ts';
  import { widgetDef } from '../lib/widgets/registry.ts';

  const hit = $derived(ui.editingWidget ? findWidget(ui.editingWidget) : null);
  const def = $derived(hit ? widgetDef(hit.widget.type) : undefined);
  const close = () => (ui.editingWidget = null);
</script>

<Dialog open={!!hit} onclose={close} title={hit ? `Widget · ${def?.label ?? ''}` : 'Widget'} side>
  {#if hit && def}
    {@const w = hit.widget}
    <label class="field">
      <span class="meta">Titre</span>
      <input value={w.title} onchange={(e) => updateWidget(w.id, { title: e.currentTarget.value.slice(0, 80) || def.label })} />
    </label>

    <div class="sizes">
      <div class="field">
        <span class="meta">Largeur · {w.w} / {hit.page.columns}</span>
        <div class="stepper">
          <button type="button" class="icon-btn" aria-label="Plus étroit" disabled={w.w <= 1} onclick={() => resizeWidget(w.id, -1, 0)}
            ><Icon name="minus" /></button
          >
          <span class="mono">{w.w}</span>
          <button
            type="button"
            class="icon-btn"
            aria-label="Plus large"
            disabled={w.w >= hit.page.columns}
            onclick={() => resizeWidget(w.id, 1, 0)}><Icon name="plus" /></button
          >
        </div>
      </div>
      <div class="field">
        <span class="meta">Hauteur · {w.h}</span>
        <div class="stepper">
          <button type="button" class="icon-btn" aria-label="Moins haut" disabled={w.h <= 1} onclick={() => resizeWidget(w.id, 0, -1)}
            ><Icon name="minus" /></button
          >
          <span class="mono">{w.h}</span>
          <button type="button" class="icon-btn" aria-label="Plus haut" disabled={w.h >= 8} onclick={() => resizeWidget(w.id, 0, 1)}
            ><Icon name="plus" /></button
          >
        </div>
      </div>
    </div>

    {#if app.config.pages.length > 1}
      <label class="field">
        <span class="meta">Page</span>
        <select value={hit.page.id} onchange={(e) => moveWidget(w.id, e.currentTarget.value, null)}>
          {#each app.config.pages as p, i (p.id)}<option value={p.id}>{i + 1}:{p.name}</option>{/each}
        </select>
      </label>
    {/if}

    {#if def.editor}
      {@const Editor = def.editor}
      <hr />
      <Editor config={w.config} update={(config) => updateWidget(w.id, { config })} />
    {/if}

    <hr />
    <div class="foot">
      <button type="button" class="btn btn-danger" onclick={() => removeWidget(w.id)}><Icon name="trash" /> Supprimer</button>
      <button type="button" class="btn btn-primary" onclick={close}><Icon name="check" /> Terminé</button>
    </div>
  {/if}
</Dialog>

<style>
  .sizes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
  .stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    padding-inline: 3px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--bg-base);
  }
  hr {
    border: 0;
    border-top: 1px solid var(--border-subtle);
    margin: 0;
    width: 100%;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
  }
</style>
