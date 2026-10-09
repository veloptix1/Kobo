'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function WithdrawalsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  async function load() {
    setLoading(true);
    const res = await fetch(`/admin/api/withdrawals?status=${filter}`);
    const data = await res.json();
    setList(data.withdrawals || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function action(id, status) {
    if (!confirm(`Confirmer ${status === 'paid' ? 'le paiement' : 'le refus'} ?`)) return;
    await fetch('/admin/api/withdrawals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">💸 Retraits</h1>
        <div className="flex gap-2 mb-6">
          {['pending', 'paid', 'rejected', 'all'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'btn-primary' : 'btn-secondary'}>
              {f === 'pending' ? '⏳ En attente' : f === 'paid' ? '✅ Payés' : f === 'rejected' ? '❌ Refusés' : '📋 Tous'}
            </button>
          ))}
        </div>
        <div className="card">
          {loading ? <p>Chargement...</p> : list.length === 0 ? <p className="text-white/50">Aucun retrait</p> : (
            <div className="space-y-3">
              {list.map((w) => (
                <div key={w.id} className="p-4 bg-white/5 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{w.users?.first_name || 'Utilisateur'} <span className="text-white/50 text-sm">@{w.users?.username || '—'}</span></div>
                      <div className="text-sm text-white/60 mt-1">
                        <div>💰 <b>{w.amount_kobo} Kobo</b> → {w.amount_target} {w.target_currency}</div>
                        <div>📱 {w.method}</div>
                        <div>📍 {w.destination}</div>
                        <div className="text-xs text-white/40 mt-1">{new Date(w.created_at).toLocaleString('fr-FR')} · ID #{w.id}</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${w.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : w.status === 'pending' ? 'bg-orange-500/20 text-orange-300' : 'bg-red-500/20 text-red-300'}`}>{w.status}</span>
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => action(w.id, 'paid')} className="btn-primary text-sm py-2">✅ Marquer payé</button>
                      <button onClick={() => action(w.id, 'rejected')} className="btn-danger text-sm py-2">❌ Refuser</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
