/*
 * Sun and moon, computed locally. Formulas from SunCalc (Vladimir Agafonkin, BSD-2-Clause,
 * https://github.com/mourner/suncalc), themselves from Astronomy Answers: accurate to about a
 * minute, which is all a startpage needs.
 */

const rad = Math.PI / 180;
const dayMs = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397; // obliquity of the Earth

const toJulian = (date: Date) => date.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (date: Date) => toJulian(date) - J2000;

const rightAscension = (l: number, b: number) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
const declination = (l: number, b: number) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
const altitude = (H: number, phi: number, dec: number) =>
  Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
const siderealTime = (d: number, lw: number) => rad * (280.16 + 360.9856235 * d) - lw;
const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d);

function eclipticLongitude(M: number): number {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + rad * 102.9372 + Math.PI;
}

function sunCoords(d: number) {
  const L = eclipticLongitude(solarMeanAnomaly(d));
  return { dec: declination(L, 0), ra: rightAscension(L, 0) };
}

/** Sun altitude above the horizon, in degrees. */
export function sunAltitude(date: Date, lat: number, lon: number): number {
  const d = toDays(date);
  const c = sunCoords(d);
  return altitude(siderealTime(d, rad * -lon) - c.ra, rad * lat, c.dec) / rad;
}

const J0 = 0.0009;
const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
const hourAngle = (h: number, phi: number, d: number) =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

export interface SunTimes {
  noon: Date;
  /** null during polar day or night. */
  sunrise: Date | null;
  sunset: Date | null;
  dawn: Date | null;
  dusk: Date | null;
  goldenHour: Date | null;
}

/** Times for the solar day containing `date` at the given place. */
export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const lw = rad * -lon;
  const phi = rad * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const Jnoon = solarTransitJ(ds, M, L);
  const pair = (h: number): [Date | null, Date | null] => {
    const w = hourAngle(h * rad, phi, dec);
    if (Number.isNaN(w)) return [null, null];
    const Jset = solarTransitJ(approxTransit(w, lw, n), M, L);
    return [fromJulian(Jnoon - (Jset - Jnoon)), fromJulian(Jset)];
  };
  const [sunrise, sunset] = pair(-0.833);
  const [dawn, dusk] = pair(-6);
  const [, goldenHour] = pair(6);
  return { noon: fromJulian(Jnoon), sunrise, sunset, dawn, dusk, goldenHour };
}

function moonCoords(d: number) {
  const L = rad * (218.316 + 13.176396 * d);
  const M = rad * (134.963 + 13.064993 * d);
  const F = rad * (93.272 + 13.22935 * d);
  const l = L + rad * 6.289 * Math.sin(M);
  const b = rad * 5.128 * Math.sin(F);
  return { ra: rightAscension(l, b), dec: declination(l, b), dist: 385001 - 20905 * Math.cos(M) };
}

export interface MoonState {
  /** 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  phase: number;
  /** Illuminated fraction, 0–1. */
  fraction: number;
}

export function moon(date: Date): MoonState {
  const d = toDays(date);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const sdist = 149598000;
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
  );
  return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI };
}

export function phaseName(p: number): string {
  if (p < 0.03 || p > 0.97) return 'Nouvelle lune';
  if (p < 0.22) return 'Premier croissant';
  if (p < 0.28) return 'Premier quartier';
  if (p < 0.47) return 'Gibbeuse croissante';
  if (p < 0.53) return 'Pleine lune';
  if (p < 0.72) return 'Gibbeuse décroissante';
  if (p < 0.78) return 'Dernier quartier';
  return 'Dernier croissant';
}

/**
 * Next time the phase reaches `target` (0.5 full, 0 new): scan in 6 h steps for the crossing,
 * then bisect to the minute.
 */
export function nextPhase(from: Date, target: 0 | 0.5): Date {
  // Distance to target along the cycle, in [0, 1): crosses from ~1 to ~0 at the target.
  const dist = (t: number) => (target - moon(new Date(t)).phase + 1) % 1;
  const step = 6 * 3600_000;
  let a = from.valueOf();
  let da = dist(a);
  for (let i = 0; i < 4 * 31; i++) {
    const b = a + step;
    const db = dist(b);
    if (db > da + 0.5) {
      let lo = a;
      let hi = b;
      while (hi - lo > 60_000) {
        const mid = (lo + hi) / 2;
        if (dist(mid) > da + 0.25) hi = mid;
        else lo = mid;
      }
      return new Date(hi);
    }
    a = b;
    da = db;
  }
  return new Date(a);
}
