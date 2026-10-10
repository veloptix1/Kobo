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
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!user) return (
    <div className="p-8 text-center">
      <div className="text-2xl font-bold mb-4">Kobo</div>
      <p className="text-white/60">Ouvre cette app depuis le bot Kobo sur Telegram.</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 flex items-center justify-between">
        <div>
          <div className="text-white/60 text-sm">Bonjour,</div>
          <div className="text-xl font-bold">{user.first_name || 'Utilisateur'}</div>
        </div>
        <Link href="/profile" className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold">
          {(user.first_name || 'U').charAt(0).toUpperCase()}
        </Link>
      </header>

      <div className="px-5 mb-6">
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-3xl p-6 text-center">
          <div className="text-white/60 text-sm mb-1">Ton solde</div>
          <div className="text-4xl font-bold text-amber-400 mb-1">{user.balance || 0}</div>
          <div className="text-white/60 text-sm">Kobo</div>
          <div className="text-white/40 text-xs mt-3">≈ {user.balance || 0} FCFA</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 mb-6">
        <Link href="/mine" className="card flex flex-col items-center py-5">
          <div className="text-3xl mb-2">⛏️</div>
          <div className="font-bold">Miner</div>
          <div className="text-xs text-white/60">Gagner des Kobo</div>
        </Link>
        <Link href="/tasks" className="card flex flex-col items-center py-5">
          <div className="text-3xl mb-2">🎯</div>
          <div className="font-bold">Tâches</div>
          <div className="text-xs text-white/60">Voir les missions</div>
        </Link>
        <Link href="/referral" className="card flex flex-col items-center py-5">
          <div className="text-3xl mb-2">👥</div>
          <div className="font-bold">Parrainer</div>
          <div className="text-xs text-white/60">Inviter des amis</div>
        </Link>
        <Link href="/games" className="card flex flex-col items-center py-5">
          <div className="text-3xl mb-2">🎰</div>
          <div className="font-bold">Jeux</div>
          <div className="text-xs text-white/60">Gagner plus</div>
        </Link>
      </div>

      <div className="px-5 mb-6">
        <Link href="/top" className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏆</div>
            <div>
              <div className="font-bold">Classement</div>
              <div className="text-xs text-white/60">Voir les meilleurs</div>
            </div>
          </div>
          <div className="text-white/40">→</div>
        </Link>
      </div>

      <Nav />
    </div>
  );
}
