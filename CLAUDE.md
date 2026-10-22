# StartX · consignes pour les agents

Startpage de navigateur : Svelte 5 + Vite (`web/`), serveur Go (`server/`), déployée par Coolify sur
https://startpage.fs0ciety.org. Lire `docs/ARCHITECTURE.md` avant de toucher au store ou au serveur.

## Commandes

```bash
cd web && npm ci && npm run check && npm run lint && npm run build   # svelte-check (0 avertissement), prettier, build
cd server && go vet ./... && go test ./...                          # gofmt aussi : gofmt -l . doit être vide
docker build -t startx .                                            # l'image relance vet + tests
```

## Règles

- Textes de l'interface en français. Code et commentaires en anglais, commentaires rares et utiles (le « pourquoi »).
- Couleurs, rayons, durées : variables de `web/src/styles/tokens.css` (copie des tokens Portico). Jamais de couleur en dur.
- Toute modification de la config passe par `edit()` (ou `update()` dans un widget) : sinon pas d'annulation.
- Toute donnée qui entre (stockage, import, `/api/defaults`, flux) est non fiable : `normalize()`/`sanitize()`
  côté client, garde SSRF côté serveur. Seules les URLs http(s) sont acceptées. Pas de `{@html}`.
- Nouveau widget = nouveau dossier `web/src/widgets/<type>/` (voir `docs/WIDGETS.md`), rien d'autre à enregistrer.
- Changement de forme de la config : migration dans `web/src/lib/config/normalize.ts` + `CONFIG_VERSION`, et mettre
  à jour `docs/CONFIG.md`.
- Pas de script ni de style inline dans `index.html` : la CSP (`server/static.go`) les bloque.
- Un `$effect` ne doit pas lire l'état qu'il écrit (boucle infinie) : charger dans `untrack()`.

## Déploiement

Push sur la branche suivie par l'application Coolify `startx` → build Dockerfile → redéploiement. Détails et
identifiants des ressources dans `docs/DEPLOY.md`.
