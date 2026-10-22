import { defineWidget } from '../../lib/widgets/types.ts';
import { int, num, obj, oneOf, str } from '../../lib/config/sanitize.ts';
import View from './Weather.svelte';
import Editor from './Editor.svelte';

export interface WeatherConfig {
  city: string;
  country: string;
  lat: number;
  lon: number;
  units: 'metric' | 'imperial';
  /** Forecast days shown next to the current conditions (0 hides them). */
  days: number;
}

export default defineWidget<WeatherConfig>({
  type: 'weather',
  label: 'Météo',
  description: 'Conditions actuelles et prévisions (Open-Meteo, sans clé).',
  icon: 'M7 18h10a4 4 0 00.5-8A6 6 0 006 9.5 4.3 4.3 0 007 18z',
  size: { w: 2, h: 1 },
  bare: true,
  defaults: () => ({ city: 'Mons', country: 'Belgique', lat: 50.4542, lon: 3.9523, units: 'metric', days: 4 }),
  sanitize: (raw) => {
    const o = obj(raw);
    return {
      city: str(o['city'], 'Mons', 80),
      country: str(o['country'], '', 80),
      lat: num(o['lat'], 50.4542, -90, 90),
      lon: num(o['lon'], 3.9523, -180, 180),
      units: oneOf(o['units'], ['metric', 'imperial'] as const, 'metric'),
      days: int(o['days'], 4, 0, 7),
    };
  },
  view: View,
  editor: Editor,
});
