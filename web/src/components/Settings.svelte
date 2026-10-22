<script lang="ts">
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';
  import { DEFAULT_ENGINES, defaultConfig } from '../lib/config/defaults.ts';
  import { THEMES, uid, type Page, type SearchEngine, type Theme } from '../lib/config/schema.ts';
  import { addPage, app, edit, exportConfig, removePage, replaceConfig, toast, ui } from '../lib/config/store.svelte.ts';

  type Tab = 'general' | 'search' | 'pages' | 'data';
  const TABS: [Tab, string][] = [
    ['general', 'Général'],
    ['search', 'Recherche'],
    ['pages', 'Pages'],
    ['data', 'Données'],
  ];
  const THEME_INFO: Record<Theme, { name: string; note: string; sw: string[] }> = {
    obsidian: { name: 'Obsidian', note: 'Minéral, laiton', sw: ['#0b0c0e', '#171a1e', '#ece9e2', '#c8a96b'] },
    basalt: { name: 'Basalt', note: 'Gris volcanique, acier', sw: ['#0d1014', '#181d24', '#e4e8ee', '#b4bcc6'] },
    travertine: { name: 'Travertine', note: 'Pierre chaude, terracotta', sw: ['#12100e', '#1f1b17', '#efe6da', '#c99a74'] },
  };

  const s = $derived(app.config.settings);
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => edit((c) => void (c.settings[k] = v));

  // ----- Engines
  const setEngine = (id: string, patch: Partial<SearchEngine>) =>
    edit((c) => {
      const e = c.settings.engines.find((x) => x.id === id);
      if (e) Object.assign(e, patch);
    });

  // ----- Pages
  const setPage = (id: string, patch: Partial<Page>) =>
    edit((c) => {
      const p = c.pages.find((x) => x.id === id);
      if (!p) return;
      Object.assign(p, patch);
      if (patch.columns) for (const w of p.widgets) w.w = Math.min(w.w, patch.columns);
    });
  const movePage = (i: number, d: number) =>
    edit((c) => {
      const j = i + d;
      if (j < 0 || j >= c.pages.length) return;
      [c.pages[i], c.pages[j]] = [c.pages[j] as Page, c.pages[i] as Page];
    });

  // ----- Data
  let json = $state('');
  let jsonError = $state('');
  $effect(() => {
    if (ui.settings === 'data') json = JSON.stringify(app.config, null, 2);
  });

  async function importFile(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      replaceConfig(JSON.parse(await file.text()), `« ${file.name} » importé`);
      ui.settings = false;
    } catch {
      toast('Fichier illisible : JSON attendu');
    }
  }
  function applyJson() {
    try {
      replaceConfig(JSON.parse(json), 'Configuration appliquée');
      jsonError = '';
    } catch (err) {
      jsonError = (err as Error).message;
    }
  }
</script>

