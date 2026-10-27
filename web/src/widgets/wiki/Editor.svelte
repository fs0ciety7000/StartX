<script lang="ts">
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import { LANGS, type Lang } from './api.ts';
  import type { WikiConfig } from './index.ts';

  let { config, update }: EditorProps<WikiConfig> = $props();
</script>

<label class="field">
  <span class="meta">Langue</span>
  <select value={config.lang} onchange={(e) => update({ ...config, lang: e.currentTarget.value as Lang })}>
    {#each Object.entries(LANGS) as [code, name] (code)}<option value={code}>{name}</option>{/each}
  </select>
</label>
<label class="check"
  ><input type="checkbox" checked={config.image} onchange={(e) => update({ ...config, image: e.currentTarget.checked })} /> Image du jour</label
>
<label class="check"
  ><input type="checkbox" checked={config.onthisday} onchange={(e) => update({ ...config, onthisday: e.currentTarget.checked })} /> Éphémérides</label
>
<label class="check"
  ><input type="checkbox" checked={config.mostread} onchange={(e) => update({ ...config, mostread: e.currentTarget.checked })} /> Les plus lus</label
>
<label class="field">
  <span class="meta">Lignes par liste · {config.count}</span>
  <input type="range" min="3" max="20" value={config.count} oninput={(e) => update({ ...config, count: +e.currentTarget.value })} />
</label>
<p class="hint">
  L’« article du jour » n’est publié par l’API que pour certaines langues (anglais, allemand…) ; il apparaît alors en premier onglet.
  Contenus Wikipédia sous licence CC BY-SA.
</p>
