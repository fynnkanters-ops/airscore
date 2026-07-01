'use client';

import { useEffect } from 'react';

/**
 * Registriert den Service Worker (nur im Production-Build, damit die lokale
 * Entwicklung mit HMR nicht durch Caching gestört wird).
 */
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '/airscore';
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
  }, []);
  return null;
}
