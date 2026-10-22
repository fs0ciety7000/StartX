/**
 * The whole startpage is one JSON document. Everything the UI shows comes from it,
 * so it can be exported, imported, versioned in a repo, or shipped as the server default.
 *
 * Bump CONFIG_VERSION when the shape changes and add a step in migrate.ts.
 */

export const CONFIG_VERSION = 1;

export const THEMES = ['obsidian', 'basalt', 'travertine'] as const;
export type Theme = (typeof THEMES)[number];

export interface SearchEngine {
  id: string;
  name: string;
  /** `{q}` is replaced by the URL-encoded query. */
  url: string;
  /** Typed as `!bang` at the start of a query to use this engine once. */
  bang: string;
}

export interface Settings {
  theme: Theme;
  /** Greeting name; empty hides it. */
  name: string;
  openInNewTab: boolean;
  clock24h: boolean;
  /** Bottom tmux-style page bar. */
  statusBar: boolean;
  /** Engraved footer under the grid. */
  footer: boolean;
  defaultEngine: string;
  engines: SearchEngine[];
}

/** A widget instance: `type` picks the implementation in the registry, `config` is its own. */
export interface WidgetInstance<C = Record<string, unknown>> {
  id: string;
  type: string;
  title: string;
  /** Columns spanned in the page grid (clamped to the page's column count). */
  w: number;
  /** Row units spanned. */
  h: number;
  config: C;
}

export interface Page {
  id: string;
  name: string;
  /** Grid columns on wide screens; collapses on narrow ones. */
  columns: number;
  widgets: WidgetInstance[];
}

export interface StartxConfig {
  version: number;
  settings: Settings;
  activePage: string;
  pages: Page[];
}

export function uid(prefix = 'w'): string {
  const rnd = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${(rnd[0] ?? 0).toString(36)}${(rnd[1] ?? 0).toString(36)}`.slice(0, 14);
}

export function isTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v);
}
