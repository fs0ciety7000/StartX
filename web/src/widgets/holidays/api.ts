/** Nager.Date (free, no key, CORS-enabled): public holidays per country and year, cached a week. */
import { arr, obj, str } from '../../lib/config/sanitize.ts';
import { readCache, writeCache } from '../../lib/geo.ts';

export const COUNTRIES = {
  BE: 'Belgique',
  FR: 'France',
  LU: 'Luxembourg',
  NL: 'Pays-Bas',
  DE: 'Allemagne',
  CH: 'Suisse',
  ES: 'Espagne',
  IT: 'Italie',
  PT: 'Portugal',
  GB: 'Royaume-Uni',
  IE: 'Irlande',
  AT: 'Autriche',
  US: 'États-Unis',
  CA: 'Canada',
} as const;
export type Country = keyof typeof COUNTRIES;

// Nager names Belgian holidays in Dutch (localName) and English: French names, keyed on the English one.
const FR: Record<string, string> = {
  "New Year's Day": 'Jour de l’an',
  Epiphany: 'Épiphanie',
  'Good Friday': 'Vendredi saint',
  'Easter Sunday': 'Pâques',
  'Easter Monday': 'Lundi de Pâques',
  'Labour Day': 'Fête du Travail',
  'Labor Day': 'Fête du Travail',
  'May Day': 'Fête du Travail',
  'Victory in Europe Day': 'Victoire 1945',
  'Europe Day': 'Journée de l’Europe',
  'Ascension Day': 'Ascension',
  'Day after Ascension Day': 'Lendemain de l’Ascension',
  'Whit Sunday': 'Pentecôte',
  Pentecost: 'Pentecôte',
  'Whit Monday': 'Lundi de Pentecôte',
  'Corpus Christi': 'Fête-Dieu',
  'Belgian National Day': 'Fête nationale',
  'National Day': 'Fête nationale',
  'Bastille Day': 'Fête nationale',
  'Swiss National Day': 'Fête nationale',
  'German Unity Day': 'Jour de l’unité allemande',
  "King's Day": 'Fête du Roi',
  'Liberation Day': 'Fête de la Libération',
  'Assumption Day': 'Assomption',
  'Assumption of Mary': 'Assomption',
  "All Saints' Day": 'Toussaint',
  'Armistice Day': 'Armistice',
  'Christmas Eve': 'Veille de Noël',
  'Christmas Day': 'Noël',
  "St. Stephen's Day": 'Saint-Étienne',
  'Boxing Day': 'Lendemain de Noël',
  "New Year's Eve": 'Saint-Sylvestre',
};

export interface Holiday {
  date: string; // AAAA-MM-JJ
  name: string;
  /** False for bank-only days. */
  public: boolean;
  /** Regional holiday (Nager's `global: false`). */
  regional: boolean;
}

const TTL = 7 * 86_400_000;

async function year(country: Country, y: number): Promise<Holiday[]> {
  const key = `startx:holidays:${country}:${y}`;
  const hit = readCache<Holiday[]>(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${country}`);
  if (!res.ok) throw new Error(`Nager.Date ${res.status}`);
  // French-speaking countries get Nager's local name; elsewhere, the French translation or the English name.
  const localFr = country === 'FR' || country === 'LU' || country === 'CH';
  const data = arr(await res.json()).map((x): Holiday => {
    const o = obj(x);
    const en = str(o['name'], '', 120);
    return {
      date: str(o['date'], '', 10),
      name: FR[en] ?? (localFr ? str(o['localName'], en, 120) : en),
      public: arr(o['types']).includes('Public'),
      regional: o['global'] === false,
    };
  });
  writeCache(key, data);
  return data;
}

/** Holidays from today on, this year and next. */
export async function upcoming(country: Country): Promise<Holiday[]> {
  const now = new Date();
  const [a, b] = await Promise.all([year(country, now.getFullYear()), year(country, now.getFullYear() + 1)]);
  const today = isoDay(now);
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date) && h.date >= today && !seen.has(h.date + h.name) && !!seen.add(h.date + h.name))
    .sort((x, y) => x.date.localeCompare(y.date));
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days between today and an AAAA-MM-JJ date (local calendar, DST-proof). */
export function daysUntil(date: string, now = new Date()): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000);
}
