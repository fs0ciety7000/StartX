<script lang="ts">
  import PlacePicker from '../../components/PlacePicker.svelte';
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import type { AirConfig } from './index.ts';

  let { config, update }: EditorProps<AirConfig> = $props();
</script>

<PlacePicker place={config} onpick={(p) => update({ ...config, ...p })} />
<label class="check"
  ><input type="checkbox" checked={config.pollen} onchange={(e) => update({ ...config, pollen: e.currentTarget.checked })} /> Pollens</label
>
<label class="check"
  ><input type="checkbox" checked={config.forecast} onchange={(e) => update({ ...config, forecast: e.currentTarget.checked })} /> Évolution sur
  24 h</label
>
<p class="hint">
  Données <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener">Open-Meteo</a> (modèle européen CAMS, maille
  de 11 km). Les pollens ne sont publiés qu’en Europe et en saison ; les seuils affichés sont indicatifs.
</p>
