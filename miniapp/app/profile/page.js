'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Profile() {
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

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!user) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 text-center bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">👤 Profil</h1>
      </header>

      <div className="px-5 pt-5">
        <div className="card text-center py-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-3xl font-black text-white mb-3">
            {(user.first_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="text-xl font-bold text-gray-800">{user.first_name || 'Utilisateur'}</div>
          <div className="text-sm text-gray-500">@{user.username || '—'}</div>
        </div>
      </div>

      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-xs text-gray-500">Solde</div>
          <div className="text-lg font-bold text-orange-600">{Math.round(user.balance || 0)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total gagné</div>
          <div className="text-lg font-bold text-emerald-600">{Math.round(user.total_earned || 0)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Parrainages</div>
          <div className="text-lg font-bold text-blue-600">{user.referral_count || 0}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total retiré</div>
          <div className="text-lg font-bold text-purple-600">{Math.round(user.total_withdrawn || 0)}</div>
        </div>
      </div>

      <Nav />
    </div>
  );
}
