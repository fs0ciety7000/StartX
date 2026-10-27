<script lang="ts">
  import { linkTarget } from '../../lib/open.ts';
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import { fetchDaily, type Daily } from './api.ts';
  import type { WikiConfig } from './index.ts';

  let { config }: WidgetProps<WikiConfig> = $props();

  let data = $state<Daily | null>(null);
  let error = $state('');
  let tab = $state<'featured' | 'onthisday' | 'mostread' | null>(null);
  let day = $state(new Date().toDateString());

  $effect(() => {
    const lang = config.lang;
    void day;
    let alive = true;
    error = '';
    fetchDaily(lang)
      .then((d) => alive && (data = d))
      .catch((e: Error) => alive && !data && (error = e.message));
    const id = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== day) day = today;
    }, 10 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  });

  const tabs = $derived(
    [
      ['featured', 'Article du jour', !!data?.featured] as const,
      ['onthisday', 'Ce jour-là', config.onthisday && !!data?.onthisday.length] as const,
      ['mostread', 'Les plus lus', config.mostread && !!data?.mostread.length] as const,
    ].filter(([, , on]) => on),
  );
  // The chosen tab while it exists, otherwise the first available one (the featured article when there is one).
  const current = $derived(tabs.some(([id]) => id === tab) ? tab : (tabs[0]?.[0] ?? null));
  const views = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)} k vues` : `${n} vues`);
  const era = (y: number) => (y < 0 ? `${-y} av. J.-C.` : String(y));
</script>

<div class="wiki">
  {#if data}
    {#if config.image && data.picture}
      <a class="pic" href={data.picture.url || undefined} target={linkTarget()} rel="noopener noreferrer" title={data.picture.caption}>
        <img src={data.picture.thumb} alt={data.picture.caption} loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        <span class="cap">
          <span class="meta">Image du jour</span>
          <span class="ctext">{data.picture.caption}</span>
          {#if data.picture.artist}<span class="by mono">© {data.picture.artist}</span>{/if}
        </span>
      </a>
    {/if}

    {#if tabs.length > 1}
      <div class="seg tabs" role="tablist" aria-label="Rubriques">
        {#each tabs as [id, label] (id)}
          <button type="button" role="tab" aria-selected={current === id} onclick={() => (tab = id)}>{label}</button>
        {/each}
      </div>
    {/if}

    <div class="list" role="tabpanel">
      {#if current === 'featured' && data.featured}
        <a class="featured" href={data.featured.url} target={linkTarget()} rel="noopener noreferrer">
          {#if data.featured.thumb}<img src={data.featured.thumb} alt="" loading="lazy" referrerpolicy="no-referrer" />{/if}
          <span class="ft">{data.featured.title}</span>
          <span class="fx">{data.featured.extract}</span>
        </a>
      {:else if current === 'onthisday'}
        <ol role="list">
          {#each data.onthisday.slice(0, config.count) as e, i (i)}
            <li>
              <a href={e.url || undefined} target={linkTarget()} rel="noopener noreferrer">
                <span class="yr mono">{era(e.year)}</span>
                <span class="tx">{e.text}</span>
              </a>
            </li>
          {/each}
        </ol>
      {:else if current === 'mostread'}
        <ol role="list">
          {#each data.mostread.slice(0, config.count) as a, i (a.url)}
            <li>
              <a href={a.url} target={linkTarget()} rel="noopener noreferrer" class="read">
                <span class="rank mono">{i + 1}</span>
                <span class="tx"
                  ><span class="t">{a.title}</span>{#if a.description}<span class="desc">{a.description}</span>{/if}</span
                >
                <span class="v mono">{views(a.views)}</span>
              </a>
            </li>
          {/each}
        </ol>
      {/if}
    </div>
  {:else if error}
    <p class="muted msg">Wikipédia indisponible ({error}).</p>
  {:else}
    <p class="muted msg">Chargement…</p>
  {/if}
</div>

<style>
  .wiki {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 0;
  }
  .pic {
    position: relative;
    display: block;
    flex: none;
    height: 132px;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
  }
  .pic img {
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
    transition: transform var(--motion-slow) var(--ease-standard);
  }
  .pic:hover img {
    transform: scale(1.03);
  }
  .cap {
    position: absolute;
    inset: auto 0 0;
    display: grid;
    gap: 2px;
    padding: var(--space-6) var(--space-3) var(--space-2);
    background: linear-gradient(to top, color-mix(in srgb, var(--bg-base) 92%, transparent), transparent);
  }
  .cap .meta {
    color: var(--wa);
  }
  .ctext {
    font-size: var(--fs-small);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .by {
    font-size: 10px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tabs {
    flex: none;
  }
  .list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    margin-inline: calc(var(--space-2) * -1);
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li a {
    display: grid;
    grid-template-columns: 7ch 1fr;
    gap: var(--space-3);
    padding: 8px var(--space-2);
    border-radius: var(--radius-md);
    font-size: var(--fs-small);
    line-height: 1.45;
  }
  li a:hover {
    background: var(--bg-elevated);
  }
  .yr {
    color: var(--wa);
    font-size: 11.5px;
    padding-top: 1px;
  }
  .tx {
    color: var(--text-primary);
    text-wrap: pretty;
  }
  .read {
    grid-template-columns: 2ch 1fr auto;
    align-items: baseline;
  }
  .rank {
    color: var(--wa);
    font-size: 11.5px;
  }
  .read .tx {
    display: grid;
  }
  .t {
    font-weight: 500;
  }
  .desc {
    color: var(--text-muted);
    font-size: 12px;
  }
  .v {
    font-size: 10.5px;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .featured {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2) var(--space-4);
    padding: var(--space-2);
  }
  .featured:has(img) {
    grid-template-columns: minmax(0, 1fr) 96px;
  }
  .featured img {
    grid-column: 2;
    grid-row: 1 / span 2;
    width: 96px;
    height: 96px;
    object-fit: cover;
    border-radius: var(--radius-md);
  }
  .ft {
    font-family: var(--font-display);
    font-size: var(--fs-ui-lg);
    font-weight: 500;
  }
  .fx {
    font-size: var(--fs-small);
    color: var(--text-secondary);
    line-height: 1.55;
  }
  .msg {
    font-size: var(--fs-small);
  }
</style>
