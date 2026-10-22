<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import { normalizeUrl } from '../../lib/config/sanitize.ts';
  import { ACCENTS, ACCENT_KEYS } from '../../lib/open.ts';
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import { fetchFeed } from './api.ts';
  import type { RssConfig } from './index.ts';

  let { config, update }: EditorProps<RssConfig> = $props();

  let draft = $state('');
  let busy = $state(false);
  let error = $state('');

  async function add(e: SubmitEvent) {
    e.preventDefault();
    const url = normalizeUrl(draft);
    if (!url) return void (error = 'Adresse invalide');
    busy = true;
    error = '';
    try {
      const data = await fetchFeed(url);
      if (config.feeds.some((f) => f.url === data.url)) error = 'Déjà dans la liste';
      else {
        update({ ...config, feeds: [...config.feeds, { url: data.url, name: data.title.slice(0, 40) }] });
        draft = '';
      }
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<p class="meta">Sources · {config.feeds.length}</p>
<ol class="rows" role="list">
  {#each config.feeds as f, i (f.url)}
    <li class="row">
      <input
        value={f.name}
        aria-label="Nom affiché"
        placeholder="Nom affiché"
        onchange={(e) =>
          update({ ...config, feeds: config.feeds.map((x, j) => (j === i ? { ...x, name: e.currentTarget.value.slice(0, 60) } : x)) })}
      />
      <button
        type="button"
        class="icon-btn danger"
        title="Retirer"
        onclick={() => update({ ...config, feeds: config.feeds.filter((x) => x.url !== f.url) })}><Icon name="trash" size={14} /></button
      >
      <span class="url mono">{f.url}</span>
    </li>
  {/each}
</ol>

<form class="add" onsubmit={add}>
  <input bind:value={draft} placeholder="wired.com ou https://…/feed" aria-label="Site ou flux à ajouter" disabled={busy} />
  <button type="submit" class="btn btn-ghost" disabled={busy}><Icon name={busy ? 'refresh' : 'plus'} /> Ajouter</button>
</form>
{#if error}<p class="err">{error}</p>{/if}
<p class="hint">L’adresse d’un site suffit : le serveur trouve son flux RSS ou Atom.</p>

<label class="field">
  <span class="meta">Articles affichés · {config.limit}</span>
  <input
    type="range"
    min="5"
    max="60"
    step="1"
    value={config.limit}
    oninput={(e) => update({ ...config, limit: +e.currentTarget.value })}
  />
</label>
<label class="field">
  <span class="meta">Actualisation</span>
  <select value={config.refresh} onchange={(e) => update({ ...config, refresh: +e.currentTarget.value })}>
    {#each [10, 15, 30, 60, 180] as m (m)}<option value={m}>Toutes les {m < 60 ? `${m} min` : `${m / 60} h`}</option>{/each}
  </select>
</label>
<label class="check"
  ><input type="checkbox" checked={config.summary} onchange={(e) => update({ ...config, summary: e.currentTarget.checked })} /> Afficher les résumés</label
>

<fieldset class="field">
  <legend class="meta">Couleur</legend>
  <div class="swatches">
    {#each ACCENT_KEYS as k (k)}
      <label class="swatch" style:--c={ACCENTS[k].css} title={ACCENTS[k].label}>
        <input type="radio" name="rss-accent" value={k} checked={config.accent === k} onchange={() => update({ ...config, accent: k })} />
        <span class="sr-only">{ACCENTS[k].label}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-2);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
  }
  .url {
    grid-column: 1 / -1;
    font-size: 11px;
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }
  .add {
    display: flex;
    gap: var(--space-2);
  }
  .add input {
    flex: 1;
    min-width: 0;
  }
  .err {
    font-size: var(--text-sm);
    color: var(--status-error);
  }
</style>
