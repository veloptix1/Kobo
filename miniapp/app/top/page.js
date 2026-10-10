'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Top() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-white/60">Ouvre depuis le bot.</div>;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 text-center">
        <h1 className="text-2xl font-bold">🏆 Classement</h1>
        <p className="text-white/60 text-sm mt-1">Top 100 gagnants</p>
      </header>

      <div className="px-5 mb-6">
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-3xl p-6 text-center">
          <div className="text-white/60 text-xs mb-1">Ton rang</div>
          <div className="text-4xl font-bold text-amber-400">#{data.myRank}</div>
          <div className="text-white/60 text-xs mt-2">Total : {Math.round(data.myTotal)} Kobo</div>
        </div>
      </div>

      <div className="px-5 space-y-2">
        {data.top.map((u, i) => {
          const isMe = u.telegram_id === data.myId;
          const medal = medals[i];
          return (
            <div
              key={u.telegram_id}
              className={`card flex items-center gap-3 ${i < 3 ? 'border-amber-500/40 bg-amber-500/5' : ''} ${isMe ? 'ring-2 ring-amber-400' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                i < 3 ? 'text-2xl' : 'bg-white/10 text-sm'
              }`}>
                {medal || `#${i + 1}`}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">
                  {u.first_name || u.username || 'Anonyme'}
                  {isMe && <span className="text-amber-400 text-xs ml-2">← toi</span>}
                </div>
                <div className="text-xs text-white/50">@{u.username || '—'}</div>
              </div>
              <div className="text-amber-400 font-bold text-sm">
                {Math.round(u.total_earned || 0)}
              </div>
            </div>
          );
        })}
      </div>

      <Nav />
    </div>
  );
}
