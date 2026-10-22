import { defineWidget } from '../../lib/widgets/types.ts';
import { arr, obj, oneOf, safeUrl, str } from '../../lib/config/sanitize.ts';
import { uid } from '../../lib/config/schema.ts';
import { ACCENT_KEYS, type Accent } from '../../lib/open.ts';
import View from './Links.svelte';
import Editor from './Editor.svelte';

export interface Bookmark {
  id: string;
  name: string;
  url: string;
  /** Custom icon URL; empty uses the site favicon. */
  icon: string;
}

export interface LinksConfig {
  accent: Accent;
  layout: 'list' | 'grid';
  links: Bookmark[];
}

export default defineWidget<LinksConfig>({
  type: 'links',
  label: 'Favoris',
  description: 'Un groupe de liens (Work, Perso, Code…) avec icônes.',
  icon: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  size: { w: 1, h: 3 },
  defaults: () => ({ accent: 'accent', layout: 'list', links: [] }),
  sanitize: (raw) => {
    const o = obj(raw);
    return {
      accent: oneOf(o['accent'], ACCENT_KEYS, 'accent'),
      layout: oneOf(o['layout'], ['list', 'grid'] as const, 'list'),
      links: arr(o['links'])
        .map((x) => {
          const l = obj(x);
          const url = safeUrl(l['url']);
          return url ? { id: str(l['id']) || uid('l'), name: str(l['name'], '', 80) || url, url, icon: safeUrl(l['icon']) } : null;
        })
        .filter((l): l is Bookmark => l !== null)
        .slice(0, 200),
    };
  },
  view: View,
  editor: Editor,
});
