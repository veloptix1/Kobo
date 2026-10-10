'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

const RATE = 0.7; // 1 Kobo = 0,7 FCFA

export default function Convert() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState('kobo_to_real');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/convert', {
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
    if (!amt || amt <= 0) return alert('Montant invalide');
    if (amt < data.min_convert) return alert(`Minimum ${data.min_convert}`);

    setSending(true);
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'convert', amount: amt, direction }),
    });
    const d = await r.json();
    setSending(false);

    if (d.ok) {
      setToast(`✅ +${Math.round(d.received)} reçus`);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setTimeout(() => setToast(null), 2500);
      setAmount('');
      load();
    } else {
      alert(d.error);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

  const fee = Number(data.fee_percent || 0);
  const amountNum = Number(amount) || 0;

  // Calcul du montant reçu selon la direction et le taux 0,7
  let received = 0;
  if (direction === 'kobo_to_real') {
    // Kobo → Réel (à 0,7)
    received = (amountNum * RATE) - (amountNum * RATE * fee / 100);
  } else {
    // Réel → Kobo (÷ 0,7 = × 1.4286)
    received = (amountNum / RATE) - (amountNum / RATE * fee / 100);
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🔄 Convertir</h1>
          <Link href="/wallet" className="text-sm text-orange-600 font-semibold">← Retour</Link>
        </div>
      </header>

      <div className="px-5 pt-5">
        {/* Soldes */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="card text-center">
            <div className="text-xs text-gray-500 mb-1">🪙 Kobo</div>
            <div className="text-xl font-black text-orange-600">{Math.round(data.kobo_balance).toLocaleString('fr-FR')}</div>
            <div className="text-[10px] text-gray-400 mt-1">≈ {Math.round(data.kobo_balance * RATE)} FCFA</div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-gray-500 mb-1">💵 {data.currency}</div>
            <div className="text-xl font-black text-emerald-600">{Math.round(data.real_balance).toLocaleString('fr-FR')}</div>
            <div className="text-[10px] text-gray-400 mt-1">≈ {Math.round(data.real_balance / RATE)} Kobo</div>
          </div>
        </div>

        {/* Info taux */}
        <div className="rounded-xl p-3 mb-5 bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed">
          📌 <b>Taux actuel</b> : 1 Kobo = 0,7 FCFA
          {fee > 0 && <span> · Frais : {fee}%</span>}
        </div>

        {/* Direction */}
        <div className="form-group mb-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">Sens de conversion</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection('kobo_to_real')}
              className={`py-3 rounded-xl text-xs font-semibold ${direction === 'kobo_to_real' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              🪙 → 💵
              <div className="text-[10px] mt-1 opacity-80">Kobo vers Réel</div>
            </button>
            <button
              onClick={() => setDirection('real_to_kobo')}
              className={`py-3 rounded-xl text-xs font-semibold ${direction === 'real_to_kobo' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              💵 → 🪙
              <div className="text-[10px] mt-1 opacity-80">Réel vers Kobo</div>
            </button>
          </div>
        </div>

        {/* Montant */}
        <div className="form-group mb-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Montant à convertir {direction === 'kobo_to_real' ? '(Kobo)' : `(${data.currency})`}
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[100, 500, 1000, 2000, 5000, 10000].map(v => (
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
            placeholder={`Minimum ${data.min_convert}`}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
          />
        </div>

        {/* Résumé */}
        {amount && (
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Tu envoies :</span>
              <span className="font-bold">{amountNum.toLocaleString('fr-FR')} {direction === 'kobo_to_real' ? 'Kobo' : data.currency}</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Frais ({fee}%) :</span>
                <span className="font-bold text-red-600">
                  -{direction === 'kobo_to_real' ? Math.round(amountNum * RATE * fee / 100) : Math.round(amountNum * fee / 100)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-amber-300">
              <span className="font-bold text-gray-800">Tu reçois :</span>
              <span className="font-black text-emerald-600">
                {Math.round(received).toLocaleString('fr-FR')} {direction === 'kobo_to_real' ? data.currency : 'Kobo'}
              </span>
            </div>
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={submit}
          disabled={sending || !amount}
          className={`w-full py-4 rounded-2xl font-bold ${!sending && amount ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}
        >
          {sending ? 'Conversion...' : '🔄 Convertir'}
        </button>

        {/* Info */}
        <div className="mt-6 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed">
          💡 <b>Exemples :</b>
          <br />
          • 1000 Kobo → 700 FCFA
          <br />
          • 2000 Kobo → 1400 FCFA
          <br />
          • 700 FCFA → 1000 Kobo
        </div>
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
