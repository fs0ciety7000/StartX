<script lang="ts">
  import { app } from '../../lib/config/store.svelte.ts';
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import type { SearchConfig } from './index.ts';

  let { config, update }: EditorProps<SearchConfig> = $props();
</script>

<label class="field">
  <span class="meta">Moteur de ce widget</span>
  <select value={config.engine} onchange={(e) => update({ ...config, engine: e.currentTarget.value })}>
    <option value="">Moteur par défaut</option>
    {#each app.config.settings.engines as e (e.id)}<option value={e.id}>{e.name} (!{e.bang})</option>{/each}
  </select>
</label>
<label class="check">
  <input type="checkbox" checked={config.launcher} onchange={(e) => update({ ...config, launcher: e.currentTarget.checked })} />
  Proposer les favoris de toutes les pages en tapant
</label>
<p class="hint">
  Tape <code>!gh svelte</code> pour chercher une fois sur un autre moteur, une adresse (<code>github.com</code>) pour l’ouvrir,
  <kbd>↓</kbd> ou <kbd>Tab</kbd> pour choisir un favori, <kbd>Ctrl</kbd>+<kbd>↵</kbd> pour un nouvel onglet. Les moteurs se gèrent dans Réglages
  → Recherche.
</p>
