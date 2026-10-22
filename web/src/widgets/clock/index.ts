import { defineWidget } from '../../lib/widgets/types.ts';
import { bool, obj } from '../../lib/config/sanitize.ts';
import View from './Clock.svelte';
import Editor from './Editor.svelte';

export interface ClockConfig {
  greeting: boolean;
  date: boolean;
  seconds: boolean;
}

export default defineWidget<ClockConfig>({
  type: 'clock',
  label: 'Horloge',
  description: 'L’heure, la date et une salutation selon le moment de la journée.',
  icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  size: { w: 2, h: 1 },
  bare: true,
  plain: true,
  defaults: () => ({ greeting: true, date: true, seconds: false }),
  sanitize: (raw) => {
    const o = obj(raw);
    return { greeting: bool(o['greeting'], true), date: bool(o['date'], true), seconds: bool(o['seconds'], false) };
  },
  view: View,
  editor: Editor,
});
