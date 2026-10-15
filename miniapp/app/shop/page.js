'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

const RATE = 0.7;

export default function Shop() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/shop', {
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

  async function buy(pack) {
    setBuying(pack.id);
    const initData = window.Telegram?.WebApp?.initData;

    try {
      const r = await fetch('/api/shop/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, packId: pack.id }),
      });
      const d = await r.json();

      if (d.ok && d.payment_url) {
        // Ouvrir la page de paiement LeekPay
        if (window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(d.payment_url);
        } else {
          window.open(d.payment_url, '_blank');
        }
        setToast('💳 Redirection vers le paiement...');
        setTimeout(() => setToast(null), 3000);
      } else {
        alert(d.error || 'Erreur');
      }
    } catch (e) {
      alert('Erreur réseau');
    }
    setBuying(null);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🛒 Boutique Kobo</h1>
          <Link href="/wallet" className="text-sm text-orange-600 font-semibold">← Retour</Link>
        </div>
      </header>

      <div className="px-5 pt-5">
        <div className="rounded-2xl p-4 mb-5 bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 text-center">
          <div className="text-xs text-gray-500 mb-1">Ton solde Kobo</div>
          <div className="text-3xl font-black text-orange-600">{Math.round(data.balance).toLocaleString('fr-FR')}</div>
          <div className="text-xs text-gray-500 mt-1">≈ {Math.round(data.balance * RATE).toLocaleString('fr-FR')} FCFA</div>
        </div>

        <div className="rounded-xl p-3 mb-5 bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed">
          💳 Paiement sécurisé via <b>LeekPay</b> (Mobile Money, carte, crypto)
          <br />
          📌 Taux : <b>1 Kobo = 0,7 FCFA</b>
        </div>

        <h2 className="font-bold text-gray-800 mb-3">Choisis un pack</h2>
        <div className="space-y-3">
          {data.packs.map(p => {
            const totalKobo = p.kobo_amount + (p.kobo_amount * p.bonus_percent / 100);
            const isLoading = buying === p.id;
            return (
              <div
                key={p.id}
                className={`card ${p.is_popular ? 'border-2 border-amber-400 bg-amber-50' : ''}`}
              >
                {p.is_popular && <div className="text-xs text-amber-700 font-bold mb-1">⭐ POPULAIRE</div>}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{p.icon}</span>
                      <span className="font-bold text-gray-800">{p.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">{Math.round(p.price).toLocaleString('fr-FR')} {p.currency}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-orange-600">{Math.round(totalKobo).toLocaleString('fr-FR')}</div>
                    <div className="text-xs text-gray-500">Kobo</div>
                    {p.bonus_percent > 0 && (
                      <div className="text-xs text-emerald-600 font-bold mt-1">+{p.bonus_percent}%</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => buy(p)}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-xl font-bold text-sm ${!isLoading ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}
                >
                  {isLoading ? 'Redirection...' : `💳 Acheter ${Math.round(p.price).toLocaleString('fr-FR')} ${p.currency}`}
                </button>
              </div>
            );
          })}
        </div>

        {data.purchases.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-800 mb-3">Historique</h3>
            <div className="space-y-2">
              {data.purchases.map(p => (
                <div key={p.id} className="card flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-800">+{Math.round(p.kobo_received + p.bonus_kobo).toLocaleString('fr-FR')} Kobo</div>
                    <div className="text-xs text-gray-500">{Math.round(p.amount_paid)} {p.currency}</div>
                    <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className={`text-xs font-bold ${p.status === 'paid' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-red-600' : 'text-orange-500'}`}>
                    {p.status === 'paid' ? '✅ Payé' : p.status === 'rejected' ? '❌ Refusé' : '⏳ En attente'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed">
          💡 <b>Comment ça marche ?</b>
          <br />
          1. Choisis un pack
          <br />
          2. Tu es redirigé vers LeekPay
          <br />
          3. Paie par Mobile Money, carte ou crypto
          <br />
          4. Tes Kobo sont crédités automatiquement ✅
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full font-bold shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      <Nav />
    </div>
  );
}
