import { baseRentForPlz } from './mietspiegel';

// Regelbasierter Mietwert-Score → grobe Orientierung für eine ortsübliche
// Kaltmiete. Keine Wertermittlung, kein amtlicher Mietspiegel.

export type Zustand = 'neuwertig' | 'renoviert' | 'normal' | 'sanierungsbeduerftig';
export type Wohnlage = 'einfach' | 'mittel' | 'gut' | 'bevorzugt';
export type Energieklasse = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'unbekannt';

export interface Ausstattung {
  balkon: boolean;
  ebk: boolean;          // Einbauküche
  aufzug: boolean;
  stellplatz: boolean;
  keller: boolean;
  hochwertigerBoden: boolean;
}

export interface MietwertInput {
  plz: string;
  sqm: number;
  rooms?: number;
  etage?: number;
  baujahr?: number;
  zustand: Zustand;
  wohnlage: Wohnlage;
  ausstattung: Ausstattung;
  energieklasse: Energieklasse;
  baseOverride?: number; // €/m² manuell
}

// Konfigurierbare Gewichtung (Summe = 1).
export const MIETWERT_WEIGHTS = {
  zustand: 0.25,
  lage: 0.25,
  ausstattung: 0.20,
  energie: 0.15,
  baujahr: 0.15,
};

const ZUSTAND_SCORE: Record<Zustand, number> = {
  neuwertig: 100, renoviert: 75, normal: 50, sanierungsbeduerftig: 20,
};
const LAGE_SCORE: Record<Wohnlage, number> = {
  einfach: 30, mittel: 55, gut: 78, bevorzugt: 95,
};
const ENERGIE_SCORE: Record<Energieklasse, number> = {
  'A+': 100, 'A': 92, 'B': 84, 'C': 74, 'D': 62, 'E': 50, 'F': 38, 'G': 25, 'H': 12, 'unbekannt': 50,
};

function ausstattungScore(a: Ausstattung): number {
  let s = 0;
  if (a.balkon) s += 15;
  if (a.ebk) s += 25;
  if (a.aufzug) s += 15;
  if (a.stellplatz) s += 20;
  if (a.keller) s += 10;
  if (a.hochwertigerBoden) s += 15;
  return Math.min(100, s);
}

function baujahrScore(baujahr?: number): number {
  if (!baujahr) return 50;
  if (baujahr >= 2015) return 100;
  if (baujahr >= 2000) return 82;
  if (baujahr >= 1980) return 62;
  if (baujahr >= 1950) return 42;
  if (baujahr >= 1925) return 30;
  return 25;
}

export interface MietwertResult {
  score: number;                 // 0–100
  subScores: { zustand: number; lage: number; ausstattung: number; energie: number; baujahr: number };
  baseEurQm: number;             // verwendeter €/m²-Basiswert
  baseSource: string;
  eurQm: { min: number; mittel: number; max: number };
  kaltmiete: { min: number; mittel: number; max: number };
  vsDurchschnittPct: number;     // Abweichung mittel-€/m² zum Basiswert (%)
  isTightMarket: boolean;
}

export function calcMietwert(input: MietwertInput): MietwertResult {
  const sub = {
    zustand: ZUSTAND_SCORE[input.zustand],
    lage: LAGE_SCORE[input.wohnlage],
    ausstattung: ausstattungScore(input.ausstattung),
    energie: ENERGIE_SCORE[input.energieklasse],
    baujahr: baujahrScore(input.baujahr),
  };

  const score = Math.round(
    sub.zustand * MIETWERT_WEIGHTS.zustand +
    sub.lage * MIETWERT_WEIGHTS.lage +
    sub.ausstattung * MIETWERT_WEIGHTS.ausstattung +
    sub.energie * MIETWERT_WEIGHTS.energie +
    sub.baujahr * MIETWERT_WEIGHTS.baujahr
  );

  const base = baseRentForPlz(input.plz);
  const baseEurQm = input.baseOverride && input.baseOverride > 0 ? input.baseOverride : base.value;

  // Score 0–100 → Faktor 0,82 … 1,18 auf den Basiswert.
  const factor = 0.82 + (score / 100) * 0.36;
  const mittelQm = baseEurQm * factor;
  const eurQm = {
    min: Math.round(mittelQm * 0.92 * 100) / 100,
    mittel: Math.round(mittelQm * 100) / 100,
    max: Math.round(mittelQm * 1.08 * 100) / 100,
  };

  const sqm = input.sqm || 0;
  const kaltmiete = {
    min: Math.round(eurQm.min * sqm),
    mittel: Math.round(eurQm.mittel * sqm),
    max: Math.round(eurQm.max * sqm),
  };

  const vsDurchschnittPct = Math.round(((eurQm.mittel - baseEurQm) / baseEurQm) * 100);

  return {
    score,
    subScores: sub,
    baseEurQm,
    baseSource: input.baseOverride ? 'manuell eingegeben' : base.source,
    eurQm,
    kaltmiete,
    vsDurchschnittPct,
    isTightMarket: base.isTightMarket,
  };
}
