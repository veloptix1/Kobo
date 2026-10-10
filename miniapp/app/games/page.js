'use client';
import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

export default function Games() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastPrize, setLastPrize] = useState(null);
  const [slotsResult, setSlotsResult] = useState(null);
  const [slotsRolling, setSlotsRolling] = useState(false);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'status' }),
      });
      const d = await r.json();
      if (d.ok) setData(d);
      else console.error('Games status error:', d.error);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function spin(isFree) {
    if (spinning) return;
    if (isFree && !data.canFreeSpin) return alert('Tour gratuit déjà utilisé');
    if (!isFree && data.balance < Number(data.settings.wheel_paid_price || 50)) return alert('Solde insuffisant');

    setSpinning(true);
    setLastPrize(null);

    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: isFree ? 'spin_free' : 'spin' }),
    });
    const d = await r.json();

    if (!d.ok) { alert(d.error); setSpinning(false); return; }

    const segAngle = 360 / 7;
    const targetAngle = 360 * 5 + (360 - d.index * segAngle);
    setRotation(targetAngle);

    setTimeout(() => {
      setLastPrize(d.prize);
      setSpinning(false);
      load();
    }, 4000);
  }

  async function playSlots() {
    if (slotsRolling) return;
    if (data.balance < Number(data.settings.slots_price || 30)) return alert('Solde insuffisant');

    setSlotsRolling(true);
    setSlotsResult(null);

    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'slots' }),
    });
    const d = await r.json();

    setTimeout(() => {
      if (d.ok) { setSlotsResult(d); load(); }
      else alert(d.error);
      setSlotsRolling(false);
    }, 1500);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Ouvre depuis le bot.</div>;

  const freeIn = data.nextFreeIn;

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">🎰 Jeux</h1>
        <p className="text-gray-500 text-sm mt-1">Solde : <span className="text-orange-600 font-bold">{Math.round(data.balance)} Kobo</span></p>
      </header>

      {data.settings.wheel_enabled !== false && (
        <div className="px-5 pt-5 mb-8">
          <div className="card">
            <h2 className="font-bold text-lg mb-4 text-center text-gray-800">🎡 Roue de la fortune</h2>

            <div className="relative w-64 h-64 mx-auto mb-6">
              <div className="w-full h-full rounded-full transition-transform duration-[4000ms] ease-out" style={{
                transform: `rotate(${rotation}deg)`,
                background: `conic-gradient(#FF6B00 0deg 51deg, #FFA500 51deg 102deg, #FBBF24 102deg 154deg, #10B981 154deg 205deg, #3B82F6 205deg 257deg, #8B5CF6 257deg 308deg, #EF4444 308deg 360deg)`,
              }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-4xl shadow-lg">
                  {spinning ? '🎰' : lastPrize ? <span className="text-orange-600 font-bold">+{lastPrize}</span> : '🎯'}
                </div>
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-8 border-r-8 border-l-transparent border-r-transparent" style={{ borderTopWidth: '16px', borderTopColor: '#FFA500', borderTopStyle: 'solid' }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => spin(true)} disabled={spinning || !data.canFreeSpin} className={`py-3 rounded-xl font-bold text-sm ${data.canFreeSpin ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {data.canFreeSpin ? '🎁 Gratuit' : `⏳ ${Math.floor(freeIn / 3600)}h`}
              </button>
              <button onClick={() => spin(false)} disabled={spinning} className="py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                🎯 {data.settings.wheel_paid_price || 50} Kobo
              </button>
            </div>
          </div>
        </div>
      )}

      {data.settings.slots_enabled !== false && (
        <div className="px-5 mb-8">
          <div className="card">
            <h2 className="font-bold text-lg mb-4 text-center text-gray-800">🎰 Machine à sous</h2>

            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`w-20 h-24 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 flex items-center justify-center text-4xl ${slotsRolling ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
                  {slotsRolling ? '🎲' : slotsResult ? (slotsResult.reward > 0 ? '💰' : '❌') : '❓'}
                </div>
              ))}
            </div>

            <div className="text-center mb-4 text-gray-500 text-sm">
              Jackpot jusqu'à <span className="text-orange-600 font-bold">{data.settings.slots_jackpot || 1000}</span> Kobo
            </div>

            <button onClick={playSlots} disabled={slotsRolling} className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              🎲 Jouer ({data.settings.slots_price || 30} Kobo)
            </button>

            {slotsResult && !slotsRolling && (
              <div className={`mt-4 text-center text-xl font-bold ${slotsResult.reward > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {slotsResult.reward > 0 ? `+${slotsResult.reward} Kobo (x${slotsResult.multiplier})` : 'Perdu...'}
              </div>
            )}
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}
