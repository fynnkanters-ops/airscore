import { haversineM } from './utils';
import type { POI, POIData } from './types';

// Mehrere Endpunkte: wird der erste langsam/überlastet (504), wird der nächste
// versucht. Reihenfolge = Priorität.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const CLIENT_TIMEOUT_MS = 25000;

// `nwr` = node+way+relation in einer Zeile → halbiert die Anzahl der Statements
// gegenüber getrennten node/way-Zeilen und entlastet Overpass spürbar.
// Radien bewusst kleiner gehalten (Airport 35 km statt 60 km etc.).
function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:25];
(
  nwr["railway"~"station|halt"](around:3000,${lat},${lng});
  nwr["shop"="supermarket"](around:1500,${lat},${lng});
  nwr["amenity"~"restaurant|fast_food"](around:1000,${lat},${lng});
  nwr["amenity"="cafe"](around:1000,${lat},${lng});
  nwr["leisure"="fitness_centre"](around:2000,${lat},${lng});
  nwr["amenity"~"hospital|clinic"](around:8000,${lat},${lng});
  nwr["healthcare"~"rehabilitation|hospital"](around:8000,${lat},${lng});
  nwr["amenity"~"university|college"](around:6000,${lat},${lng});
  nwr["tourism"~"attraction|museum|gallery|viewpoint|theme_park"](around:5000,${lat},${lng});
  nwr["leisure"~"spa|water_park"](around:12000,${lat},${lng});
  nwr["natural"="hot_spring"](around:10000,${lat},${lng});
  nwr["aeroway"="aerodrome"](around:35000,${lat},${lng});
  nwr["amenity"="parking"](around:400,${lat},${lng});
  nwr["amenity"~"theatre|music_venue|events_centre|conference_centre"](around:8000,${lat},${lng});
  nwr["leisure"~"stadium|arena"](around:12000,${lat},${lng});
  nwr["leisure"="park"](around:2000,${lat},${lng});
  node["highway"="motorway_junction"](around:15000,${lat},${lng});
);
out center;`;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function elementLatLng(el: OverpassElement): { lat: number; lng: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

function toPOI(el: OverpassElement, centerLat: number, centerLng: number, type: string): POI | null {
  const pos = elementLatLng(el);
  if (!pos) return null;
  const name = el.tags?.name ?? el.tags?.['name:de'] ?? type;
  return {
    id: `${el.type}-${el.id}`,
    type,
    name,
    distanceM: Math.round(haversineM(centerLat, centerLng, pos.lat, pos.lng)),
    lat: pos.lat,
    lng: pos.lng,
  };
}

function sortByDist(pois: POI[]): POI[] {
  return pois.sort((a, b) => a.distanceM - b.distanceM);
}

export function emptyPOIData(): POIData {
  return {
    stations: [], supermarkets: [], restaurants: [], cafes: [], clinics: [],
    universities: [], tourism: [], spas: [], airports: [], motorways: [],
    parkings: [], eventVenues: [], parks: [],
  };
}

// Ein Endpunkt-Versuch mit hartem Client-Timeout (AbortController), damit ein
// hängender Server nicht ewig blockiert. `signal` erlaubt das Abbrechen, sobald
// ein anderer Endpunkt im Rennen bereits gewonnen hat.
async function tryEndpoint(
  url: string,
  query: string,
  external: AbortSignal
): Promise<OverpassElement[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  external.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('Overpass Fehler: ' + res.status);
    const data = await res.json();
    return data.elements ?? [];
  } finally {
    clearTimeout(timer);
    external.removeEventListener('abort', onAbort);
  }
}

export async function fetchPOIs(lat: number, lng: number): Promise<POIData> {
  const query = buildQuery(lat, lng);

  // Alle Endpunkte parallel anfragen und den ERSTEN erfolgreichen nehmen.
  // So bestimmt der schnellste gesunde Server die Wartezeit (~15s), nicht die
  // Summe aller Timeouts. Sobald einer gewinnt, werden die anderen abgebrochen.
  const winner = new AbortController();
  let elements: OverpassElement[];
  try {
    elements = await Promise.any(
      OVERPASS_ENDPOINTS.map((url) => tryEndpoint(url, query, winner.signal))
    );
    winner.abort(); // übrige Requests höflich beenden
  } catch {
    throw new Error('Standortdaten (OpenStreetMap) momentan nicht erreichbar.');
  }

  const stations: POI[] = [];
  const supermarkets: POI[] = [];
  const restaurants: POI[] = [];
  const cafes: POI[] = [];
  const clinics: POI[] = [];
  const universities: POI[] = [];
  const tourism: POI[] = [];
  const spas: POI[] = [];
  const airports: POI[] = [];
  const motorways: POI[] = [];
  const parkings: POI[] = [];
  const eventVenues: POI[] = [];
  const parks: POI[] = [];

  for (const el of elements) {
    const t = el.tags ?? {};
    const poi = (type: string) => toPOI(el, lat, lng, type);

    if (t.railway === 'station' || t.railway === 'halt') {
      const p = poi('Bahnhof'); if (p) stations.push(p);
    } else if (t.shop === 'supermarket') {
      const p = poi('Supermarkt'); if (p) supermarkets.push(p);
    } else if (t.amenity === 'restaurant' || t.amenity === 'fast_food') {
      const p = poi('Restaurant'); if (p) restaurants.push(p);
    } else if (t.amenity === 'cafe') {
      const p = poi('Café'); if (p) cafes.push(p);
    } else if (
      t.amenity === 'hospital' || t.amenity === 'clinic' ||
      t.healthcare === 'rehabilitation' || t.healthcare === 'hospital'
    ) {
      const p = poi(t.healthcare === 'rehabilitation' ? 'Reha-Klinik' : 'Klinik / Krankenhaus');
      if (p) clinics.push(p);
    } else if (t.amenity === 'university' || t.amenity === 'college') {
      const p = poi(t.amenity === 'university' ? 'Universität' : 'Hochschule');
      if (p) universities.push(p);
    } else if (t.tourism) {
      const p = poi(t.tourism === 'museum' ? 'Museum' : 'Sehenswürdigkeit');
      if (p) tourism.push(p);
    } else if (t.leisure === 'spa' || t.leisure === 'water_park' || t.natural === 'hot_spring') {
      const p = poi(t.leisure === 'water_park' ? 'Wasserpark / Therme' : 'Therme / Spa');
      if (p) spas.push(p);
    } else if (t.aeroway === 'aerodrome') {
      const p = poi('Flughafen'); if (p) airports.push(p);
    } else if (t.highway === 'motorway_junction') {
      const p = poi('Autobahn-Auffahrt'); if (p) motorways.push(p);
    } else if (t.amenity === 'parking') {
      const p = poi('Parkplatz'); if (p) parkings.push(p);
    } else if (
      t.amenity === 'theatre' || t.amenity === 'music_venue' ||
      t.amenity === 'events_centre' || t.amenity === 'conference_centre' ||
      t.leisure === 'stadium' || t.leisure === 'arena'
    ) {
      const p = poi(t.leisure === 'stadium' ? 'Stadion' : 'Veranstaltungsort');
      if (p) eventVenues.push(p);
    } else if (t.leisure === 'park') {
      const p = poi('Park / Kurpark'); if (p) parks.push(p);
    }
  }

  return {
    stations: sortByDist(stations),
    supermarkets: sortByDist(supermarkets),
    restaurants: sortByDist(restaurants),
    cafes: sortByDist(cafes),
    clinics: sortByDist(clinics),
    universities: sortByDist(universities),
    tourism: sortByDist(tourism),
    spas: sortByDist(spas),
    airports: sortByDist(airports),
    motorways: sortByDist(motorways),
    parkings: sortByDist(parkings),
    eventVenues: sortByDist(eventVenues),
    parks: sortByDist(parks),
  };
}
