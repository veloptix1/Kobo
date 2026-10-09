'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  async function load() {
    const res = await fetch(`/admin/api/users?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(data.users || []);
  }
  useEffect(() => { load(); }, []);

  async function action(id, updates) {
    await fetch('/admin/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    load();
  }

  async function credit(id) {
    const v = prompt('Montant en Kobo (+ pour créditer, - pour débiter):');
    if (!v) return;
    await action(id, { credit: Number(v) });
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">👥 Utilisateurs</h1>
        <div className="flex gap-2 mb-6">
          <input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} className="flex-1" />
          <button onClick={load} className="btn-primary">🔍</button>
        </div>
        <div className="card">
          {users.length === 0 ? <p className="text-white/50">Aucun utilisateur</p> : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.telegram_id} className="p-4 bg-white/5 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{u.first_name || 'Utilisateur'} <span className="text-white/50 text-sm">@{u.username || '—'}</span>{u.is_banned && <span className="ml-2 text-red-400 text-xs">🚫</span>}</div>
                    <div className="text-sm text-white/60">💰 {u.balance} Kobo · retirable {u.withdrawable_balance} · gagné {u.total_earned}</div>
                    <div className="text-xs text-white/40">ID: {u.telegram_id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => credit(u.telegram_id)} className="btn-secondary text-sm">💵</button>
                    <button onClick={() => action(u.telegram_id, { is_banned: !u.is_banned })} className="btn-danger text-sm">{u.is_banned ? '🔓' : '🚫'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
