// Abschreibung (AfA) für vermietete Immobilien — grobe Orientierung, KEINE
// Steuerberatung. Sätze/Regeln veralten; im UI als Richtwerte kennzeichnen.

export type AfaMethode = 'linear' | 'degressiv';

// Linearer AfA-Satz nach Baujahr (Gebäude, Vermietung).
export function linearAfaSatz(baujahr?: number): number {
  if (!baujahr) return 2.0;
  if (baujahr < 1925) return 2.5;
  if (baujahr >= 2023) return 3.0;
  return 2.0;
}

export interface AfaInput {
  gebaeudewert: number;       // Kaufpreis abzüglich Grundstücksanteil
  baujahr?: number;
  grenzsteuersatz: number;    // %
  methode: AfaMethode;
  // §7b Sonder-AfA (optional, nur förderfähige Neubau-Mietwohnungen)
  sonder7b: boolean;
  wohnflaeche?: number;       // m² – für §7b-Deckelung
}

export interface AfaResult {
  methode: AfaMethode;
  linearSatz: number;
  afaJahr1: number;           // reguläre AfA im 1. Jahr
  degressivHinweis?: string;
  sonder7bJahr1: number;      // zusätzliche §7b-AfA im 1. Jahr (0 wenn aus)
  afaGesamtJahr1: number;     // regulär + §7b
  steuerersparnisJahr1: number;
}

const SONDER7B_CAP_QM = 4000; // Bemessungsgrundlage gedeckelt auf 4.000 €/m²

export function calcAfa(i: AfaInput): AfaResult {
  const linearSatz = linearAfaSatz(i.baujahr);

  let afaJahr1: number;
  let degressivHinweis: string | undefined;

  if (i.methode === 'degressiv') {
    // Degressiv: 5 % vom (Rest-)Wert p.a., 1. Jahr = 5 % vom Gebäudewert.
    afaJahr1 = i.gebaeudewert * 0.05;
    degressivHinweis =
      'Degressiv 5 % vom Restwert p.a. (nur Neubau, Baubeginn 01.10.2023–30.09.2029). ' +
      'Ein späterer Wechsel zur linearen AfA ist möglich und oft sinnvoll.';
  } else {
    afaJahr1 = i.gebaeudewert * (linearSatz / 100);
  }

  // §7b Sonder-AfA: zusätzlich 5 %/Jahr über 4 Jahre, Bemessungsgrundlage
  // gedeckelt auf 4.000 €/m² Wohnfläche.
  let sonder7bJahr1 = 0;
  if (i.sonder7b) {
    const cap = i.wohnflaeche ? SONDER7B_CAP_QM * i.wohnflaeche : i.gebaeudewert;
    const basis = Math.min(i.gebaeudewert, cap);
    sonder7bJahr1 = basis * 0.05;
  }

  const afaGesamtJahr1 = afaJahr1 + sonder7bJahr1;
  const steuerersparnisJahr1 = afaGesamtJahr1 * (i.grenzsteuersatz / 100);

  return {
    methode: i.methode,
    linearSatz,
    afaJahr1: Math.round(afaJahr1),
    degressivHinweis,
    sonder7bJahr1: Math.round(sonder7bJahr1),
    afaGesamtJahr1: Math.round(afaGesamtJahr1),
    steuerersparnisJahr1: Math.round(steuerersparnisJahr1),
  };
}

// Cashflow nach Steuern (jährlich): Miete − Zins − Instandhaltung + Steuerersparnis.
export function cashflowNachSteuern(params: {
  jahresmiete: number;
  jahresZins: number;
  instandhaltung: number;
  steuerersparnisJahr: number;
}): number {
  return Math.round(
    params.jahresmiete - params.jahresZins - params.instandhaltung + params.steuerersparnisJahr
  );
}
