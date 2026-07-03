'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  searchAddress,
  nominatimToGeoLocation,
  shortLabel,
  precisionOf,
  parseAddress,
  PRECISION_LABELS,
} from '@/lib/nominatim';
import type { NominatimResult, ObjectType, BuildYear } from '@/lib/types';

const OBJECT_TYPES: { value: ObjectType; label: string }[] = [
  { value: 'wohnung', label: 'Wohnung' },
  { value: 'apartment', label: 'Apartment / Ferienwohnung' },
  { value: 'studio', label: 'Studio / Einzimmerwohnung' },
  { value: 'buero', label: 'Büro / Gewerbefläche' },
];

const BUILD_YEARS: { value: BuildYear; label: string }[] = [
  { value: 'vor1980', label: 'Vor 1980' },
  { value: '1980-2000', label: '1980–2000' },
  { value: 'nach2000', label: 'Nach 2000 (Neubau)' },
];

export default function HomePage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<NominatimResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [objectType, setObjectType] = useState<ObjectType>('wohnung');
  const [warmmiete, setWarmmiete] = useState('');
  const [sqm, setSqm] = useState('');
  const [rooms, setRooms] = useState('');
  const [hasParking, setHasParking] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [buildYear, setBuildYear] = useState<BuildYear | ''>('');
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function onAddressChange(value: string) {
    setAddress(value);
    setSelectedResult(null);
    setError('');
    setWarning('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 4) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const results = await searchAddress(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
      finally { setLoadingSuggest(false); }
    }, 450);
  }

  function selectSuggestion(r: NominatimResult) {
    setSelectedResult(r);
    setAddress(shortLabel(r));
    setShowSuggestions(false);
    setSuggestions([]);
    setWarning('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    let geo = selectedResult;
    if (!geo) {
      if (address.trim().length < 3) { setError('Bitte gib eine Adresse ein.'); return; }
      setSubmitting(true);
      try {
        const results = await searchAddress(address);
        if (results.length === 0) {
          setError('Adresse nicht gefunden. Bitte präziser eingeben (Straße, Hausnr., PLZ, Stadt).');
          setSubmitting(false);
          return;
        }
        geo = results[0];

        // Hausnummer gewünscht, aber nur Straße/Stadt gefunden: NICHT blind den
        // ersten Treffer nehmen. Liste + Warnung zeigen, Navigation stoppen.
        // Erst beim zweiten Klick (warning bereits gesetzt) fahren wir fort.
        const parsed = parseAddress(address);
        if (parsed.hasHouseNumber && precisionOf(geo) !== 'exact' && !warning) {
          setSuggestions(results);
          setShowSuggestions(true);
          setWarning(
            `Keine exakte Hausadresse gefunden. Wähle einen Vorschlag aus oder ergänze die PLZ. ` +
            `Nochmal auf „Analysieren" klicken, um mit „${shortLabel(geo)}" fortzufahren.`
          );
          setSubmitting(false);
          return;
        }
      } catch { setError('Geocoding fehlgeschlagen. Bitte erneut versuchen.'); setSubmitting(false); return; }
    } else { setSubmitting(true); }
    setWarning('');

    const loc = nominatimToGeoLocation(geo);
    const params = new URLSearchParams({
      address,
      lat: loc.lat.toString(),
      lng: loc.lng.toString(),
      city: loc.city,
      state: loc.state,
      country: loc.country,
      displayName: loc.displayName,
      objectType,
      hasParking: hasParking.toString(),
      hasBalcony: hasBalcony.toString(),
    });
    if (warmmiete) params.set('warmmiete', warmmiete);
    if (sqm) params.set('sqm', sqm);
    if (rooms) params.set('rooms', rooms);
    if (buildYear) params.set('buildYear', buildYear);

    router.push(`/analyze?${params.toString()}`);
  }

  return (
    <div className="flex flex-col">
      <section className="px-6 py-12 text-center animate-rise">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            Airbnb-Analyse
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            Gib eine Adresse ein.<br />Bekomm eine klare Antwort.
          </h1>
          <p style={{ color: 'var(--muted-fg)' }} className="text-lg">
            Analyse für Kurzzeitvermietung — Standort, Nachfrage, Finanzen, Risiken.
          </p>
        </div>
      </section>

      <section className="flex-1 px-4 py-10">
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
            <h2 className="text-xl font-semibold">Objekt analysieren</h2>

            <div className="relative" ref={suggestRef}>
              <label className="block text-sm font-medium mb-1.5">
                Adresse, Stadt oder Stadtteil <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="z. B. Kurparkstraße 5, Bad Orb"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                autoComplete="off"
                required
              />
              {loadingSuggest && (
                <div style={{ color: 'var(--muted-fg)', fontSize: '0.8rem' }} className="mt-1">Suche…</div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-lg shadow-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  {suggestions.map((s) => {
                    const prec = PRECISION_LABELS[precisionOf(s)];
                    return (
                      <button key={s.place_id} type="button"
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2 transition"
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => selectSuggestion(s)}
                      >
                        <span className="flex-1">{shortLabel(s)}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0"
                          style={{ background: prec.color + '22', color: prec.color }}>
                          {prec.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Objekttyp <span style={{ color: 'var(--primary)' }}>*</span></label>
              <select className="input-field" value={objectType} onChange={(e) => setObjectType(e.target.value as ObjectType)}>
                {OBJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Warmmiete (€/Monat) <span style={{ color: 'var(--muted-fg)', fontWeight: 400 }}>– für Gewinnrechnung</span>
              </label>
              <input className="input-field" type="number" placeholder="z. B. 800" value={warmmiete} onChange={(e) => setWarmmiete(e.target.value)} min="0" max="10000" />
            </div>

            <button type="button" onClick={() => setShowDetails(!showDetails)} style={{ color: 'var(--primary)', fontSize: '0.9rem', textAlign: 'left' }} className="font-medium flex items-center gap-1">
              {showDetails ? '▲' : '▼'} Weitere Details (optional)
            </button>

            {showDetails && (
              <div className="flex flex-col gap-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Wohnfläche (m²)</label>
                    <input className="input-field" type="number" placeholder="55" value={sqm} onChange={(e) => setSqm(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Anzahl Zimmer</label>
                    <input className="input-field" type="number" placeholder="2" value={rooms} onChange={(e) => setRooms(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Baujahr (grob)</label>
                  <select className="input-field" value={buildYear} onChange={(e) => setBuildYear(e.target.value as BuildYear | '')}>
                    <option value="">Unbekannt</option>
                    {BUILD_YEARS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={hasParking} onChange={(e) => setHasParking(e.target.checked)} className="w-4 h-4" />
                    Parkplatz vorhanden
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={hasBalcony} onChange={(e) => setHasBalcony(e.target.checked)} className="w-4 h-4" />
                    Balkon / Terrasse
                  </label>
                </div>
              </div>
            )}

            {warning && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                ⚠️ {warning}
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary text-center py-3 text-base" disabled={submitting}>
              {submitting ? 'Wird analysiert…' : 'Jetzt analysieren →'}
            </button>

            <p style={{ color: 'var(--muted-fg)', fontSize: '0.78rem', textAlign: 'center' }}>
              Keine Daten werden dauerhaft gespeichert · Kein Login erforderlich
            </p>
          </form>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: '📍', title: 'Standort', desc: 'ÖPNV, POIs, Infrastruktur' },
              { icon: '📊', title: 'Finanzen', desc: 'Umsatz, Kosten, Break-even' },
              { icon: '⚖️', title: 'Rechtliches', desc: 'Risiken & Genehmigungen' },
            ].map((f) => (
              <div key={f.title} className="card card-hover text-center" style={{ padding: '1rem' }}>
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-sm font-semibold">{f.title}</div>
                <div style={{ color: 'var(--muted-fg)', fontSize: '0.75rem' }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <p className="text-center mt-8" style={{ color: 'var(--muted-fg)', fontSize: '0.78rem' }}>
            AirScore ist kein Rechtsberater. Alle Angaben ohne Gewähr. Immer schriftliche Vermieter-Erlaubnis einholen.
          </p>
        </div>
      </section>
    </div>
  );
}
