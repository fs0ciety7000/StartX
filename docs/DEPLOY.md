# Déploiement

## En bref

| | |
|---|---|
| URL | https://startpage.fs0ciety.org |
| Hébergeur | Coolify `coolify.fs0ciety.org`, projet **StartX**, application **startx** |
| Build | Dockerfile à la racine, port exposé `8080`, healthcheck `GET /healthz` |
| Branche suivie | `claude/wonderful-thompson-m6yk6n` (à passer sur `main` une fois la PR fusionnée) |
| DNS | Cloudflare, `CNAME startpage → fs0ciety.org`, proxifié (TLS Cloudflare + Let's Encrypt côté Traefik) |

Un push sur la branche suivie déclenche le build et le redéploiement (application GitHub de Coolify).

## Construire et lancer à la main

```bash
docker build -t startx .
docker run --rm -p 8080:8080 startx
curl localhost:8080/healthz
```

L'étape Go de l'image exécute `go vet` et `go test` : un test rouge empêche le déploiement.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute (8080 par défaut, à garder aligné avec *Ports Exposes* dans Coolify) |
| `STARTX_DEFAULT_CONFIG` | Chemin d'un export JSON monté dans le conteneur : config de premier lancement (voir [CONFIG.md](CONFIG.md)) |
| `STARTX_DENY_CIDRS` | IP publiques du serveur (ici `152.53.176.13`), interdites au proxy RSS : sinon une URL vers l'hôte lui-même contournerait le pare-feu |

## Recréer l'installation de zéro

1. **DNS** (Cloudflare, zone `fs0ciety.org`) : `CNAME startpage → fs0ciety.org`, proxy activé.
2. **Coolify** : nouveau projet *StartX*, ressource *Private Repository (GitHub App)* → `fs0ciety7000/StartX`,
   branche suivie, build pack *Dockerfile*, *Ports Exposes* `8080`, domaine `https://startpage.fs0ciety.org`,
   healthcheck activé sur `/healthz` port `8080`, variable `STARTX_DENY_CIDRS=152.53.176.13`.
3. *Deploy*. Vérifier `https://startpage.fs0ciety.org/healthz`.

## Navigateur

La page ne demande rien au navigateur : il suffit d'en faire la page d'accueil.

- **Firefox** : `about:preferences#home` → *Page d'accueil et nouvelles fenêtres* → *Adresses web personnalisées* →
  `https://startpage.fs0ciety.org`. Nouvel onglet : extension *New Tab Override* (option « focus sur la page web »
  pour que la recherche reçoive le clavier).
- **Chrome / Edge / Brave / Vivaldi** : *Au démarrage* → *Ouvrir une page ou un ensemble de pages spécifiques*.
  Nouvel onglet : extension *Custom New Tab URL* ou équivalent. Vivaldi et Brave acceptent une URL de nouvel onglet
  sans extension.

La configuration étant propre à chaque navigateur, utiliser *Exporter* / *Importer* (ou `STARTX_DEFAULT_CONFIG`)
pour retrouver la même page ailleurs.
