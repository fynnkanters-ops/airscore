'use client';

import { useEffect, useState } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import {
  fetchNews, getLastReadAt, markAllRead, countUnread, type NewsItem,
} from '@/lib/news';

export function NewsBell() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    fetchNews().then((news) => {
      if (!active) return;
      setItems(news);
      setUnread(countUnread(news, getLastReadAt()));
    });
    return () => { active = false; };
  }, []);

  function openPanel() {
    setOpen(true);
    markAllRead();
    setUnread(0);
  }

  return (
    <>
      <button onClick={openPanel} aria-label="News öffnen"
        style={{ color: 'var(--muted-fg)', padding: 6, position: 'relative' }}
        className="rounded-full hover:opacity-80 transition">
        <Bell size={20} />
        {unread > 0 && <span className="badge-dot">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="panel-overlay" onClick={() => setOpen(false)} />
          <aside className="panel-sheet" role="dialog" aria-label="Neuigkeiten">
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-lg font-semibold">Neuigkeiten</h2>
              <button onClick={() => setOpen(false)} aria-label="Schließen"
                style={{ color: 'var(--muted-fg)' }} className="hover:opacity-80">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {items.length === 0 && (
                <p style={{ color: 'var(--muted-fg)' }} className="text-sm px-1 py-6 text-center">
                  Keine Meldungen.
                </p>
              )}
              {items.map((n) => (
                <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                  className="card card-hover block" style={{ padding: '0.9rem 1rem' }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm leading-snug">{n.title}</span>
                    <ExternalLink size={14} style={{ color: 'var(--muted-fg)', flexShrink: 0, marginTop: 2 }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--muted-fg)' }}>{n.summary}</p>
                  <div className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>
                    {n.source} · {new Date(n.date).toLocaleDateString('de-DE')}
                  </div>
                </a>
              ))}
            </div>

            <div className="px-5 py-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-fg)' }}>
              Quellen werden dezent aggregiert. Ohne Gewähr.
            </div>
          </aside>
        </>
      )}
    </>
  );
}
