<script lang="ts">
  import PlacePicker from '../../components/PlacePicker.svelte';
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import type { SunConfig } from './index.ts';

  let { config, update }: EditorProps<SunConfig> = $props();
</script>

<PlacePicker place={config} onpick={(p) => update({ ...config, ...p })} />
<label class="check"
  ><input type="checkbox" checked={config.moon} onchange={(e) => update({ ...config, moon: e.currentTarget.checked })} /> Afficher la lune</label
>
<p class="hint">Calculé dans le navigateur (formules de SunCalc), à la minute près. Aucune donnée envoyée.</p>
