<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import { normalizeUrl } from '../../lib/config/sanitize.ts';
  import { uid } from '../../lib/config/schema.ts';
  import { ACCENTS, ACCENT_KEYS } from '../../lib/open.ts';
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import type { Bookmark, LinksConfig } from './index.ts';

  let { config, update }: EditorProps<LinksConfig> = $props();

  const setLink = (i: number, patch: Partial<Bookmark>) =>
    update({ ...config, links: config.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const move = (i: number, d: number) => {
    const links = [...config.links];
    const j = i + d;
    if (j < 0 || j >= links.length) return;
    [links[i], links[j]] = [links[j] as Bookmark, links[i] as Bookmark];
    update({ ...config, links });
  };
</script>

<fieldset class="field">
  <legend class="meta">Couleur</legend>
  <div class="swatches">
    {#each ACCENT_KEYS as k (k)}
      <label class="swatch" style:--c={ACCENTS[k].css} title={ACCENTS[k].label}>
        <input type="radio" name="accent" value={k} checked={config.accent === k} onchange={() => update({ ...config, accent: k })} />
        <span class="sr-only">{ACCENTS[k].label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<div class="seg" role="radiogroup" aria-label="Disposition">
  {#each [['list', 'Liste'], ['grid', 'Grille']] as const as [v, label] (v)}
    <button type="button" role="radio" aria-checked={config.layout === v} onclick={() => update({ ...config, layout: v })}>{label}</button>
  {/each}
</div>

<p class="meta">Liens · {config.links.length}</p>
<ol class="rows" role="list">
  {#each config.links as l, i (l.id)}
    <li class="row">
      <input value={l.name} aria-label="Nom" placeholder="Nom" onchange={(e) => setLink(i, { name: e.currentTarget.value })} />
      <input
        value={l.url}
        aria-label="Adresse"
        placeholder="https://"
        class="mono"
        onchange={(e) => {
          const url = normalizeUrl(e.currentTarget.value);
          if (url) setLink(i, { url });
          else e.currentTarget.value = l.url;
        }}
      />
      <div class="row-actions">
        <button type="button" class="icon-btn" title="Monter" disabled={i === 0} onclick={() => move(i, -1)}
          ><Icon name="up" size={14} /></button
        >
        <button type="button" class="icon-btn" title="Descendre" disabled={i === config.links.length - 1} onclick={() => move(i, 1)}
          ><Icon name="down" size={14} /></button
        >
        <button
          type="button"
          class="icon-btn danger"
          title="Supprimer"
          onclick={() => update({ ...config, links: config.links.filter((x) => x.id !== l.id) })}><Icon name="trash" size={14} /></button
        >
      </div>
      <input
        value={l.icon}
        aria-label="Icône personnalisée (URL)"
        placeholder="Icône personnalisée (URL, optionnel)"
        class="mono icon-url"
        onchange={(e) => setLink(i, { icon: normalizeUrl(e.currentTarget.value) })}
      />
    </li>
  {/each}
</ol>
<button
  type="button"
  class="btn btn-ghost"
  onclick={() =>
    update({ ...config, links: [...config.links, { id: uid('l'), name: 'Nouveau lien', url: 'https://example.com/', icon: '' }] })}
>
  <Icon name="plus" /> Ajouter un lien
</button>

<style>
  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-3);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
  }
  .row > input:first-child {
    grid-column: 1;
  }
  .row > input:nth-child(2) {
    grid-column: 1;
    grid-row: 2;
  }
  .row-actions {
    grid-column: 2;
    grid-row: 1 / span 2;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .icon-url {
    grid-column: 1 / -1;
    font-size: var(--text-sm);
  }
</style>
