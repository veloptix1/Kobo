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
    const r = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'status' }),
    });
    const d = await r.json();
    if (d.ok) setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function spin(isFree) {
    if (spinning) return;
    if (isFree && !data.canFreeSpin) return alert('Tour gratuit déjà utilisé');
    if (!isFree && data.balance < Number(data.settings.wheel_paid_price || 50)) {
      return alert('Solde insuffisant');
    }

    setSpinning(true);
    setLastPrize(null);

    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: isFree ? 'spin_free' : 'spin' }),
    });
    const d = await r.json();

    if (!d.ok) {
      alert(d.error);
      setSpinning(false);
      return;
    }

    // Animation : 5 tours + arrêt sur l'index
    const segAngle = 360 / 7;
    const targetAngle = 360 * 5 + (360 - d.index * segAngle);
    setRotation(targetAngle);

    setTimeout(() => {
      setLastPrize(d.prize);
      setSpinning(false);
      load();
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }, 4000);
  }

  async function playSlots() {
    if (slotsRolling) return;
    if (data.balance < Number(data.settings.slots_price || 30)) {
      return alert('Solde insuffisant');
    }

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
      if (d.ok) {
        setSlotsResult(d);
        load();
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(d.reward > 0 ? 'success' : 'error');
      } else {
        alert(d.error);
      }
      setSlotsRolling(false);
    }, 1500);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  if (!data) return <div className="p-8 text-center text-white/60">Ouvre depuis le bot.</div>;

  const prizes = data.settings.wheel_prizes || [5,10,20,50,100,200,500];
  const freeInterval = Number(data.settings.wheel_free_interval_hours || 24);
  const freeIn = data.nextFreeIn;

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5">
        <h1 className="text-2xl font-bold">🎰 Jeux</h1>
        <p className="text-white/60 text-sm mt-1">Solde : <span className="text-amber-400 font-bold">{Math.round(data.balance)} Kobo</span></p>
      </header>

      {/* Roue de la fortune */}
      {data.settings.wheel_enabled !== false && (
        <div className="px-5 mb-8">
          <div className="card">
            <h2 className="font-bold text-lg mb-4 text-center">🎡 Roue de la fortune</h2>

            <div className="relative w-64 h-64 mx-auto mb-6">
              <div
                className="w-full h-full rounded-full transition-transform duration-[4000ms] ease-out"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  background: `conic-gradient(
                    #FF6B00 0deg 51deg,
                    #FFA500 51deg 102deg,
                    #FBBF24 102deg 154deg,
                    #10B981 154deg 205deg,
                    #3B82F6 205deg 257deg,
                    #8B5CF6 257deg 308deg,
                    #EF4444 308deg 360deg
                  )`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-[#0A1F44] flex items-center justify-center text-4xl">
                  {spinning ? '🎰' : lastPrize ? `+${lastPrize}` : '🎯'}
                </div>
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-amber-400" style={{ borderTopWidth: '16px' }} />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => spin(true)}
                disabled={spinning || !data.canFreeSpin}
                className={`py-3 rounded-xl font-bold text-sm ${
                  data.canFreeSpin
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                    : 'bg-white/5 text-white/40'
                }`}
              >
                {data.canFreeSpin ? '🎁 Gratuit' : `⏳ ${Math.floor(freeIn / 3600)}h`}
              </button>
              <button
                onClick={() => spin(false)}
                disabled={spinning}
                className="py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500"
              >
                🎯 {data.settings.wheel_paid_price || 50} Kobo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Machine à sous */}
      {data.settings.slots_enabled !== false && (
        <div className="px-5 mb-8">
          <div className="card">
            <h2 className="font-bold text-lg mb-4 text-center">🎰 Machine à sous</h2>

            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-20 h-24 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-2 border-amber-500/30 flex items-center justify-center text-4xl ${
                    slotsRolling ? 'animate-bounce' : ''
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {slotsRolling ? '🎲' : slotsResult ? (slotsResult.reward > 0 ? '💰' : '❌') : '❓'}
                </div>
              ))}
            </div>

            <div className="text-center mb-4 text-white/60 text-sm">
              Jackpot jusqu'à <span className="text-amber-400 font-bold">{data.settings.slots_jackpot || 1000}</span> Kobo
            </div>

            <button
              onClick={playSlots}
              disabled={slotsRolling}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500"
            >
              🎲 Jouer ({data.settings.slots_price || 30} Kobo)
            </button>

            {slotsResult && !slotsRolling && (
              <div className={`mt-4 text-center text-xl font-bold ${slotsResult.reward > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
