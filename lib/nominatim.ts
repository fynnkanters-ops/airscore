import type { GeoLocation, NominatimResult, MatchPrecision } from './types';

const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'AirScore/1.0 (contact@airscore.app)' };

// --- Abkürzungen normalisieren ---------------------------------------------
// Nominatim versteht "Str." mal so, mal so. Wir normalisieren vorab, damit die
// Suche deterministisch ist.
const ABBREVIATIONS: [RegExp, string][] = [
  [/\bstr\.?\b/gi, 'straße'],
  [/\bpl\.?\b/gi, 'platz'],
  [/\ballee\b/gi, 'allee'],
  [/\bweg\b/gi, 'weg'],
  [/\bgs\.?\b/gi, 'gasse'],
];

export function normalizeQuery(raw: string): string {
  let q = raw.trim();
  for (const [pattern, replacement] of ABBREVIATIONS) {
    q = q.replace(pattern, replacement);
  }
  return q.replace(/\s+/g, ' ');
}

// --- Query in Bestandteile zerlegen ----------------------------------------
// Erkennt "Straße Hausnr, PLZ Stadt" bzw. "Straße Hausnr, Stadt".
export interface ParsedAddress {
  street?: string;       // inkl. Hausnummer (Nominatim akzeptiert das in street=)
  city?: string;
  postalcode?: string;
  hasHouseNumber: boolean;
}

export function parseAddress(raw: string): ParsedAddress {
  const q = normalizeQuery(raw);
  const parts = q.split(',').map((p) => p.trim()).filter(Boolean);

  // Hausnummer = Zahl (optional mit Buchstabe) irgendwo im ersten Teil
  const hasHouseNumber = parts.length > 0 && /\d+\s*[a-z]?/i.test(parts[0]) &&
    /[a-zäöüß]/i.test(parts[0]); // muss auch Buchstaben haben (=Straßenname)

  if (parts.length === 1) {
    // Nur ein Teil: könnte Stadt ODER Straße sein
    return { city: parts[0], hasHouseNumber: false };
  }

  const street = parts[0];
  const rest = parts.slice(1).join(' ');

  // PLZ aus dem Rest extrahieren (4–5 Ziffern, DE/AT=5, CH=4)
  const plzMatch = rest.match(/\b(\d{4,5})\b/);
  const postalcode = plzMatch ? plzMatch[1] : undefined;
  const city = rest.replace(/\b\d{4,5}\b/, '').trim() || undefined;

  return { street, city, postalcode, hasHouseNumber };
}

// --- Präzision eines Treffers bestimmen ------------------------------------
export function precisionOf(r: NominatimResult): MatchPrecision {
  if (r.address.house_number) return 'exact';
  if (r.address.road || r.addresstype === 'road') return 'street';
  if (r.addresstype === 'city' || r.addresstype === 'town' ||
      r.addresstype === 'village' || r.addresstype === 'municipality') return 'city';
  return 'area';
}

const PRECISION_RANK: Record<MatchPrecision, number> = {
  exact: 3, street: 2, city: 1, area: 0,
};

// --- Ergebnisse sinnvoll sortieren -----------------------------------------
// Wenn der Nutzer eine Hausnummer getippt hat, wollen wir exakte Treffer oben.
function rankResults(results: NominatimResult[], wantHouseNumber: boolean): NominatimResult[] {
  return [...results].sort((a, b) => {
    if (wantHouseNumber) {
      const diff = PRECISION_RANK[precisionOf(b)] - PRECISION_RANK[precisionOf(a)];
      if (diff !== 0) return diff;
    }
    return (b.importance ?? 0) - (a.importance ?? 0);
  });
}

async function fetchNominatim(qs: string): Promise<NominatimResult[]> {
  const res = await fetch(`${BASE}/search?${qs}`, { headers: HEADERS });
  if (!res.ok) throw new Error('Nominatim Fehler: ' + res.status);
  return res.json();
}

const COMMON_PARAMS = 'format=json&addressdetails=1&limit=6&countrycodes=de,at,ch&dedupe=1';

// --- Hauptsuche: strukturiert, mit Freitext-Fallback ------------------------
export async function searchAddress(query: string): Promise<NominatimResult[]> {
  const parsed = parseAddress(query);

  // 1) Wenn Straße + Stadt/PLZ erkannt → strukturierte Suche (präzise).
  if (parsed.street && (parsed.city || parsed.postalcode)) {
    const params = new URLSearchParams();
    params.set('street', parsed.street);
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.postalcode) params.set('postalcode', parsed.postalcode);
    const structured = await fetchNominatim(params.toString() + '&' + COMMON_PARAMS);

    if (structured.length > 0) {
      return rankResults(structured, parsed.hasHouseNumber);
    }
    // Kein Treffer strukturiert → Fallback auf Freitext (z.B. Tippfehler PLZ)
  }

  // 2) Freitext-Suche (für unvollständige Eingaben / reine Städte).
  const free = await fetchNominatim(
    `q=${encodeURIComponent(normalizeQuery(query))}&` + COMMON_PARAMS
  );
  return rankResults(free, parsed.hasHouseNumber);
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  const url = `${BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  return res.json();
}

export function nominatimToGeoLocation(r: NominatimResult): GeoLocation {
  const a = r.address;
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '',
    state: a.state ?? '',
    country: a.country ?? '',
    addressNorm: r.display_name,
    displayName: r.display_name.split(',').slice(0, 3).join(',').trim(),
  };
}

// Hübsches Label für Autocomplete: zeigt Straße+Nr, PLZ, Stadt klar an.
export function shortLabel(r: NominatimResult): string {
  const a = r.address;
  const line1 = [a.road, a.house_number].filter(Boolean).join(' ');
  const line2 = [a.postcode, a.city ?? a.town ?? a.village ?? a.municipality].filter(Boolean).join(' ');
  const label = [line1, line2].filter(Boolean).join(', ');
  return label || r.display_name.split(',').slice(0, 3).join(',').trim();
}

export const PRECISION_LABELS: Record<MatchPrecision, { text: string; color: string }> = {
  exact: { text: 'Genaue Adresse', color: '#16a34a' },
  street: { text: 'Straße', color: '#0369a1' },
  city: { text: 'Stadt', color: '#d97706' },
  area: { text: 'Region', color: '#94a3b8' },
};
