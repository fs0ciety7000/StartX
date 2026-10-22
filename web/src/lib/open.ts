import { app } from './config/store.svelte.ts';

/** Open a URL honouring the "new tab" setting; Ctrl/Cmd/middle-click always opens a new tab. */
export function openUrl(url: string, forceNewTab = false): void {
  if (forceNewTab || app.config.settings.openInNewTab) window.open(url, '_blank', 'noopener');
  else window.location.assign(url);
}

export function linkTarget(): '_blank' | undefined {
  return app.config.settings.openInNewTab ? '_blank' : undefined;
}

/** Favicon through DuckDuckGo's icon service: no request to the site itself, cached by the browser. */
export function faviconFor(url: string, custom = ''): string {
  if (custom) return custom;
  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`;
  } catch {
    return '';
  }
}

/** Accent tokens a widget can pick; all exist in the three themes. */
export const ACCENTS = {
  accent: { label: 'Laiton', css: 'var(--accent)' },
  green: { label: 'Vert', css: 'var(--ansi-2)' },
  blue: { label: 'Bleu', css: 'var(--ansi-4)' },
  violet: { label: 'Violet', css: 'var(--ansi-5)' },
  teal: { label: 'Sarcelle', css: 'var(--ansi-6)' },
  amber: { label: 'Ambre', css: 'var(--ansi-3)' },
  red: { label: 'Rouge', css: 'var(--ansi-1)' },
} as const;
export type Accent = keyof typeof ACCENTS;
export const ACCENT_KEYS = Object.keys(ACCENTS) as Accent[];

export function relTime(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 60) return 'à l’instant';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} j`;
  return new Date(ts).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
}
