import type { AnalysisResult, AIAnalysis } from '../types';

/**
 * Ein AnalysisProvider erzeugt aus den Roh-Analysedaten (Scores, POIs, Finanzen)
 * den textlichen Bericht (AIAnalysis).
 *
 * Diese Abstraktion ist der zentrale Erweiterungspunkt der App:
 *  - `localProvider`  – regelbasiert, läuft im Browser, KEIN API-Key nötig (Default).
 *  - `claudeProvider` – ruft ein konfigurierbares Backend/Claude-Endpoint auf.
 *  - eigene Provider   – einfach dieses Interface implementieren und in index.ts
 *                        registrieren (z. B. eigener ML-Service, andere LLM-API).
 *
 * Wichtig: Der Rückgabewert ist IMMER das gleiche AIAnalysis-Format, damit die
 * Bericht-UI unverändert bleibt, egal welcher Provider aktiv ist.
 */
export interface AnalysisProvider {
  /** Stabile ID, z. B. 'local' | 'claude' */
  readonly id: string;
  /** Anzeigename für UI/Debug */
  readonly label: string;
  /** Braucht dieser Provider einen API-Key / Server? */
  readonly requiresNetwork: boolean;
  /** Erzeugt den Bericht. Sollte nie unkontrolliert werfen (Fallback einplanen). */
  generateReport(result: AnalysisResult): Promise<AIAnalysis>;
}
