/** Open-Meteo Air Quality (CAMS Europe): free, no key, CORS-enabled. Cached 30 min per place. */
import { arr, obj } from '../../lib/config/sanitize.ts';
import { readCache, writeCache, type Place } from '../../lib/geo.ts';

export const POLLENS = [
  // Indicative thresholds in grains/m³ (low, moderate, high), after the usual European scales.
  { key: 'alder_pollen', label: 'Aulne', levels: [10, 50, 100] },
  { key: 'birch_pollen', label: 'Bouleau', levels: [10, 50, 100] },
  { key: 'olive_pollen', label: 'Olivier', levels: [10, 50, 100] },
  { key: 'grass_pollen', label: 'Graminées', levels: [5, 20, 50] },
  { key: 'mugwort_pollen', label: 'Armoise', levels: [5, 15, 30] },
  { key: 'ragweed_pollen', label: 'Ambroisie', levels: [5, 15, 30] },
] as const;

export const POLLUTANTS = [
  { key: 'pm2_5', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'ozone', label: 'O₃' },
  { key: 'nitrogen_dioxide', label: 'NO₂' },
] as const;

export interface Air {
  aqi: number | null;
  values: Record<string, number | null>;
  /** Next 24 hourly AQI values, from the current hour. */
  hourly: { time: string; aqi: number | null }[];
}

const TTL = 30 * 60_000;
const key = (p: Place) => `startx:air:${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;

export const cachedAir = (p: Place) => readCache<Air>(key(p));

const val = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function fetchAir(p: Place): Promise<Air> {
  const hit = cachedAir(p);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const fields = ['european_aqi', ...POLLUTANTS.map((x) => x.key), ...POLLENS.map((x) => x.key)].join(',');
  const q = new URLSearchParams({
    latitude: String(p.lat),
    longitude: String(p.lon),
    current: fields,
    hourly: 'european_aqi',
    forecast_days: '2',
    timezone: 'auto',
  });
  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = obj(await res.json());
  const cur = obj(j['current']);
  const h = obj(j['hourly']);
  const times = arr(h['time']).map(String);
  const aqis = arr(h['european_aqi']);
  const start = Math.max(0, times.indexOf(String(cur['time'] ?? '')));
  const data: Air = {
    aqi: val(cur['european_aqi']),
    values: Object.fromEntries([...POLLUTANTS, ...POLLENS].map((x) => [x.key, val(cur[x.key])])),
    hourly: times.slice(start, start + 24).map((time, i) => ({ time, aqi: val(aqis[start + i]) })),
  };
  writeCache(key(p), data);
  return data;
}

/** European Air Quality Index bands (EEA). */
export function aqiBand(aqi: number): { label: string; color: string } {
  if (aqi <= 20) return { label: 'Bon', color: 'var(--ansi-2)' };
  if (aqi <= 40) return { label: 'Correct', color: 'var(--ansi-6)' };
  if (aqi <= 60) return { label: 'Moyen', color: 'var(--ansi-3)' };
  if (aqi <= 80) return { label: 'Médiocre', color: 'var(--ansi-9)' };
  if (aqi <= 100) return { label: 'Très médiocre', color: 'var(--ansi-1)' };
  return { label: 'Extrêmement médiocre', color: 'var(--ansi-5)' };
}

export function pollenLevel(v: number, levels: readonly [number, number, number]): { label: string; step: 0 | 1 | 2 | 3 } {
  if (v < levels[0]) return { label: 'Faible', step: 0 };
  if (v < levels[1]) return { label: 'Modéré', step: 1 };
  if (v < levels[2]) return { label: 'Élevé', step: 2 };
  return { label: 'Très élevé', step: 3 };
}
