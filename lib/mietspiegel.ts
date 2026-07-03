// Grobe Mietspiegel-Richtwerte (€/m² Kaltmiete, Angebotsmieten) nach PLZ-Region.
// ACHTUNG: bewusst grobe, veraltbare Orientierungswerte — im UI editierbar und
// mit Datum/Disclaimer versehen. Ersetzt keinen amtlichen Mietspiegel.

export const MIETSPIEGEL_STAND = 'grobe Richtwerte, Stand 2025';

// €/m² nach 2-stelliger PLZ-Leitregion (nicht flächendeckend – Fallback unten).
const BY_PREFIX2: Record<string, number> = {
  '01': 9.0, '04': 8.5, '06': 7.0, '07': 8.0, '08': 7.0, '09': 7.0,
  '10': 13.5, '12': 13.5, '13': 13.0, '14': 12.0,
  '18': 10.0, '19': 8.0,
  '20': 15.0, '21': 11.5, '22': 15.0, '23': 10.5, '24': 10.0, '25': 9.5,
  '26': 9.5, '27': 9.5, '28': 10.5,
  '30': 11.0, '33': 9.0, '34': 9.0, '37': 10.0, '38': 9.0, '39': 7.5,
  '40': 12.5, '41': 11.0, '42': 9.0, '44': 9.0, '45': 9.0, '46': 8.5,
  '47': 8.5, '48': 11.0, '49': 9.0,
  '50': 13.0, '51': 11.5, '52': 10.0, '53': 12.0, '55': 11.0, '56': 9.0,
  '57': 8.0, '58': 8.5, '59': 8.5,
  '60': 15.5, '61': 13.0, '63': 12.5, '64': 13.0, '65': 12.5, '66': 8.0,
  '67': 10.0, '68': 12.0, '69': 13.5,
  '70': 15.0, '71': 12.5, '72': 12.0, '73': 10.5, '74': 10.0, '75': 10.0,
  '76': 12.0, '77': 10.0, '78': 10.5, '79': 13.0,
  '80': 19.5, '81': 19.5, '82': 15.0, '83': 12.0, '84': 10.5, '85': 14.0,
  '86': 11.5, '87': 11.0, '88': 11.0, '89': 11.0,
  '90': 11.5, '91': 10.0, '92': 9.5, '93': 11.0, '94': 9.5, '95': 8.5,
  '96': 9.0, '97': 10.5, '98': 8.0, '99': 8.5,
};

// Fallback nach 1. Ziffer (Leitzone) und Bundesdurchschnitt.
const BY_PREFIX1: Record<string, number> = {
  '0': 8.0, '1': 12.0, '2': 11.0, '3': 9.0, '4': 9.5,
  '5': 11.0, '6': 12.0, '7': 12.0, '8': 13.0, '9': 9.5,
};

const NATIONAL_AVG = 9.5;

export interface BaseRent {
  value: number;      // €/m²
  source: string;     // woher der Wert stammt
  isTightMarket: boolean; // Heuristik: angespannter Wohnungsmarkt?
}

export function baseRentForPlz(plzRaw: string): BaseRent {
  const plz = (plzRaw || '').replace(/\D/g, '');
  const p2 = plz.slice(0, 2);
  const p1 = plz.slice(0, 1);

  let value = NATIONAL_AVG;
  let source = `Bundesdurchschnitt (${MIETSPIEGEL_STAND})`;

  if (p2 && BY_PREFIX2[p2] != null) {
    value = BY_PREFIX2[p2];
    source = `PLZ-Region ${p2}xxx (${MIETSPIEGEL_STAND})`;
  } else if (p1 && BY_PREFIX1[p1] != null) {
    value = BY_PREFIX1[p1];
    source = `PLZ-Zone ${p1}xxxx (${MIETSPIEGEL_STAND})`;
  }

  // Heuristik für "angespannten Wohnungsmarkt" (Mietpreisbremse-Hinweis):
  // hohe Basismiete ≈ angespannter Markt. Bewusst grob.
  const isTightMarket = value >= 11.5;

  return { value, source, isTightMarket };
}
