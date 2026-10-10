'use client';
import { useEffect, useState, useRef } from 'react';
import Nav from '@/components/Nav';

export default function Ads() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [viewId, setViewId] = useState(null);
  const [toast, setToast] = useState(null);
  const timerRef = useRef();

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/ads', {
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

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  async function startAd() {
    if (!data?.canWatch || watching) return;

    if (!data.url) return alert('Aucune pub configurée');

    // Ouvrir le lien
    window.open(data.url, '_blank');

    // Créer la vue
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'start' }),
    });
    const d = await r.json();
    if (!d.ok) { alert(d.error); return; }

    setViewId(d.viewId);
    setWatching(true);
    setCountdown(data.minWatch);

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  }

  async function finishAd() {
    if (!viewId) return;

    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'complete', viewId }),
    });
    const d = await r.json();

    if (d.ok) {
      setToast(`+${d.reward} Kobo !`);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setTimeout(() => setToast(null), 2500);
      setWatching(false);
      setViewId(null);
      setCountdown(0);
      load();
    } else {
      alert(d.error);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre cette app depuis le bot.</div>;

  const progressPct = Math.min(100, (data.todayCount / data.dailyLimit) * 100);

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">📺 Regarder des pubs</h1>
        <p className="text-gray-500 text-sm mt-1">Gagne {data.reward} Kobo par pub vue</p>
      </header>

      <div className="p-5">
        {!data.enabled && (
          <div className="card text-center py-10 text-gray-500">
            Les pubs ne sont pas disponibles pour le moment.
          </div>
        )}

        {data.enabled && (
          <>
            <div className="card text-center py-8">
              <div className="text-6xl mb-4">📺</div>
              <div className="text-lg font-bold text-gray-800 mb-2">
                Gagne {data.reward} Kobo
              </div>
              <div className="text-sm text-gray-500 mb-6">
                Regarde une pub pendant {data.minWatch} secondes
              </div>

              {watching ? (
                <>
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-orange-600 mb-2">
                      {countdown > 0 ? countdown : '✓'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {countdown > 0 ? 'secondes restantes...' : 'Pub terminée !'}
                    </div>
                  </div>
                  {countdown === 0 && (
                    <button onClick={finishAd} className="btn-gold w-full">
                      🎁 Récupérer ma récompense
                    </button>
                  )}
                  {countdown > 0 && (
                    <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-semibold">
                      ⏱️ Patientez...
                    </button>
                  )}
                </>
              ) : data.canWatch ? (
                <button onClick={startAd} className="btn-gold w-full">
                  ▶️ Regarder une pub
                </button>
              ) : (
                <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-semibold">
                  ⏳ Revient dans {data.nextIn}s
                </button>
              )}
            </div>

            <div className="card mt-5">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-semibold text-gray-700">Pubs aujourd'hui</div>
                <div className="text-sm font-bold text-orange-600">{data.todayCount} / {data.dailyLimit}</div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </>
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
