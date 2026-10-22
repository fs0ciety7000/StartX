<script lang="ts">
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import type { ClockConfig } from './index.ts';

  let { config, update }: EditorProps<ClockConfig> = $props();
  const set = <K extends keyof ClockConfig>(k: K, v: ClockConfig[K]) => update({ ...config, [k]: v });
</script>

<label class="check"
  ><input type="checkbox" checked={config.greeting} onchange={(e) => set('greeting', e.currentTarget.checked)} /> Salutation</label
>
<label class="check"><input type="checkbox" checked={config.date} onchange={(e) => set('date', e.currentTarget.checked)} /> Date</label>
<label class="check"
  ><input type="checkbox" checked={config.seconds} onchange={(e) => set('seconds', e.currentTarget.checked)} /> Secondes</label
>
<p class="hint">Le format 12/24 h et le prénom se règlent dans Réglages → Général.</p>
