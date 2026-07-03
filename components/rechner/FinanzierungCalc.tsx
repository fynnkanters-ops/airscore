'use client';

import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  calcNebenkosten, calcAnnuity, BUNDESLAENDER, GRUNDERWERBSTEUER,
  DEFAULT_ZINS_PROZENT, DEFAULT_TILGUNG_PROZENT, FINANZIERUNG_STAND,
} from '@/lib/financing';
import { calcAfa, cashflowNachSteuern, linearAfaSatz, type AfaMethode } from '@/lib/afa';
import { formatEur } from '@/lib/utils';
import { Disclaimer } from '@/components/Disclaimer';
import { Field, NumInput, Select, Check, Stat } from './Field';
import type { Prefill } from '@/app/rechner/prefill';

const n = (s: string) => (s ? Number(s) : 0);

export function FinanzierungCalc({ prefill }: { prefill: Prefill }) {
  const [kaufpreis, setKaufpreis] = useState('400000');
  const [eigenkapital, setEigenkapital] = useState('80000');
  const [bundesland, setBundesland] = useState('Hessen');
  const [maklerP, setMaklerP] = useState('3.57');
  const [zins, setZins] = useState(String(DEFAULT_ZINS_PROZENT));
  const [tilgung, setTilgung] = useState(String(DEFAULT_TILGUNG_PROZENT));
  const [bindung, setBindung] = useState('10');

  // AfA / Kapitalanlage
  const [grundstuecksP, setGrundstuecksP] = useState('20');
  const [baujahr, setBaujahr] = useState('2020');
  const [grenzsteuer, setGrenzsteuer] = useState('42');
  const [methode, setMethode] = useState<AfaMethode>('linear');
  const [sonder7b, setSonder7b] = useState(false);
  const [wohnflaeche, setWohnflaeche] = useState('');
  const [monatsmiete, setMonatsmiete] = useState('1200');
  const [instandhaltung, setInstandhaltung] = useState('1500');

  useEffect(() => {
    if (prefill.kaufpreis) setKaufpreis(String(prefill.kaufpreis));
    if (prefill.baujahr) setBaujahr(String(prefill.baujahr));
    if (prefill.sqm) setWohnflaeche(String(prefill.sqm));
  }, [prefill]);

  const calc = useMemo(() => {
    const kp = n(kaufpreis);
    if (!kp) return null;
    const neben = calcNebenkosten({
      kaufpreis: kp, bundesland, maklerProzent: n(maklerP),
    });
    const darlehen = Math.max(0, neben.gesamtkosten - n(eigenkapital));
    const ann = calcAnnuity({
      darlehen, zinsProzent: n(zins), tilgungProzent: n(tilgung), zinsbindungJahre: n(bindung),
    });

    const gebaeudewert = kp * (1 - n(grundstuecksP) / 100);
    const afa = calcAfa({
      gebaeudewert, baujahr: n(baujahr), grenzsteuersatz: n(grenzsteuer),
      methode, sonder7b, wohnflaeche: wohnflaeche ? n(wohnflaeche) : undefined,
    });

    const jahresmiete = n(monatsmiete) * 12;
    const jahresZins = ann.jahre[0]?.zins ?? 0;
    const cashflow = cashflowNachSteuern({
      jahresmiete, jahresZins, instandhaltung: n(instandhaltung), steuerersparnisJahr: afa.steuerersparnisJahr1,
    });

    return { neben, darlehen, ann, gebaeudewert, afa, cashflow, jahresmiete };
  }, [kaufpreis, eigenkapital, bundesland, maklerP, zins, tilgung, bindung,
      grundstuecksP, baujahr, grenzsteuer, methode, sonder7b, wohnflaeche, monatsmiete, instandhaltung]);

  const grestSatz = GRUNDERWERBSTEUER[bundesland];

  return (
    <div className="flex flex-col gap-5 animate-rise">
      {/* Finanzierung */}
      <div className="card flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Baufinanzierung</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kaufpreis (€)"><NumInput value={kaufpreis} onChange={setKaufpreis} /></Field>
          <Field label="Eigenkapital (€)"><NumInput value={eigenkapital} onChange={setEigenkapital} /></Field>
          <Field label="Bundesland" hint={`(${grestSatz}% GrESt)`}>
            <Select value={bundesland} onChange={setBundesland}
              options={BUNDESLAENDER.map((b) => ({ value: b, label: b }))} />
          </Field>
          <Field label="Makler (%)" hint="0–7"><NumInput value={maklerP} onChange={setMaklerP} step={0.1} /></Field>
          <Field label="Sollzins (%)" hint={`Richtwert ${FINANZIERUNG_STAND}`}>
            <NumInput value={zins} onChange={setZins} step={0.1} />
          </Field>
          <Field label="Anf. Tilgung (%)"><NumInput value={tilgung} onChange={setTilgung} step={0.1} /></Field>
          <Field label="Zinsbindung (Jahre)">
            <Select value={bindung} onChange={setBindung}
              options={['5','10','15','20','30'].map((v) => ({ value: v, label: v + ' Jahre' }))} />
          </Field>
        </div>
        <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
          Zins-{FINANZIERUNG_STAND} – vor Abschluss aktuellen Zins beim Kreditinstitut prüfen. Feld ist überschreibbar.
        </div>
      </div>

      {calc && (
        <>
          {/* Ergebnis Finanzierung */}
          <div className="card flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Monatliche Rate" value={formatEur(calc.ann.monatlicheRate)} accent />
              <Stat label="Darlehenssumme" value={formatEur(calc.darlehen)} />
              <Stat label={`Restschuld nach ${bindung} J.`} value={formatEur(calc.ann.restschuldNachBindung)} />
              <Stat label={`Zinskosten (${bindung} J.)`} value={formatEur(calc.ann.gesamtZinsBindung)} />
            </div>
            {calc.ann.volltilgungJahre && (
              <div className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                Vollständig getilgt nach ca. <b>{calc.ann.volltilgungJahre} Jahren</b> (bei konstanter Rate & Zins).
              </div>
            )}

            {calc.ann.jahre.length > 0 && (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calc.ann.jahre} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
                    <XAxis dataKey="jahr" tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} width={34} />
                    <Tooltip formatter={(v) => formatEur(Number(v))} labelFormatter={(l) => `Jahr ${l}`}
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="restschuld" name="Restschuld" stroke="var(--accent)" fill="var(--accent-soft)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Nebenkosten */}
          <div className="card flex flex-col gap-2">
            <h3 className="text-base font-semibold mb-1">Kaufnebenkosten</h3>
            {[
              ['Grunderwerbsteuer', calc.neben.grunderwerb],
              ['Maklerprovision', calc.neben.makler],
              ['Notar', calc.neben.notar],
              ['Grundbuch', calc.neben.grundbuch],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <span style={{ color: 'var(--muted-fg)' }}>{label}</span>
                <span>{formatEur(val as number)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <span>Summe ({calc.neben.prozent}% v. Kaufpreis)</span>
              <span>{formatEur(calc.neben.summe)}</span>
            </div>
          </div>

          {/* AfA & Cashflow */}
          <div className="card flex flex-col gap-4">
            <h3 className="text-base font-semibold">Abschreibung (AfA) & Cashflow — für Kapitalanleger</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Grundstücksanteil (%)" hint="15–40"><NumInput value={grundstuecksP} onChange={setGrundstuecksP} /></Field>
              <Field label="Baujahr"><NumInput value={baujahr} onChange={setBaujahr} /></Field>
              <Field label="Grenzsteuersatz (%)"><NumInput value={grenzsteuer} onChange={setGrenzsteuer} /></Field>
              <Field label="AfA-Methode">
                <Select value={methode} onChange={setMethode} options={[
                  { value: 'linear', label: `Linear (${linearAfaSatz(n(baujahr))}%)` },
                  { value: 'degressiv', label: 'Degressiv (5%)' },
                ]} />
              </Field>
              <Field label="Monatsmiete (€)"><NumInput value={monatsmiete} onChange={setMonatsmiete} /></Field>
              <Field label="Instandhaltung/Jahr (€)"><NumInput value={instandhaltung} onChange={setInstandhaltung} /></Field>
            </div>
            <Check checked={sonder7b} onChange={setSonder7b}
              label="§7b Sonder-AfA (förderfähiger Neubau, +5%/J. über 4 Jahre)" />

            <div className="grid grid-cols-2 gap-3">
              <Stat label="AfA 1. Jahr" value={formatEur(calc.afa.afaGesamtJahr1)} />
              <Stat label="Steuerersparnis 1. J." value={formatEur(calc.afa.steuerersparnisJahr1)} accent />
              <Stat label="Gebäudewert" value={formatEur(Math.round(calc.gebaeudewert))} />
              <Stat label="Cashflow n. Steuern/J." value={formatEur(calc.cashflow)} accent={calc.cashflow >= 0} />
            </div>

            {calc.afa.degressivHinweis && (
              <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>{calc.afa.degressivHinweis}</div>
            )}
            {sonder7b && (
              <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                §7b-Bemessungsgrundlage auf 4.000 €/m² gedeckelt (max. 5.200 €/m² Baukosten). Nur förderfähige Neubau-Mietwohnungen.
              </div>
            )}

            <Disclaimer text="Keine Steuerberatung – dient nur der groben Orientierung. Für die konkrete Veranlagung einen Steuerberater konsultieren." />
          </div>
        </>
      )}
    </div>
  );
}
