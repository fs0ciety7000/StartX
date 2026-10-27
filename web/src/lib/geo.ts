/** A place picked by name (Open-Meteo geocoding, no key), shared by every location-based widget. */
import { num, obj, str } from './config/sanitize.ts';

export interface Place {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface GeoResult extends Place {
  admin: string;
}

export const MONS: Place = { city: 'Mons', country: 'Belgique', lat: 50.4542, lon: 3.9523 };

export function sanitizePlace(o: Record<string, unknown>, fallback: Place = MONS): Place {
  return {
    city: str(o['city'], fallback.city, 80),
    country: str(o['country'], fallback.country, 80),
    lat: num(o['lat'], fallback.lat, -90, 90),
    lon: num(o['lon'], fallback.lon, -180, 180),
  };
}

export async function geocode(q: string): Promise<GeoResult[]> {
  const p = new URLSearchParams({ name: q, count: '6', language: 'fr', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${p}`);
  if (!res.ok) throw new Error(`Géocodage ${res.status}`);
  const j = obj(await res.json());
  return (Array.isArray(j['results']) ? j['results'] : []).map((x) => {
    const r = obj(x);
    return {
      city: str(r['name']),
      country: str(r['country']),
      admin: str(r['admin1']),
      lat: num(r['latitude'], 0, -90, 90),
      lon: num(r['longitude'], 0, -180, 180),
    };
  });
}

/** Small JSON cache in localStorage: callers decide freshness from `at`. */
export function readCache<T>(key: string): { at: number; data: T } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota or private mode: the next load refetches */
  }
}
