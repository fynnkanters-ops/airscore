export type ObjectType = 'wohnung' | 'apartment' | 'studio' | 'buero';
export type BuildYear = 'vor1980' | '1980-2000' | 'nach2000';
export type CityType = 'grossstadt' | 'mittelstadt' | 'kleinstadt' | 'kurort' | 'tourismusort';
export type LegalRisk = 'low' | 'medium' | 'high';
export type Recommendation = 'ja' | 'pruefen' | 'nein';

export interface PropertyInput {
  addressRaw: string;
  objectType: ObjectType;
  warmmiete?: number;
  sqm?: number;
  rooms?: number;
  hasParking: boolean;
  hasBalcony: boolean;
  buildYear?: BuildYear;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  state: string;
  country: string;
  addressNorm: string;
  displayName: string;
}

export interface POI {
  id: string;
  type: string;
  name: string;
  distanceM: number;
  lat: number;
  lng: number;
}

export interface POIData {
  stations: POI[];
  supermarkets: POI[];
  restaurants: POI[];
  cafes: POI[];
  clinics: POI[];
  universities: POI[];
  tourism: POI[];
  spas: POI[];
  airports: POI[];
  motorways: POI[];
  parkings: POI[];
  eventVenues: POI[];
  parks: POI[];
}

export interface SubScores {
  location: number;
  demand: number;
  competition: number;
  finance: number;
  automation: number;
  legal: number;
}

export interface Scores extends SubScores {
  total: number;
}

export interface CostSettings {
  electricity: number;
  internet: number;
  cleaningPerStay: number;
  avgStayDuration: number;
  laundry: number;
  airbnbFeePercent: number;
  consumables: number;
  wearTear: number;
  insurance: number;
  software: number;
  reserve: number;
}

export interface Scenario {
  pct: number;
  nights: number;
  revenue: number;
  costs: number;
  profit: number;
}

export interface FinancialData {
  avgDailyRate: number;
  scenarios: {
    s40: Scenario;
    s55: Scenario;
    s70: Scenario;
  };
  fixedCosts: number;
  breakEvenNights: number;
  breakEvenPct: number;
  revenueToRentRatio: number | null;
  costSettings: CostSettings;
}

export interface CityInfo {
  type: CityType;
  avgDailyRateBase: number;
  legalRisk: LegalRisk;
  legalHints: string[];
}

export interface AIAnalysis {
  summary: string;
  locationAnalysis: string;
  demandAnalysis: string;
  targetGroups: string[];
  legalNotes: string[];
  marketGap: string;
  automationNotes: string;
  equipmentRecommendations: Array<{ group: string; items: string[] }>;
  nextSteps: string[];
  recommendation: Recommendation;
  recommendationReason: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  input: PropertyInput;
  location: GeoLocation;
  pois: POIData;
  scores: Scores;
  finance: FinancialData;
  ai: AIAnalysis | null;
  cityInfo: CityInfo;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  addresstype?: string;
  importance?: number;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export type MatchPrecision = 'exact' | 'street' | 'city' | 'area';
