<script lang="ts">
  import Icon from './Icon.svelte';
  import { drag, MIME } from './dnd.svelte.ts';
  import { addPage, app, edit, moveWidget, ui } from '../lib/config/store.svelte.ts';
  import { keys } from '../lib/keys.svelte.ts';

  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 15_000);
    return () => clearInterval(id);
  });
  const time = $derived(now.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', hour12: !app.config.settings.clock24h }));
  const date = $derived(now.toLocaleDateString('fr-BE', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, ''));
  const prevId = $derived.by(() => {
    // tmux marks the last window with "-": we mark the previous page the same way.
    return lastPage !== app.config.activePage ? lastPage : null;
  });
  let lastPage = $state<string | null>(null);
  let current = app.config.activePage;
  $effect(() => {
    const id = app.config.activePage;
    if (id !== current) {
      lastPage = current;
      current = id;
    }
  });

  function rename(id: string, name: string) {
    const clean = name.trim().replace(/\s+/g, '-').slice(0, 24);
    keys.renaming = null;
    if (!clean) return;
    edit((c) => {
      const p = c.pages.find((x) => x.id === id);
      if (p) p.name = clean;
    });
  }

  function focusOnMount(el: HTMLInputElement) {
    el.focus();
    el.select();
  }
</script>

<nav class="tmux mono" aria-label="Pages">
  <span class="session" class:prefix={keys.prefix} title="Préfixe tmux : Ctrl+B">{keys.prefix ? '^B' : '[startx]'}</span>
  <ol class="wins" role="list">
    {#each app.config.pages as p, i (p.id)}
      {@const active = p.id === app.config.activePage}
      <li>
        {#if keys.renaming === p.id}
          <input
            class="rename"
            value={p.name}
            aria-label="Nom de la page"
            use:focusOnMount
            onkeydown={(e) => {
              if (e.key === 'Enter') rename(p.id, e.currentTarget.value);
              if (e.key === 'Escape') keys.renaming = null;
            }}
            onblur={(e) => rename(p.id, e.currentTarget.value)}
          />
        {:else}
          <button
            type="button"
            class="win"
            class:active
            class:drop={drag.over === `tab:${p.id}`}
            aria-current={active ? 'page' : undefined}
            title={`Alt+${i + 1} · double-clic pour renommer`}
            onclick={() => (app.config.activePage = p.id)}
            ondblclick={() => (keys.renaming = p.id)}
            ondragover={(e) => {
              if (!drag.id) return;
              e.preventDefault();
              drag.over = `tab:${p.id}`;
            }}
            ondragleave={() => drag.over === `tab:${p.id}` && (drag.over = null)}
            ondrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer?.getData(MIME) || drag.id;
              if (id) moveWidget(id, p.id, null);
              drag.over = null;
            }}>{i + 1}:{p.name}<span class="flag">{active ? '*' : p.id === prevId ? '-' : ' '}</span></button
          >
        {/if}
      </li>
    {/each}
    <li>
      <button
        type="button"
        class="win new"
        title="Nouvelle page (Ctrl+B c)"
        aria-label="Nouvelle page"
        onclick={() => addPage(`page${app.config.pages.length + 1}`)}><Icon name="plus" size={12} stroke={2} /></button
      >
    </li>
  </ol>
  <span class="spacer"></span>
  <span class="hints">
    {#if ui.editing}<span class="mode">-- ÉDITION --</span>{/if}
    <span><b>/</b> chercher</span><span><b>e</b> éditer</span><span><b>?</b> aide</span>
  </span>
  <span class="seg date">{date}</span>
  <span class="seg clock">{time}</span>
</nav>

<style>
  .tmux {
    position: fixed;
    inset: auto 0 0;
    z-index: 40;
    display: flex;
    align-items: stretch;
    height: var(--bar-h);
    font-size: 12px;
    line-height: calc(var(--bar-h) - 1px);
    background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
    border-top: 1px solid var(--border-subtle);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .session {
    padding-inline: 12px;
    background: var(--accent);
    color: var(--text-on-accent);
    font-weight: 600;
    min-width: 9ch;
    text-align: center;
  }
  .session.prefix {
    background: var(--status-warning);
  }
  .wins {
    display: flex;
    margin: 0;
    padding: 0 0 0 4px;
    list-style: none;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .win {
    height: 100%;
    padding-inline: 10px 6px;
    color: var(--text-secondary);
    transition:
      color var(--motion-fast) var(--ease-standard),
      background-color var(--motion-fast) var(--ease-standard);
  }
  .win:hover {
    color: var(--text-primary);
    background: var(--bg-elevated);
  }
  .win.active {
    color: var(--accent-strong);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    font-weight: 600;
  }
  .win.drop {
    background: var(--accent);
    color: var(--text-on-accent);
  }
  .flag {
    display: inline-block;
    width: 1ch;
    color: var(--accent);
  }
  .new {
    display: grid;
    place-items: center;
    padding-inline: 10px;
    color: var(--text-muted);
  }
  .rename {
    height: calc(var(--bar-h) - 6px) !important;
    margin: 3px 4px;
    width: 14ch;
    font-family: var(--font-mono) !important;
    font-size: 12px !important;
    padding-inline: 6px !important;
  }
  .spacer {
    flex: 1;
  }
  .hints {
    display: flex;
    gap: 14px;
    padding-inline: 12px;
    color: var(--text-muted);
  }
  .hints b {
    color: var(--text-secondary);
    font-weight: 500;
  }
  .mode {
    color: var(--accent);
    font-weight: 600;
  }
  .seg {
    padding-inline: 12px;
  }
  .date {
    background: var(--bg-elevated);
    color: var(--text-secondary);
  }
  .clock {
    background: var(--bg-selected);
    color: var(--text-primary);
    font-weight: 600;
  }
  @media (max-width: 860px) {
    .hints {
      display: none;
    }
  }
  @media (max-width: 520px) {
    .date,
    .session {
      display: none;
    }
  }
</style>
