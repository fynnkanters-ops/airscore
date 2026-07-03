'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'airscore-theme';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);

  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch {}
    setDark(!dark);
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
      style={{ color: 'var(--muted-fg)', padding: 6 }}
      className="rounded-full hover:opacity-80 transition"
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
