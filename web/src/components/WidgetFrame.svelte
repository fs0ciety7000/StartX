<script lang="ts">
  import Icon from './Icon.svelte';
  import { drag, MIME } from './dnd.svelte.ts';
  import { moveWidget, nudgeWidget, removeWidget, resizeWidget, ui, updateWidget } from '../lib/config/store.svelte.ts';
  import type { Page, WidgetInstance } from '../lib/config/schema.ts';
  import { ACCENTS, type Accent } from '../lib/open.ts';
  import { widgetDef } from '../lib/widgets/registry.ts';

  let { widget, page, cols, index }: { widget: WidgetInstance; page: Page; cols: number; index: number } = $props();

  const def = $derived(widgetDef(widget.type));
  const accent = $derived(ACCENTS[widget.config['accent'] as Accent]?.css ?? 'var(--accent)');
  const span = $derived(Math.min(widget.w, cols));
  // A one-column layout grows with its content instead of a fixed number of rows.
  const rows = $derived(cols === 1 ? Math.max(widget.h, def?.bare ? 1 : 2) : widget.h);
  let armed = $state(false);
</script>

{#if def}
  {@const View = def.view}
  <section
    class="frame"
    class:bare={def.bare}
    class:plain={def.plain}
    class:editing={ui.editing}
    class:dragging={drag.id === widget.id}
    class:over={drag.over === widget.id && drag.id !== widget.id}
    class:selected={ui.editingWidget === widget.id}
    style:grid-column={`span ${span}`}
    style:grid-row={`span ${rows}`}
    style:--wa={accent}
    style:--i={index}
    aria-label={widget.title}
    draggable={ui.editing && armed}
    ondragstart={(e) => {
      drag.id = widget.id;
      e.dataTransfer?.setData(MIME, widget.id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    }}
    ondragend={() => {
      drag.id = null;
      drag.over = null;
      armed = false;
    }}
    ondragover={(e) => {
      if (!drag.id) return;
      e.preventDefault();
      drag.over = widget.id;
    }}
    ondragleave={() => {
      if (drag.over === widget.id) drag.over = null;
    }}
    ondrop={(e) => {
      e.preventDefault();
      const id = e.dataTransfer?.getData(MIME) || drag.id;
      if (id) moveWidget(id, page.id, widget.id);
      drag.over = null;
    }}
  >
    {#if !def.bare || ui.editing}
      <header class="head" class:float={def.bare}>
        {#if ui.editing}
          <button
            type="button"
            class="grip"
            title="Glisser pour déplacer · ←/→ au clavier"
            aria-label={`Déplacer ${widget.title}`}
            onpointerdown={() => (armed = true)}
            onpointerup={() => (armed = false)}
            onkeydown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nudgeWidget(widget.id, -1);
              else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nudgeWidget(widget.id, 1);
              else return;
              e.preventDefault();
            }}><Icon name="grip" /></button
          >
        {/if}
        <h2 class="title" class:sr-only={def.bare}>
          <span class="dot" aria-hidden="true"></span>
          {#if ui.editing && !def.bare}
            <input
              class="title-input"
              value={widget.title}
              aria-label="Titre du widget"
              onchange={(e) => updateWidget(widget.id, { title: e.currentTarget.value.slice(0, 80) || def.label })}
            />
          {:else}
            {widget.title}
          {/if}
        </h2>
        {#if ui.editing}
          <div class="tools">
            <span class="size mono" title="Largeur × hauteur">{widget.w}×{widget.h}</span>
            <button
              type="button"
              class="icon-btn"
              title="Plus étroit"
              disabled={widget.w <= 1}
              onclick={() => resizeWidget(widget.id, -1, 0)}><Icon name="left" size={14} /></button
            >
            <button
              type="button"
              class="icon-btn"
              title="Plus large"
              disabled={widget.w >= page.columns}
              onclick={() => resizeWidget(widget.id, 1, 0)}><Icon name="right" size={14} /></button
            >
            <button
              type="button"
              class="icon-btn"
              title="Moins haut"
              disabled={widget.h <= 1}
              onclick={() => resizeWidget(widget.id, 0, -1)}><Icon name="up" size={14} /></button
            >
            <button type="button" class="icon-btn" title="Plus haut" disabled={widget.h >= 8} onclick={() => resizeWidget(widget.id, 0, 1)}
              ><Icon name="down" size={14} /></button
            >
            <button type="button" class="icon-btn" title="Réglages du widget" onclick={() => (ui.editingWidget = widget.id)}
              ><Icon name="gear" size={15} /></button
            >
            <button type="button" class="icon-btn danger" title="Supprimer" onclick={() => removeWidget(widget.id)}
              ><Icon name="trash" size={15} /></button
            >
          </div>
        {/if}
      </header>
    {/if}
    <div class="body">
      <View instance={widget} config={widget.config} editing={ui.editing} update={(config) => updateWidget(widget.id, { config })} />
    </div>
  </section>
{/if}

<style>
  .frame {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: var(--space-4) var(--space-5) var(--space-5);
    border-radius: var(--radius-lg);
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--bg-surface) 100%, transparent),
      color-mix(in srgb, var(--bg-surface) 70%, var(--bg-base))
    );
    border: 1px solid var(--border-subtle);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--text-primary) 3%, transparent) inset;
    animation: rise var(--motion-slow) var(--ease-emphasized) backwards;
    animation-delay: calc(var(--i) * 30ms);
    transition:
      border-color var(--motion-base) var(--ease-standard),
      box-shadow var(--motion-base) var(--ease-standard),
      opacity var(--motion-base) var(--ease-standard),
      transform var(--motion-base) var(--ease-standard);
  }
  .frame:hover {
    border-color: var(--border-strong);
  }
  .frame {
    container-type: inline-size;
  }
  .frame.bare {
    padding: var(--space-4) var(--space-5);
  }
  .frame.plain {
    padding: 0;
    background: none;
    border-color: transparent;
    box-shadow: none;
  }
  .frame.editing {
    border-style: dashed;
    border-color: var(--border-strong);
    padding-top: var(--space-3);
  }
  .frame.bare.editing {
    padding-top: var(--space-4);
  }
  .frame.plain.editing {
    padding: var(--space-5) var(--space-4) var(--space-2);
    background: color-mix(in srgb, var(--bg-surface) 50%, transparent);
  }
  .frame.selected {
    border-style: solid;
    border-color: var(--accent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .frame.dragging {
    opacity: 0.35;
  }
  .frame.over {
    border-color: var(--accent);
    transform: translateX(6px);
    box-shadow: -6px 0 0 -2px var(--accent);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 30px;
    margin-bottom: var(--space-3);
    flex: none;
  }
  /* Bare widgets keep their full height: the edit tools sit on the top border. */
  .head.float {
    position: absolute;
    z-index: 2;
    top: -15px;
    right: var(--space-3);
    left: var(--space-3);
    min-height: 0;
    margin: 0;
    pointer-events: none;
  }
  .head.float > * {
    pointer-events: auto;
  }
  .head.float .grip,
  .head.float .tools {
    height: 30px;
    padding-inline: 4px;
    margin: 0;
    border-radius: var(--radius-md);
    background: var(--bg-overlay);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-raised);
  }
  .head.float .grip {
    width: 30px;
    padding: 0;
  }
  .head.float .tools {
    margin-left: auto;
  }
  .grip {
    display: grid;
    place-items: center;
    width: 24px;
    height: 30px;
    margin-left: calc(var(--space-2) * -1);
    color: var(--text-muted);
    cursor: grab;
    border-radius: var(--radius-sm);
  }
  .grip:hover {
    color: var(--accent);
    background: var(--bg-elevated);
  }
  .grip:active {
    cursor: grabbing;
  }
  .title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--fs-meta);
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .dot {
    width: 6px;
    height: 6px;
    flex: none;
    border-radius: 1px;
    background: var(--wa);
    box-shadow: 0 0 10px color-mix(in srgb, var(--wa) 60%, transparent);
  }
  .title-input {
    flex: 1;
    min-width: 40px;
    height: 28px !important;
    font-family: var(--font-mono) !important;
    font-size: var(--fs-meta) !important;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: transparent !important;
    border-color: transparent !important;
    padding-inline: 6px !important;
  }
  .title-input:hover,
  .title-input:focus {
    border-color: var(--border-strong) !important;
    background: var(--bg-base) !important;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 0;
    margin-right: calc(var(--space-2) * -1);
  }
  .tools .icon-btn {
    width: 26px;
    height: 26px;
  }
  .size {
    font-size: 10.5px;
    color: var(--text-muted);
    margin-right: var(--space-1);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }
  .plain .body {
    overflow: visible;
  }
  @container (max-width: 380px) {
    .size {
      display: none;
    }
  }
</style>
