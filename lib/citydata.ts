import type { CityInfo, CityType } from './types';

const HIGH_RISK_CITIES = [
  'berlin', 'münchen', 'munich', 'hamburg', 'frankfurt', 'köln', 'cologne',
  'stuttgart', 'düsseldorf', 'dusseldorf', 'freiburg', 'heidelberg',
  'konstanz', 'mannheim', 'münchen', 'augsburg', 'regensburg',
];

const SPA_KEYWORDS = [
  'bad ', 'bad-', 'thermal', 'kurort', 'spa', 'heilbad', 'sole',
];

const TOURISM_KEYWORDS = [
  'rügen', 'sylt', 'usedom', 'bodensee', 'berchtesgaden', 'garmisch',
  'oberstdorf', 'allgäu', 'schwarzwald', 'rothenburg', 'bamberg',
  'cochem', 'bernkastel', 'rdesheim', 'goslar', 'quedlinburg',
];

interface CityRateConfig {
  type: CityType;
  base: number;
  legalRisk: 'low' | 'medium' | 'high';
}

export function detectCityType(
  city: string,
  hasSpaNearby: boolean,
  hasTourismNearby: boolean
): CityRateConfig {
  const lower = city.toLowerCase();

  if (SPA_KEYWORDS.some((k) => lower.includes(k))) {
    return { type: 'kurort', base: 90, legalRisk: 'low' };
  }
  if (TOURISM_KEYWORDS.some((k) => lower.includes(k))) {
    return { type: 'tourismusort', base: 100, legalRisk: 'low' };
  }
  if (hasSpaNearby) {
    return { type: 'kurort', base: 85, legalRisk: 'low' };
  }

  // City size heuristic based on known large cities
  const GROSSSTADTE = [
    'berlin', 'hamburg', 'münchen', 'munich', 'köln', 'cologne', 'frankfurt',
    'stuttgart', 'düsseldorf', 'dortmund', 'essen', 'leipzig', 'bremen',
    'dresden', 'hannover', 'nürnberg', 'nuremberg', 'duisburg', 'bochum',
    'wuppertal', 'bielefeld', 'bonn', 'münster', 'karlsruhe', 'mannheim',
    'augsburg', 'wiesbaden', 'gelsenkirchen', 'mönchengladbach', 'braunschweig',
    'chemnitz', 'kiel', 'aachen', 'halle', 'magdeburg', 'freiburg',
  ];
  const MIDSTADTE = [
    'erfurt', 'rostock', 'kassel', 'hagen', 'hamm', 'ludwigshafen', 'mainz',
    'saarbrücken', 'krefeld', 'solingen', 'osnabrück', 'lübeck', 'oberhausen',
    'potsdam', 'heidelberg', 'darmstadt', 'regensburg', 'würzburg', 'göttingen',
    'wolfsburg', 'offenbach', 'ulm', 'ingolstadt', 'heilbronn', 'pforzheim',
  ];

  if (GROSSSTADTE.some((g) => lower.includes(g))) {
    return { type: 'grossstadt', base: 100, legalRisk: 'high' };
  }
  if (MIDSTADTE.some((m) => lower.includes(m))) {
    return { type: 'mittelstadt', base: 80, legalRisk: 'medium' };
  }
  if (hasTourismNearby) {
    return { type: 'tourismusort', base: 85, legalRisk: 'low' };
  }

  return { type: 'kleinstadt', base: 65, legalRisk: 'low' };
}

const LEGAL_HINTS_BY_RISK: Record<string, string[]> = {
  high: [
    'In dieser Stadt gibt es bekannte Zweckentfremdungsverbote – Genehmigung zwingend erforderlich.',
    'Schriftliche Erlaubnis des Vermieters zur touristischen Untervermietung ist Pflicht.',
    'Registrierungsnummer für Kurzzeitmietungen bei der Stadt beantragen.',
    'Bei Verstoß drohen hohe Bußgelder (bis zu 500.000 €).',
    'Prüfe die aktuelle Rechtslage mit einem spezialisierten Anwalt oder beim Amt.',
  ],
  medium: [
    'In dieser Region gibt es möglicherweise Einschränkungen für Kurzzeitvermietung.',
    'Schriftliche Erlaubnis des Vermieters ist in jedem Fall erforderlich.',
    'Kurtaxe/Beherbergungssteuer kann anfallen – bei der Gemeinde anfragen.',
    'Meldepflicht für Gäste gemäß Bundesmeldegesetz (ab 1 Übernachtung) beachten.',
    'Steuerliche Einkünfte aus Vermietung dem Finanzamt melden.',
  ],
  low: [
    'Kein bekanntes stadtweites Zweckentfremdungsverbot.',
    'Schriftliche Erlaubnis des Vermieters zur Untervermietung ist dennoch Pflicht.',
    'Kurtaxe/Gästebeitrag prüfen – in Kurorten oft obligatorisch.',
    'Einkünfte aus Kurzzeitvermietung sind einkommensteuerpflichtig.',
    'Umsatzsteuer beachten: Kleinunternehmerregelung bis 22.000 € Jahresumsatz möglich.',
  ],
};

export function buildCityInfo(
  city: string,
  hasSpaNearby: boolean,
  hasTourismNearby: boolean
): CityInfo {
  const config = detectCityType(city, hasSpaNearby, hasTourismNearby);

  const legalHints = LEGAL_HINTS_BY_RISK[config.legalRisk];

  return {
    type: config.type,
    avgDailyRateBase: config.base,
    legalRisk: config.legalRisk,
    legalHints,
  };
}

export function cityTypeLabel(type: CityType): string {
  const labels: Record<CityType, string> = {
    grossstadt: 'Großstadt',
    mittelstadt: 'Mittelstadt',
    kleinstadt: 'Kleinstadt',
    kurort: 'Kurort / Heilbad',
    tourismusort: 'Tourismusort',
  };
  return labels[type];
}
