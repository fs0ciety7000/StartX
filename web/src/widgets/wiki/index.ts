import { defineWidget } from '../../lib/widgets/types.ts';
import { bool, int, obj, oneOf } from '../../lib/config/sanitize.ts';
import View from './Wiki.svelte';
import Editor from './Editor.svelte';
import { LANGS, type Lang } from './api.ts';

export interface WikiConfig {
  lang: Lang;
  image: boolean;
  onthisday: boolean;
  mostread: boolean;
  /** Rows per list. */
  count: number;
}

export default defineWidget<WikiConfig>({
  type: 'wiki',
  label: 'Wikipédia du jour',
  description: 'Image du jour, éphémérides et articles les plus lus (API Wikimedia).',
  icon: 'M3 6l4.5 12L12 8l4.5 10L21 6M2 6h4M18 6h4M10 6h4',
  size: { w: 2, h: 3 },
  defaults: () => ({ lang: 'fr', image: true, onthisday: true, mostread: true, count: 8 }),
  sanitize: (raw) => {
    const o = obj(raw);
    return {
      lang: oneOf(o['lang'], Object.keys(LANGS) as Lang[], 'fr'),
      image: bool(o['image'], true),
      onthisday: bool(o['onthisday'], true),
      mostread: bool(o['mostread'], true),
      count: int(o['count'], 8, 3, 20),
    };
  },
  view: View,
  editor: Editor,
});
