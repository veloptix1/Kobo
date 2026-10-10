'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Vip() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'status' }),
      });
      const d = await r.json();
      if (d.ok) setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function buy() {
    if (!confirm(`Confirmer l'achat du VIP pour ${data.price} Kobo ?`)) return;
    setBuying(true);
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'buy' }),
    });
    const d = await r.json();
    setBuying(false);
    if (d.ok) {
      setToast('💎 VIP activé !');
      setTimeout(() => setToast(null), 2500);
      load();
    } else {
      alert(d.error === 'insufficient_balance' ? 'Solde insuffisant' : d.error);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre cette app depuis le bot.</div>;

  if (!data.enabled) return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200"><h1 className="text-2xl font-bold text-gray-900">💎 VIP</h1></header>
      <div className="p-5"><div className="card text-center py-10 text-gray-500">Le VIP n'est pas disponible.</div></div>
      <Nav />
    </div>
  );

  const expiresAt = data.vip?.expires_at ? new Date(data.vip.expires_at) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">💎 VIP</h1>
        <p className="text-gray-500 text-sm mt-1">Gagne plus avec le statut VIP</p>
      </header>

      {data.is_active ? (
        <div className="p-5">
          <div className="rounded-3xl p-6 text-center bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300">
            <div className="text-6xl mb-3">💎</div>
            <div className="text-2xl font-black text-purple-700 mb-1">VIP ACTIF</div>
            <div className="text-sm text-purple-600 mb-3">Niveau {data.vip.level}</div>
            <div className="bg-white/50 rounded-xl p-3 mb-4">
              <div className="text-xs text-purple-600">Expire dans</div>
              <div className="text-3xl font-bold text-purple-700">{daysLeft} jours</div>
            </div>
            {data.vip.auto_renew ? (
              <div className="text-xs text-purple-600">🔄 Renouvellement automatique activé</div>
            ) : (
              <div className="text-xs text-gray-500">Renouvellement désactivé</div>
            )}
          </div>

          <div className="mt-5 space-y-2">
            <h3 className="font-bold text-gray-800 mb-2">Tes avantages</h3>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">+{data.bonus_tasks}% gains tâches</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">📺</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">+{data.bonus_ads}% gains pubs</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">⛏️</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">+{data.bonus_mining}% gains minage</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">🚀</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">Retraits prioritaires</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="rounded-3xl p-6 text-center bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300">
            <div className="text-6xl mb-3">💎</div>
            <div className="text-2xl font-black text-purple-700 mb-1">Devenir VIP</div>
            <div className="text-4xl font-black text-orange-600 my-4">{data.price} Kobo</div>
            <div className="text-sm text-purple-600 mb-4">par mois · renouvelable</div>
          </div>

          <div className="mt-5 space-y-2">
            <h3 className="font-bold text-gray-800 mb-2">Avantages exclusifs</h3>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">+{data.bonus_tasks}% gains tâches</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">📺</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">+{data.bonus_ads}% gains pubs</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">⛏️</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">+{data.bonus_mining}% gains minage</div>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="text-2xl">🚀</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">Retraits prioritaires</div>
              </div>
            </div>
          </div>

          <button onClick={buy} disabled={buying} className="w-full mt-6 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
            {buying ? 'Achat en cours...' : `💎 Acheter pour ${data.price} Kobo`}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg">
          {toast}
        </div>
      )}

      <Nav />
    </div>
  );
}
