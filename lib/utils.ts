import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDist(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function scoreColor(score: number): string {
  if (score >= 90) return '#16a34a';
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Sehr starkes Objekt';
  if (score >= 75) return 'Gutes Potenzial';
  if (score >= 60) return 'Interessant – genauer prüfen';
  if (score >= 40) return 'Riskant – nur bei günstiger Miete';
  return 'Eher ungeeignet';
}

export function recoBadge(rec: string): { label: string; color: string } {
  if (rec === 'ja') return { label: 'Empfohlen', color: '#16a34a' };
  if (rec === 'pruefen') return { label: 'Weiter prüfen', color: '#d97706' };
  return { label: 'Nicht empfohlen', color: '#dc2626' };
}
