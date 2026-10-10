'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) { setLoading(false); return; }
      try {
        const r = await fetch('/api/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        const d = await r.json();
        if (d.ok) setUser(d.user);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      <div className="text-gray-500 text-sm">Chargement...</div>
    </div>
  );

  if (!user) return (
    <div className="p-8 text-center">
      <div className="text-3xl font-bold mb-4 text-gray-900">Kobo</div>
      <p className="text-gray-500">Ouvre cette app depuis le bot Kobo sur Telegram.</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <header className="header-app">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-[#0A1F44]">
            K
          </div>
          <div>
            <div className="font-bold leading-tight">{user.first_name || 'Utilisateur'}</div>
            <div className="text-white/60 text-xs">@{user.username || '—'}</div>
          </div>
        </div>
        <Link href="/profile" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        </Link>
      </header>

      <div className="p-5">
        <div className="rounded-3xl p-6 text-center bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200">
          <div className="text-gray-500 text-xs mb-1">Ton solde</div>
          <div className="text-4xl font-black text-orange-600 mb-1">{Math.round(user.balance || 0)}</div>
          <div className="text-gray-500 text-sm">Kobo</div>
          <div className="text-gray-400 text-xs mt-3">≈ {Math.round(user.balance || 0)} FCFA</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 mb-4">
        <Link href="/mine" className="card flex flex-col items-center py-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
            <path d="M14 4l6 6-9 9H5v-6l9-9z" />
            <path d="M3 21h18" />
          </svg>
          <div className="font-bold text-sm text-gray-800">Miner</div>
          <div className="text-[10px] text-gray-500">Gagner des Kobo</div>
        </Link>

        <Link href="/ads" className="card flex flex-col items-center py-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
            <polyline points="17 2 12 7 7 2" />
          </svg>
          <div className="font-bold text-sm text-gray-800">Pubs</div>
          <div className="text-[10px] text-gray-500">+10 Kobo / pub</div>
        </Link>

        <Link href="/tasks" className="card flex flex-col items-center py-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <div className="font-bold text-sm text-gray-800">Tâches</div>
          <div className="text-[10px] text-gray-500">Voir les missions</div>
        </Link>

        <Link href="/referral" className="card flex flex-col items-center py-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <div className="font-bold text-sm text-gray-800">Parrainer</div>
          <div className="text-[10px] text-gray-500">Inviter des amis</div>
        </Link>

        <Link href="/games" className="card flex flex-col items-center py-5 col-span-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <div className="font-bold text-sm text-gray-800">Jeux</div>
          <div className="text-[10px] text-gray-500">Roue + Machine à sous</div>
        </Link>
      </div>

      <div className="px-5">
        <Link href="/top" className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFA500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M18 2H6v7a6 6 0 0012 0V2z" />
            </svg>
            <div>
              <div className="font-bold text-gray-800">Classement</div>
              <div className="text-xs text-gray-500">Voir les meilleurs</div>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <Nav />
    </div>
  );
}
