import type { CostSettings, FinancialData, Scenario } from './types';

export const DEFAULT_COST_SETTINGS: CostSettings = {
  electricity: 80,
  internet: 30,
  cleaningPerStay: 50,
  avgStayDuration: 3,
  laundry: 40,
  airbnbFeePercent: 3,
  consumables: 20,
  wearTear: 30,
  insurance: 20,
  software: 20,
  reserve: 30,
};

function calcScenario(
  pct: number,
  avgDailyRate: number,
  warmmiete: number | undefined,
  settings: CostSettings
): Scenario {
  const nights = 30 * pct;
  const revenue = nights * avgDailyRate;
  const stays = nights / settings.avgStayDuration;

  const cleaningCost = stays * settings.cleaningPerStay;
  const platformFee = revenue * (settings.airbnbFeePercent / 100);
  const variableCosts = cleaningCost + settings.laundry + settings.consumables + platformFee;

  const fixedBase =
    settings.electricity +
    settings.internet +
    settings.wearTear +
    settings.insurance +
    settings.software +
    settings.reserve;

  const fixedCosts = (warmmiete ?? 0) + fixedBase;
  const totalCosts = fixedCosts + variableCosts;
  const profit = revenue - totalCosts;

  return { pct, nights, revenue, costs: totalCosts, profit };
}

export function calcFinancials(
  avgDailyRate: number,
  warmmiete: number | undefined,
  settings: CostSettings = DEFAULT_COST_SETTINGS
): FinancialData {
  const s40 = calcScenario(0.4, avgDailyRate, warmmiete, settings);
  const s55 = calcScenario(0.55, avgDailyRate, warmmiete, settings);
  const s70 = calcScenario(0.7, avgDailyRate, warmmiete, settings);

  const fixedBase =
    settings.electricity +
    settings.internet +
    settings.wearTear +
    settings.insurance +
    settings.software +
    settings.reserve;
  const fixedCosts = (warmmiete ?? 0) + fixedBase;

  const breakEvenNights = fixedCosts / avgDailyRate;
  const breakEvenPct = (breakEvenNights / 30) * 100;
  const revenueToRentRatio =
    warmmiete && warmmiete > 0 ? s55.revenue / warmmiete : null;

  return {
    avgDailyRate,
    scenarios: { s40, s55, s70 },
    fixedCosts,
    breakEvenNights,
    breakEvenPct,
    revenueToRentRatio,
    costSettings: settings,
  };
}

export function estimateDailyRate(
  baseRate: number,
  hasParking: boolean,
  hasBalcony: boolean,
  buildYear?: string,
  sqm?: number
): number {
  let rate = baseRate;
  if (hasParking) rate *= 1.1;
  if (hasBalcony) rate *= 1.05;
  if (buildYear === 'nach2000') rate *= 1.08;
  if (buildYear === 'vor1980') rate *= 0.92;
  if (sqm && sqm > 70) rate *= 1.1;
  if (sqm && sqm < 30) rate *= 0.88;
  return Math.round(rate);
}
