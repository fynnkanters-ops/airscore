// Listing-Import: Link → Felder. Ruft den Vercel-Proxy (NEXT_PUBLIC_PROXY_BASE),
// der serverseitig OpenGraph/JSON-LD ausliest. Ohne Proxy/Fehler → null (Fallback
// auf manuelle Eingabe im UI). Kein hartes Scraping.

export interface ListingData {
  titel?: string;
  preis?: number;      // €
  flaeche?: number;    // m²
  zimmer?: number;
  plz?: string;
  baujahr?: number;
}

export function proxyConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_PROXY_BASE;
}

export async function importFromUrl(url: string): Promise<ListingData | null> {
  const base = process.env.NEXT_PUBLIC_PROXY_BASE;
  if (!base) return null;
  try {
    const res = await fetch(
      `${base.replace(/\/$/, '')}/api/listing?url=${encodeURIComponent(url)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || (data.error && !data.preis && !data.flaeche)) return null;
    return data as ListingData;
  } catch {
    return null;
  }
}
