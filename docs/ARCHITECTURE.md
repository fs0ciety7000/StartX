# Architecture · StartX

```
 Navigateur                                              Serveur Go (startx)
┌──────────────────────────────────────────────┐        ┌──────────────────────────────┐
│ localStorage "startx:config"  ◄──── store ───┼─ GET / ─► build Vite embarqué (embed) │
│        ▲ (débounce 250 ms)        │          │        │                              │
│        │                   app.config ($state)        │ GET /api/defaults ──► fichier │
│   edit(fn) ── undo/redo     │                │        │   STARTX_DEFAULT_CONFIG (opt.)│
│        ▲                    ▼                │        │                              │
│  composants ◄──── PageGrid → WidgetFrame ────┼───────►│ GET /api/feed?url=…          │
│                        → widgets/<type>      │        │   SSRF guard → fetch → parse │
│                                              │        │   → découverte → cache 10 min│
│  Open-Meteo (météo, air), Nager.Date,       │
│  Wikipédia, DuckDuckGo (favicons)        ◄───┘        └──────────────────────────────┘
```

## Interface (`web/`)

### Le document de configuration
Toute l'interface est la projection d'un seul objet `StartxConfig` ([schema.ts](../web/src/lib/config/schema.ts),
format détaillé dans [CONFIG.md](CONFIG.md)) : réglages, moteurs de recherche, pages, widgets et leur config.

- **Lecture** : `initStore()` (appelé par `main.ts` *après* le chargement du registre de widgets) lit
  `localStorage`, passe le JSON dans `normalize()` et l'installe. Premier passage : config intégrée
  ([defaults.ts](../web/src/lib/config/defaults.ts)), remplacée par `/api/defaults` si le serveur en fournit une.
- **Écriture** : un `$effect` sérialise `app.config` à chaque changement profond, avec un débounce de 250 ms.
  L'évènement `storage` synchronise les autres onglets ouverts.
- **Modifications** : toujours via `edit(fn, label?)` ([store.svelte.ts](../web/src/lib/config/store.svelte.ts)),
  qui empile un instantané pour l'annulation (40 niveaux) et peut afficher un toast « Annuler ». La frappe dans une
  note passe par `updateWidgetQuiet()` qui regroupe la saisie en une seule étape d'annulation.
- **Robustesse** : `normalize()` répare tout ce qui entre (stockage, import, défaut serveur) : bornes numériques,
  URLs http(s) uniquement, widgets de type inconnu ignorés, chaque widget nettoie sa propre config (`sanitize`).
  Les migrations de version sont une liste de fonctions dans [normalize.ts](../web/src/lib/config/normalize.ts).

### Rendu
- `App.svelte` : barre du haut, `PageGrid`, `Footer`, `TmuxBar`, et les panneaux (`Settings`, `Picker`,
  `WidgetDrawer`, `Help`, `Toast`), tous des `<dialog>` natifs (piège du focus, `Échap`).
- `PageGrid` : grille CSS de `columns` colonnes (repliée à 2 sous 1180 px, à 1 sous 720 px), rangées de 112 px,
  `grid-auto-flow: dense`. Chaque widget occupe `w × h` cellules.
- `WidgetFrame` : le cadre commun (titre, couleur d'accent `--wa`, outils d'édition, glisser-déposer). Les widgets
  `bare` n'ont pas de titre hors édition ; `plain` les dessine sans carte (horloge, recherche).
- Widgets : voir [WIDGETS.md](WIDGETS.md). Ils reçoivent `instance`, `config`, `editing` et `update(next)`.

