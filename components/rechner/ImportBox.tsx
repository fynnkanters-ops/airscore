'use client';

import { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { importFromUrl, proxyConfigured } from '@/lib/listing';
import type { Prefill } from '@/app/rechner/prefill';

export function ImportBox({ onImport }: { onImport: (p: Prefill) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (!url.trim()) return;
    setLoading(true);
    setMsg(null);
    const data = await importFromUrl(url.trim());
    setLoading(false);

    if (!data) {
      setMsg({
        ok: false,
        text: proxyConfigured()
          ? 'Automatischer Import nicht möglich – bitte Daten manuell ergänzen.'
          : 'Automatischer Import ist noch nicht aktiviert. Bitte Daten manuell in den Rechnern eingeben.',
      });
      return;
    }
    onImport({
      plz: data.plz,
      sqm: data.flaeche,
      rooms: data.zimmer,
      baujahr: data.baujahr,
      kaufpreis: data.preis,
    });
    const parts: string[] = [];
    if (data.preis) parts.push(formatK(data.preis) + ' €');
    if (data.flaeche) parts.push(data.flaeche + ' m²');
    if (data.plz) parts.push('PLZ ' + data.plz);
    setMsg({ ok: true, text: `Übernommen: ${parts.join(' · ') || 'Daten'} — bitte prüfen & ergänzen.` });
  }

  return (
    <div className="card flex flex-col gap-3 animate-rise">
      <h2 className="text-lg font-semibold">Listing per Link importieren</h2>
      <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
        Link von ImmoScout24, Immowelt, Kleinanzeigen o. ä. einfügen — die Felder der Rechner werden,
        soweit möglich, automatisch vorausgefüllt.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-fg)' }} />
          <input className="input-field" style={{ paddingLeft: 36 }} type="url" placeholder="https://…"
            value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()} />
        </div>
        <button className="btn-primary" onClick={run} disabled={loading || !url.trim()}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Import'}
        </button>
      </div>
      {msg && (
        <div className="px-3.5 py-2.5 rounded-lg text-sm"
          style={msg.ok
            ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
            : { background: 'var(--muted)', color: 'var(--muted-fg)' }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

function formatK(v: number): string {
  return new Intl.NumberFormat('de-DE').format(v);
}
