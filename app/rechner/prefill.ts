// Gemeinsame Vorbefüllung, die der Listing-Import an die Rechner weiterreicht.
export interface Prefill {
  plz?: string;
  sqm?: number;
  rooms?: number;
  baujahr?: number;
  kaufpreis?: number;
}

export const EMPTY_PREFILL: Prefill = {};
