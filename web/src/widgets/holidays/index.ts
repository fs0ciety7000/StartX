import { defineWidget } from '../../lib/widgets/types.ts';
import { bool, int, obj, oneOf } from '../../lib/config/sanitize.ts';
import View from './Holidays.svelte';
import Editor from './Editor.svelte';
import { COUNTRIES, type Country } from './api.ts';

export interface HolidaysConfig {
  country: Country;
  /** Rows listed after the next holiday. */
  count: number;
  /** Also list bank holidays (in Belgium: Good Friday, the day after Ascension, 26 December). */
  bank: boolean;
}

export default defineWidget<HolidaysConfig>({
  type: 'holidays',
  label: 'Jours fériés',
  description: 'Les prochains jours fériés et le compte à rebours (Nager.Date).',
  icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15h2',
  size: { w: 1, h: 2 },
  defaults: () => ({ country: 'BE', count: 5, bank: false }),
  sanitize: (raw) => {
    const o = obj(raw);
    return {
      country: oneOf(o['country'], Object.keys(COUNTRIES) as Country[], 'BE'),
      count: int(o['count'], 5, 1, 15),
      bank: bool(o['bank'], false),
    };
  },
  view: View,
  editor: Editor,
});
