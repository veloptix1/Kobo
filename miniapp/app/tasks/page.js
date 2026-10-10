'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'list' }),
      });
      const d = await r.json();
      if (d.ok) setTasks(d.tasks || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function complete(task) {
    if (!task.canDo) return;
    if (task.link) window.open(task.link, '_blank');
    if (!confirm(`Valider "${task.title}" et recevoir ${task.reward} Kobo ?`)) return;

    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'complete', taskId: task.id }),
    });
    const d = await r.json();
    if (d.ok) {
      setToast(`+${d.reward} Kobo !`);
      setTimeout(() => setToast(null), 2000);
      load();
    } else alert(d.error);
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'available') return t.canDo;
    if (filter === 'done') return !t.canDo;
    return true;
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200 sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">🎯 Tâches</h1>
        <div className="flex gap-2 overflow-x-auto">
          {[
            { k: 'all', l: 'Toutes' },
            { k: 'available', l: 'Disponibles' },
            { k: 'done', l: 'Terminées' },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                filter === f.k ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 pt-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">Aucune tâche</div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="card">
              <div className="mb-3">
                <div className="font-bold text-base mb-1 text-gray-900">{t.title}</div>
                {t.description && <div className="text-xs text-gray-500 mb-2">{t.description}</div>}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-orange-600 font-bold">💰 {t.reward} Kobo</span>
                  <span className="text-gray-400 text-xs">{t.type}</span>
                </div>
              </div>
              <button
                onClick={() => complete(t)}
                disabled={!t.canDo}
                className={`w-full py-3 rounded-xl font-semibold ${
                  t.canDo ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {!t.canDo ? (t.hasPending ? '⏳ En attente' : '✅ Terminée') : t.link ? '▶️ Commencer' : "✅ J'ai terminé"}
              </button>
            </div>
          ))
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
