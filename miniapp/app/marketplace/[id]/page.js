'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function AdDetail() {
  const params = useParams();
  const adId = params?.id;
  const [ad, setAd] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [payWith, setPayWith] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || !adId) { setLoading(false); return; }
    try {
      // Récupérer le user (soldes)
      const meR = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const meD = await meR.json();
      if (meD.ok) setMe(meD.user);

      // Récupérer l'annonce
      const r = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'list' }),
      });
      const d = await r.json();
      if (d.ok) {
        const found = (d.ads || []).find(a => String(a.id) === String(adId));
        setAd(found || null);
        if (found) setPayWith(found.currency);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [adId]);

  async function buy() {
    if (!payWith) return alert('Choisis un mode de paiement');
    if (!confirm(`Payer ${Math.round(ad.price)} ${payWith === 'real' ? 'FCFA' : 'Kobo'} ?`)) return;

    setBuying(true);
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'buy', adId: ad.id, currency: payWith }),
    });
    const d = await r.json();
    setBuying(false);

    if (d.ok) {
      setToast(`✅ Achat réussi !`);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      if (d.link) {
        setTimeout(() => window.open(d.link, '_blank'), 800);
      }
    } else {
      const errors = {
        insufficient_real_balance: 'Solde réel insuffisant. Recharge ton portefeuille.',
        insufficient_kobo: 'Solde Kobo insuffisant. Gagne plus ou convertis.',
        no_places_left: 'Plus de places disponibles.',
        cannot_buy_own_ad: 'Tu ne peux pas acheter ta propre annonce.',
        ad_not_found: 'Annonce introuvable.',
      };
      alert(errors[d.error] || d.error);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  if (!ad) return (
    <div className="p-8 text-center text-gray-500">
      <p className="mb-4">Annonce introuvable ou supprimée.</p>
      <Link href="/marketplace" className="text-orange-600 font-bold underline">← Retour</Link>
    </div>
  );

  const sellerName = ad.users?.first_name || ad.users?.username || 'Vendeur';
  const placesLeft = ad.places ? ad.places - ad.sold : '∞';
  const isMine = me && String(ad.seller_id) === String(me.telegram_id);

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Annonce</h1>
          <Link href="/marketplace" className="text-sm text-orange-600 font-semibold">← Retour</Link>
        </div>
      </header>

      <div className="p-5">
        {ad.image_url && <img src={ad.image_url} alt="" className="w-full h-48 object-cover rounded-2xl mb-4" />}

        <div className="card mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">{ad.title}</h2>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">{ad.category}</span>
            {ad.broadcast_to_channels && <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">📢 Diffusée</span>}
            {ad.status !== 'active' && (
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${ad.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {ad.status === 'pending' ? '⏳ En attente' : ad.status === 'rejected' ? '❌ Rejetée' : ad.status}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 leading-relaxed mb-4">{ad.description}</p>

          <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">{sellerName}</div>
              <div className="text-xs text-gray-500">Vendeur</div>
            </div>
          </div>
        </div>

        <div className="card mb-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Prix</div>
          <div className="text-3xl font-black text-orange-600 mb-1">
            {Math.round(ad.price)} {ad.currency === 'real' ? 'FCFA' : 'Kobo'}
          </div>
          <div className="text-xs text-gray-500">
            {placesLeft} place{placesLeft > 1 ? 's' : ''} restante{placesLeft > 1 ? 's' : ''} · {ad.sold} vendu{ad.sold > 1 ? 's' : ''}
          </div>
        </div>

        {isMine ? (
          <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 text-sm text-blue-800">
            ℹ️ C'est ton annonce.
          </div>
        ) : ad.status !== 'active' ? (
          <div className="text-center text-gray-500 text-sm py-4">Cette annonce n'est pas disponible.</div>
        ) : (
          <>
            {/* CHOIX DE LA DEVISE */}
            <div className="card mb-4">
              <div className="text-sm font-bold text-gray-800 mb-3">💳 Mode de paiement</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPayWith('real')}
                  className={`py-3 rounded-xl text-sm font-bold ${payWith === 'real' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  💵 Argent réel
                  <div className="text-[10px] mt-1 opacity-80">
                    {me ? Math.round(me.real_balance || 0) : 0} FCFA dispo
                  </div>
                </button>
                <button
                  onClick={() => setPayWith('kobo')}
                  className={`py-3 rounded-xl text-sm font-bold ${payWith === 'kobo' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  🪙 Kobo
                  <div className="text-[10px] mt-1 opacity-80">
                    {me ? Math.round(me.balance || 0) : 0} Kobo dispo
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={buy}
              disabled={buying || !payWith}
              className={`w-full py-4 rounded-2xl font-bold text-lg ${!buying && payWith ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg' : 'bg-gray-200 text-gray-400'}`}
            >
              {buying ? 'Achat...' : `💳 Payer ${Math.round(ad.price)} ${payWith === 'real' ? 'FCFA' : 'Kobo'}`}
            </button>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg text-sm text-center max-w-xs z-50">
          {toast}
        </div>
      )}

      <Nav />
    </div>
  );
}
