'use client';

import { useState } from 'react';
import { MietwertCalc } from '@/components/rechner/MietwertCalc';
import { FinanzierungCalc } from '@/components/rechner/FinanzierungCalc';
import { ImportBox } from '@/components/rechner/ImportBox';
import { EMPTY_PREFILL, type Prefill } from './prefill';

type Segment = 'mietwert' | 'finanzierung' | 'import';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'mietwert', label: 'Mietwert' },
  { id: 'finanzierung', label: 'Finanzierung' },
  { id: 'import', label: 'Import' },
];

export default function RechnerPage() {
  const [seg, setSeg] = useState<Segment>('mietwert');
  const [prefill, setPrefill] = useState<Prefill>(EMPTY_PREFILL);

  function handleImport(p: Prefill) {
    setPrefill(p);
    // Nach Import direkt zum Mietwert-Rechner springen (nutzt die Felder)
    setSeg('mietwert');
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
      <header className="text-center animate-rise">
        <div className="inline-block px-3 py-1 mb-3 rounded-full text-xs font-semibold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          Vermietung & Finanzierung
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Rechner</h1>
        <p style={{ color: 'var(--muted-fg)' }} className="mt-1">
          Mietwert schätzen, Baufinanzierung & Abschreibung durchrechnen.
        </p>
      </header>

      <div className="flex justify-center">
        <div className="segmented">
          {SEGMENTS.map((s) => (
            <button key={s.id} data-active={seg === s.id} onClick={() => setSeg(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {seg === 'mietwert' && <MietwertCalc prefill={prefill} />}
      {seg === 'finanzierung' && <FinanzierungCalc prefill={prefill} />}
      {seg === 'import' && <ImportBox onImport={handleImport} />}
    </div>
  );
}
