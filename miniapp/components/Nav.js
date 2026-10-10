'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Accueil', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10' },
  { href: '/mine', label: 'Miner', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { href: '/tasks', label: 'Tâches', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { href: '/wallet', label: 'Wallet', icon: 'M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 000 4h4v-4z' },
  { href: '/profile', label: 'Profil', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100 8 4 4 0 000-8z' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link key={it.href} href={it.href} className={`nav-item ${active ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={it.icon} />
            </svg>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
