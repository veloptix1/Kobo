'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Wallet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tx');

  useEffect(() => {
    (async () => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) { setLoading(false); return; }
      try {
        const r = await fetch('/api/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });
        const d = await r.json();
        if (d.ok) setData(d);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

  const typeLabels = {
    signup: '🎁 Bonus inscription', task: '🎯 Tâche', referral: '👥 Parrainage',
    withdrawal: '💸 Retrait', admin_adjust: '⚙️ Ajustement', convert: '🔄 Conversion',
  };
  const statusLabels = {
    pending: '⏳ En attente', paid: '✅ Payé', rejected: '❌ Refusé', processing: '⚙️ En cours',
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">💰 Wallet</h1>
      </header>

      <div className="px-5 pt-5 mb-6">
        <div className="rounded-3xl p-6 text-center bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200">
          <div className="text-gray-500 text-xs mb-1">Solde principal</div>
          <div className="text-4xl font-black text-orange-600 mb-1">{Math.round(data.user.balance || 0)}</div>
          <div className="text-gray-500 text-xs mb-4">Kobo ≈ {(data.user.balance || 0).toFixed(0)} FCFA</div>
          <div className="pt-4 border-t border-amber-200">
            <div className="text-gray-500 text-xs mb-1">Solde retirable</div>
            <div className="text-2xl font-bold text-emerald-600">{Math.round(data.user.withdrawable_balance || 0)} Kobo</div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-6 grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-xs text-gray-500 mb-1">Total gagné</div>
          <div className="text-lg font-bold text-emerald-600">{Math.round(data.user.total_earned || 0)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500 mb-1">Total retiré</div>
          <div className="text-lg font-bold text-orange-600">{Math.round(data.user.total_withdrawn || 0)}</div>
        </div>
      </div>

      <div className="px-5 mb-4 flex gap-2">
        <button onClick={() => setTab('tx')} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${tab === 'tx' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Transactions</button>
        <button onClick={() => setTab('wd')} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${tab === 'wd' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Retraits</button>
      </div>

      <div className="px-5 space-y-2">
        {tab === 'tx' ? (
          data.transactions.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">Aucune transaction</div>
          ) : (
            data.transactions.map((t) => (
              <div key={t.id} className="card flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{typeLabels[t.type] || t.type}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(t.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className={`font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.amount >= 0 ? '+' : ''}{t.amount}
                </div>
              </div>
            ))
          )
        ) : data.withdrawals.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">Aucun retrait</div>
        ) : (
          data.withdrawals.map((w) => (
            <div key={w.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-800">{w.amount_target} {w.target_currency}</div>
                  <div className="text-xs text-gray-500">{w.method}</div>
                </div>
                <div className="text-xs text-gray-600">{statusLabels[w.status] || w.status}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <Nav />
    </div>
  );
}
