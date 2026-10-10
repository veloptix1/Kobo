'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Referral() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) { setLoading(false); return; }
      const r = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const d = await r.json();
      if (d.ok) setData(d);
      setLoading(false);
    })();
  }, []);

  function copyLink() {
    if (!data?.referral_code) return;
    const link = `https://t.me/Koboofficialbot?start=${data.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareLink() {
    if (!data?.referral_code) return;
    const link = `https://t.me/Koboofficialbot?start=${data.referral_code}`;
    const text = `💰 Rejoins Kobo et gagne de l'argent en faisant des tâches simples !\n\n${link}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
      );
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-white/60">Ouvre depuis le bot.</div>;

  const link = `https://t.me/Koboofficialbot?start=${data.referral_code}`;

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5">
        <h1 className="text-2xl font-bold">👥 Parrainage</h1>
        <p className="text-white/60 text-sm mt-1">Invite des amis et gagne des Kobo</p>
      </header>

      <div className="px-5 mb-6">
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 rounded-3xl p-6 text-center">
          <div className="text-5xl mb-3">🎁</div>
          <div className="text-white/60 text-xs mb-1">Ton lien de parrainage</div>
          <div className="text-xs text-amber-300 font-mono bg-black/30 rounded-lg p-3 my-3 break-all">
            {link}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={copyLink} className="btn-primary py-2 text-sm">
              {copied ? '✅ Copié !' : '📋 Copier'}
            </button>
            <button onClick={shareLink} className="btn-secondary py-2 text-sm">
              📤 Partager
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 mb-6 grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-400">{data.referral_count}</div>
          <div className="text-xs text-white/60 mt-1">Filleuls</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-400">
            +{data.referral_count * 20}
          </div>
          <div className="text-xs text-white/60 mt-1">Kobo gagnés</div>
        </div>
      </div>

      <div className="px-5">
        <h2 className="font-bold mb-3">Mes filleuls</h2>
        {data.referrals.length === 0 ? (
          <div className="card text-center py-10 text-white/50">
            Aucun filleul pour le moment
          </div>
        ) : (
          <div className="space-y-2">
            {data.referrals.map((r) => (
              <div key={r.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold">
                  {(r.referred?.first_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {r.referred?.first_name || 'Utilisateur'}
                  </div>
                  <div className="text-xs text-white/50">
                    @{r.referred?.username || '—'}
                  </div>
                </div>
                <div className="text-amber-400 font-bold text-sm">+{r.bonus_paid || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Nav />
    </div>
  );
}
