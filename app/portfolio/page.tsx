'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPortfolio, removeEntry, updateNote, type PortfolioEntry } from '@/lib/storage';
import { cityTypeLabel } from '@/lib/citydata';
import { formatEur, scoreColor, scoreLabel, recoBadge } from '@/lib/utils';

type SortKey = 'score' | 'date' | 'ratio';

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center justify-center rounded-lg flex-shrink-0"
      style={{ width: 56, height: 56, background: color + '22', border: `2px solid ${color}` }}>
      <span className="text-xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(getPortfolio());
    setLoaded(true);
  }, []);

  function handleRemove(id: string) {
    setEntries(removeEntry(id));
  }

  function handleNote(id: string, note: string) {
    updateNote(id, note);
  }

  const sorted = [...entries].sort((a, b) => {
    if (sortKey === 'score') return b.scores.total - a.scores.total;
    if (sortKey === 'ratio') return (b.finance.revenueToRentRatio ?? 0) - (a.finance.revenueToRentRatio ?? 0);
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });

  const avgScore = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.scores.total, 0) / entries.length)
    : 0;
  const topEntry = entries.length
    ? entries.reduce((best, e) => (e.scores.total > best.scores.total ? e : best), entries[0])
    : null;

  return (
    <main className="min-h-screen flex flex-col">
      <header style={{ background: 'var(--primary)', color: 'white' }} className="px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/')} className="font-bold text-xl">AirScore</button>
          <button onClick={() => router.push('/')} style={{ opacity: 0.85, fontSize: '0.85rem' }}>+ Neue Analyse</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">📁 Mein Portfolio</h1>
        <p style={{ color: 'var(--muted-fg)' }} className="text-sm mb-6">
          Deine gemerkten Objekte. Gespeichert lokal in diesem Browser.
        </p>

        {!loaded ? null : entries.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🏠</div>
            <h2 className="text-lg font-semibold mb-2">Noch keine Objekte gespeichert</h2>
            <p style={{ color: 'var(--muted-fg)' }} className="text-sm mb-5">
              Analysiere ein Objekt und klicke auf „⭐ Zum Portfolio hinzufügen", um es hier zu sammeln.
            </p>
            <button onClick={() => router.push('/')} className="btn-primary">Erstes Objekt analysieren →</button>
          </div>
        ) : (
          <>
            {/* Übersicht */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="card text-center py-4">
                <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{entries.length}</div>
                <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>Objekte</div>
              </div>
              <div className="card text-center py-4">
                <div className="text-2xl font-bold" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
                <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>Ø Score</div>
              </div>
              <div className="card text-center py-4">
                <div className="text-2xl font-bold" style={{ color: topEntry ? scoreColor(topEntry.scores.total) : '#000' }}>
                  {topEntry?.scores.total ?? '–'}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>Bestes Objekt</div>
              </div>
            </div>

            {/* Sortierung */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span style={{ color: 'var(--muted-fg)' }}>Sortieren:</span>
              {([
                ['score', 'Score'],
                ['ratio', 'Umsatz/Miete'],
                ['date', 'Datum'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setSortKey(key)}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={sortKey === key
                    ? { background: 'var(--primary)', color: 'white' }
                    : { background: 'var(--muted)', color: 'var(--muted-fg)' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Liste */}
            <div className="flex flex-col gap-3">
              {sorted.map((e) => {
                const badge = recoBadge(e.ai?.recommendation ?? (e.scores.total >= 75 ? 'ja' : e.scores.total >= 55 ? 'pruefen' : 'nein'));
                return (
                  <div key={e.id} className="card">
                    <div className="flex gap-4 items-start">
                      <ScoreBadge score={e.scores.total} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold truncate">{e.location.displayName}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                            style={{ background: badge.color + '22', color: badge.color }}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-sm mb-2" style={{ color: 'var(--muted-fg)' }}>
                          {scoreLabel(e.scores.total)} · {cityTypeLabel(e.cityInfo.type)}
                        </div>
                        <div className="flex gap-4 text-xs flex-wrap" style={{ color: 'var(--muted-fg)' }}>
                          <span>💶 {formatEur(e.finance.avgDailyRate)}/Nacht</span>
                          {e.input.warmmiete ? <span>🏠 {formatEur(e.input.warmmiete)} Miete</span> : null}
                          {e.finance.revenueToRentRatio
                            ? <span>📊 Ratio {e.finance.revenueToRentRatio.toFixed(2)}x</span> : null}
                          <span>🗓️ {new Date(e.savedAt).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notiz */}
                    <textarea
                      defaultValue={e.note ?? ''}
                      placeholder="Notiz hinzufügen (z. B. Makler-Kontakt, Besichtigungstermin, Gedanken)…"
                      onBlur={(ev) => handleNote(e.id, ev.target.value)}
                      className="input-field mt-3 resize-none"
                      rows={2}
                      style={{ fontSize: '0.82rem' }}
                    />

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => router.push(`/analyze?saved=${e.id}`)}
                        className="btn-primary text-sm" style={{ padding: '0.4rem 0.9rem' }}>
                        Bericht öffnen
                      </button>
                      <button onClick={() => handleRemove(e.id)}
                        className="px-3 py-1.5 rounded-lg border text-sm font-medium"
                        style={{ border: '1px solid var(--border)', background: 'white', color: '#dc2626' }}>
                        Entfernen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
