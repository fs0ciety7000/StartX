/** Open-Meteo (free, no key, CORS-enabled). Responses cached 15 min per place. */
import type { WeatherConfig } from './index.ts';

export interface Weather {
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  code: number;
  isDay: boolean;
  daily: { date: string; code: number; max: number; min: number; rain: number }[];
}

const TTL = 15 * 60_000;
const key = (c: WeatherConfig) => `startx:weather:${c.lat.toFixed(3)},${c.lon.toFixed(3)},${c.units}`;

export function cachedWeather(c: WeatherConfig): { at: number; data: Weather } | null {
  try {
    const raw = localStorage.getItem(key(c));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchWeather(c: WeatherConfig, force = false): Promise<Weather> {
  const hit = cachedWeather(c);
  if (hit && !force && Date.now() - hit.at < TTL) return hit.data;
  const p = new URLSearchParams({
    latitude: String(c.lat),
    longitude: String(c.lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '8',
  });
  if (c.units === 'imperial') {
    p.set('temperature_unit', 'fahrenheit');
    p.set('wind_speed_unit', 'mph');
  }
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = await res.json();
  const d = j.daily;
  const data: Weather = {
    temp: j.current.temperature_2m,
    feels: j.current.apparent_temperature,
    humidity: j.current.relative_humidity_2m,
    wind: j.current.wind_speed_10m,
    code: j.current.weather_code,
    isDay: j.current.is_day === 1,
    daily: (d.time as string[]).map((date, i) => ({
      date,
      code: d.weather_code[i],
      max: d.temperature_2m_max[i],
      min: d.temperature_2m_min[i],
      rain: d.precipitation_probability_max[i] ?? 0,
    })),
  };
  try {
    localStorage.setItem(key(c), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* ignore */
  }
  return data;
}

export interface Place {
  name: string;
  country: string;
  admin: string;
  lat: number;
  lon: number;
}

export async function geocode(q: string): Promise<Place[]> {
  const p = new URLSearchParams({ name: q, count: '6', language: 'fr', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${p}`);
  if (!res.ok) throw new Error(`Géocodage ${res.status}`);
  const j = await res.json();
  return ((j.results ?? []) as Record<string, any>[]).map((r) => ({
    name: r['name'],
    country: r['country'] ?? '',
    admin: r['admin1'] ?? '',
    lat: r['latitude'],
    lon: r['longitude'],
  }));
}

export type Sky = 'clear' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

/** WMO weather interpretation codes → French label and icon family. */
export function describe(code: number): { label: string; sky: Sky } {
  if (code === 0) return { label: 'Ciel dégagé', sky: 'clear' };
  if (code === 1) return { label: 'Plutôt dégagé', sky: 'clear' };
  if (code === 2) return { label: 'Partiellement nuageux', sky: 'partly' };
  if (code === 3) return { label: 'Couvert', sky: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Brouillard', sky: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Bruine', sky: 'drizzle' };
  if (code >= 61 && code <= 67) return { label: code >= 65 ? 'Forte pluie' : 'Pluie', sky: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Neige', sky: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Averses', sky: 'rain' };
  if (code === 85 || code === 86) return { label: 'Averses de neige', sky: 'snow' };
  if (code >= 95) return { label: 'Orage', sky: 'storm' };
  return { label: '—', sky: 'cloud' };
}
