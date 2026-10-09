'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/admin/dashboard', label: '📊 Dashboard' },
  { href: '/admin/withdrawals', label: '💸 Retraits' },
  { href: '/admin/tasks', label: '🎯 Tâches' },
  { href: '/admin/users', label: '👥 Utilisateurs' },
  { href: '/admin/settings', label: '⚙️ Paramètres' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/admin/api/logout', { method: 'POST' });
    router.push('/admin');
    router.refresh();
  }

  return (
    <aside className="w-64 bg-black/30 border-r border-white/10 min-h-screen p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold">K</div>
        <span className="font-bold text-lg">Kobo Admin</span>
      </div>
      <nav className="flex-1 space-y-2">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link key={l.href} href={l.href} className={`block px-4 py-3 rounded-xl transition ${active ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold' : 'hover:bg-white/10 text-white/80'}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="btn-secondary w-full mt-4">🚪 Déconnexion</button>
    </aside>
  );
}
