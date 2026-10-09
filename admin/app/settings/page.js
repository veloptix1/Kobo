'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/admin/api/settings');
    const data = await res.json();
    setSettings(data.settings || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function update(key, value) {
    await fetch('/admin/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  }

  function formatValue(v) {
    if (Array.isArray(v)) return JSON.stringify(v);
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function parseValue(str) {
    try { return JSON.parse(str); } catch { return str; }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">⚙️ Paramètres</h1>
        <div className="card">
          {loading ? <p>Chargement...</p> : (
            <div className="space-y-4">
              {settings.map((s) => (
                <div key={s.key} className="p-4 bg-white/5 rounded-xl">
                  <div className="text-sm text-white/60 mb-2">{s.description || s.key}</div>
                  <div className="font-mono text-xs text-orange-300 mb-2">{s.key}</div>
                  <input
                    defaultValue={formatValue(s.value)}
                    onBlur={(e) => update(s.key, parseValue(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
