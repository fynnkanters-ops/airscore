import type { AnalysisProvider } from './provider';
import type { AnalysisResult, AIAnalysis } from '../types';
import { localProvider } from './localProvider';
import { createClaudeProvider } from './claudeProvider';

export type { AnalysisProvider } from './provider';
export { localProvider } from './localProvider';

/**
 * Wählt den aktiven Provider anhand der Konfiguration.
 * Standard = lokal (kein Key, läuft als statische PWA auf GitHub Pages).
 *
 * Zum Aktivieren eines Backends in .env.local:
 *   NEXT_PUBLIC_ANALYSIS_MODE=claude
 *   NEXT_PUBLIC_ANALYSIS_ENDPOINT=https://dein-backend/api/analyze
 */
export function getProvider(): AnalysisProvider {
  const mode = process.env.NEXT_PUBLIC_ANALYSIS_MODE;
  const endpoint = process.env.NEXT_PUBLIC_ANALYSIS_ENDPOINT;
  if (mode === 'claude' && endpoint) {
    return createClaudeProvider(endpoint);
  }
  return localProvider;
}

/**
 * Erzeugt den Bericht über den aktiven Provider und fällt bei Fehlern
 * (z. B. Backend nicht erreichbar) automatisch auf die lokale Engine zurück,
 * damit IMMER ein Bericht entsteht.
 */
export async function generateReport(result: AnalysisResult): Promise<AIAnalysis> {
  const provider = getProvider();
  try {
    return await provider.generateReport(result);
  } catch {
    if (provider.id !== 'local') {
      return localProvider.generateReport(result);
    }
    throw new Error('Berichtserstellung fehlgeschlagen.');
  }
}
