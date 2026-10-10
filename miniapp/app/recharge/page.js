'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Recharge() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [destination, setDestination] = useState('');
  const [proof, setProof] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/recharge', {
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

  async function submit() {
    if (!amount || Number(amount) < (data?.min_amount || 500)) {
      return alert(`Minimum ${data?.min_amount || 500} FCFA`);
    }
    if (!method) return alert('Choisis une méthode');

    setSending(true);
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/recharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'create', amount: Number(amount), method, destination, proof }),
    });
    const d = await r.json();
    setSending(false);

    if (d.ok) {
      setToast('✅ Demande envoyée !');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setTimeout(() => {
        setToast(null);
        window.Telegram?.WebApp?.close?.();
      }, 2000);
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

  const bonus = Number(data.bonus_percent || 0);
  const estimatedTotal = Number(amount) + (Number(amount) * bonus / 100);

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">💳 Recharger</h1>
          <Link href="/wallet" className="text-sm text-orange-600 font-semibold">← Retour</Link>
        </div>
      </header>

      <div className="px-5 pt-5">
        {/* Solde actuel */}
        <div className="card mb-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Solde réel actuel</div>
          <div className="text-2xl font-black text-emerald-600">
            {Math.round(data.real_balance).toLocaleString('fr-FR')} {data.currency}
          </div>
        </div>

        {/* Instructions */}
        {data.instructions && (
          <div className="rounded-xl p-3 mb-5 bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
            ℹ️ {data.instructions}
          </div>
        )}

        {/* Montants rapides */}
        <div className="form-group">
          <label className="block text-sm font-bold text-gray-700 mb-2">Montant</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[1000, 2000, 5000, 10000, 25000, 50000].map(v => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`py-2 rounded-xl text-xs font-semibold ${amount === String(v) ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {v.toLocaleString('fr-FR')}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Minimum ${data.min_amount} ${data.currency}`}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
          />
          {bonus > 0 && amount && (
            <div className="text-xs text-emerald-600 mt-2 font-semibold">
              🎁 Bonus {bonus}% → tu recevras {estimatedTotal.toLocaleString('fr-FR')} {data.currency}
            </div>
          )}
        </div>

        {/* Méthode */}
        <div className="form-group">
          <label className="block text-sm font-bold text-gray-700 mb-2">Méthode</label>
          <div className="grid grid-cols-2 gap-2">
            {data.methods.map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`py-3 rounded-xl text-sm font-semibold ${method === m ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {methodLabels[m] || m}
              </button>
            ))}
          </div>
        </div>

        {/* Destination */}
        {method && (
          <div className="form-group">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {method === 'usdt' ? 'Adresse wallet USDT (TRC20)' : 'Numéro envoyé'}
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === 'usdt' ? 'TXxx...' : '+237 6XX XXX XXX'}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
            />
          </div>
        )}

        {/* Preuve */}
        {method && (
          <div className="form-group">
            <label className="block text-sm font-bold text-gray-700 mb-2">ID de transaction / Hash (optionnel)</label>
            <input
              type="text"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="ID de la transaction Mobile Money"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
            />
          </div>
        )}

        <button
          onClick={submit}
          disabled={sending || !amount || !method}
          className={`w-full py-4 rounded-2xl font-bold mt-4 ${!sending && amount && method ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}
        >
          {sending ? 'Envoi...' : '✅ Confirmer la recharge'}
        </button>

        {/* Historique */}
        {data.recharges.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-800 mb-3">Historique des recharges</h3>
            <div className="space-y-2">
              {data.recharges.map(r => (
                <div key={r.id} className="card flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-800">+{Math.round(r.amount)} {data.currency}</div>
                    <div className="text-xs text-gray-500">{methodLabels[r.method] || r.method}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <div className={`text-xs font-bold ${r.status === 'paid' ? 'text-emerald-600' : r.status === 'rejected' ? 'text-red-600' : 'text-orange-500'}`}>
                    {r.status === 'paid' ? '✅ Payé' : r.status === 'rejected' ? '❌ Refusé' : '⏳ En attente'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg">
          {toast}
        </div>
      )}

      <Nav />
    </div>
  );
}
