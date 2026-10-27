<script lang="ts">
  import PlacePicker from '../../components/PlacePicker.svelte';
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import type { WeatherConfig } from './index.ts';

  let { config, update }: EditorProps<WeatherConfig> = $props();
</script>

<PlacePicker place={config} onpick={(p) => update({ ...config, ...p })} />

<div class="seg" role="radiogroup" aria-label="Unités">
  {#each [['metric', '°C · km/h'], ['imperial', '°F · mph']] as const as [v, label] (v)}
    <button type="button" role="radio" aria-checked={config.units === v} onclick={() => update({ ...config, units: v })}>{label}</button>
  {/each}
</div>
<label class="field">
  <span class="meta">Jours de prévision · {config.days}</span>
  <input type="range" min="0" max="7" value={config.days} oninput={(e) => update({ ...config, days: +e.currentTarget.value })} />
</label>
<p class="hint">Données <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>, appelées depuis ton navigateur.</p>
