'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchPOIs, emptyPOIData } from '@/lib/overpass';
import { buildCityInfo, cityTypeLabel } from '@/lib/citydata';
import { calcFinancials, estimateDailyRate, DEFAULT_COST_SETTINGS } from '@/lib/calculations';
import { calcFullScores } from '@/lib/scoring';
import { formatEur, formatDist, scoreColor, scoreLabel, recoBadge } from '@/lib/utils';
import { addEntry, removeEntry, isSaved, getEntry } from '@/lib/storage';
import { generateReport } from '@/lib/analysis';
import type { AnalysisResult, AIAnalysis, CostSettings, ObjectType, BuildYear } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const STEPS = [
  'Adresse wird verifiziert…',
  'Standort-Daten werden geladen…',
  'Nahgelegene POIs werden gesucht…',
  'Score wird berechnet…',
  'Bericht wird erstellt…',
  'Bericht wird finalisiert…',
];

function ProgressScreen({ step }: { step: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm w-full">
        <div className="text-5xl mb-6">🏠</div>
        <h2 className="text-xl font-semibold mb-6">Analyse läuft…</h2>
        <div className="score-bar-bg mb-4">
          <div
            className="score-bar-fill"
            style={{
              width: `${Math.round(((step + 1) / STEPS.length) * 100)}%`,
              background: 'var(--primary)',
            }}
          />
        </div>
        <div style={{ color: 'var(--muted-fg)', fontSize: '0.9rem' }}>{STEPS[Math.min(step, STEPS.length - 1)]}</div>
        <div className="mt-3" style={{ color: 'var(--muted-fg)', fontSize: '0.78rem' }}>
          Das dauert 10–20 Sekunden
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42"
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 42}`}
          strokeDashoffset={`${2 * Math.PI * 42 * (1 - score / 100)}`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>von 100</div>
      </div>
    </div>
  );
}

function SubScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">{value} / {max}</span>
      </div>
      <div className="score-bar-bg">
        <div
          className="score-bar-fill"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-semibold text-base flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <span style={{ color: 'var(--muted-fg)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function POIRow({ label, pois, limit = 3 }: { label: string; pois: { name: string; distanceM: number }[]; limit?: number }) {
  if (pois.length === 0) return (
    <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--muted-fg)' }}>{label}</span>
      <span style={{ color: '#94a3b8' }}>–</span>
    </div>
  );
  return (
    <>
      {pois.slice(0, limit).map((p, i) => (
        <div key={i} className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: i === 0 ? 'var(--foreground)' : 'var(--muted-fg)' }}>
            {i === 0 ? label : ''}
            {i === 0 ? '' : <>&nbsp;</>}
            <span style={{ color: 'var(--muted-fg)', fontSize: '0.8rem' }}>{i > 0 ? `+ ${p.name}` : p.name}</span>
          </span>
          <span className="font-medium" style={{ fontSize: '0.82rem', color: 'var(--muted-fg)' }}>
            {formatDist(p.distanceM)}
          </span>
        </div>
      ))}
    </>
  );
}

function AnalyzeContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [costSettings, setCostSettings] = useState<CostSettings>(DEFAULT_COST_SETTINGS);
  const [showCostEditor, setShowCostEditor] = useState(false);
  const [saved, setSaved] = useState(false);
  const [poiWarning, setPoiWarning] = useState(false);

  const run = useCallback(async () => {
    try {
      // Modus 1: Gespeicherten Bericht aus dem Portfolio laden (kein Neu-Abruf).
      const savedId = params.get('saved');
      if (savedId) {
        const entry = getEntry(savedId);
        if (!entry) { setError('Gespeicherter Bericht nicht gefunden.'); return; }
        setResult(entry);
        setCostSettings(entry.finance.costSettings);
        setSaved(true);
        return;
      }

      // Modus 2: Neue Analyse aus URL-Parametern.
      const lat = parseFloat(params.get('lat') ?? '0');
      const lng = parseFloat(params.get('lng') ?? '0');
      const city = params.get('city') ?? '';
      const state = params.get('state') ?? '';
      const country = params.get('country') ?? '';
      const address = params.get('address') ?? '';
      const displayName = params.get('displayName') ?? address;
      const objectType = (params.get('objectType') ?? 'wohnung') as ObjectType;
      const warmmiete = params.get('warmmiete') ? parseFloat(params.get('warmmiete')!) : undefined;
      const sqm = params.get('sqm') ? parseInt(params.get('sqm')!) : undefined;
      const rooms = params.get('rooms') ? parseInt(params.get('rooms')!) : undefined;
      const hasParking = params.get('hasParking') === 'true';
      const hasBalcony = params.get('hasBalcony') === 'true';
      const buildYear = (params.get('buildYear') ?? undefined) as BuildYear | undefined;

      if (!lat || !lng) { setError('Keine Koordinaten. Bitte neu starten.'); return; }

      setStep(1);

      setStep(2);
      // POIs sind wichtig, aber kein harter Blocker: wenn Overpass timeout/504
      // liefert, läuft die Analyse mit leeren POIs + Hinweis weiter.
      let pois;
      try {
        pois = await fetchPOIs(lat, lng);
      } catch {
        pois = emptyPOIData();
        setPoiWarning(true);
      }

      setStep(3);
      const hasSpaNearby = pois.spas.length > 0 && pois.spas[0].distanceM < 15000;
      const hasTourismNearby = pois.tourism.length >= 2;
      const cityInfo = buildCityInfo(city, hasSpaNearby, hasTourismNearby);

      const avgDailyRate = estimateDailyRate(
        cityInfo.avgDailyRateBase,
        hasParking,
        hasBalcony,
        buildYear,
        sqm
      );

      const finance = calcFinancials(avgDailyRate, warmmiete, costSettings);

      setStep(4);
      const input = { addressRaw: address, objectType, warmmiete, sqm, rooms, hasParking, hasBalcony, buildYear };
      const location = { lat, lng, city, state, country, addressNorm: displayName, displayName };
      const scores = calcFullScores(pois, finance, cityInfo, input);

      const partial: AnalysisResult = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        input,
        location,
        pois,
        scores,
        finance,
        ai: null,
        cityInfo,
      };

      setStep(5);
      // Bericht über den aktiven Provider erzeugen. Standard = lokale Engine
      // (kein API-Key). Bei konfiguriertem Backend wird dieses genutzt, mit
      // automatischem Fallback auf lokal.
      let ai: AIAnalysis | null = null;
      try {
        ai = await generateReport(partial);
      } catch { /* Bericht optional — Ergebnisse trotzdem zeigen */ }

      setStep(6);
      setResult({ ...partial, ai });
    } catch (err) {
      setError('Analyse fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [params, costSettings]);

  useEffect(() => { run(); }, []);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">Fehler</h2>
        <p style={{ color: 'var(--muted-fg)' }} className="mb-4">{error}</p>
        <button onClick={() => router.push('/')} className="btn-primary">← Zurück zur Suche</button>
      </div>
    </div>
  );

  if (!result) return (
    <>
      <header style={{ background: 'var(--primary)', color: 'white' }} className="px-6 py-4">
        <div className="max-w-3xl mx-auto font-bold text-xl">AirScore</div>
      </header>
      <ProgressScreen step={step} />
    </>
  );

  const { scores, finance, cityInfo, ai, location, input, pois } = result;
  const badge = recoBadge(ai?.recommendation ?? (scores.total >= 75 ? 'ja' : scores.total >= 55 ? 'pruefen' : 'nein'));
  const sColor = scoreColor(scores.total);

  const chartData = [
    { label: 'Standort', value: scores.location, max: 20 },
    { label: 'Nachfrage', value: scores.demand, max: 20 },
    { label: 'Wettbewerb', value: scores.competition, max: 15 },
    { label: 'Finanzen', value: scores.finance, max: 20 },
    { label: 'Automatisierung', value: scores.automation, max: 10 },
    { label: 'Rechtliches', value: scores.legal, max: 15 },
  ];

  const revenueChartData = [
    { name: '40%', umsatz: Math.round(finance.scenarios.s40.revenue), kosten: Math.round(finance.scenarios.s40.costs) },
    { name: '55%', umsatz: Math.round(finance.scenarios.s55.revenue), kosten: Math.round(finance.scenarios.s55.costs) },
    { name: '70%', umsatz: Math.round(finance.scenarios.s70.revenue), kosten: Math.round(finance.scenarios.s70.costs) },
  ];

  function recalcFinance(newSettings: CostSettings) {
    setCostSettings(newSettings);
    const newFinance = calcFinancials(finance.avgDailyRate, input.warmmiete, newSettings);
    setResult((r) => r ? { ...r, finance: newFinance } : r);
  }

  function toggleSave() {
    if (!result) return;
    if (saved) {
      removeEntry(result.id);
      setSaved(false);
    } else {
      // aktuellen Stand (inkl. evtl. angepasster Kosten) speichern
      addEntry(result);
      setSaved(true);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header style={{ background: 'var(--primary)', color: 'white' }} className="px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/')} className="font-bold text-xl">AirScore</button>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/portfolio')} style={{ opacity: 0.85, fontSize: '0.85rem' }}>📁 Portfolio</button>
            <button onClick={() => router.push('/')} style={{ opacity: 0.85, fontSize: '0.85rem' }}>← Neue Analyse</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">

        {poiWarning && (
          <div className="px-4 py-3 rounded-lg text-sm" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
            ⚠️ Die Standortdaten (OpenStreetMap) waren gerade nicht erreichbar. Score und Empfehlung
            basieren daher nur auf Stadttyp und Finanzdaten. Lade die Analyse später neu für die volle Standortanalyse.
          </div>
        )}

        {/* Header Card */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <ScoreRing score={scores.total} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-lg font-semibold">{location.displayName}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: badge.color + '22', color: badge.color }}>
                  {badge.label}
                </span>
              </div>
              <div className="font-semibold mb-2" style={{ color: sColor }}>{scoreLabel(scores.total)}</div>
              <div className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                {cityTypeLabel(cityInfo.type)} · Tagespreis: ~{formatEur(finance.avgDailyRate)}
                {input.warmmiete ? ` · Miete: ${formatEur(input.warmmiete)}/Monat` : ''}
              </div>
              {ai?.summary && (
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{ai.summary}</p>
              )}
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <Section title="Score-Übersicht" icon="📊">
          <div className="flex flex-col gap-3">
            {chartData.map((d) => (
              <SubScoreBar key={d.label} label={d.label} value={d.value} max={d.max} color={scoreColor((d.value / d.max) * 100)} />
            ))}
          </div>
          <div className="mt-4 text-xs" style={{ color: 'var(--muted-fg)' }}>
            Score 0–39: Ungeeignet · 40–59: Riskant · 60–74: Prüfen · 75–89: Gut · 90–100: Sehr stark
          </div>
        </Section>

        {/* Standort */}
        <Section title="Standortanalyse" icon="📍">
          {ai?.locationAnalysis && (
            <p className="text-sm mb-4 leading-relaxed">{ai.locationAnalysis}</p>
          )}
          <div className="flex flex-col">
            <POIRow label="Bahnhof" pois={pois.stations} />
            <POIRow label="Autobahn" pois={pois.motorways} />
            <POIRow label="Flughafen" pois={pois.airports} />
            <POIRow label="Supermarkt" pois={pois.supermarkets} />
            <POIRow label="Restaurant" pois={pois.restaurants.slice(0, 2)} />
            <POIRow label="Café" pois={pois.cafes.slice(0, 2)} />
            <POIRow label="Park / Kurpark" pois={pois.parks} />
            {input.hasParking && (
              <div className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <span>Parkplatz</span>
                <span className="font-medium" style={{ color: '#16a34a' }}>✓ vorhanden</span>
              </div>
            )}
          </div>
        </Section>

        {/* Nachfrage */}
        <Section title="Nachfrageanalyse" icon="🎯">
          {ai?.demandAnalysis && (
            <p className="text-sm mb-4 leading-relaxed">{ai.demandAnalysis}</p>
          )}
          <div className="flex flex-col mb-4">
            <POIRow label="Therme / Spa" pois={pois.spas} />
            <POIRow label="Klinik / Reha" pois={pois.clinics} />
            <POIRow label="Universität" pois={pois.universities} />
            <POIRow label="Veranstaltungsort" pois={pois.eventVenues} />
            <POIRow label="Sehenswürdigkeiten" pois={pois.tourism.slice(0, 2)} />
          </div>
          {ai?.targetGroups && ai.targetGroups.length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2">Top-Zielgruppen:</div>
              <div className="flex flex-col gap-2">
                {ai.targetGroups.map((g, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {i + 1}. {g}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Wettbewerb */}
        {ai?.marketGap && (
          <Section title="Wettbewerb & Marktlücke" icon="🏆">
            <p className="text-sm leading-relaxed">{ai.marketGap}</p>
            <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: 'var(--muted)' }}>
              <strong>Wettbewerbs-Score:</strong> {scores.competition} / 15 Punkte
              <span style={{ color: 'var(--muted-fg)' }} className="ml-2 text-xs">
                (Schätzung basiert auf Stadtgröße und Stadttyp)
              </span>
            </div>
          </Section>
        )}

        {/* Finanzen */}
        <Section title="Finanzrechnung" icon="💶">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Tagespreis', value: formatEur(finance.avgDailyRate) },
              { label: 'Umsatz (55%)', value: formatEur(finance.scenarios.s55.revenue) },
              { label: 'Break-even', value: `${Math.round(finance.breakEvenPct)} %` },
              { label: 'Ratio Umsatz/Miete', value: finance.revenueToRentRatio ? finance.revenueToRentRatio.toFixed(2) + 'x' : '–' },
            ].map((m) => (
              <div key={m.label} className="rounded-lg p-3 text-center" style={{ background: 'var(--muted)' }}>
                <div className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{m.value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-fg)' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Szenarien-Tabelle */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  <th className="text-left px-3 py-2 rounded-tl-lg">Szenario</th>
                  <th className="text-right px-3 py-2">Nächte</th>
                  <th className="text-right px-3 py-2">Umsatz</th>
                  {input.warmmiete && <th className="text-right px-3 py-2">Kosten</th>}
                  {input.warmmiete && <th className="text-right px-3 py-2 rounded-tr-lg">Gewinn</th>}
                </tr>
              </thead>
              <tbody>
                {[finance.scenarios.s40, finance.scenarios.s55, finance.scenarios.s70].map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i === 1 ? 'var(--primary-light)' : 'white' }}>
                    <td className="px-3 py-2 font-medium">
                      {s.pct * 100}% Auslastung {i === 1 && <span style={{ color: 'var(--muted-fg)', fontSize: '0.75rem' }}>(realistisch)</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{Math.round(s.nights)} Nächte</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatEur(s.revenue)}</td>
                    {input.warmmiete && <td className="px-3 py-2 text-right" style={{ color: '#dc2626' }}>{formatEur(s.costs)}</td>}
                    {input.warmmiete && (
                      <td className="px-3 py-2 text-right font-bold" style={{ color: s.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                        {formatEur(s.profit)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          {input.warmmiete && (
            <div className="mb-5">
              <div className="text-sm font-medium mb-2">Umsatz vs. Kosten</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={revenueChartData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(v) => formatEur(Number(v))} />
                  <Bar dataKey="umsatz" fill="#0369a1" name="Umsatz" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="kosten" fill="#f97316" name="Kosten" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {input.warmmiete && finance.revenueToRentRatio !== null && (
            <div className="p-3 rounded-lg text-sm mb-4" style={{
              background: finance.revenueToRentRatio >= 2.0 ? '#f0fdf4' : '#fef3c7',
              border: `1px solid ${finance.revenueToRentRatio >= 2.0 ? '#bbf7d0' : '#fde68a'}`
            }}>
              <strong>Umsatz-zu-Miete-Ratio: {finance.revenueToRentRatio.toFixed(2)}x</strong><br />
              <span style={{ color: 'var(--muted-fg)' }}>
                Ziel: &gt; 2,0 (interessant) · &gt; 2,3 (gut) · &gt; 2,5 (sehr gut)
              </span>
            </div>
          )}

          {/* Cost editor */}
          <button
            type="button"
            onClick={() => setShowCostEditor(!showCostEditor)}
            style={{ color: 'var(--primary)', fontSize: '0.85rem' }}
            className="font-medium"
          >
            {showCostEditor ? '▲' : '▼'} Kostenannahmen anpassen
          </button>

          {showCostEditor && (
            <div className="mt-3 grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              {([
                ['electricity', 'Strom (€/Mo.)'],
                ['internet', 'Internet (€/Mo.)'],
                ['cleaningPerStay', 'Reinigung/Aufenthalt (€)'],
                ['avgStayDuration', 'Ø Aufenthaltsdauer (Nächte)'],
                ['laundry', 'Wäsche (€/Mo.)'],
                ['airbnbFeePercent', 'Airbnb-Gebühr (%)'],
                ['consumables', 'Verbrauchsmaterial (€/Mo.)'],
                ['wearTear', 'Verschleiß (€/Mo.)'],
                ['insurance', 'Versicherung (€/Mo.)'],
                ['software', 'Software (€/Mo.)'],
                ['reserve', 'Rücklage (€/Mo.)'],
              ] as [keyof CostSettings, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-fg)' }}>{label}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={costSettings[key]}
                    onChange={(e) => {
                      const newSettings = { ...costSettings, [key]: parseFloat(e.target.value) || 0 };
                      recalcFinance(newSettings);
                    }}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Rechtliches */}
        <Section title="Rechtliche Hinweise" icon="⚖️" defaultOpen={false}>
          <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' }}>
            ⚠️ <strong>Wichtig:</strong> Ohne schriftliche Erlaubnis des Vermieters und ohne Prüfung lokaler Vorschriften kein Objekt anmieten oder einrichten.
          </div>
          <div className="flex flex-col gap-2">
            {(ai?.legalNotes ?? cityInfo.legalHints).map((note, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span style={{ color: '#d97706', flexShrink: 0 }}>•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Automatisierung */}
        {ai?.automationNotes && (
          <Section title="Self-Check-in & Automatisierung" icon="🔑" defaultOpen={false}>
            <p className="text-sm leading-relaxed mb-3">{ai.automationNotes}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Schlüsselbox / Smart Lock', ok: true },
                { label: 'Self-Check-in', ok: true },
                { label: 'Ferngesteuerte Reinigung', ok: true },
                { label: 'Parkplatz', ok: input.hasParking },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ color: item.ok ? '#16a34a' : '#94a3b8' }}>{item.ok ? '✓' : '–'}</span>
                  <span style={{ color: item.ok ? 'var(--foreground)' : 'var(--muted-fg)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Ausstattung */}
        {ai?.equipmentRecommendations && ai.equipmentRecommendations.length > 0 && (
          <Section title="Ausstattungsempfehlungen" icon="🛋️" defaultOpen={false}>
            <div className="flex flex-col gap-4">
              {ai.equipmentRecommendations.map((rec, i) => (
                <div key={i}>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'var(--primary)' }}>Für {rec.group}:</div>
                  <ul className="flex flex-col gap-1">
                    {rec.items.map((item, j) => (
                      <li key={j} className="flex gap-2 text-sm">
                        <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Entscheidung */}
        <Section title="Entscheidung & nächste Schritte" icon="🎯">
          <div className="p-4 rounded-lg mb-4 text-center" style={{ background: badge.color + '15', border: `2px solid ${badge.color}` }}>
            <div className="text-2xl font-bold mb-1" style={{ color: badge.color }}>{badge.label}</div>
            {ai?.recommendationReason && (
              <p className="text-sm">{ai.recommendationReason}</p>
            )}
          </div>
          {ai?.nextSteps && ai.nextSteps.length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2">Nächste Schritte:</div>
              <ol className="flex flex-col gap-2">
                {ai.nextSteps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: 'var(--primary)', color: 'white' }}>
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Section>

        {/* Footer actions */}
        <div className="flex gap-3 justify-center flex-wrap pb-8">
          <button
            onClick={toggleSave}
            className="px-5 py-2.5 rounded-lg font-medium text-sm"
            style={
              saved
                ? { background: '#16a34a', color: 'white' }
                : { background: 'var(--primary)', color: 'white' }
            }
          >
            {saved ? '✓ Im Portfolio gespeichert' : '⭐ Zum Portfolio hinzufügen'}
          </button>
          <button onClick={() => router.push('/portfolio')}
            className="px-5 py-2.5 rounded-lg border font-medium text-sm"
            style={{ border: '1px solid var(--border)', background: 'white' }}>
            📁 Portfolio öffnen
          </button>
          <button onClick={() => router.push('/')}
            className="px-5 py-2.5 rounded-lg border font-medium text-sm"
            style={{ border: '1px solid var(--border)', background: 'white' }}>
            ← Neue Analyse
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-lg border font-medium text-sm"
            style={{ border: '1px solid var(--border)', background: 'white' }}
          >
            🖨️ Drucken / PDF
          </button>
        </div>
      </div>
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <ProgressScreen step={1} />
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