### Glisser-déposer
HTML5 DnD, armé uniquement depuis la poignée (pour ne pas gêner la sélection de texte). Cibles : un autre widget
(insertion avant), la tuile « Ajouter un widget » (fin de page), un onglet de la barre tmux (fin de l'autre page).
Au clavier : focus sur la poignée puis flèches.

### Clavier
Défini dans [keys.svelte.ts](../web/src/lib/keys.svelte.ts). Les touches simples n'agissent que si aucun champ n'a le
focus et qu'aucun panneau n'est ouvert (WCAG 2.1.4).

| Touche | Action |
|---|---|
| `/` ou taper directement | Focus recherche |
| `e` | Mode édition |
| `,` | Réglages |
| `?` | Aide |
| `[` / `]` | Page précédente / suivante |
| `Alt+1…9` | Page n |
| `Ctrl+Z` / `Ctrl+Maj+Z` | Annuler / rétablir |
| `Ctrl+B` puis `1…9`, `n`, `p`, `c`, `,`, `x`, `e`, `?` | Préfixe tmux : page n, suivante, précédente, créer, renommer, fermer, éditer, aide |
| Recherche : `↓`/`Tab`, `↵`, `Ctrl+↵`, `!bang` | Choisir un favori, ouvrir/chercher, nouvel onglet, autre moteur |

### Styles
`tokens.css` vient de Portico (généré par `portico-theme`) : ne jamais coder une couleur en dur, utiliser
`--bg-*`, `--text-*`, `--accent*`, `--ansi-*`, `--status-*`. Le thème est l'attribut `data-theme` de `<html>`,
appliqué avant le premier rendu par `public/boot.js` (fichier externe : la CSP n'autorise aucun script inline).

## Serveur (`server/`)

| Route | Rôle |
|---|---|
| `GET /` et le reste | Build Vite embarqué ; chemins sans extension → `index.html`. `assets/` et `fonts/` en cache immuable. |
| `GET /api/feed?url=` | Proxy RSS/Atom/RDF normalisé en JSON `{url,title,site,items[{title,link,date,summary}]}`. |
| `GET /api/defaults` | Contenu de `STARTX_DEFAULT_CONFIG` (204 sinon). |
| `GET /healthz` | `ok`. |

### Proxy de flux
1. **Garde SSRF** ([fetch.go](../server/fetch.go)) : http(s) seulement, ports 80/443, pas d'identifiants
   dans l'URL ; l'adresse IP réellement composée est vérifiée au moment du `dial` (refus du loopback, réseaux privés,
   link-local, CGNAT, multicast, plages réservées, IPv4 mappées, et les adresses publiques de l'hôte listées dans
   `STARTX_DENY_CIDRS`) : pas de contournement par DNS rebinding ni par
   redirection. 5 redirections max, 10 s, 4 Mio max.
2. **Lecture** ([feed.go](../server/feed.go)) : RSS 2.0, RSS 1.0/RDF, Atom ; tous charsets (`x/net/html/charset`) ;
   liens relatifs résolus ; dates normalisées en RFC 3339 UTC ; résumés sans HTML, tronqués à 280 caractères ;
   50 articles max.
3. **Découverte** : si l'adresse donne une page HTML, lecture des `<link rel="alternate" type="application/rss+xml">`
   puis essai de `/feed`, `/rss`, `/feed.xml`, `/rss.xml`, `/atom.xml`, `/index.xml`. Si la page d'accueil refuse les
   robots (Korben répond 403), les mêmes chemins sont essayés directement.
4. **Cache** : 10 min (2 min pour une erreur), requêtes simultanées sur la même URL fusionnées, 512 entrées max.
   Côté navigateur, chaque flux est aussi mis en cache dans `localStorage` (affichage immédiat, rafraîchissement selon
   le réglage du widget).
5. **Débit** : 120 requêtes par minute et par IP. L'IP retenue est le dernier saut `X-Forwarded-For` ajouté par
   Traefik ; `CF-Connecting-IP` n'est cru que si ce saut est une adresse Cloudflare (sinon l'en-tête est falsifiable
   par qui contacte l'origine directement).

### En-têtes
CSP stricte (`script-src 'self'`, styles de fichiers + attributs `style` pour les directives Svelte, `connect-src`
limité à soi et Open-Meteo, `frame-ancestors 'none'`), HSTS, `nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag: noindex`.

### Variables d'environnement
| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `8080` | Port d'écoute |
| `STARTX_DEFAULT_CONFIG` | — | Chemin d'un export JSON servi comme config de premier lancement |
| `STARTX_DENY_CIDRS` | — | IP ou CIDR supplémentaires interdits au proxy, séparés par des virgules : les IP publiques du serveur |
| `STARTX_STATIC` | — | Servir un dossier au lieu du build embarqué (développement) |
| `STARTX_USE_PROXY` | — | `1` : sortir par `HTTPS_PROXY` (bacs à sable de dev uniquement ; la vérification IP se fait alors avant la requête) |
