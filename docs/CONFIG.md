# Format de configuration

Toute la startpage est un document JSON (clé `startx:config` du `localStorage`). On l'obtient par
Réglages → Données → *Exporter*, on peut l'éditer à la main puis le réimporter ou le coller dans l'éditeur JSON.
À l'import, tout est vérifié : les valeurs invalides sont corrigées, les widgets de type inconnu ignorés.

```jsonc
{
  "version": 1,                       // version du format (migrations automatiques)
  "activePage": "p_k3x9…",            // id de la page affichée
  "settings": {
    "theme": "obsidian",              // obsidian | basalt | travertine
    "name": "Nicolas",                // prénom de la salutation ("" pour aucun)
    "openInNewTab": false,
    "clock24h": true,
    "statusBar": true,                // barre de pages façon tmux
    "footer": true,                   // pied de page gravé
    "defaultEngine": "google",
    "engines": [
      { "id": "google", "name": "Google", "url": "https://www.google.com/search?q={q}", "bang": "g" }
    ]
  },
  "pages": [
    {
      "id": "p_k3x9…",
      "name": "home",                 // 24 caractères max, sans espaces (affiché "1:home")
      "columns": 4,                   // 1 à 6
      "widgets": [
        { "id": "w_…", "type": "links", "title": "Work", "w": 1, "h": 3, "config": { … } }
      ]
    }
  ]
}
```

`w` est la largeur en colonnes (bornée par `columns`), `h` la hauteur en rangées de 112 px (1 à 8). Les `id` sont
libres mais uniques ; absents, ils sont générés.

## Config de chaque widget

| `type` | `config` |
|---|---|
| `links` | `accent` (`accent`, `green`, `blue`, `violet`, `teal`, `amber`, `red`), `layout` (`list` \| `grid`), `links: [{ id, name, url, icon }]` (`icon` : URL d'image, vide = favicon du site) |
| `search` | `engine` (id d'un moteur, vide = moteur par défaut), `launcher` (proposer les favoris en tapant) |
| `rss` | `feeds: [{ url, name }]`, `limit` (3–100), `summary` (bool), `refresh` (minutes, 5–1440), `accent` |
| `weather` | `city`, `country`, `lat`, `lon`, `units` (`metric` \| `imperial`), `days` (0–7) |
| `clock` | `greeting`, `date`, `seconds` (bool) |
| `notes` | `text` |

Seules les adresses `http://` et `https://` sont acceptées (liens, icônes, flux, moteurs) ; une URL de moteur doit
contenir `{q}`.

## Config par défaut côté serveur

Au premier chargement dans un navigateur (aucune config locale), l'app demande `/api/defaults`. Si la variable
`STARTX_DEFAULT_CONFIG` pointe vers un fichier JSON (un export), c'est lui qui sert de point de départ ; sinon la
config intégrée (`web/src/lib/config/defaults.ts`) s'applique.

Dans Coolify : *Storages* → monter un fichier, par exemple `/data/startx.json`, puis
`STARTX_DEFAULT_CONFIG=/data/startx.json` dans les variables d'environnement. Le fichier n'écrase jamais une
configuration déjà présente dans un navigateur.
