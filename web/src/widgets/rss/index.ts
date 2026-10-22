import { defineWidget } from '../../lib/widgets/types.ts';
import { arr, bool, int, obj, oneOf, safeUrl, str } from '../../lib/config/sanitize.ts';
import { ACCENT_KEYS, type Accent } from '../../lib/open.ts';
import View from './Rss.svelte';
import Editor from './Editor.svelte';

export interface Feed {
  url: string;
  name: string;
}

export interface RssConfig {
  feeds: Feed[];
  /** Items shown, all feeds merged. */
  limit: number;
  summary: boolean;
  /** Minutes between refreshes. */
  refresh: number;
  accent: Accent;
}

export default defineWidget<RssConfig>({
  type: 'rss',
  label: 'Flux RSS',
  description: 'Les derniers articles de plusieurs sites (Korben, Numerama, Wired…), fusionnés.',
  icon: 'M5 5a14 14 0 0114 14M5 11a8 8 0 018 8M6 19h.01',
  size: { w: 2, h: 3 },
  defaults: () => ({ feeds: [], limit: 20, summary: false, refresh: 30, accent: 'accent' }),
  sanitize: (raw) => {
    const o = obj(raw);
    const urls = new Set<string>();
    return {
      feeds: arr(o['feeds'])
        .map((x) => {
          const f = obj(x);
          const url = safeUrl(f['url']);
          if (!url || urls.has(url)) return null;
          urls.add(url);
          return { url, name: str(f['name'], '', 60) };
        })
        .filter((f): f is Feed => f !== null)
        .slice(0, 30),
      limit: int(o['limit'], 20, 3, 100),
      summary: bool(o['summary'], false),
      refresh: int(o['refresh'], 30, 5, 1440),
      accent: oneOf(o['accent'], ACCENT_KEYS, 'accent'),
    };
  },
  view: View,
  editor: Editor,
});
