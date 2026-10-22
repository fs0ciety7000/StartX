import { defineWidget } from '../../lib/widgets/types.ts';
import { bool, obj, str } from '../../lib/config/sanitize.ts';
import View from './Search.svelte';
import Editor from './Editor.svelte';

export interface SearchConfig {
  /** Engine id; empty follows the global default. */
  engine: string;
  /** Suggest bookmarks from every page while typing. */
  launcher: boolean;
}

export default defineWidget<SearchConfig>({
  type: 'search',
  label: 'Recherche',
  description: 'Recherche web avec raccourcis !bang et lanceur de favoris.',
  icon: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  size: { w: 3, h: 1 },
  bare: true,
  plain: true,
  defaults: () => ({ engine: '', launcher: true }),
  sanitize: (raw) => {
    const o = obj(raw);
    return { engine: str(o['engine'], '', 40), launcher: bool(o['launcher'], true) };
  },
  view: View,
  editor: Editor,
});
