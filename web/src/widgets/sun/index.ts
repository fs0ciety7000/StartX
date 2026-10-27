import { defineWidget } from '../../lib/widgets/types.ts';
import { bool, obj } from '../../lib/config/sanitize.ts';
import { MONS, sanitizePlace, type Place } from '../../lib/geo.ts';
import View from './Sun.svelte';
import Editor from './Editor.svelte';

export interface SunConfig extends Place {
  moon: boolean;
}

export default defineWidget<SunConfig>({
  type: 'sun',
  label: 'Soleil et lune',
  description: 'Lever, coucher, durée du jour et phase de la lune, calculés localement.',
  icon: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  size: { w: 2, h: 2 },
  defaults: () => ({ ...MONS, moon: true }),
  sanitize: (raw) => {
    const o = obj(raw);
    return { ...sanitizePlace(o), moon: bool(o['moon'], true) };
  },
  view: View,
  editor: Editor,
});
