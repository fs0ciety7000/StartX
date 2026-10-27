import { defineWidget } from '../../lib/widgets/types.ts';
import { bool, obj } from '../../lib/config/sanitize.ts';
import { MONS, sanitizePlace, type Place } from '../../lib/geo.ts';
import View from './Air.svelte';
import Editor from './Editor.svelte';

export interface AirConfig extends Place {
  pollen: boolean;
  /** 24 h forecast bars of the air quality index. */
  forecast: boolean;
}

export default defineWidget<AirConfig>({
  type: 'air',
  label: 'Qualité de l’air',
  description: 'Indice européen, particules, ozone et pollens (Open-Meteo, sans clé).',
  icon: 'M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h8',
  size: { w: 2, h: 2 },
  defaults: () => ({ ...MONS, pollen: true, forecast: true }),
  sanitize: (raw) => {
    const o = obj(raw);
    return { ...sanitizePlace(o), pollen: bool(o['pollen'], true), forecast: bool(o['forecast'], true) };
  },
  view: View,
  editor: Editor,
});
