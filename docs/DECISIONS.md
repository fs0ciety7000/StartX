# Décisions · StartX

## D-001 · Svelte 5 + Vite plutôt qu'Astro ou Next
- **Choix** : application monopage Svelte 5 (runes), construite par Vite, sans dépendance d'exécution.
- **Alternatives** : Astro (comme Portico-show), Next.js, React + Vite, Web Components « à la main ».
- **Raison** : une startpage n'a pas de contenu à rendre au build : tout dépend de la configuration locale de la
  personne, donc tout est client. L'intérêt d'Astro (HTML statique, îlots) disparaît, celui de Next (rendu serveur)
  aussi. Svelte compile vers du JS sans runtime lourd (~44 Ko gzip pour toute l'app), et ses runes donnent un store
  profondément réactif sur un seul objet JSON : le modèle exact de l'app (un document de config qu'on édite).
  React aurait demandé un gestionnaire d'état et plus de code pour le même résultat.

## D-002 · Go pour le serveur
- **Choix** : un binaire Go qui embarque le build (`embed`), sert l'app et l'API.
- **Alternatives** : nginx seul (comme Portico-show), Rust (axum), Node.
- **Raison** : le navigateur ne peut pas lire la plupart des flux RSS (pas de CORS) : il faut un proxy, donc un
  serveur. nginx ne sait pas parser ni découvrir un flux, et un `proxy_pass` vers une URL arbitraire serait un relais
  ouvert. Go fait le parsing XML, les charsets, la protection SSRF et le cache en ~600 lignes avec la bibliothèque
  standard, compile en un binaire statique et démarre en millisecondes. Rust aurait été aussi bon techniquement pour
  plus de temps de compilation et de code ; Node aurait ajouté un runtime et des dépendances.

## D-003 · Configuration locale, sans compte
- **Choix** : un document JSON unique dans `localStorage`, export/import en fichier, défaut optionnel servi par le
  serveur (`STARTX_DEFAULT_CONFIG`).
- **Alternatives** : base de données côté serveur avec comptes, synchronisation par jeton.
- **Raison** : demandé « sans connexion ». Rien de personnel ne quitte le navigateur (sauf les adresses de flux,
  lues par le proxy). Le fichier exporté sert de sauvegarde et de moyen de copier sa page sur un autre poste ; le
  défaut côté serveur permet d'avoir *sa* page dès le premier chargement d'un nouveau navigateur.
- **Conséquence** : la config doit être robuste aux imports faits main : tout passe par `normalize()` qui répare ou
  ignore ce qui est invalide (URL non http(s), types inconnus, tailles hors bornes).

## D-004 · Widgets = dossiers, registre automatique
- **Choix** : chaque widget est `web/src/widgets/<type>/index.ts` exportant un `WidgetDef` ; `import.meta.glob` les
  enregistre au build.
- **Raison** : ajouter un widget ne touche aucun fichier central (ni switch, ni liste). Le contrat impose `defaults()`
  et `sanitize()`, donc un widget nouveau reste sûr face à une config importée. Voir [WIDGETS.md](WIDGETS.md).

## D-005 · Tokens et thèmes de Portico, gravure propre
- **Choix** : `tokens.css` copié tel quel depuis Portico (Obsidian, Basalt, Travertine) ; même échelle typographique,
  mêmes polices (Geist, Inter, JetBrains Mono, auto-hébergées). Le pied de page reprend la *technique* de Portico
  (gravure utilisée comme masque de luminance, teintée par le thème, lanterne qui suit le pointeur) avec une
  illustration propre à StartX : un carrefour de nuit et son poteau indicateur, la métaphore d'une page de départ.
- **Source de l'illustration** : générée par IA (gpt-image-2) d'après le brief `design/footer-engraving-prompt.txt`,
  original dans `design/footer-engraving-source.png`, servie en WebP niveaux de gris (115 et 290 Ko).

## D-006 · Pages façon tmux
- **Choix** : une barre d'état en bas, au format tmux (`[startx] 1:home* 2:code-`), avec le préfixe `Ctrl+B`.
- **Raison** : demandé « style tmux ». La barre sert aussi de cible de dépôt : glisser un widget sur un onglet le
  déplace vers cette page.

## D-007 · Météo appelée par le navigateur, favicons par DuckDuckGo
- **Choix** : Open-Meteo directement depuis le navigateur (CORS autorisé, sans clé) ; favicons via
  `icons.duckduckgo.com` avec repli sur une initiale.
- **Raison** : rien à cacher ni à proxifier, pas de clé à gérer. DuckDuckGo plutôt que Google pour ne pas envoyer la
  liste de ses favoris à Google ; une icône personnalisée par lien reste possible.

## D-008 · Widgets de données ouvertes appelés par le navigateur
- **Choix** : qualité de l'air (Open-Meteo Air Quality), jours fériés (Nager.Date) et Wikipédia du jour (REST de
  `<langue>.wikipedia.org`) sont appelés directement par le navigateur ; soleil et lune sont calculés localement
  (formules de SunCalc, BSD).
- **Raison** : ces trois API envoient des en-têtes CORS et n'ont pas de clé : passer par le serveur n'apporterait
  qu'une charge et un point de panne. Les réponses sont mises en cache dans `localStorage` (30 min, 7 jours, 1 h).
  Le français n'a pas d'« article du jour » dans l'API Wikimedia : le widget montre alors image, éphémérides et plus
  lus. Les noms de jours fériés belges (fournis en néerlandais/anglais) sont traduits dans le widget.

## D-009 · Alpine plutôt que distroless pour l'image
- **Raison** : le healthcheck de Coolify exécute `wget` dans le conteneur. L'image Docker a aussi son propre
  `HEALTHCHECK` qui appelle le binaire (`startx -healthcheck`).
