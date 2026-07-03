'use client';

import { useEffect, useMemo, useState } from 'react';
import { calcMietwert, type Zustand, type Wohnlage, type Energieklasse } from '@/lib/mietwert';
import { formatEur } from '@/lib/utils';
import { Disclaimer } from '@/components/Disclaimer';
import { Field, NumInput, TextInput, Select, Check, Stat } from './Field';
import type { Prefill } from '@/app/rechner/prefill';

export function MietwertCalc({ prefill }: { prefill: Prefill }) {
  const [plz, setPlz] = useState('');
  const [sqm, setSqm] = useState('');
  const [rooms, setRooms] = useState('');
  const [etage, setEtage] = useState('');
  const [baujahr, setBaujahr] = useState('');
  const [zustand, setZustand] = useState<Zustand>('normal');
  const [wohnlage, setWohnlage] = useState<Wohnlage>('mittel');
  const [energie, setEnergie] = useState<Energieklasse>('unbekannt');
  const [baseOverride, setBaseOverride] = useState('');
  const [a, setA] = useState({ balkon: false, ebk: false, aufzug: false, stellplatz: false, keller: false, hochwertigerBoden: false });

  // Import-Vorbefüllung übernehmen
  useEffect(() => {
    if (prefill.plz) setPlz(prefill.plz);
    if (prefill.sqm) setSqm(String(prefill.sqm));
    if (prefill.rooms) setRooms(String(prefill.rooms));
    if (prefill.baujahr) setBaujahr(String(prefill.baujahr));
  }, [prefill]);

  const result = useMemo(() => {
    const s = Number(sqm);
    if (!plz || !s) return null;
    return calcMietwert({
      plz, sqm: s,
      rooms: rooms ? Number(rooms) : undefined,
      etage: etage ? Number(etage) : undefined,
      baujahr: baujahr ? Number(baujahr) : undefined,
      zustand, wohnlage, energieklasse: energie,
      ausstattung: a,
      baseOverride: baseOverride ? Number(baseOverride) : undefined,
    });
  }, [plz, sqm, rooms, etage, baujahr, zustand, wohnlage, energie, a, baseOverride]);

  return (
    <div className="flex flex-col gap-5 animate-rise">
      <div className="card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Was kann ich für meine Wohnung verlangen?</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="PLZ / Stadtteil"><TextInput value={plz} onChange={setPlz} placeholder="63619" /></Field>
          <Field label="Wohnfläche (m²)"><NumInput value={sqm} onChange={setSqm} placeholder="55" /></Field>
          <Field label="Zimmer"><NumInput value={rooms} onChange={setRooms} placeholder="2" /></Field>
          <Field label="Etage"><NumInput value={etage} onChange={setEtage} placeholder="1" /></Field>
          <Field label="Baujahr"><NumInput value={baujahr} onChange={setBaujahr} placeholder="1995" /></Field>
          <Field label="Energieeffizienzklasse">
            <Select value={energie} onChange={setEnergie} options={[
              'A+','A','B','C','D','E','F','G','H','unbekannt',
            ].map((v) => ({ value: v as Energieklasse, label: v }))} />
          </Field>
          <Field label="Zustand">
            <Select value={zustand} onChange={setZustand} options={[
              { value: 'neuwertig', label: 'Neuwertig' },
              { value: 'renoviert', label: 'Renoviert' },
              { value: 'normal', label: 'Normal' },
              { value: 'sanierungsbeduerftig', label: 'Sanierungsbedürftig' },
            ]} />
          </Field>
          <Field label="Wohnlage">
            <Select value={wohnlage} onChange={setWohnlage} options={[
              { value: 'einfach', label: 'Einfach' },
              { value: 'mittel', label: 'Mittel' },
              { value: 'gut', label: 'Gut' },
              { value: 'bevorzugt', label: 'Bevorzugt' },
            ]} />
          </Field>
        </div>

        <Field label="Ausstattung">
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Check checked={a.balkon} onChange={(v) => setA({ ...a, balkon: v })} label="Balkon/Terrasse" />
            <Check checked={a.ebk} onChange={(v) => setA({ ...a, ebk: v })} label="Einbauküche" />
            <Check checked={a.aufzug} onChange={(v) => setA({ ...a, aufzug: v })} label="Aufzug" />
            <Check checked={a.stellplatz} onChange={(v) => setA({ ...a, stellplatz: v })} label="Stellplatz" />
            <Check checked={a.keller} onChange={(v) => setA({ ...a, keller: v })} label="Keller" />
            <Check checked={a.hochwertigerBoden} onChange={(v) => setA({ ...a, hochwertigerBoden: v })} label="Hochw. Bodenbelag" />
          </div>
        </Field>

        <Field label="Mietspiegel-Basiswert €/m²" hint="(optional – überschreibt Region-Richtwert)">
          <NumInput value={baseOverride} onChange={setBaseOverride} placeholder="aus PLZ" step={0.1} />
        </Field>
      </div>

      {result && (
        <div className="card flex flex-col gap-4 animate-rise">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-semibold">Empfohlene Kaltmiete</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--muted-fg)' }}>Mietwert-Score</span>
              <span className="px-2.5 py-1 rounded-full text-sm font-bold"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{result.score}/100</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Konservativ" value={formatEur(result.kaltmiete.min)} />
            <Stat label="Mittel" value={formatEur(result.kaltmiete.mittel)} accent />
            <Stat label="Optimistisch" value={formatEur(result.kaltmiete.max)} />
          </div>

          <div className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            ≈ {result.eurQm.min}–{result.eurQm.max} €/m² · Basis {result.baseEurQm} €/m² ({result.baseSource})
            {result.vsDurchschnittPct !== 0 && (
              <> · {result.vsDurchschnittPct > 0 ? '+' : ''}{result.vsDurchschnittPct}% ggü. Regionsdurchschnitt</>
            )}
          </div>

          {result.isTightMarket && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-xs"
              style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              ⚠️ Lage vermutlich in einem <b>angespannten Wohnungsmarkt</b> – die Mietpreisbremse kann die
              zulässige Neuvermietungsmiete begrenzen (max. ~10 % über ortsüblicher Vergleichsmiete). Bitte lokal prüfen.
            </div>
          )}

          <Disclaimer text="Grobe Orientierung – ersetzt keinen amtlichen Mietspiegel und keine Wertermittlung." />
        </div>
      )}
    </div>
  );
}
