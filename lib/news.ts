// News-Datenquelle. Standard: Mock-Daten (statisch, keyless). Ist der Vercel-
// Proxy konfiguriert (NEXT_PUBLIC_PROXY_BASE), wird der echte RSS-Aggregat-Feed
// geladen. Fällt der Proxy aus → Fallback auf Mock.

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  date: string; // ISO
}

const READ_KEY = 'airscore-news-read';

// Platzhalter-Meldungen, bis echte RSS-Quellen im Proxy konfiguriert sind.
export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'mock-1',
    title: 'Kurzzeitvermietung: Mehr Städte führen Registrierungspflicht ein',
    summary: 'Immer mehr Kommunen verlangen eine Registrierungsnummer für Airbnb & Co. Prüfe die Regeln deiner Stadt vor dem Start.',
    source: 'AirScore (Beispiel)',
    url: 'https://fynnkanters-ops.github.io/airscore/',
    date: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
  {
    id: 'mock-2',
    title: 'Mietpreisbremse verlängert – was das für Vermieter bedeutet',
    summary: 'In angespannten Wohnungsmärkten bleibt die Miethöhe bei Neuvermietung gedeckelt. Der Mietwert-Rechner zeigt betroffene Lagen an.',
    source: 'AirScore (Beispiel)',
    url: 'https://fynnkanters-ops.github.io/airscore/rechner',
    date: new Date(Date.now() - 5 * 864e5).toISOString(),
  },
  {
    id: 'mock-3',
    title: 'Bauzinsen seitwärts: 10-Jahres-Bindung um 3,8 %',
    summary: 'Die Konditionen für Baufinanzierungen bewegen sich kaum. Aktuelle Werte immer beim Kreditinstitut prüfen.',
    source: 'AirScore (Beispiel)',
    url: 'https://fynnkanters-ops.github.io/airscore/rechner',
    date: new Date(Date.now() - 9 * 864e5).toISOString(),
  },
];

export async function fetchNews(): Promise<NewsItem[]> {
  const base = process.env.NEXT_PUBLIC_PROXY_BASE;
  if (!base) return MOCK_NEWS;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/news`, { cache: 'no-store' });
    if (!res.ok) throw new Error('news proxy ' + res.status);
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.items;
    return (items && items.length ? items : MOCK_NEWS) as NewsItem[];
  } catch {
    return MOCK_NEWS;
  }
}

export function getLastReadAt(): number {
  if (typeof window === 'undefined') return 0;
  try { return Number(localStorage.getItem(READ_KEY) ?? 0); } catch { return 0; }
}

export function markAllRead(): void {
  try { localStorage.setItem(READ_KEY, String(Date.now())); } catch {}
}

export function countUnread(items: NewsItem[], lastReadAt: number): number {
  return items.filter((i) => new Date(i.date).getTime() > lastReadAt).length;
}
