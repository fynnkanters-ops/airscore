import type { CityInfo, FinancialData, POIData, PropertyInput, Scores } from './types';

export function calcScores(
  pois: POIData,
  finance: FinancialData,
  cityInfo: CityInfo,
  input: PropertyInput
): Scores {
  // --- Location (max 20) ---
  let location = 0;

  const nearestStation = pois.stations[0];
  if (nearestStation) {
    if (nearestStation.distanceM < 500) location += 5;
    else if (nearestStation.distanceM < 1000) location += 4;
    else if (nearestStation.distanceM < 2000) location += 3;
    else if (nearestStation.distanceM < 3000) location += 1;
  }

  const nearestMotorway = pois.motorways[0];
  if (nearestMotorway) {
    if (nearestMotorway.distanceM < 5000) location += 3;
    else if (nearestMotorway.distanceM < 10000) location += 3;
    else if (nearestMotorway.distanceM < 20000) location += 2;
  }

  const nearestAirport = pois.airports[0];
  if (nearestAirport) {
    if (nearestAirport.distanceM < 15000) location += 4;
    else if (nearestAirport.distanceM < 30000) location += 4;
    else if (nearestAirport.distanceM < 60000) location += 2;
  }

  const diningNearby = [...pois.restaurants, ...pois.cafes].filter(
    (p) => p.distanceM < 500
  ).length;
  if (diningNearby >= 3) location += 2;
  else if (diningNearby >= 1) location += 1;

  const nearestSupermarket = pois.supermarkets[0];
  if (nearestSupermarket) {
    if (nearestSupermarket.distanceM < 500) location += 2;
    else if (nearestSupermarket.distanceM < 1000) location += 1;
  }

  if (input.hasParking || pois.parkings.length > 0) location += 2;

  // Safe neighbourhood default: +2 (can't reliably determine from OSM)
  location += 2;

  location = Math.min(20, location);

  // --- Demand (max 20) ---
  let demand = 0;

  const nearestSpa = pois.spas[0];
  if (nearestSpa) {
    if (nearestSpa.distanceM < 2000) demand += 5;
    else if (nearestSpa.distanceM < 5000) demand += 5;
    else if (nearestSpa.distanceM < 10000) demand += 3;
  }

  const nearestClinic = pois.clinics[0];
  if (nearestClinic) {
    if (nearestClinic.distanceM < 2000) demand += 4;
    else if (nearestClinic.distanceM < 5000) demand += 4;
    else if (nearestClinic.distanceM < 8000) demand += 2;
  }

  const nearestUni = pois.universities[0];
  if (nearestUni) {
    if (nearestUni.distanceM < 2000) demand += 3;
    else if (nearestUni.distanceM < 5000) demand += 3;
    else if (nearestUni.distanceM < 8000) demand += 1;
  }

  const nearestEvent = pois.eventVenues[0];
  if (nearestEvent) {
    if (nearestEvent.distanceM < 5000) demand += 3;
    else if (nearestEvent.distanceM < 15000) demand += 2;
  }

  if (pois.tourism.length >= 3) demand += 3;
  else if (pois.tourism.length >= 1) demand += 2;

  if (cityInfo.type === 'kurort' || cityInfo.type === 'tourismusort') demand += 2;

  demand = Math.min(20, demand);

  // --- Competition (max 15) ---
  // MVP: estimate based on city type (no real Airbnb data)
  let competition = 0;
  if (cityInfo.type === 'kleinstadt') competition = 12;
  else if (cityInfo.type === 'kurort') competition = 10;
  else if (cityInfo.type === 'tourismusort') competition = 9;
  else if (cityInfo.type === 'mittelstadt') competition = 8;
  else if (cityInfo.type === 'grossstadt') competition = 5;

  competition = Math.min(15, competition);

  // --- Finance (max 20) ---
  const financeScore = finance_score(0, input.warmmiete, cityInfo);

  // --- Automation (max 10) ---
  let automation = 6;
  if (input.hasParking) automation += 1;
  if (input.objectType !== 'buero') automation += 1;
  if (input.objectType === 'wohnung' || input.objectType === 'apartment') automation += 2;
  automation = Math.min(10, automation);

  // --- Legal (max 15) ---
  let legal = 0;
  if (cityInfo.legalRisk === 'low') legal = 13;
  else if (cityInfo.legalRisk === 'medium') legal = 9;
  else legal = 5;

  if (input.objectType === 'buero') legal = Math.max(0, legal - 4);

  const total =
    location +
    demand +
    competition +
    financeScore +
    automation +
    legal;

  return {
    location,
    demand,
    competition,
    finance: financeScore,
    automation,
    legal,
    total: Math.min(100, total),
  };
}

function finance_score(
  _placeholder: number,
  warmmiete: number | undefined,
  cityInfo: CityInfo
): number {
  // If no warmmiete provided, score based on city type potential
  if (!warmmiete) {
    if (cityInfo.type === 'grossstadt') return 14;
    if (cityInfo.type === 'kurort' || cityInfo.type === 'tourismusort') return 16;
    if (cityInfo.type === 'mittelstadt') return 12;
    return 10;
  }
  return 0; // will be updated below with ratio
}

export function calcFinanceScore(
  revenueToRentRatio: number | null,
  breakEvenPct: number,
  warmmiete: number | undefined,
  cityInfo: CityInfo
): number {
  if (!warmmiete || revenueToRentRatio === null) {
    if (cityInfo.type === 'grossstadt') return 14;
    if (cityInfo.type === 'kurort' || cityInfo.type === 'tourismusort') return 16;
    if (cityInfo.type === 'mittelstadt') return 12;
    return 10;
  }

  if (revenueToRentRatio >= 2.5) return 20;
  if (revenueToRentRatio >= 2.3) return 18;
  if (revenueToRentRatio >= 2.0) return 15;
  if (revenueToRentRatio >= 1.7) return 10;
  if (revenueToRentRatio >= 1.4) return 6;
  return 2;
}

export function calcFullScores(
  pois: POIData,
  finance: FinancialData,
  cityInfo: CityInfo,
  input: PropertyInput
): Scores {
  const raw = calcScores(pois, finance, cityInfo, input);

  const financeScore = calcFinanceScore(
    finance.revenueToRentRatio,
    finance.breakEvenPct,
    input.warmmiete,
    cityInfo
  );

  const total = raw.location + raw.demand + raw.competition + financeScore + raw.automation + raw.legal;

  return {
    ...raw,
    finance: financeScore,
    total: Math.min(100, total),
  };
}
