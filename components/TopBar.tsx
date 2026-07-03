'use client';

import Link from 'next/link';
import { NewsBell } from './NewsBell';
import { ThemeToggle } from './ThemeToggle';

export function TopBar() {
  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between"
      style={{
        background: 'color-mix(in srgb, var(--background) 85%, transparent)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Link href="/" className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
          AirScore
        </span>
      </Link>
      <div className="flex items-center gap-1">
        <NewsBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
