'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Shop() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState(null);
  const [method, setMethod] = useState('');
  const [destination, setDestination] = useState('');
  const [proof, setProof] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const RATE = 0.7; // 1 Kobo = 0,7 FCFA

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

  async function buy() {
    if (!selectedPack) return alert('Choisis un pack');
    if (!method) return alert('Choisis une méthode');

    setSending(true);
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'buy', packId: selectedPack.id, method, destination, proof }),
    });
    const d = await r.json();
    setSending(false);

    if (d.ok) {
      setToast('✅ Demande envoyée !');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setSelectedPack(null);
      setDestination('');
      setProof('');
      load();
    } else {
      alert(d.error);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

  const methodLabels = {
    orange_money: '🟠 Orange Money',
    mtn: '🟡 MTN Mobile Money',
    wave: '🌊 Wave',
    usdt: '🪙 USDT (TRC20)',
  };

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
          📌 Taux : <b>1 Kobo = 0,7 FCFA</b>
          {data.instructions && <div className="mt-2">ℹ️ {data.instructions}</div>}
        </div>

        {!selectedPack ? (
          <>
            <h2 className="font-bold text-gray-800 mb-3">Choisis un pack</h2>
            <div className="space-y-3">
              {data.packs.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPack(p)}
                  className={`w-full card text-left ${p.is_popular ? 'border-2 border-amber-400 bg-amber-50' : ''}`}
                >
                  {p.is_popular && <div className="text-xs text-amber-700 font-bold mb-1">⭐ POPULAIRE</div>}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{p.icon}</span>
                        <span className="font-bold text-gray-800">{p.name}</span>
                      </div>
                      <div className="text-xs text-gray-500">{Math.round(p.price).toLocaleString('fr-FR')} {p.currency}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-orange-600">{Math.round(p.kobo_amount).toLocaleString('fr-FR')}</div>
                      <div className="text-xs text-gray-500">Kobo</div>
                      <div className="text-[10px] text-gray-400 mt-1">≈ {Math.round(p.kobo_amount * RATE).toLocaleString('fr-FR')} FCFA</div>
                      {p.bonus_percent > 0 && (
                        <div className="text-xs text-emerald-600 font-bold mt-1">+{p.bonus_percent}% bonus</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="card mb-4 bg-amber-50 border-amber-300">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selectedPack.icon}</span>
                <span className="font-bold text-gray-800">{selectedPack.name}</span>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                Paie <b>{Math.round(selectedPack.price).toLocaleString('fr-FR')} {selectedPack.currency}</b>
              </div>
              <div className="text-sm text-gray-700">
                Reçois <b className="text-orange-600">{Math.round(selectedPack.kobo_amount + selectedPack.kobo_amount * selectedPack.bonus_percent / 100).toLocaleString('fr-FR')} Kobo</b>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Valeur réelle : {Math.round((selectedPack.kobo_amount + selectedPack.kobo_amount * selectedPack.bonus_percent / 100) * RATE).toLocaleString('fr-FR')} FCFA
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Méthode de paiement</label>
              <div className="grid grid-cols-2 gap-2">
                {data.methods.map(m => (
                  <button key={m} onClick={() => setMethod(m)} className={`py-3 rounded-xl text-sm font-semibold ${method === m ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {methodLabels[m] || m}
                  </button>
                ))}
              </div>
            </div>

            {method && (
              <>
                <div className="form-group mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {method === 'usdt' ? 'Adresse wallet USDT (TRC20)' : 'Numéro utilisé pour payer'}
                  </label>
                  <input value={destination} onChange={e => setDestination(e.target.value)} placeholder={method === 'usdt' ? 'TXxx...' : '+237 6XX XXX XXX'} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">ID de transaction (optionnel)</label>
                  <input value={proof} onChange={e => setProof(e.target.value)} placeholder="Ex: TXN123456" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" />
                </div>
              </>
            )}

            <button onClick={buy} disabled={sending || !method} className={`w-full py-4 rounded-2xl font-bold mt-4 ${!sending && method ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}>
              {sending ? 'Envoi...' : '✅ Confirmer'}
            </button>

            <button onClick={() => setSelectedPack(null)} className="w-full py-3 rounded-xl font-semibold mt-3 bg-gray-100 text-gray-600">
              ← Changer de pack
            </button>
          </>
        )}

        {data.purchases.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-800 mb-3">Historique</h3>
            <div className="space-y-2">
              {data.purchases.map(p => (
                <div key={p.id} className="card flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-800">+{Math.round(p.kobo_received + p.bonus_kobo).toLocaleString('fr-FR')} Kobo</div>
                    <div className="text-xs text-gray-500">{Math.round(p.amount_paid)} {p.currency} · {methodLabels[p.method] || p.method}</div>
                    <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                  </div>
                  <div className={`text-xs font-bold ${p.status === 'paid' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-red-600' : 'text-orange-500'}`}>
                    {p.status === 'paid' ? '✅ Payé' : p.status === 'rejected' ? '❌ Refusé' : '⏳ En attente'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg z-50">
          {toast}
        </div>
      )}

      <Nav />
    </div>
  );
}
