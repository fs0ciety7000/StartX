# StartX · startpage

Page de démarrage de navigateur : favoris par catégories, lanceur, recherche multi-moteurs, flux RSS, météo, notes,
pages multiples façon tmux. Tout se règle depuis l'interface, rien ne demande de compte : la configuration vit dans le
navigateur et s'exporte en un fichier JSON.

Production : **https://startpage.fs0ciety.org**

Conçu et développé par Nicolas Dessenius · Cardor Interactive. Design dérivé de
[Portico](https://portico.dessenius.be) (mêmes tokens, mêmes trois thèmes, même grammaire de pied de page gravé).

## Ce que ça fait

| | |
|---|---|
| **Favoris** | Groupes de liens (Work, Personnel, Code, Divers… ou les tiens), icônes automatiques, couleur par groupe, liste ou grille. |
| **Lanceur** | La barre de recherche propose les favoris de *toutes* les pages pendant la frappe ; une adresse (`github.com`) s'ouvre directement. |
| **Recherche** | Moteurs configurables (Google, DuckDuckGo, Claude, GitHub, YouTube, Wikipédia, MDN, Maps…), `!bang` pour changer de moteur une fois. |
| **RSS** | Plusieurs sites fusionnés et triés par date, filtre par source. L'adresse du site suffit (`numerama.com`) : le serveur trouve le flux. |
| **Météo** | Open-Meteo, sans clé : actuel + prévisions, recherche de ville. |
| **Pages** | Autant de pages que voulu, barre du bas façon tmux (`1:home* 2:code`), `Alt+1…9` ou `Ctrl+B` puis un chiffre. |
| **Édition** | `e` : glisser-déposer (y compris vers un autre onglet de page), redimensionner, renommer, `Ctrl+Z` illimité ou presque. |
| **Données** | Export / import JSON, éditeur JSON brut, réinitialisation. Configuration par défaut fournie par le serveur si voulu. |

Raccourcis complets : touche `?` dans l'app, ou [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#clavier).

## Stack

| Domaine | Choix |
|---|---|
| Interface | Svelte 5 (runes) + Vite 8, TypeScript strict, aucune dépendance d'exécution |
| Styles | CSS natif ; couleurs, rayons, durées = tokens Portico (`web/src/styles/tokens.css`) |
| Serveur | Go 1.24, bibliothèque standard + `x/net` (charsets, HTML) ; sert le build embarqué et le proxy RSS |
| Image | Multi-étapes Node → Go → Alpine (~15 Mo), utilisateur non-root, healthcheck `/healthz` |
| Hébergement | Coolify (build pack Dockerfile, port 8080) derrière Cloudflare |

Le pourquoi de chaque choix : [docs/DECISIONS.md](docs/DECISIONS.md).

## Développer

```bash
# Interface (http://localhost:5173, /api proxifié vers :8080)
cd web && npm install && npm run dev

# Serveur (dans un autre terminal)
cd server && go run .                       # sert aussi l'app embarquée (après un build)
STARTX_STATIC=../web/dist go run .          # ou le build courant, sans recompiler

# Vérifications
cd web && npm run check && npm run lint     # svelte-check + prettier
cd server && go vet ./... && go test ./...
docker build -t startx . && docker run -p 8080:8080 startx
```

Node ≥ 22.12, Go ≥ 1.24.

## Structure

```
web/
├── src/
│   ├── App.svelte              # coquille : barre du haut, grille, footer, barre tmux, panneaux
│   ├── components/             # cadre de widget, grille, barre tmux, réglages, galerie, aide…
│   ├── lib/config/             # schéma, valeurs par défaut, normalisation, store (undo, persistance)
│   ├── lib/widgets/            # contrat d'un widget + registre automatique
│   ├── lib/keys.svelte.ts      # clavier (raccourcis simples, préfixe tmux)
│   └── widgets/<type>/         # un dossier = un widget (index.ts + vue + éditeur)
└── public/                     # polices, gravure du footer, favicon
server/                         # Go : statique embarqué, /api/feed, /api/defaults, /healthz
design/                         # source et brief de la gravure du footer
docs/                           # architecture, décisions, config, widgets, déploiement
```

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) : flux de données, store, rendu, serveur, sécurité.
- [WIDGETS.md](docs/WIDGETS.md) : écrire un nouveau widget (pas à pas).
- [CONFIG.md](docs/CONFIG.md) : format JSON de la configuration, config par défaut côté serveur.
- [DEPLOY.md](docs/DEPLOY.md) : Coolify, Cloudflare, variables d'environnement, mise en startpage du navigateur.
- [DECISIONS.md](docs/DECISIONS.md) : choix techniques et alternatives écartées.

## Mettre en page d'accueil

- **Firefox** : Paramètres → Accueil → *Adresse web personnalisée* → `https://startpage.fs0ciety.org`.
  Pour les nouveaux onglets, l'extension *New Tab Override* pointant sur la même adresse.
- **Chrome / Edge / Brave** : Paramètres → Au démarrage → *Ouvrir une page spécifique* ; pour les nouveaux onglets,
  une extension du type *Custom New Tab URL*.

Détails dans [docs/DEPLOY.md](docs/DEPLOY.md#navigateur).
