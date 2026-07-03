import { Info } from 'lucide-react';

/**
 * Pflicht-Hinweis unter jedem Rechner-Ergebnis.
 * `variant` steuert den Text-Schwerpunkt.
 */
export function Disclaimer({ text }: { text: string }) {
  return (
    <div
      className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-xs"
      style={{ background: 'var(--muted)', color: 'var(--muted-fg)', border: '1px solid var(--border)' }}
    >
      <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{text}</span>
    </div>
  );
}
