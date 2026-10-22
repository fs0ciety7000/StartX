<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '../../components/Icon.svelte';
  import { hostOf, normalizeUrl } from '../../lib/config/sanitize.ts';
  import { linkTarget, relTime } from '../../lib/open.ts';
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import { cached, fetchFeed, type FeedData } from './api.ts';
  import type { RssConfig } from './index.ts';

  let { config, editing, update }: WidgetProps<RssConfig> = $props();

  /** Per feed URL: last data, error, loading flag. */
  let feeds = $state<Record<string, { data?: FeedData; error?: string; loading?: boolean }>>({});
  let filter = $state<string | null>(null);
  let now = $state(Date.now());
  let draft = $state('');
  let adding = $state(false);
  let addError = $state('');

  const label = (url: string, name: string) => name || feeds[url]?.data?.title || hostOf(url);

  async function load(url: string, force = false) {
    const c = cached(url);
    const fresh = c && Date.now() - c.at < config.refresh * 60_000;
    feeds[url] = { ...feeds[url], data: feeds[url]?.data ?? c?.data, loading: !fresh || force };
    if (fresh && !force) return;
    try {
      feeds[url] = { data: await fetchFeed(url), loading: false };
    } catch (e) {
      feeds[url] = { ...feeds[url], loading: false, error: (e as Error).message };
    }
  }

  const refreshAll = (force = false) => Promise.all(config.feeds.map((f) => load(f.url, force)));

  $effect(() => {
    // Re-run when the feed list changes; load() reads and writes `feeds`, which must not be tracked.
    void config.feeds.map((f) => f.url).join();
    untrack(() => void refreshAll());
    const id = setInterval(() => {
      now = Date.now();
      void refreshAll();
    }, 60_000);
    return () => clearInterval(id);
  });

  const items = $derived.by(() => {
    const all = config.feeds
      .filter((f) => !filter || f.url === filter)
      .flatMap((f) =>
        (feeds[f.url]?.data?.items ?? []).map((it) => ({
          ...it,
          source: label(f.url, f.name),
          feed: f.url,
          ts: it.date ? Date.parse(it.date) : 0,
        })),
      );
    // One article can appear in several feeds, or twice in one: keys must stay unique.
    const seen = new Set<string>();
    return all
      .filter((it) => /^https?:\/\//.test(it.link) && !seen.has(it.link) && !!seen.add(it.link))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, config.limit);
  });
  const loading = $derived(config.feeds.some((f) => feeds[f.url]?.loading));
  const errors = $derived(config.feeds.filter((f) => feeds[f.url]?.error && !feeds[f.url]?.data));

  async function addFeed(e: SubmitEvent) {
    e.preventDefault();
    const url = normalizeUrl(draft);
    if (!url) {
      addError = 'Adresse invalide';
      return;
    }
    adding = true;
    addError = '';
    try {
      // The server discovers the feed when given a site's home page (korben.info → /feed).
      const data = await fetchFeed(url);
      if (config.feeds.some((f) => f.url === data.url)) addError = 'Déjà dans la liste';
      else {
        feeds[data.url] = { data };
        update({ ...config, feeds: [...config.feeds, { url: data.url, name: data.title.slice(0, 40) }] });
        draft = '';
      }
    } catch (err) {
      addError = (err as Error).message;
    } finally {
      adding = false;
    }
  }
</script>

<div class="rss">
  <div class="chips" role="toolbar" aria-label="Filtrer par source">
    <button type="button" class="chip" aria-pressed={filter === null} onclick={() => (filter = null)}>Tous</button>
    {#each config.feeds as f (f.url)}
      <button
        type="button"
        class="chip"
        aria-pressed={filter === f.url}
        onclick={() => (filter = filter === f.url ? null : f.url)}
        title={f.url}
      >
        {label(f.url, f.name)}{#if feeds[f.url]?.error}<span class="dot-err" title={feeds[f.url]?.error}></span>{/if}
      </button>
    {/each}
    <button type="button" class="icon-btn refresh" class:spin={loading} title="Actualiser" onclick={() => refreshAll(true)}
      ><Icon name="refresh" size={14} /></button
    >
  </div>

  {#if editing}
    <form class="add" onsubmit={addFeed}>
      <input
        bind:value={draft}
        placeholder="Site ou flux : numerama.com"
        aria-label="Ajouter un flux"
        aria-invalid={!!addError}
        disabled={adding}
      />
      <button type="submit" class="icon-btn" title="Ajouter le flux" disabled={adding}><Icon name={adding ? 'refresh' : 'plus'} /></button>
    </form>
    {#if addError}<p class="err">{addError}</p>{/if}
  {/if}

  <ol class="items" role="list">
    {#each items as it (it.link)}
      <li>
        <a href={it.link} target={linkTarget()} rel="noopener noreferrer">
          <span class="row-meta mono"
            ><span class="src">{it.source}</span>{#if it.ts}<span class="t">{relTime(it.ts, now)}</span>{/if}</span
          >
          <span class="title">{it.title}</span>
          {#if config.summary && it.summary}<span class="sum">{it.summary}</span>{/if}
        </a>
      </li>
    {:else}
      <li class="empty muted">
        {#if !config.feeds.length}
          Aucun flux. Passe en mode édition (<kbd>e</kbd>) et colle l’adresse d’un site.
        {:else if loading}
          Chargement…
        {:else if errors.length}
          Flux injoignables : {errors.map((f) => label(f.url, f.name)).join(', ')}.
        {:else}
          Rien de neuf.
        {/if}
      </li>
    {/each}
  </ol>
</div>

<style>
  .rss {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 0;
  }
  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    flex: none;
    mask-image: linear-gradient(to right, #000 90%, transparent);
    padding-right: var(--space-5);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding-inline: 10px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-subtle);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: nowrap;
    transition: all var(--motion-fast) var(--ease-standard);
  }
  .chip:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  .chip[aria-pressed='true'] {
    color: var(--text-on-accent);
    background: var(--wa);
    border-color: var(--wa);
  }
  .dot-err {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-error);
  }
  .refresh {
    margin-left: auto;
    flex: none;
  }
  .spin :global(svg) {
    animation: spin 900ms linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .items {
    margin: 0 calc(var(--space-2) * -1);
    padding: 0;
    list-style: none;
    overflow-y: auto;
    min-height: 0;
    flex: 1;
    scrollbar-width: thin;
  }
  .items a {
    display: grid;
    gap: 3px;
    padding: 9px var(--space-2);
    border-radius: var(--radius-md);
    border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
  }
  .items li:last-child a {
    border-bottom: 0;
  }
  .items a:hover,
  .items a:focus-visible {
    background: var(--bg-elevated);
  }
  .items a:visited .title {
    color: var(--text-secondary);
  }
  .row-meta {
    display: flex;
    gap: var(--space-3);
    font-size: 10.5px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .src {
    color: var(--wa);
  }
  .t {
    color: var(--text-muted);
  }
  .title {
    font-size: var(--fs-ui-sm);
    line-height: 1.4;
    color: var(--text-primary);
    text-wrap: pretty;
  }
  .items a:hover .title {
    color: var(--accent-strong);
  }
  .sum {
    font-size: var(--fs-small);
    color: var(--text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .empty {
    padding: var(--space-3) var(--space-2);
    font-size: var(--fs-small);
  }
  .add {
    display: flex;
    gap: var(--space-2);
    flex: none;
  }
  .add input {
    flex: 1;
    min-width: 0;
  }
  .err {
    font-size: var(--text-sm);
    color: var(--status-error);
    margin-top: calc(var(--space-2) * -1);
  }
</style>
