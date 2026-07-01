/**
 * OPTIONALES BACKEND-BEISPIEL — nicht Teil des statischen Builds.
 * ----------------------------------------------------------------
 * Die App läuft standardmäßig komplett ohne Backend (lokale Engine in
 * lib/analysis/localProvider.ts). Wer stattdessen Claude für die Texte nutzen
 * will, deployt diese Datei als API-Route auf einer Plattform mit Server
 * (z. B. Vercel) und setzt in der App:
 *
 *   NEXT_PUBLIC_ANALYSIS_MODE=claude
 *   NEXT_PUBLIC_ANALYSIS_ENDPOINT=https://<deine-vercel-app>/api/analyze
 *
 * Installation auf Vercel:
 *   1. Diese Datei nach app/api/analyze/route.ts kopieren.
 *   2. In next.config.ts `output: 'export'` entfernen (Server-Build).
 *   3. ANTHROPIC_API_KEY als Environment Variable in Vercel hinterlegen.
 *
 * Das zurückgegebene Format ({ ai: AIAnalysis }) ist identisch zur lokalen
 * Engine, sodass die Bericht-UI unverändert bleibt.
 */
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisResult } from '@/lib/types';

const client = new Anthropic();

function buildPOISummary(result: AnalysisResult): string {
  const { pois } = result;
  const lines: string[] = [];

  if (pois.stations.length > 0) lines.push(`- Bahnhof: ${pois.stations[0].name} (${Math.round(pois.stations[0].distanceM)} m)`);
  if (pois.airports.length > 0) lines.push(`- Flughafen: ${pois.airports[0].name} (${(pois.airports[0].distanceM / 1000).toFixed(1)} km)`);
  if (pois.motorways.length > 0) lines.push(`- Autobahn: ${(pois.motorways[0].distanceM / 1000).toFixed(1)} km`);
  if (pois.supermarkets.length > 0) lines.push(`- Supermarkt: ${pois.supermarkets[0].name} (${Math.round(pois.supermarkets[0].distanceM)} m)`);
  const dining = [...pois.restaurants, ...pois.cafes];
  lines.push(`- Restaurants/Cafés in 1 km: ${dining.filter((p) => p.distanceM < 1000).length}`);
  if (pois.spas.length > 0) lines.push(`- Therme/Spa: ${pois.spas[0].name} (${(pois.spas[0].distanceM / 1000).toFixed(1)} km)`);
  if (pois.clinics.length > 0) lines.push(`- Klinik: ${pois.clinics[0].name} (${(pois.clinics[0].distanceM / 1000).toFixed(1)} km)`);
  if (pois.universities.length > 0) lines.push(`- Universität: ${pois.universities[0].name} (${(pois.universities[0].distanceM / 1000).toFixed(1)} km)`);
  if (pois.eventVenues.length > 0) lines.push(`- Veranstaltungsort: ${pois.eventVenues[0].name} (${(pois.eventVenues[0].distanceM / 1000).toFixed(1)} km)`);
  if (pois.tourism.length > 0) lines.push(`- Sehenswürdigkeiten in 5 km: ${pois.tourism.length}`);
  if (pois.parks.length > 0) lines.push(`- Parks/Kurpark: ${pois.parks[0].name} (${Math.round(pois.parks[0].distanceM)} m)`);

  return lines.join('\n') || 'Keine POI-Daten verfügbar';
}

export async function POST(req: NextRequest) {
  try {
    const result: AnalysisResult = await req.json();
    const { input, location, scores, finance, cityInfo } = result;
    const poisSummary = buildPOISummary(result);

    const prompt = `Analysiere dieses Objekt für Kurzzeitvermietung (Airbnb/Booking):

OBJEKT:
- Adresse: ${input.addressRaw}
- Normalisiert: ${location.displayName}
- Typ: ${input.objectType}
- Größe: ${input.sqm ? input.sqm + ' m²' : 'unbekannt'}${input.rooms ? ', ' + input.rooms + ' Zimmer' : ''}
- Warmmiete: ${input.warmmiete ? input.warmmiete + ' €/Monat' : 'nicht angegeben'}
- Parkplatz: ${input.hasParking ? 'Ja' : 'Nein'}
- Balkon: ${input.hasBalcony ? 'Ja' : 'Nein'}

STANDORT:
- Stadt: ${location.city}, ${location.state}
- Stadttyp: ${cityInfo.type}
- Rechtliches Risiko: ${cityInfo.legalRisk}

POIs IN DER NÄHE:
${poisSummary}

FINANZDATEN:
- Geschätzter Tagespreis: ${finance.avgDailyRate} €
- Monatsumsatz realistisch (55%): ${Math.round(finance.scenarios.s55.revenue)} €
- Monatsumsatz optimistisch (70%): ${Math.round(finance.scenarios.s70.revenue)} €
${input.warmmiete ? `- Umsatz-zu-Miete-Ratio: ${finance.revenueToRentRatio?.toFixed(2) ?? 'n/a'} (Ziel: > 2.0)` : ''}
${input.warmmiete ? `- Break-even-Auslastung: ${Math.round(finance.breakEvenPct)} %` : ''}

SCORES:
- Gesamtscore: ${scores.total}/100
- Standort: ${scores.location}/20 | Nachfrage: ${scores.demand}/20 | Wettbewerb: ${scores.competition}/15
- Finanzen: ${scores.finance}/20 | Automatisierung: ${scores.automation}/10 | Rechtlich: ${scores.legal}/15

Erstelle eine detaillierte Airbnb-Analyse. Antworte NUR mit validem JSON:
{
  "summary": "3 prägnante Sätze Kurzfazit",
  "locationAnalysis": "Detaillierte Standortbewertung (5-7 Sätze)",
  "demandAnalysis": "Nachfrageeinschätzung und warum Menschen dort buchen würden (4-6 Sätze)",
  "targetGroups": ["Primäre Zielgruppe mit Begründung", "Zweite Zielgruppe", "Dritte Zielgruppe"],
  "legalNotes": ["Konkreter rechtlicher Hinweis 1", "Hinweis 2", "Hinweis 3"],
  "marketGap": "Marktlücke und möglicher Wettbewerbsvorteil (3-4 Sätze)",
  "automationNotes": "Eignung für kontaktloses Airbnb-Business (3-4 Sätze)",
  "equipmentRecommendations": [
    {"group": "Zielgruppe 1", "items": ["Ausstattung 1", "Ausstattung 2", "Ausstattung 3"]},
    {"group": "Zielgruppe 2", "items": ["Ausstattung 1", "Ausstattung 2"]}
  ],
  "nextSteps": ["Konkreter nächster Schritt 1", "Schritt 2", "Schritt 3", "Schritt 4"],
  "recommendation": "ja | pruefen | nein",
  "recommendationReason": "Ein Satz Begründung der Gesamtempfehlung"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system:
        'Du bist ein erfahrener Airbnb-Marktanalyst und Immobilienexperte für den deutschsprachigen Raum. Antworte immer auf Deutsch. Gib deine Antwort als valides JSON zurück. Keine Erklärungen, kein Markdown, kein Text außerhalb des JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'KI-Antwort konnte nicht geparst werden.' }, { status: 500 });
    }
    const ai = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ai });
  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: 'Analyse fehlgeschlagen.' }, { status: 500 });
  }
}
