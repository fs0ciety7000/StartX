import type { StartxConfig } from '../../lib/config/schema.ts';
import { hostOf } from '../../lib/config/sanitize.ts';

export interface Hit {
  name: string;
  url: string;
  group: string;
  page: string;
  score: number;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Bookmarks matching `q` across all pages, best first. Cheap enough to run on every keystroke. */
export function searchLinks(config: StartxConfig, q: string, limit = 6): Hit[] {
  const needle = fold(q.trim());
  if (!needle) return [];
  const hits: Hit[] = [];
  const seen = new Set<string>();
  for (const page of config.pages) {
    for (const w of page.widgets) {
      if (w.type !== 'links') continue;
      const links = (w.config['links'] ?? []) as { name: string; url: string }[];
      for (const l of links) {
        if (seen.has(l.url)) continue;
        const name = fold(l.name);
        const host = fold(hostOf(l.url));
        let score = 0;
        if (name === needle) score = 100;
        else if (name.startsWith(needle)) score = 80;
        else if (name.split(/[\s.\-_/]+/).some((p) => p.startsWith(needle))) score = 60;
        else if (host.startsWith(needle)) score = 50;
        else if (name.includes(needle)) score = 40;
        else if (host.includes(needle)) score = 25;
        else if (fold(w.title).startsWith(needle)) score = 10;
        if (score) {
          seen.add(l.url);
          hits.push({ name: l.name, url: l.url, group: w.title, page: page.name, score });
        }
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit);
}

/** "!gh svelte" or "svelte !gh" → { bang: 'gh', rest: 'svelte' }. */
export function parseBang(q: string): { bang: string; rest: string } | null {
  const m = q.match(/(?:^|\s)!(\S+)(?=\s|$)/);
  if (!m || m.index === undefined) return null;
  const rest = (q.slice(0, m.index) + q.slice(m.index + m[0].length)).trim();
  return { bang: (m[1] ?? '').toLowerCase(), rest };
}

/** Something that should be opened, not searched: a URL or a bare domain without spaces. */
export function asUrl(q: string): string | null {
  const s = q.trim();
  if (/\s/.test(s)) return null;
  if (/^https?:\/\/\S+$/i.test(s)) return s;
  if (/^localhost(:\d+)?(\/\S*)?$/i.test(s)) return `http://${s}`;
  if (/^[\w-]+(\.[\w-]+)*\.[a-z]{2,24}(:\d+)?(\/\S*)?$/i.test(s)) return `https://${s}`;
  return null;
}
