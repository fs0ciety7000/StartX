/** Client for the Go server's /api/feed: fetching, parsing and feed discovery happen server-side. */

export interface FeedItem {
  title: string;
  link: string;
  /** ISO date, or empty when the feed has none. */
  date: string;
  summary: string;
}

export interface FeedData {
  /** The feed URL actually read (differs from the input when a site page was given). */
  url: string;
  title: string;
  site: string;
  items: FeedItem[];
}

const CACHE = 'startx:feed:';

interface Cached {
  at: number;
  data: FeedData;
}

export function cached(url: string): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE + url);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

export async function fetchFeed(url: string, signal?: AbortSignal): Promise<FeedData> {
  const res = await fetch(`/api/feed?url=${encodeURIComponent(url)}`, { signal });
  const body = (await res.json().catch(() => ({}))) as Partial<FeedData> & { error?: string };
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  const data = body as FeedData;
  try {
    localStorage.setItem(CACHE + url, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota: the next load just refetches */
  }
  return data;
}
