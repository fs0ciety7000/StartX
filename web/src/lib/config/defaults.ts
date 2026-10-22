import { CONFIG_VERSION, uid, type SearchEngine, type StartxConfig, type WidgetInstance } from './schema.ts';

export const DEFAULT_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', bang: 'g' },
  { id: 'ddg', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}', bang: 'd' },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new?q={q}', bang: 'c' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={q}&type=repositories', bang: 'gh' },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query={q}', bang: 'y' },
  { id: 'wikipedia', name: 'Wikipédia', url: 'https://fr.wikipedia.org/w/index.php?search={q}', bang: 'w' },
  { id: 'mdn', name: 'MDN', url: 'https://developer.mozilla.org/fr/search?q={q}', bang: 'mdn' },
  { id: 'maps', name: 'Google Maps', url: 'https://www.google.com/maps/search/{q}', bang: 'm' },
];

const link = (name: string, url: string) => ({ id: uid('l'), name, url, icon: '' });

function w<C>(type: string, title: string, size: [number, number], config: C): WidgetInstance {
  return { id: uid(), type, title, w: size[0], h: size[1], config: config as Record<string, unknown> };
}

/** First-run layout. A server can override it (STARTX_DEFAULT_CONFIG, see docs/CONFIG.md). */
export function defaultConfig(): StartxConfig {
  const home = uid('p');
  return {
    version: CONFIG_VERSION,
    activePage: home,
    settings: {
      theme: 'obsidian',
      name: '',
      openInNewTab: false,
      clock24h: true,
      statusBar: true,
      footer: true,
      defaultEngine: 'google',
      engines: DEFAULT_ENGINES.map((e) => ({ ...e })),
    },
    pages: [
      {
        id: home,
        name: 'home',
        columns: 4,
        widgets: [
          w('clock', 'Horloge', [2, 1], { greeting: true, date: true, seconds: false }),
          w('weather', 'Météo', [2, 1], { city: 'Mons', country: 'Belgique', lat: 50.4542, lon: 3.9523, units: 'metric', days: 4 }),
          w('search', 'Recherche', [4, 1], { engine: '', launcher: true }),
          w('links', 'Work', [1, 3], {
            accent: 'accent',
            links: [
              link('Gmail', 'https://mail.google.com/'),
              link('Agenda', 'https://calendar.google.com/'),
              link('Drive', 'https://drive.google.com/'),
              link('Notion', 'https://www.notion.so/'),
              link('Coolify', 'https://coolify.fs0ciety.org/'),
              link('Cloudflare', 'https://dash.cloudflare.com/'),
            ],
          }),
          w('links', 'Personnel', [1, 3], {
            accent: 'green',
            links: [
              link('YouTube', 'https://www.youtube.com/'),
              link('Spotify', 'https://open.spotify.com/'),
              link('Reddit', 'https://www.reddit.com/'),
              link('RTBF Info', 'https://www.rtbf.be/info'),
              link('Le Soir', 'https://www.lesoir.be/'),
              link('Wikipédia', 'https://fr.wikipedia.org/'),
            ],
          }),
          w('links', 'Code', [1, 3], {
            accent: 'blue',
            links: [
              link('GitHub', 'https://github.com/fs0ciety7000'),
              link('Claude', 'https://claude.ai/'),
              link('MDN', 'https://developer.mozilla.org/fr/'),
              link('pkg.go.dev', 'https://pkg.go.dev/'),
              link('crates.io', 'https://crates.io/'),
              link('Svelte', 'https://svelte.dev/docs'),
            ],
          }),
          w('links', 'Divers', [1, 3], {
            accent: 'violet',
            links: [
              link('Google Maps', 'https://www.google.com/maps'),
              link('DeepL', 'https://www.deepl.com/translator'),
              link('Excalidraw', 'https://excalidraw.com/'),
              link('Photopea', 'https://www.photopea.com/'),
              link('Internet Archive', 'https://archive.org/'),
              link('IRM Météo', 'https://www.meteo.be/fr'),
            ],
          }),
          w('rss', 'Veille', [3, 3], {
            feeds: [
              { url: 'https://korben.info/feed', name: 'Korben' },
              { url: 'https://www.numerama.com/feed/', name: 'Numerama' },
              { url: 'https://www.wired.com/feed/rss', name: 'Wired' },
            ],
            limit: 20,
            summary: false,
            refresh: 30,
            accent: 'amber',
          }),
          w('notes', 'Notes', [1, 3], {
            text: 'Bienvenue sur StartX.\n\n— e : mode édition\n— , : réglages\n— / : recherche\n— ? : raccourcis',
          }),
        ],
      },
      {
        id: uid('p'),
        name: 'code',
        columns: 3,
        widgets: [
          w('search', 'Recherche', [3, 1], { engine: 'github', launcher: true }),
          w('links', 'Dépôts', [1, 3], {
            accent: 'blue',
            links: [
              link('StartX', 'https://github.com/fs0ciety7000/StartX'),
              link('Portico', 'https://github.com/fs0ciety7000/Portico'),
              link('Portico-show', 'https://github.com/fs0ciety7000/Portico-show'),
              link('Pull requests', 'https://github.com/pulls'),
              link('Notifications', 'https://github.com/notifications'),
            ],
          }),
          w('links', 'Docs', [1, 3], {
            accent: 'teal',
            links: [
              link('Go', 'https://go.dev/doc/'),
              link('Rust std', 'https://doc.rust-lang.org/std/'),
              link('Astro', 'https://docs.astro.build/fr/'),
              link('Coolify', 'https://coolify.io/docs/'),
              link('Can I use', 'https://caniuse.com/'),
            ],
          }),
          w('rss', 'Dev', [1, 3], {
            feeds: [
              { url: 'https://github.blog/feed/', name: 'GitHub Blog' },
              { url: 'https://blog.rust-lang.org/feed.xml', name: 'Rust' },
              { url: 'https://go.dev/blog/feed.atom', name: 'Go' },
            ],
            limit: 15,
            summary: false,
            refresh: 60,
            accent: 'teal',
          }),
        ],
      },
    ],
  };
}
