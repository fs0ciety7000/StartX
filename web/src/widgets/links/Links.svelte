<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import { hostOf, normalizeUrl } from '../../lib/config/sanitize.ts';
  import { uid } from '../../lib/config/schema.ts';
  import { linkTarget } from '../../lib/open.ts';
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import Favicon from './Favicon.svelte';
  import type { LinksConfig } from './index.ts';

  let { config, editing, update }: WidgetProps<LinksConfig> = $props();

  let draft = $state('');
  let error = $state('');

  function quickAdd(e: SubmitEvent) {
    e.preventDefault();
    // "Nom https://url" or just an URL.
    const m = draft.trim().match(/^(.*?)\s*(\S+)$/);
    const url = normalizeUrl(m?.[2] ?? '');
    if (!url) {
      error = 'Adresse invalide';
      return;
    }
    const name = m?.[1]?.trim() || hostOf(url).split('.')[0] || url;
    update({ ...config, links: [...config.links, { id: uid('l'), name: name[0]?.toUpperCase() + name.slice(1), url, icon: '' }] });
    draft = '';
    error = '';
  }
</script>

<ul class="links" class:grid={config.layout === 'grid'} role="list">
  {#each config.links as l (l.id)}
    <li>
      <a href={l.url} target={linkTarget()} rel="noopener noreferrer" title={l.url} tabindex={editing ? -1 : undefined}>
        <Favicon url={l.url} name={l.name} icon={l.icon} size={config.layout === 'grid' ? 22 : 16} />
        <span class="txt">
          <span class="name">{l.name}</span>
          {#if config.layout === 'list'}<span class="host mono">{hostOf(l.url)}</span>{/if}
        </span>
        {#if editing}
          <button
            type="button"
            class="rm"
            title="Retirer"
            onclick={(e) => {
              e.preventDefault();
              update({ ...config, links: config.links.filter((x) => x.id !== l.id) });
            }}><Icon name="x" size={14} /></button
          >
        {/if}
      </a>
    </li>
  {:else}
    <li class="empty muted">Aucun lien. {editing ? '' : 'Passe en mode édition (e) pour en ajouter.'}</li>
  {/each}
</ul>

{#if editing}
  <form class="add" onsubmit={quickAdd}>
    <input
      bind:value={draft}
      placeholder="Nom https://exemple.com"
      aria-label="Ajouter un lien"
      aria-invalid={!!error}
      oninput={() => (error = '')}
    />
    <button type="submit" class="icon-btn" title="Ajouter"><Icon name="plus" /></button>
  </form>
  {#if error}<p class="err">{error}</p>{/if}
{/if}

<style>
  .links {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 2px;
  }
  .links.grid {
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: var(--space-2);
  }
  a {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 6px var(--space-2);
    margin-inline: calc(var(--space-2) * -1);
    border-radius: var(--radius-md);
    transition:
      background-color var(--motion-fast) var(--ease-standard),
      transform var(--motion-fast) var(--ease-standard);
  }
  a:hover,
  a:focus-visible {
    background: var(--bg-elevated);
  }
  a:hover .name,
  a:focus-visible .name {
    color: var(--wa);
  }
  a:active {
    transform: translateY(1px);
  }
  .grid a {
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: var(--space-3) var(--space-1);
    text-align: center;
  }
  .txt {
    display: grid;
    min-width: 0;
    line-height: 1.25;
  }
  .name {
    font-size: var(--fs-ui-sm);
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color var(--motion-fast) var(--ease-standard);
  }
  .grid .name {
    font-size: var(--text-sm);
  }
  .host {
    font-size: 10.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rm {
    margin-left: auto;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
  }
  .grid .rm {
    position: absolute;
    top: 2px;
    right: 2px;
  }
  .rm:hover {
    color: var(--status-error);
    background: var(--bg-overlay);
  }
  .empty {
    font-size: var(--fs-small);
    padding: var(--space-2) 0;
  }
  .add {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .add input {
    flex: 1;
    min-width: 0;
  }
  .err {
    margin-top: var(--space-1);
    font-size: var(--text-sm);
    color: var(--status-error);
  }
</style>
