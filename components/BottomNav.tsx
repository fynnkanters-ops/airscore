'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Calculator, Bookmark } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Analyse', icon: Search },
  { href: '/rechner', label: 'Rechner', icon: Calculator },
  { href: '/portfolio', label: 'Portfolio', icon: Bookmark },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href} data-active={active}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
