# Écrire un widget

Un widget est un dossier `web/src/widgets/<type>/`. Il est enregistré automatiquement au build
([registry.ts](../web/src/lib/widgets/registry.ts)) : il apparaît dans la galerie « Ajouter un widget », se rend dans
la grille, s'exporte et s'importe avec la config. Aucun autre fichier à modifier.

## Le contrat

```ts
// web/src/lib/widgets/types.ts
interface WidgetDef<C> {
  type: string;                 // identifiant stable, écrit dans la config : ne plus le changer ensuite
  label: string;                // nom dans la galerie et titre par défaut
  description: string;          // une phrase pour la galerie
  icon: string;                 // tracé SVG (viewBox 24×24, trait)
  size: { w: number; h: number }; // taille initiale en cellules de grille
  defaults: () => C;            // config d'un widget neuf
  sanitize: (raw: unknown) => C; // répare une config venue du stockage ou d'un import
  view: Component<WidgetProps<C>>;
  editor?: Component<EditorProps<C>>; // formulaire du panneau « Réglages du widget »
  bare?: boolean;               // pas de barre de titre hors édition
  plain?: boolean;              // pas de carte non plus (dessiné directement sur la page)
}
```

La vue reçoit `instance` (id, titre, taille), `config`, `editing` (mode édition actif) et `update(next)`.
L'éditeur reçoit `config` et `update(next)`. `update` remplace la config entière : toujours passer un nouvel objet
(`update({ ...config, champ: valeur })`), ce qui crée une étape d'annulation.

## Exemple : un compte à rebours

`web/src/widgets/countdown/index.ts`

```ts
import { defineWidget } from '../../lib/widgets/types.ts';
import { obj, str } from '../../lib/config/sanitize.ts';
import View from './Countdown.svelte';
import Editor from './Editor.svelte';

export interface CountdownConfig {
  label: string;
  date: string; // AAAA-MM-JJ
}

export default defineWidget<CountdownConfig>({
  type: 'countdown',
  label: 'Compte à rebours',
  description: 'Les jours restants avant une date.',
  icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  size: { w: 1, h: 1 },
  defaults: () => ({ label: 'Vacances', date: '2026-12-24' }),
  sanitize: (raw) => {
    const o = obj(raw);
    const date = str(o['date'], '', 10);
    return { label: str(o['label'], 'Vacances', 60), date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '2026-12-24' };
  },
  view: View,
  editor: Editor,
});
```

`Countdown.svelte`

```svelte
<script lang="ts">
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import type { CountdownConfig } from './index.ts';

  let { config }: WidgetProps<CountdownConfig> = $props();
  const days = $derived(Math.ceil((Date.parse(config.date) - Date.now()) / 86_400_000));
</script>

<p class="n">{days}</p>
<p class="meta">jours avant {config.label}</p>

<style>
  .n {
    font-family: var(--font-display);
    font-size: 44px;
    color: var(--wa);
  }
</style>
```

`Editor.svelte`

```svelte
<script lang="ts">
  import type { EditorProps } from '../../lib/widgets/types.ts';
  import type { CountdownConfig } from './index.ts';

  let { config, update }: EditorProps<CountdownConfig> = $props();
</script>

<label class="field">
  <span class="meta">Libellé</span>
  <input value={config.label} onchange={(e) => update({ ...config, label: e.currentTarget.value })} />
</label>
<label class="field">
  <span class="meta">Date</span>
  <input type="date" value={config.date} onchange={(e) => update({ ...config, date: e.currentTarget.value })} />
</label>
```

C'est tout : `npm run dev`, mode édition (`e`), « Widget », le compte à rebours est dans la galerie.

## Règles

- **Couleurs** : uniquement les variables du thème (`--text-*`, `--bg-*`, `--accent`, `--ansi-*`…). `--wa` est
  l'accent du widget : si la config contient `accent` (une clé de `ACCENTS` dans `lib/open.ts`), le cadre l'applique.
- **Classes globales disponibles** : `.meta`, `.mono`, `.muted`, `.hint`, `.field`, `.check`, `.seg`, `.swatches`,
  `.btn` (`-primary`, `-ghost`, `-danger`), `.icon-btn`, et les contrôles de formulaire déjà stylés.
- **`sanitize` est obligatoire et total** : il ne lève jamais, borne les nombres, n'accepte que des URLs http(s)
  (`safeUrl`, `normalizeUrl`), tronque les chaînes. Une config importée à la main ne doit jamais casser la page.
- **Effets** : un `$effect` qui lit et écrit le même état boucle. Pour charger des données, lire les dépendances
  voulues puis appeler le chargement dans `untrack()` (voir `widgets/rss/Rss.svelte`), et retourner une fonction de
  nettoyage pour les `setInterval`.
- **Réseau** : le navigateur n'a le droit qu'à `'self'`, Open-Meteo, Nager.Date et Wikipédia (`connect-src` de la
  CSP dans `server/static.go`). Une source
  externe sans CORS passe par une route du serveur Go (sur le modèle de `/api/feed`, avec la garde SSRF), une source
  avec CORS s'ajoute à `connect-src`.
- **Lieu** : un widget lié à une ville étend `Place` et réutilise `sanitizePlace()` et `<PlacePicker>`
  (`lib/geo.ts`, `components/PlacePicker.svelte`), comme `weather`, `air` et `sun`. `readCache`/`writeCache` du même
  module donnent un cache `localStorage` horodaté.
- **Pas de HTML injecté** : afficher du texte (`{valeur}`), jamais `{@html}` avec des données externes.
- **Changer la forme d'une config existante** : garder `sanitize` capable de lire l'ancienne forme, ou ajouter une
  migration dans `lib/config/normalize.ts` et incrémenter `CONFIG_VERSION`.
