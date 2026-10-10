'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Top() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) { setLoading(false); return; }
      try {
        const r = await fetch('/api/top', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        const d = await r.json();
        if (d.ok) setData(d);
        else setErr(d.error || 'Erreur');
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (err) return <div className="p-8 text-center text-red-600">Erreur : {err}</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 text-center bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">🏆 Classement</h1>
        <p className="text-gray-500 text-sm mt-1">Top 100 gagnants</p>
      </header>

      <div className="px-5 pt-5 mb-6">
        <div className="rounded-3xl p-6 text-center bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200">
          <div className="text-gray-500 text-xs mb-1">Ton rang</div>
          <div className="text-4xl font-black text-orange-600">#{data.myRank}</div>
          <div className="text-gray-500 text-xs mt-2">Total : {Math.round(data.myTotal)} Kobo</div>
        </div>
      </div>

      <div className="px-5 space-y-2">
        {data.top.map((u, i) => {
          const isMe = u.telegram_id === data.myId;
          const medal = medals[i];
          return (
            <div key={u.telegram_id} className={`card flex items-center gap-3 ${i < 3 ? 'border-amber-300 bg-amber-50' : ''} ${isMe ? 'ring-2 ring-orange-400' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${i < 3 ? 'text-2xl' : 'bg-gray-100 text-sm text-gray-600'}`}>
                {medal || `#${i + 1}`}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">
                  {u.first_name || u.username || 'Anonyme'}
                  {isMe && <span className="text-orange-600 text-xs ml-2">← toi</span>}
                </div>
                <div className="text-xs text-gray-400">@{u.username || '—'}</div>
              </div>
              <div className="text-orange-600 font-bold text-sm">{Math.round(u.total_earned || 0)}</div>
            </div>
          );
        })}
      </div>

      <Nav />
    </div>
  );
}
