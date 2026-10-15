'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Recharge() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
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
    const amt = Number(amount);
    if (!amt || amt < (data?.min_amount || 500)) {
      return alert(`Minimum ${data?.min_amount || 500} FCFA`);
    }

    setSending(true);
    const initData = window.Telegram?.WebApp?.initData;

    try {
      const r = await fetch('/api/recharge/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, amount: amt }),
      });
      const d = await r.json();

      if (d.ok && d.payment_url) {
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
    setSending(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

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
        <div className="card mb-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Solde réel actuel</div>
          <div className="text-2xl font-black text-emerald-600">
            {Math.round(data.real_balance).toLocaleString('fr-FR')} {data.currency}
          </div>
        </div>

        <div className="rounded-xl p-3 mb-5 bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed">
          💳 Paiement sécurisé via <b>LeekPay</b>
          <br />
          📱 Mobile Money · Carte bancaire · Crypto
        </div>

        <div className="form-group mb-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">Montant</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[500, 1000, 2000, 5000, 10000, 25000].map(v => (
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
            placeholder={`Minimum ${data.min_amount} FCFA`}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
          />
          {bonus > 0 && amount && (
            <div className="text-xs text-emerald-600 mt-2 font-semibold">
              🎁 Bonus {bonus}% → tu recevras {estimatedTotal.toLocaleString('fr-FR')} FCFA
            </div>
          )}
        </div>

        <button
          onClick={submit}
          disabled={sending || !amount || Number(amount) < (data?.min_amount || 500)}
          className={`w-full py-4 rounded-2xl font-bold ${!sending && amount && Number(amount) >= (data?.min_amount || 500) ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}
        >
          {sending ? 'Redirection...' : `💳 Payer ${amount ? Number(amount).toLocaleString('fr-FR') : '0'} FCFA`}
        </button>

        <div className="mt-6 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed">
          💡 <b>Comment ça marche ?</b>
          <br />
          1. Entre le montant
          <br />
          2. Tu es redirigé vers LeekPay
          <br />
          3. Paie par Mobile Money, carte ou crypto
          <br />
          4. Ton solde réel est crédité automatiquement ✅
        </div>

        {data.recharges.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-800 mb-3">Historique</h3>
            <div className="space-y-2">
              {data.recharges.map(r => (
                <div key={r.id} className="card flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-800">+{Math.round(r.amount)} {data.currency}</div>
                    <div className="text-xs text-gray-500">{r.method === 'leekpay' ? '💳 LeekPay' : r.method}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full font-bold shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      <Nav />
    </div>
  );
}
