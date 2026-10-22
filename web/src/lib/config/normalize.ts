import { widgetDef } from '../widgets/registry.ts';
import { DEFAULT_ENGINES, defaultConfig } from './defaults.ts';
import { arr, bool, int, obj, str } from './sanitize.ts';
import { CONFIG_VERSION, isTheme, uid, type Page, type SearchEngine, type StartxConfig, type WidgetInstance } from './schema.ts';

/**
 * Version migrations: index i upgrades a v(i+1) document to v(i+2).
 * Example for a future v2: `(c) => ({ ...c, settings: { ...c.settings, density: 'cozy' } })`.
 */
const MIGRATIONS: ((c: Record<string, unknown>) => Record<string, unknown>)[] = [];

function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let c = raw;
  let v = int(c['version'], 1, 1, CONFIG_VERSION);
  while (v < CONFIG_VERSION) {
    const step = MIGRATIONS[v - 1];
    if (step) c = step(c);
    v += 1;
  }
  return c;
}

function engine(raw: unknown): SearchEngine | null {
  const o = obj(raw);
  const url = str(o['url']).trim();
  if (!/^https?:\/\//i.test(url) || !url.includes('{q}')) return null;
  return {
    id: str(o['id']) || uid('e'),
    name: str(o['name'], 'Moteur', 40) || 'Moteur',
    url,
    bang: str(o['bang'], '', 12).replace(/^!/, '').trim().toLowerCase(),
  };
}

function widget(raw: unknown, cols: number): WidgetInstance | null {
  const o = obj(raw);
  const def = widgetDef(str(o['type']));
  // Unknown types (a widget removed from the build) are dropped rather than crashing the page.
  if (!def) return null;
  return {
    id: str(o['id']) || uid(),
    type: def.type,
    title: str(o['title'], def.label, 80),
    w: int(o['w'], def.size.w, 1, Math.max(cols, 1)),
    h: int(o['h'], def.size.h, 1, 8),
    config: def.sanitize(o['config']) as Record<string, unknown>,
  };
}

function page(raw: unknown): Page {
  const o = obj(raw);
  const columns = int(o['columns'], 3, 1, 6);
  return {
    id: str(o['id']) || uid('p'),
    name: str(o['name'], 'page', 24) || 'page',
    columns,
    widgets: arr(o['widgets'])
      .map((x) => widget(x, columns))
      .filter((x): x is WidgetInstance => x !== null),
  };
}

/** Turns anything (storage, an import, a server default) into a valid config. */
export function normalize(input: unknown): StartxConfig {
  const base = defaultConfig();
  const c = migrate(obj(input));
  const s = obj(c['settings']);
  const engines = arr(s['engines'])
    .map(engine)
    .filter((e): e is SearchEngine => e !== null);
  const finalEngines = engines.length ? engines : DEFAULT_ENGINES.map((e) => ({ ...e }));
  const pages = arr(c['pages']).map(page);
  const finalPages = pages.length ? pages : base.pages;
  const active = str(c['activePage']);
  const defaultEngine = str(s['defaultEngine']);
  return {
    version: CONFIG_VERSION,
    activePage: finalPages.some((p) => p.id === active) ? active : (finalPages[0]?.id ?? ''),
    settings: {
      theme: isTheme(s['theme']) ? s['theme'] : base.settings.theme,
      name: str(s['name'], '', 40),
      openInNewTab: bool(s['openInNewTab'], base.settings.openInNewTab),
      clock24h: bool(s['clock24h'], base.settings.clock24h),
      statusBar: bool(s['statusBar'], base.settings.statusBar),
      footer: bool(s['footer'], base.settings.footer),
      defaultEngine: finalEngines.some((e) => e.id === defaultEngine) ? defaultEngine : (finalEngines[0]?.id ?? 'google'),
      engines: finalEngines,
    },
    pages: finalPages,
  };
}
