import { defineWidget } from '../../lib/widgets/types.ts';
import { obj, str } from '../../lib/config/sanitize.ts';
import View from './Notes.svelte';

export interface NotesConfig {
  text: string;
}

export default defineWidget<NotesConfig>({
  type: 'notes',
  label: 'Notes',
  description: 'Un bloc-notes, enregistré dans ce navigateur.',
  icon: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3',
  size: { w: 1, h: 3 },
  defaults: () => ({ text: '' }),
  sanitize: (raw) => ({ text: str(obj(raw)['text'], '', 20000) }),
  view: View,
});
