'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch('/admin/api/tasks');
    const data = await res.json();
    setTasks(data.tasks || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const res = await fetch('/admin/api/tasks', {
      method: editing?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    const data = await res.json();
    if (data.ok) { setShowForm(false); setEditing(null); load(); }
    else alert('Erreur: ' + data.error);
  }

  async function toggle(id, is_active) {
    await fetch('/admin/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !is_active }) });
    load();
  }

  async function remove(id) {
    if (!confirm('Supprimer ?')) return;
    await fetch(`/admin/api/tasks?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">🎯 Tâches</h1>
          <button onClick={() => { setEditing({ title: '', description: '', type: 'one_time', reward: 0, link: '', daily_limit: 1, is_active: true }); setShowForm(true); }} className="btn-primary">➕ Nouvelle tâche</button>
        </div>
        {showForm && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">{editing?.id ? 'Modifier' : 'Nouvelle'} tâche</h2>
            <form onSubmit={save} className="space-y-4">
              <input placeholder="Titre" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full" required />
              <textarea placeholder="Description" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full" rows={2} />
              <div className="grid grid-cols-2 gap-4">
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="w-full">
                  <option value="one_time">Une fois</option>
                  <option value="daily">Quotidien</option>
                  <option value="channel_join">Rejoindre canal</option>
                  <option value="watch_ad">Regarder pub</option>
                  <option value="share_link">Partager lien</option>
                  <option value="signup">Inscription externe</option>
                  <option value="custom">Custom</option>
                </select>
                <input type="number" placeholder="Récompense (Kobo)" value={editing.reward} onChange={(e) => setEditing({ ...editing, reward: Number(e.target.value) })} className="w-full" required />
              </div>
              <input placeholder="Lien (optionnel)" value={editing.link || ''} onChange={(e) => setEditing({ ...editing, link: e.target.value })} className="w-full" />
              <input placeholder="ID canal" value={editing.channel_id || ''} onChange={(e) => setEditing({ ...editing, channel_id: e.target.value })} className="w-full" />
              <input type="number" placeholder="Limite par jour" value={editing.daily_limit || 1} onChange={(e) => setEditing({ ...editing, daily_limit: Number(e.target.value) })} className="w-full" />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">💾 Enregistrer</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Annuler</button>
              </div>
            </form>
          </div>
        )}
        <div className="card">
          {tasks.length === 0 ? <p className="text-white/50">Aucune tâche</p> : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="p-4 bg-white/5 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{t.title} <span className="text-white/50 text-sm">({t.type})</span>{!t.is_active && <span className="ml-2 text-red-400 text-xs">❌</span>}</div>
                    <div className="text-sm text-white/60">💰 {t.reward} Kobo · {t.daily_limit || 1}/jour</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(t); setShowForm(true); }} className="btn-secondary text-sm">✏️</button>
                    <button onClick={() => toggle(t.id, t.is_active)} className="btn-secondary text-sm">{t.is_active ? '⏸️' : '▶️'}</button>
                    <button onClick={() => remove(t.id)} className="btn-danger text-sm">🗑️</button>
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
