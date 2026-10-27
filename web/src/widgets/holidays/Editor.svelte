<script lang="ts">
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import { COUNTRIES, type Country } from './api.ts';
  import type { HolidaysConfig } from './index.ts';

  let { config, update }: EditorProps<HolidaysConfig> = $props();
</script>

<label class="field">
  <span class="meta">Pays</span>
  <select value={config.country} onchange={(e) => update({ ...config, country: e.currentTarget.value as Country })}>
    {#each Object.entries(COUNTRIES) as [code, name] (code)}<option value={code}>{name}</option>{/each}
  </select>
</label>
<label class="field">
  <span class="meta">Jours listés · {config.count}</span>
  <input type="range" min="1" max="15" value={config.count} oninput={(e) => update({ ...config, count: +e.currentTarget.value })} />
</label>
<label class="check">
  <input type="checkbox" checked={config.bank} onchange={(e) => update({ ...config, bank: e.currentTarget.checked })} />
  Inclure les jours bancaires (Vendredi saint, 26 décembre…)
</label>
<p class="hint">
  Données <a href="https://date.nager.at/" target="_blank" rel="noopener">Nager.Date</a>. Les jours régionaux sont signalés.
</p>
