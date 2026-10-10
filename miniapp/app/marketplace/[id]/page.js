'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function AdDetail() {
  const params = useParams();
  const adId = params?.id;
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || !adId) { setLoading(false); return; }
    try {
      const r = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'list' }),
      });
      const d = await r.json();
      if (d.ok) {
        const found = (d.ads || []).find(a => a.id === Number(adId));
        setAd(found || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [adId]);

  async function buy() {
    if (!confirm(`Acheter pour ${Math.round(ad.price)} ${ad.currency === 'real' ? 'FCFA' : 'Kobo'} ?`)) return;
    setBuying(true);
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'buy', adId: ad.id, currency: ad.currency }),
    });
    const d = await r.json();
    setBuying(false);

    if (d.ok) {
      setToast(`✅ Achat réussi ! Lien : ${d.link || 'voir avec le vendeur'}`);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setTimeout(() => {
        if (d.link) window.open(d.link, '_blank');
      }, 500);
    } else {
      const errors = {
        insufficient_real_balance: 'Solde réel insuffisant. Recharge ton portefeuille.',
        insufficient_kobo: 'Solde Kobo insuffisant.',
        no_places_left: 'Plus de places disponibles.',
        cannot_buy_own_ad: 'Tu ne peux pas acheter ta propre annonce.',
      };
      alert(errors[d.error] || d.error);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!ad) return (
    <div className="p-8 text-center text-gray-500">
      <p>Annonce introuvable ou supprimée.</p>
      <Link href="/marketplace" className="text-orange-600 font-bold underline mt-4 inline-block">← Retour</Link>
    </div>
  );

  const sellerName = ad.users?.first_name || ad.users?.username || 'Vendeur';
  const placesLeft = ad.places ? ad.places - ad.sold : '∞';

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Annonce</h1>
          <Link href="/marketplace" className="text-sm text-orange-600 font-semibold">← Retour</Link>
        </div>
      </header>

      <div className="p-5">
        {ad.image_url && (
          <img src={ad.image_url} alt="" className="w-full h-48 object-cover rounded-2xl mb-4" />
        )}

        <div className="card mb-4">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800 flex-1">{ad.title}</h2>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">{ad.category}</span>
            {ad.broadcast_to_channels && <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">📢 Diffusée</span>}
          </div>

          <p className="text-sm text-gray-700 leading-relaxed mb-4">{ad.description}</p>

          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                {sellerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">{sellerName}</div>
                <div className="text-xs text-gray-500">Vendeur</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Prix</div>
          <div className="text-3xl font-black text-orange-600 mb-1">
            {Math.round(ad.price)} {ad.currency === 'real' ? 'FCFA' : 'Kobo'}
          </div>
          <div className="text-xs text-gray-500">
            {placesLeft} place{placesLeft > 1 ? 's' : ''} restante{placesLeft > 1 ? 's' : ''}
          </div>
        </div>

        <button
          onClick={buy}
          disabled={buying}
          className={`w-full py-4 rounded-2xl font-bold text-lg ${!buying ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}
        >
          {buying ? 'Achat...' : `💳 Acheter maintenant`}
        </button>

        <div className="mt-4 text-xs text-gray-500 text-center leading-relaxed">
          💡 Après achat, tu recevras le lien de téléchargement/accès
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg text-xs text-center max-w-xs">
          {toast}
        </div>
      )}

      <Nav />
    </div>
  );
}
