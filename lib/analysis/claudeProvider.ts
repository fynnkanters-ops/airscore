import type { AnalysisProvider } from './provider';
import type { AnalysisResult, AIAnalysis } from '../types';

/**
 * Provider, der den Bericht von einem externen Backend/LLM-Endpoint holt.
 *
 * Das Backend bekommt das komplette AnalysisResult als JSON (POST) und muss
 * `{ ai: AIAnalysis }` zurückgeben. Damit funktioniert sowohl:
 *  - die mitgelieferte Beispiel-Route (server-examples/analyze-route.ts, z. B. auf Vercel),
 *  - als auch ein eigenes Backend / eine eigene API-Schnittstelle.
 *
 * Aktiviert über die Umgebungsvariablen:
 *   NEXT_PUBLIC_ANALYSIS_MODE=claude
 *   NEXT_PUBLIC_ANALYSIS_ENDPOINT=https://dein-backend/api/analyze
 */
export function createClaudeProvider(endpoint: string): AnalysisProvider {
  return {
    id: 'claude',
    label: 'Externes Backend / Claude',
    requiresNetwork: true,
    async generateReport(r: AnalysisResult): Promise<AIAnalysis> {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      });
      if (!res.ok) throw new Error('Analyse-Backend Fehler: ' + res.status);
      const data = await res.json();
      if (!data.ai) throw new Error('Backend lieferte kein gültiges AIAnalysis-Objekt.');
      return data.ai as AIAnalysis;
    },
  };
}
