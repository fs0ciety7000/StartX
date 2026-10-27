/**
 * Wikipedia's daily feed (REST, CORS-enabled, no key): picture of the day, "on this day",
 * most read articles and, for the languages that have one, today's featured article.
 * Untrusted text: HTML fragments are reduced to plain text, links must be https.
 */
import { arr, num, obj, str, type Obj } from '../../lib/config/sanitize.ts';
import { readCache, writeCache } from '../../lib/geo.ts';

export const LANGS = { fr: 'Français', en: 'English', nl: 'Nederlands', de: 'Deutsch', es: 'Español', it: 'Italiano' } as const;
export type Lang = keyof typeof LANGS;

export interface Article {
  title: string;
  description: string;
  extract: string;
  url: string;
  thumb: string;
  views: number;
}

export interface Event {
  year: number;
  text: string;
  url: string;
}

export interface Picture {
  thumb: string;
  caption: string;
  artist: string;
  url: string;
}

export interface Daily {
  date: string;
  featured: Article | null;
  picture: Picture | null;
  onthisday: Event[];
  mostread: Article[];
}

const TTL = 60 * 60_000;

const https = (v: unknown): string => {
  const s = str(v);
  return /^https:\/\//.test(s) ? s : '';
};

function text(html: unknown): string {
  const s = str(html, '', 5000);
  if (!s.includes('<')) return s.trim();
  // DOMParser builds an inert document: nothing in it runs or loads.
  return (new DOMParser().parseFromString(s, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function article(raw: unknown): Article | null {
  const o = obj(raw);
  const url = https(obj(obj(o['content_urls'])['desktop'])['page']);
  const title = str(o['normalizedtitle'] ?? o['title'], '', 300);
  if (!url || !title) return null;
  return {
    title,
    description: str(o['description'], '', 300),
    extract: str(o['extract'], '', 1200),
    url,
    thumb: https(obj(o['thumbnail'])['source']),
    views: num(o['views'], 0, 0, 1e10),
  };
}

export async function fetchDaily(lang: Lang, day = new Date()): Promise<Daily> {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, '0');
  const d = String(day.getDate()).padStart(2, '0');
  const key = `startx:wiki:${lang}:${y}-${m}-${d}`;
  const hit = readCache<Daily>(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`);
  if (!res.ok) throw new Error(`Wikipédia ${res.status}`);
  const j = obj(await res.json());

  const img = obj(j['image']);
  const picture: Picture | null = https(obj(img['thumbnail'])['source'])
    ? {
        thumb: https(obj(img['thumbnail'])['source']),
        caption: text(obj(img['description'])['html'] ?? obj(img['description'])['text']),
        artist: text(obj(img['artist'])['text'] ?? obj(img['artist'])['html']),
        url: https(img['file_page']),
      }
    : null;

  const onthisday = arr(j['onthisday'])
    .map((x): Event | null => {
      const o = obj(x);
      const page = arr(o['pages'])
        .map(article)
        .find((a) => a !== null);
      const t = str(o['text'], '', 600).trim();
      return t ? { year: num(o['year'], 0, -10000, 3000), text: t, url: page?.url ?? '' } : null;
    })
    .filter((e): e is Event => e !== null)
    .sort((a, b) => b.year - a.year);

  const urls = new Set<string>();
  const mostread = arr(obj(j['mostread'])['articles'])
    .map(article)
    .filter((a): a is Article => a !== null && !urls.has(a.url) && !!urls.add(a.url));

  const data: Daily = { date: `${y}-${m}-${d}`, featured: article(j['tfa'] as Obj | undefined), picture, onthisday, mostread };
  writeCache(key, data);
  return data;
}
