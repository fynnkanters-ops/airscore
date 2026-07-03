// Baufinanzierung: Annuitätendarlehen, Kaufnebenkosten, Grunderwerbsteuer.
// Alle Sätze/Zinsen sind editierbare Richtwerte (siehe UI), keine feste Wahrheit.

export const FINANZIERUNG_STAND = 'Richtwert Stand Juli 2026';
export const DEFAULT_ZINS_PROZENT = 3.8;   // 10-J.-Bindung, Richtwert Juli 2026
export const DEFAULT_TILGUNG_PROZENT = 2.0;

// Grunderwerbsteuer je Bundesland (%), Stand 2025 – editierbar/veraltbar.
export const GRUNDERWERBSTEUER: Record<string, number> = {
  'Baden-Württemberg': 5.0,
  'Bayern': 3.5,
  'Berlin': 6.0,
  'Brandenburg': 6.5,
  'Bremen': 5.0,
  'Hamburg': 5.5,
  'Hessen': 6.0,
  'Mecklenburg-Vorpommern': 6.0,
  'Niedersachsen': 5.0,
  'Nordrhein-Westfalen': 6.5,
  'Rheinland-Pfalz': 5.0,
  'Saarland': 6.5,
  'Sachsen': 5.5,
  'Sachsen-Anhalt': 5.0,
  'Schleswig-Holstein': 6.5,
  'Thüringen': 5.0,
};

export const BUNDESLAENDER = Object.keys(GRUNDERWERBSTEUER);

export interface NebenkostenInput {
  kaufpreis: number;
  bundesland: string;
  maklerProzent: number;   // 0–7
  notarProzent?: number;   // Default 1,5
  grundbuchProzent?: number; // Default 0,5
}

export interface NebenkostenResult {
  grunderwerb: number;
  makler: number;
  notar: number;
  grundbuch: number;
  summe: number;
  gesamtkosten: number; // Kaufpreis + Nebenkosten
  prozent: number;      // Nebenkosten in % vom Kaufpreis
}

export function calcNebenkosten(i: NebenkostenInput): NebenkostenResult {
  const grestSatz = GRUNDERWERBSTEUER[i.bundesland] ?? 5.0;
  const notarP = i.notarProzent ?? 1.5;
  const grundbuchP = i.grundbuchProzent ?? 0.5;

  const grunderwerb = i.kaufpreis * (grestSatz / 100);
  const makler = i.kaufpreis * (i.maklerProzent / 100);
  const notar = i.kaufpreis * (notarP / 100);
  const grundbuch = i.kaufpreis * (grundbuchP / 100);
  const summe = grunderwerb + makler + notar + grundbuch;

  return {
    grunderwerb, makler, notar, grundbuch, summe,
    gesamtkosten: i.kaufpreis + summe,
    prozent: i.kaufpreis > 0 ? Math.round((summe / i.kaufpreis) * 1000) / 10 : 0,
  };
}

export interface AnnuityInput {
  darlehen: number;
  zinsProzent: number;
  tilgungProzent: number;
  zinsbindungJahre: number;
}

export interface AnnuityYear {
  jahr: number;
  zins: number;
  tilgung: number;
  restschuld: number;
}

export interface AnnuityResult {
  monatlicheRate: number;
  jahre: AnnuityYear[];              // bis Zinsbindungsende
  restschuldNachBindung: number;
  gesamtZinsBindung: number;         // Summe Zinsen über die Zinsbindung
  volltilgungJahre: number | null;  // geschätzte Jahre bis Restschuld 0 (bei konstanter Rate)
}

export function calcAnnuity(i: AnnuityInput): AnnuityResult {
  const monatlicheRate = (i.darlehen * (i.zinsProzent + i.tilgungProzent)) / 100 / 12;
  const monatszins = i.zinsProzent / 100 / 12;

  let restschuld = i.darlehen;
  const jahre: AnnuityYear[] = [];
  let gesamtZinsBindung = 0;
  let jahrZins = 0, jahrTilgung = 0;
  let volltilgungMonate: number | null = null;

  const maxMonate = 50 * 12;
  for (let m = 1; m <= maxMonate && restschuld > 0.01; m++) {
    const zinsAnteil = restschuld * monatszins;
    let tilgAnteil = monatlicheRate - zinsAnteil;
    if (tilgAnteil <= 0) break; // Rate deckt Zins nicht → keine Tilgung
    if (tilgAnteil > restschuld) tilgAnteil = restschuld;

    restschuld -= tilgAnteil;
    jahrZins += zinsAnteil;
    jahrTilgung += tilgAnteil;

    const jahrIndex = Math.ceil(m / 12);
    if (jahrIndex <= i.zinsbindungJahre) gesamtZinsBindung += zinsAnteil;

    if (m % 12 === 0) {
      if (jahrIndex <= i.zinsbindungJahre) {
        jahre.push({ jahr: jahrIndex, zins: Math.round(jahrZins), tilgung: Math.round(jahrTilgung), restschuld: Math.round(restschuld) });
      }
      jahrZins = 0; jahrTilgung = 0;
    }
    if (restschuld <= 0.01 && volltilgungMonate === null) volltilgungMonate = m;
  }

  // Restschuld exakt am Zinsbindungsende (falls noch nicht getilgt)
  const restschuldNachBindung = jahre.length >= i.zinsbindungJahre
    ? jahre[i.zinsbindungJahre - 1].restschuld
    : Math.round(restschuld);

  return {
    monatlicheRate: Math.round(monatlicheRate * 100) / 100,
    jahre,
    restschuldNachBindung,
    gesamtZinsBindung: Math.round(gesamtZinsBindung),
    volltilgungJahre: volltilgungMonate ? Math.round((volltilgungMonate / 12) * 10) / 10 : null,
  };
}