<Dialog open={ui.settings !== false} onclose={() => (ui.settings = false)} title="Réglages" side wide>
  {#snippet head()}
    <div class="seg tabs" role="tablist" aria-label="Sections">
      {#each TABS as [id, label] (id)}
        <button type="button" role="tab" aria-selected={ui.settings === id} onclick={() => (ui.settings = id)}>{label}</button>
      {/each}
    </div>
  {/snippet}

  {#if ui.settings === 'general'}
    <fieldset class="field">
      <legend class="meta">Thème · les trois thèmes de Portico</legend>
      <div class="themes">
        {#each THEMES as th (th)}
          <label class="theme" class:on={s.theme === th}>
            <input type="radio" name="theme" value={th} checked={s.theme === th} onchange={() => set('theme', th)} />
            <span class="sw" aria-hidden="true"
              >{#each THEME_INFO[th].sw as c (c)}<i style:background={c}></i>{/each}</span
            >
            <span class="tn">{THEME_INFO[th].name}</span>
            <span class="muted tnote">{THEME_INFO[th].note}</span>
          </label>
        {/each}
      </div>
    </fieldset>
    <label class="field">
      <span class="meta">Prénom (salutation)</span>
      <input value={s.name} placeholder="Nicolas" maxlength="40" onchange={(e) => set('name', e.currentTarget.value.trim())} />
    </label>
    <div class="checks">
      <label class="check"
        ><input type="checkbox" checked={s.openInNewTab} onchange={(e) => set('openInNewTab', e.currentTarget.checked)} /> Ouvrir les liens dans
        un nouvel onglet</label
      >
      <label class="check"
        ><input type="checkbox" checked={s.clock24h} onchange={(e) => set('clock24h', e.currentTarget.checked)} /> Horloge sur 24 heures</label
      >
      <label class="check"
        ><input type="checkbox" checked={s.statusBar} onchange={(e) => set('statusBar', e.currentTarget.checked)} /> Barre de pages façon tmux</label
      >
      <label class="check"
        ><input type="checkbox" checked={s.footer} onchange={(e) => set('footer', e.currentTarget.checked)} /> Pied de page gravé</label
      >
    </div>
  {:else if ui.settings === 'search'}
    <p class="hint">
      Le moteur coché sert par défaut. Le <code>!bang</code> en début ou fin de requête choisit un moteur pour une seule recherche. Dans
      l’adresse, <code>{'{q}'}</code> est remplacé par la recherche.
    </p>
    <ol class="rows" role="list">
      {#each s.engines as e (e.id)}
        <li class="engine-row">
          <label class="radio" title="Moteur par défaut">
            <input type="radio" name="default-engine" checked={s.defaultEngine === e.id} onchange={() => set('defaultEngine', e.id)} />
            <span class="sr-only">Par défaut</span>
          </label>
          <input
            value={e.name}
            aria-label="Nom"
            onchange={(ev) => setEngine(e.id, { name: ev.currentTarget.value.slice(0, 40) || e.name })}
          />
          <input
            class="mono bang"
            value={e.bang}
            aria-label="Bang"
            onchange={(ev) => setEngine(e.id, { bang: ev.currentTarget.value.replace(/^!/, '').trim().toLowerCase().slice(0, 12) })}
          />
          <button
            type="button"
            class="icon-btn danger"
            title="Supprimer"
            disabled={s.engines.length <= 1}
            onclick={() =>
              edit((c) => {
                c.settings.engines = c.settings.engines.filter((x) => x.id !== e.id);
                if (c.settings.defaultEngine === e.id) c.settings.defaultEngine = c.settings.engines[0]?.id ?? '';
              })}><Icon name="trash" size={14} /></button
          >
          <input
            class="mono url"
            value={e.url}
            aria-label="Adresse de recherche"
            onchange={(ev) => {
              const v = ev.currentTarget.value.trim();
              if (/^https?:\/\//.test(v) && v.includes('{q}')) setEngine(e.id, { url: v });
              else {
                ev.currentTarget.value = e.url;
                toast('L’adresse doit commencer par http(s):// et contenir {q}');
              }
            }}
          />
        </li>
      {/each}
    </ol>
    <div class="row-btns">
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() =>
          edit((c) => void c.settings.engines.push({ id: uid('e'), name: 'Nouveau', url: 'https://example.com/search?q={q}', bang: '' }))}
        ><Icon name="plus" /> Ajouter un moteur</button
      >
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() => edit((c) => void (c.settings.engines = DEFAULT_ENGINES.map((e) => ({ ...e }))), 'Moteurs par défaut rétablis')}
        >Rétablir les moteurs</button
      >
    </div>
  {:else if ui.settings === 'pages'}
    <p class="hint">
      Chaque page est une « fenêtre » de la barre du bas, comme dans tmux : <kbd>Alt</kbd>+<kbd>1…9</kbd> ou <kbd>Ctrl</kbd>+<kbd>B</kbd> puis
      un chiffre.
    </p>
    <ol class="rows" role="list">
      {#each app.config.pages as p, i (p.id)}
        <li class="page-row">
          <span class="mono idx">{i + 1}</span>
          <input
            value={p.name}
            aria-label="Nom de la page"
            onchange={(e) => setPage(p.id, { name: e.currentTarget.value.trim().replace(/\s+/g, '-').slice(0, 24) || p.name })}
          />
          <label class="cols">
            <span class="sr-only">Colonnes</span>
            <select value={p.columns} onchange={(e) => setPage(p.id, { columns: +e.currentTarget.value })}>
              {#each [1, 2, 3, 4, 5, 6] as n (n)}<option value={n}>{n} col.</option>{/each}
            </select>
          </label>
          <span class="muted n">{p.widgets.length} w.</span>
          <button type="button" class="icon-btn" title="Monter" disabled={i === 0} onclick={() => movePage(i, -1)}
            ><Icon name="up" size={14} /></button
          >
          <button
            type="button"
            class="icon-btn"
            title="Descendre"
            disabled={i === app.config.pages.length - 1}
            onclick={() => movePage(i, 1)}><Icon name="down" size={14} /></button
          >
          <button
            type="button"
            class="icon-btn danger"
            title="Supprimer"
            disabled={app.config.pages.length <= 1}
            onclick={() => removePage(p.id)}><Icon name="trash" size={14} /></button
          >
        </li>
      {/each}
    </ol>
    <button type="button" class="btn btn-ghost add-page" onclick={() => addPage(`page${app.config.pages.length + 1}`)}
      ><Icon name="plus" /> Nouvelle page</button
    >
  {:else if ui.settings === 'data'}
    <p class="hint">
      Tout vit dans ce navigateur (<code>localStorage</code>), sans compte ni serveur de données. Exporte le fichier pour le sauvegarder ou
      le copier sur un autre poste.
    </p>
    <div class="row-btns">
      <button type="button" class="btn btn-primary" onclick={exportConfig}><Icon name="download" /> Exporter</button>
      <label class="btn btn-ghost file"
        ><Icon name="upload" /> Importer…<input type="file" accept="application/json,.json" onchange={importFile} /></label
      >
      <button
        type="button"
        class="btn btn-danger"
        onclick={() => {
          if (confirm('Revenir à la configuration d’origine ? (Ctrl+Z permet d’annuler)'))
            replaceConfig(defaultConfig(), 'Configuration réinitialisée');
        }}>Réinitialiser</button
      >
    </div>
    <label class="field">
      <span class="meta">Configuration brute (JSON)</span>
      <textarea class="input json mono" spellcheck="false" bind:value={json} aria-invalid={!!jsonError}></textarea>
    </label>
    {#if jsonError}<p class="err">{jsonError}</p>{/if}
    <div class="row-btns">
      <button type="button" class="btn btn-ghost" onclick={applyJson}><Icon name="check" /> Appliquer le JSON</button>
      <button
        type="button"
        class="btn btn-ghost"
        onclick={() => {
          void navigator.clipboard?.writeText(json).then(() => toast('Copié'));
        }}><Icon name="copy" /> Copier</button
      >
    </div>
    <p class="hint">
      Le format est décrit dans <a href="https://github.com/fs0ciety7000/StartX/blob/main/docs/CONFIG.md" target="_blank" rel="noopener"
        >docs/CONFIG.md</a
      >. Les champs invalides sont corrigés à l’import.
    </p>
  {/if}
</Dialog>

<style>
  .tabs {
    margin-right: var(--space-2);
  }
  .themes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }
  .theme {
    position: relative;
    display: grid;
    gap: 4px;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    cursor: pointer;
    transition: border-color var(--motion-fast) var(--ease-standard);
  }
  .theme:hover {
    border-color: var(--border-strong);
  }
  .theme.on {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .theme input {
    position: absolute;
    opacity: 0;
  }
  .theme:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .sw {
    display: flex;
    height: 28px;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: var(--space-2);
    border: 1px solid var(--border-subtle);
  }
  .sw i {
    flex: 1;
  }
  .tn {
    font-weight: 550;
    font-size: var(--fs-ui-sm);
  }
  .tnote {
    font-size: 11.5px;
  }
  .checks {
    display: grid;
    gap: var(--space-3);
  }
  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-2);
  }
  .engine-row {
    display: grid;
    grid-template-columns: auto 1fr 80px auto;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
  }
  .engine-row .url {
    grid-column: 2 / -1;
    font-size: var(--text-sm);
  }
  .radio {
    display: grid;
    place-items: center;
    width: 24px;
  }
  .page-row {
    display: grid;
    grid-template-columns: 20px 1fr 92px 40px auto auto auto;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
  }
  .page-row select {
    width: 100%;
  }
  .idx {
    color: var(--accent);
    font-size: var(--text-sm);
  }
  .n {
    font-size: var(--text-sm);
  }
  .add-page {
    justify-self: start;
  }
  .row-btns {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .file {
    position: relative;
    cursor: pointer;
  }
  .file input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .json {
    height: 320px !important;
    padding: var(--space-3) !important;
    font-size: 11.5px !important;
    line-height: 1.5;
    resize: vertical;
  }
  .err {
    color: var(--status-error);
    font-size: var(--text-sm);
  }
  @media (max-width: 560px) {
    .themes {
      grid-template-columns: 1fr;
    }
    .tabs {
      order: 3;
      width: 100%;
    }
  }
</style>
