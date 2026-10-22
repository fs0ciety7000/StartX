<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import { app } from '../../lib/config/store.svelte.ts';
  import { hostOf } from '../../lib/config/sanitize.ts';
  import { faviconFor, openUrl } from '../../lib/open.ts';
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import type { SearchConfig } from './index.ts';
  import { asUrl, parseBang, searchLinks, type Hit } from './launcher.ts';

  let { instance, config, editing }: WidgetProps<SearchConfig> = $props();

  let q = $state('');
  let sel = $state(-1);
  let input: HTMLInputElement | undefined = $state();
  let chosen = $state<string | null>(null);

  const engines = $derived(app.config.settings.engines);
  const engine = $derived(engines.find((e) => e.id === (chosen ?? (config.engine || app.config.settings.defaultEngine))) ?? engines[0]);
  const bang = $derived(parseBang(q));
  const bangEngine = $derived(bang ? engines.find((e) => e.bang === bang.bang) : undefined);
  const url = $derived(asUrl(q));
  const hits: Hit[] = $derived(config.launcher && !bangEngine ? searchLinks(app.config, q) : []);
  const listId = $derived(`${instance.id}-hits`);

  $effect(() => {
    // Keep the highlighted row valid as results change.
    if (sel >= hits.length) sel = hits.length - 1;
  });

  function submit(newTab: boolean) {
    const hit = sel >= 0 ? hits[sel] : undefined;
    if (hit) return go(hit.url, newTab);
    const text = q.trim();
    if (!text) return;
    if (bangEngine) return go(bangEngine.url.replace('{q}', encodeURIComponent(bang?.rest ?? '')), newTab);
    if (url) return go(url, newTab);
    if (engine) go(engine.url.replace('{q}', encodeURIComponent(text)), newTab);
  }

  function go(target: string, newTab: boolean) {
    openUrl(target, newTab);
    q = '';
    sel = -1;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault();
      sel = (sel + 1) % hits.length;
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault();
      sel = sel <= 0 ? hits.length - 1 : sel - 1;
    } else if (e.key === 'Tab' && hits.length && !e.shiftKey && sel < 0) {
      e.preventDefault();
      sel = 0;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit(e.ctrlKey || e.metaKey);
    } else if (e.key === 'Escape') {
      if (q) {
        e.stopPropagation();
        q = '';
        sel = -1;
      } else input?.blur();
    }
  }
</script>

<div class="search" class:open={hits.length > 0}>
  <form
    class="bar"
    role="search"
    onsubmit={(e) => {
      e.preventDefault();
      submit(false);
    }}
  >
    <span class="lead" aria-hidden="true"><Icon name="search" size={18} /></span>
    <input
      bind:this={input}
      bind:value={q}
      data-search
      type="search"
      autocomplete="off"
      spellcheck="false"
      enterkeyhint="search"
      disabled={editing}
      placeholder={`Rechercher sur ${engine?.name ?? 'le web'}, ouvrir un favori ou une adresse…`}
      aria-label="Rechercher"
      role="combobox"
      aria-expanded={hits.length > 0}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={sel >= 0 ? `${listId}-${sel}` : undefined}
      oninput={() => (sel = -1)}
      {onkeydown}
    />
    {#if bangEngine}
      <span class="bang mono">→ {bangEngine.name}</span>
    {:else if url}
      <span class="bang mono">↵ ouvrir</span>
    {/if}
    <label class="engine">
      <span class="sr-only">Moteur</span>
      <select value={engine?.id} onchange={(e) => (chosen = e.currentTarget.value)} disabled={editing}>
        {#each engines as e (e.id)}<option value={e.id}>{e.name}</option>{/each}
      </select>
      <span class="engine-name mono" aria-hidden="true">{engine?.name}</span>
      <Icon name="down" size={12} />
    </label>
    <kbd class="slash" aria-hidden="true">/</kbd>
  </form>

  {#if hits.length}
    <ul class="hits" id={listId} role="listbox" aria-label="Favoris correspondants">
      {#each hits as h, i (h.url)}
        <li
          id={`${listId}-${i}`}
          role="option"
          aria-selected={i === sel}
          class:sel={i === sel}
          onpointerenter={() => (sel = i)}
          onpointerdown={(e) => {
            e.preventDefault();
            go(h.url, e.ctrlKey || e.metaKey || e.button === 1);
          }}
        >
          <img
            src={faviconFor(h.url)}
            alt=""
            width="16"
            height="16"
            loading="lazy"
            onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
          />
          <span class="name">{h.name}</span>
          <span class="host mono">{hostOf(h.url)}</span>
          <span class="group meta">{h.page} · {h.group}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search {
    position: relative;
    height: 100%;
    display: grid;
    align-content: center;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: 60px;
    padding-inline: var(--space-5) var(--space-3);
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--text-primary) 4%, transparent) inset;
    transition:
      border-color var(--motion-fast) var(--ease-standard),
      box-shadow var(--motion-base) var(--ease-standard);
  }
  .bar:focus-within {
    border-color: color-mix(in srgb, var(--accent) 60%, var(--border-strong));
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent),
      var(--shadow-raised);
  }
  .open .bar {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .lead {
    color: var(--text-muted);
    display: grid;
  }
  .bar:focus-within .lead {
    color: var(--accent);
  }
  .bar input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: var(--fs-ui-lg);
    letter-spacing: -0.01em;
  }
  input::placeholder {
    color: var(--text-muted);
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  .bang {
    font-size: var(--text-sm);
    color: var(--accent);
    white-space: nowrap;
  }
  .engine {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding-inline: 10px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    border: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
    cursor: pointer;
  }
  .engine:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  .engine:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .engine select {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .engine-name {
    font-size: var(--text-sm);
  }
  .slash {
    margin-left: var(--space-1);
  }
  .hits {
    position: absolute;
    z-index: 20;
    top: calc(50% + 30px);
    left: 0;
    right: 0;
    margin: 0;
    padding: var(--space-2);
    list-style: none;
    background: var(--bg-overlay);
    border: 1px solid color-mix(in srgb, var(--accent) 60%, var(--border-strong));
    border-top-color: var(--border-subtle);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    box-shadow: var(--shadow-overlay);
  }
  .hits li {
    display: grid;
    grid-template-columns: 16px auto 1fr auto;
    align-items: center;
    gap: var(--space-3);
    padding: 9px var(--space-3);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .hits li.sel {
    background: var(--bg-selected);
  }
  .hits li.sel .name {
    color: var(--accent-strong);
  }
  .name {
    font-weight: 500;
  }
  .host {
    font-size: var(--text-sm);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 720px) {
    .slash,
    .engine-name,
    .group {
      display: none;
    }
    .bar {
      padding-inline: var(--space-4) var(--space-2);
    }
  }
</style>
