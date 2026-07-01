import type { AnalysisResult } from './types';

const KEY = 'airscore_portfolio_v1';

// Gespeicherter Eintrag = vollständiges Analyse-Ergebnis + optionale Notiz.
export interface PortfolioEntry extends AnalysisResult {
  note?: string;
  savedAt: string;
}

function read(): PortfolioEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PortfolioEntry[]) : [];
  } catch {
    return [];
  }
}

function write(items: PortfolioEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* localStorage voll oder gesperrt — still ignorieren */
  }
}

export function getPortfolio(): PortfolioEntry[] {
  return read();
}

export function getEntry(id: string): PortfolioEntry | null {
  return read().find((e) => e.id === id) ?? null;
}

export function isSaved(id: string): boolean {
  return read().some((e) => e.id === id);
}

export function addEntry(result: AnalysisResult, note = ''): PortfolioEntry[] {
  const items = read();
  if (items.some((e) => e.id === result.id)) return items;
  const entry: PortfolioEntry = { ...result, note, savedAt: new Date().toISOString() };
  items.unshift(entry);
  write(items);
  return items;
}

export function removeEntry(id: string): PortfolioEntry[] {
  const items = read().filter((e) => e.id !== id);
  write(items);
  return items;
}

export function updateNote(id: string, note: string): PortfolioEntry[] {
  const items = read().map((e) => (e.id === id ? { ...e, note } : e));
  write(items);
  return items;
}
