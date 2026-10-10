'use client';
import { useEffect, useState, useRef } from 'react';
import Nav from '@/components/Nav';

export default function Mine() {
  const [user, setUser] = useState(null);
  const [mining, setMining] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [lastReward, setLastReward] = useState(null);
  const timerRef = useRef();

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'status' }),
      });
      const d = await r.json();
      if (d.ok) {
        setUser(d.user);
        setMining(d.mining);
        setSettings(d.settings || {});
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  async function mine() {
    if (cooldown > 0) return;
    const initData = window.Telegram?.WebApp?.initData;
    setAnimating(true);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');

    const r = await fetch('/api/mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'mine' }),
    });
    const d = await r.json();

    setTimeout(() => setAnimating(false), 200);

    if (d.ok) {
      setUser((u) => ({ ...u, balance: (Number(u.balance) || 0) + Number(d.reward) }));
      setMining((m) => ({ ...m, total_mined: d.total_mined, daily_clicks: d.daily_clicks, level: d.level }));
      setLastReward(Number(d.reward).toFixed(2));
      setCooldown(Number(settings.mining_cooldown_seconds) || 3);
      setTimeout(() => setLastReward(null), 1500);
    } else if (d.error === 'cooldown') setCooldown(d.wait || 3);
    else if (d.error === 'daily_limit') alert('Limite quotidienne atteinte ! Reviens demain.');
  }

  async function buyBoost() {
    const price = Number(settings.mining_boost_price) || 500;
    if (!confirm(`Acheter un boost x${settings.mining_boost_multiplier} pour ${price} Kobo ?`)) return;
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'buy_boost' }),
    });
    const d = await r.json();
    if (d.ok) { alert('Boost activé !'); load(); }
    else alert(d.error || 'Erreur');
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!user) return <div className="p-8 text-center text-gray-500">Ouvre cette app depuis le bot Kobo.</div>;

  const dailyLimit = Number(settings.mining_daily_limit) || 500;
  const dailyClicks = Number(mining?.daily_clicks) || 0;
  const progressPct = Math.min(100, (dailyClicks / dailyLimit) * 100);
  const boostActive = mining?.boost_expires_at && new Date(mining.boost_expires_at) > new Date();

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 text-center bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">⛏️ Miner</h1>
        <p className="text-gray-500 text-sm mt-1">Tape sur la pioche pour gagner</p>
      </header>

      <div className="px-5 mt-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <div className="text-xs text-gray-500">Solde</div>
            <div className="text-xl font-bold text-orange-600">{Math.round(user.balance || 0)} Kobo</div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-gray-500">Niveau {mining?.level || 1}</div>
            <div className="text-xl font-bold text-gray-800">{Math.round(mining?.total_mined || 0)} minés</div>
          </div>
        </div>
      </div>

      {boostActive && (
        <div className="mx-5 mb-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-xl text-center text-sm text-purple-700 font-semibold">
          ⚡ Boost x{mining.boost_multiplier} actif jusqu'à {new Date(mining.boost_expires_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      <div className="flex flex-col items-center px-5 mt-4">
        <button
          onClick={mine}
          disabled={cooldown > 0}
          className={`relative w-56 h-56 rounded-full flex items-center justify-center text-8xl transition-all ${
            cooldown > 0
              ? 'bg-gray-100 cursor-not-allowed'
              : 'bg-gradient-to-br from-amber-400 to-orange-600 active:scale-95 animate-pulse-gold'
          }`}
        >
          {cooldown > 0 ? (
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-700">{cooldown}</div>
              <div className="text-xs text-gray-500 mt-1">secondes</div>
            </div>
          ) : (
            <div className={animating ? 'scale-125 transition-transform' : ''}>⛏️</div>
          )}

          {lastReward && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl font-bold text-orange-500 animate-bounce">
              +{lastReward}
            </div>
          )}
        </button>

        <div className="mt-8 w-full max-w-xs">
          <div className="text-sm text-gray-500 mb-2 text-center">
            {dailyClicks} / {dailyLimit} clics aujourd'hui
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          ⚡ {settings.mining_reward_per_click || 1} Kobo par clic
          <br />
          ⏱️ Cooldown {settings.mining_cooldown_seconds || 3}s
        </div>

        {!boostActive && (
          <button onClick={buyBoost} className="btn-gold mt-6 w-full max-w-xs text-sm">
            ⚡ Boost x{settings.mining_boost_multiplier || 2} — {settings.mining_boost_price || 500} Kobo
          </button>
        )}
      </div>

      <Nav />
    </div>
  );
}
