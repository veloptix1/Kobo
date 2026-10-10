'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Mine() {
  const [user, setUser] = useState(null);
  const [mining, setMining] = useState(false);

  useEffect(() => {
    (async () => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) return;
      const r = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const d = await r.json();
      if (d.ok) setUser(d.user);
    })();
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 text-center">
        <h1 className="text-2xl font-bold">⛏️ Miner</h1>
        <p className="text-white/60 text-sm mt-1">Gagne des Kobo passivement</p>
      </header>

      <div className="flex flex-col items-center justify-center px-5 mt-10">
        <div className="w-56 h-56 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-8xl animate-pulse-gold">
          ⛏️
        </div>
        <div className="mt-8 text-center">
          <div className="text-white/60 text-sm">Solde miné</div>
          <div className="text-3xl font-bold text-amber-400">{user?.balance || 0} Kobo</div>
        </div>
        <button onClick={() => setMining(true)} className="btn-gold mt-8 w-full max-w-xs">
          {mining ? 'Minage en cours...' : 'Commencer à miner'}
        </button>
      </div>

      <Nav />
    </div>
  );
}
