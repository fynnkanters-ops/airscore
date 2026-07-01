import type { AnalysisProvider } from './provider';
import type { AnalysisResult, AIAnalysis, POIData, Recommendation } from '../types';
import { formatDist } from '../utils';
import { cityTypeLabel } from '../citydata';

/**
 * Regelbasierte Berichts-Engine — läuft komplett im Browser, ohne API-Key.
 * Erzeugt aus Scores, POIs, Stadttyp und Finanzdaten denselben AIAnalysis-Output,
 * den sonst die KI liefern würde. Deterministisch, sofort, kostenlos.
 *
 * Erweitern: Die Textbausteine unten sind bewusst in kleine Hilfsfunktionen
 * aufgeteilt. Neue Zielgruppen / Empfehlungen / Rechtshinweise hier ergänzen.
 */

// --- Zielgruppen-Erkennung -------------------------------------------------
interface DemandSignal {
  group: string;
  reason: string;
  strength: number; // höher = relevanter
}

function detectTargetGroups(r: AnalysisResult): DemandSignal[] {
  const { pois, cityInfo, location } = r;
  const signals: DemandSignal[] = [];
  const near = (list: POIData[keyof POIData], maxM: number) =>
    list[0] && list[0].distanceM <= maxM ? list[0] : null;

  const spa = near(pois.spas, 12000);
  if (spa) signals.push({
    group: 'Kur- & Wellnessgäste',
    reason: `Therme/Spa „${spa.name}" in ${formatDist(spa.distanceM)} Entfernung`,
    strength: 9,
  });

  const clinic = near(pois.clinics, 8000);
  if (clinic) signals.push({
    group: 'Reha-Patienten, Klinikbesucher & Angehörige',
    reason: `${clinic.name} in ${formatDist(clinic.distanceM)} – oft mehrwöchige Aufenthalte`,
    strength: 8,
  });

  const uni = near(pois.universities, 8000);
  if (uni) signals.push({
    group: 'Studenten & Eltern von Studenten',
    reason: `${uni.name} in ${formatDist(uni.distanceM)} – Semesterstart, Prüfungen, Besuche`,
    strength: 6,
  });

  const event = near(pois.eventVenues, 15000);
  if (event) signals.push({
    group: 'Event- & Veranstaltungsbesucher',
    reason: `${event.name} in ${formatDist(event.distanceM)} – Konzerte, Messen, Sport`,
    strength: 6,
  });

  const station = near(pois.stations, 1500);
  if (station && (cityInfo.type === 'grossstadt' || cityInfo.type === 'mittelstadt')) {
    signals.push({
      group: 'Geschäftsreisende & Pendler',
      reason: `Bahnhof „${station.name}" in ${formatDist(station.distanceM)} – gute Anbindung`,
      strength: 7,
    });
  }

  if (cityInfo.type === 'kurort' || cityInfo.type === 'tourismusort' || pois.tourism.length >= 2) {
    signals.push({
      group: 'Touristen & Wochenendgäste',
      reason: `${cityTypeLabel(cityInfo.type)} mit ${pois.tourism.length} Sehenswürdigkeit(en) in der Nähe`,
      strength: cityInfo.type === 'tourismusort' ? 8 : 6,
    });
  }

  const motorway = near(pois.motorways, 15000);
  if (motorway && r.input.hasParking) {
    signals.push({
      group: 'Monteure & Handwerker',
      reason: `Autobahn in ${formatDist(motorway.distanceM)} + Parkplatz – ideal für Langzeit-Wochenbucher`,
      strength: 5,
    });
  }

  const airport = near(pois.airports, 35000);
  if (airport) signals.push({
    group: 'Flugreisende & Crew',
    reason: `Flughafen „${airport.name}" in ${formatDist(airport.distanceM)}`,
    strength: 4,
  });

  // Fallback, falls gar nichts erkannt wurde
  if (signals.length === 0) {
    signals.push({
      group: 'Durchreisende & Kurzbesucher',
      reason: `Allgemeine Nachfrage in ${location.city || 'der Region'}`,
      strength: 2,
    });
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

// --- Ausstattungs-Empfehlungen nach Zielgruppe -----------------------------
const EQUIPMENT_BY_GROUP: Record<string, string[]> = {
  'Kur- & Wellnessgäste': ['Bequemes Boxspringbett', 'Verdunklung & ruhige Lage', 'Voll ausgestattete Küche', 'Kurtaxe-Abwicklung erklären', 'Leseecke / Entspannungsbereich'],
  'Reha-Patienten, Klinikbesucher & Angehörige': ['Barrierearmer Zugang', 'Langzeit-/Wochenpreise', 'Waschmaschine', 'Ruhige Lage', 'Parkplatz'],
  'Studenten & Eltern von Studenten': ['Schnelles WLAN', 'Schreibtisch / Arbeitsplatz', 'Gute ÖPNV-Anbindung', 'Flexible Aufenthaltsdauer', 'Küche zum Selbstkochen'],
  'Event- & Veranstaltungsbesucher': ['Self-Check-in (späte Anreise)', 'Mehrere Schlafplätze', 'Gute Anbindung zum Venue', 'Schließfach/Garderobe'],
  'Geschäftsreisende & Pendler': ['Schnelles WLAN', 'Schreibtisch', 'Kaffeemaschine', 'Self-Check-in', 'Rechnung/Beleg möglich', 'Bügeleisen'],
  'Touristen & Wochenendgäste': ['Stilvolle Einrichtung', 'Gute Fotos im Inserat', 'Lokale Tipps / Gästemappe', 'Kaffee & Willkommensgruß', 'Nähe zu Attraktionen betonen'],
  'Monteure & Handwerker': ['Getrennte Einzelbetten', 'Waschmaschine', 'Robuste, pflegeleichte Möbel', 'Große Küche', 'Parkplatz für Transporter', 'Günstiger Wochenpreis'],
  'Flugreisende & Crew': ['Self-Check-in 24/7', 'Verdunklung für Schichtschlaf', 'Schneller Transfer-Hinweis', 'Gepäckablage'],
  'Durchreisende & Kurzbesucher': ['Self-Check-in', 'Saubere Basics', 'Parkmöglichkeit', 'Klare Anfahrtsbeschreibung'],
};

// --- Textbausteine ---------------------------------------------------------
function buildLocationText(r: AnalysisResult): string {
  const { pois } = r;
  const parts: string[] = [];
  if (pois.stations[0]) parts.push(`Der nächste Bahnhof („${pois.stations[0].name}") liegt ${formatDist(pois.stations[0].distanceM)} entfernt`);
  if (pois.supermarkets[0]) parts.push(`ein Supermarkt ist in ${formatDist(pois.supermarkets[0].distanceM)} erreichbar`);
  const dining = [...pois.restaurants, ...pois.cafes].filter((p) => p.distanceM < 1000).length;
  if (dining > 0) parts.push(`${dining} Restaurant(s)/Café(s) befinden sich im Umkreis von 1 km`);
  if (pois.motorways[0]) parts.push(`die nächste Autobahnauffahrt ist ${formatDist(pois.motorways[0].distanceM)} entfernt`);
  if (pois.airports[0]) parts.push(`der Flughafen „${pois.airports[0].name}" liegt ${formatDist(pois.airports[0].distanceM)} weg`);
  if (r.input.hasParking || pois.parkings.length > 0) parts.push('Parkmöglichkeiten sind vorhanden');

  if (parts.length === 0) return 'Zur Lage liegen keine detaillierten Standortdaten vor. Bitte vor Ort prüfen, wie gut ÖPNV, Einkauf und Anbindung erreichbar sind.';
  return parts.join('. ').replace(/^./, (c) => c.toUpperCase()) + '.';
}

function buildDemandText(signals: DemandSignal[]): string {
  const top = signals.slice(0, 3);
  const intro = top.length > 1
    ? 'Mehrere Nachfragequellen sprechen für die Lage: '
    : 'Die Nachfrage stützt sich vor allem auf: ';
  return intro + top.map((s) => `${s.group} (${s.reason})`).join('; ') + '.';
}

function buildMarketGap(r: AnalysisResult): string {
  const features: string[] = [];
  if (r.input.hasParking) features.push('eigenem Parkplatz');
  if (r.input.hasBalcony) features.push('Balkon/Terrasse');
  features.push('Self-Check-in', 'schnellem WLAN', 'Arbeitsplatz');
  const base = `In ${cityTypeLabel(r.cityInfo.type)}-Lagen sind moderne, voll ausgestattete Einheiten mit ${features.join(', ')} oft rar — viele Wettbewerber sind ältere Ferienwohnungen ohne Automatisierung.`;
  const ratioHint = r.finance.revenueToRentRatio && r.finance.revenueToRentRatio >= 2
    ? ' Das Preis-/Umsatzverhältnis ist solide, was Spielraum für eine professionelle Positionierung lässt.'
    : ' Achte auf scharfe Kalkulation, da der Markt preissensibel sein kann.';
  return base + ratioHint;
}

function buildAutomationText(r: AnalysisResult): string {
  const isOffice = r.input.objectType === 'buero';
  const lock = isOffice
    ? 'Bei Gewerbeflächen ist eine Nutzungsänderung zu prüfen, bevor an Self-Check-in zu denken ist.'
    : 'Eine Schlüsselbox oder ein Smart Lock lässt sich in der Regel montieren, was kontaktlosen 24/7-Check-in ermöglicht.';
  const parking = r.input.hasParking ? ' Der vorhandene Parkplatz vereinfacht Anreise und Übergabe.' : '';
  return `${lock}${parking} Plane Reinigung und Wäsche von Beginn an mit festen Dienstleistern, und erstelle eine bebilderte Check-in-Anleitung. Kläre vorab, ob häufig wechselnde Gäste die Nachbarschaft stören könnten.`;
}

function buildLegalNotes(r: AnalysisResult): string[] {
  const notes = [...r.cityInfo.legalHints];
  if (r.input.objectType === 'buero') {
    notes.unshift('Gewerbe-/Bürofläche: Eine Nutzungsänderung zu Wohn-/Beherbergungszwecken ist meist genehmigungspflichtig.');
  }
  notes.unshift('⚠️ Ohne schriftliche Erlaubnis des Vermieters zur touristischen Untervermietung darf nicht gestartet werden.');
  return notes;
}

function buildNextSteps(r: AnalysisResult): string[] {
  const steps: string[] = [];
  steps.push('Schriftliche Erlaubnis des Vermieters zur Kurzzeitvermietung einholen (Pflicht).');
  if (r.cityInfo.legalRisk !== 'low') {
    steps.push('Zweckentfremdungs-/Registrierungsregeln bei der Stadt prüfen.');
  }
  if (r.cityInfo.type === 'kurort') {
    steps.push('Kurtaxe-/Gästebeitragspflicht bei der Gemeinde erfragen.');
  }
  if (r.finance.revenueToRentRatio !== null && r.finance.revenueToRentRatio < 2) {
    steps.push('Warmmiete nachverhandeln oder Pricing optimieren – Umsatz/Miete liegt unter dem Zielwert von 2,0.');
  }
  steps.push('Vergleichbare Inserate (Airbnb/Booking) vor Ort auf Preise, Auslastung und Ausstattung prüfen.');
  steps.push('Probe-Kalkulation mit realistischer Auslastung (≈55 %) gegenrechnen.');
  return steps;
}

function deriveRecommendation(score: number, ratio: number | null): { rec: Recommendation; reason: string } {
  if (score >= 75 && (ratio === null || ratio >= 2)) {
    return { rec: 'ja', reason: 'Starker Gesamteindruck aus Lage, Nachfrage und Wirtschaftlichkeit – aussichtsreich.' };
  }
  if (score >= 55) {
    const why = ratio !== null && ratio < 2
      ? 'Solide Lage, aber das Umsatz-/Miet-Verhältnis ist knapp – nur mit guter Miete/Pricing.'
      : 'Interessantes Profil mit einzelnen Schwächen – lohnt eine genauere Prüfung.';
    return { rec: 'pruefen', reason: why };
  }
  return { rec: 'nein', reason: 'Zu viele Schwachpunkte bei Lage, Nachfrage oder Wirtschaftlichkeit – eher ungeeignet.' };
}

function buildSummary(r: AnalysisResult, signals: DemandSignal[], rec: Recommendation): string {
  const city = r.location.city || 'der Standort';
  const topGroup = signals[0]?.group ?? 'Kurzzeitgäste';
  const band = r.scores.total >= 75 ? 'gutes' : r.scores.total >= 55 ? 'durchaus interessantes' : 'eher schwaches';
  const ratioTxt = r.finance.revenueToRentRatio !== null
    ? ` Das Umsatz-zu-Miete-Verhältnis liegt bei ${r.finance.revenueToRentRatio.toFixed(2)}x (Ziel: > 2,0).`
    : '';
  const recTxt = rec === 'ja' ? 'Das Objekt wirkt aussichtsreich.'
    : rec === 'pruefen' ? 'Das Objekt verdient eine genauere Prüfung.'
    : 'Vom Objekt ist eher abzuraten.';
  return `${city} zeigt mit Score ${r.scores.total}/100 ein ${band} Potenzial für Kurzzeitvermietung, getragen v. a. von der Zielgruppe „${topGroup}".${ratioTxt} ${recTxt}`;
}

export const localProvider: AnalysisProvider = {
  id: 'local',
  label: 'Lokale Engine (ohne API-Key)',
  requiresNetwork: false,
  async generateReport(r: AnalysisResult): Promise<AIAnalysis> {
    const signals = detectTargetGroups(r);
    const { rec, reason } = deriveRecommendation(r.scores.total, r.finance.revenueToRentRatio);
    const topGroups = signals.slice(0, 3).map((s) => s.group);

    const equipmentRecommendations = topGroups
      .filter((g) => EQUIPMENT_BY_GROUP[g])
      .slice(0, 3)
      .map((g) => ({ group: g, items: EQUIPMENT_BY_GROUP[g] }));

    return {
      summary: buildSummary(r, signals, rec),
      locationAnalysis: buildLocationText(r),
      demandAnalysis: buildDemandText(signals),
      targetGroups: signals.slice(0, 4).map((s) => `${s.group} — ${s.reason}`),
      legalNotes: buildLegalNotes(r),
      marketGap: buildMarketGap(r),
      automationNotes: buildAutomationText(r),
      equipmentRecommendations,
      nextSteps: buildNextSteps(r),
      recommendation: rec,
      recommendationReason: reason,
    };
  },
};
