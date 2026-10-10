'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Marketplace() {
  const [ads, setAds] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: tab === 'mine' ? 'mine' : tab === 'orders' ? 'orders' : 'list', category, search }),
      });
      const d = await r.json();
      if (d.ok) {
        if (d.ads) setAds(d.ads);
        if (d.orders) setAds(d.orders);
        if (d.settings) setSettings(d.settings);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab, category]);

  const categories = settings.marketplace_categories || ["Abonnement","Design","Partage","Application","Service","Autre"];

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">🛒 Marketplace</h1>
          <Link href="/marketplace/publish" className="px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold">
            ➕ Vendre
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {[
            { k: 'all', l: '🛒 Toutes' },
            { k: 'mine', l: '📢 Mes annonces' },
            { k: 'orders', l: '📋 Mes achats' },
          ].map(x => (
            <button key={x.k} onClick={() => setTab(x.k)} className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${tab === x.k ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {x.l}
            </button>
          ))}
        </div>

        {/* Recherche + Catégories */}
        {tab === 'all' && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="🔍 Rechercher..."
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-orange-500 outline-none text-sm mb-2"
            />
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setCategory('all')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${category === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Toutes</button>
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${category === c ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{c}</button>
              ))}
            </div>
          </>
        )}
      </header>

      <div className="p-5 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Chargement...</div>
        ) : ads.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            {tab === 'mine' ? 'Tu n\'as aucune annonce' : tab === 'orders' ? 'Aucun achat' : 'Aucune annonce disponible'}
          </div>
        ) : (
          ads.map((ad) => {
            if (tab === 'orders') {
              return (
                <div key={ad.id} className="card">
                  <div className="font-bold text-gray-800 mb-1">{ad.marketplace_ads?.title || 'Annonce supprimée'}</div>
                  <div className="text-xs text-gray-500">Payé : {Math.round(ad.amount)} ({ad.currency === 'real' ? 'FCFA' : 'Kobo'})</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(ad.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
              );
            }

            const sellerName = ad.users?.first_name || ad.users?.username || 'Vendeur';
            const isMine = ad.seller_id === (window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0);
            const placesLeft = ad.places ? ad.places - ad.sold : '∞';

            return (
              <div key={ad.id} className={`card ${ad.boosted ? 'border-2 border-amber-400' : ''}`}>
                {ad.boosted && <div className="text-xs text-amber-600 font-bold mb-2">🚀 Annonce boostée</div>}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-base mb-1">{ad.title}</div>
                    <div className="text-xs text-gray-500 mb-2">{ad.description}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">{ad.category}</span>
                      {ad.broadcast_to_channels && <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">📢 Diffusée</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-lg font-black text-orange-600">{Math.round(ad.price)} {ad.currency === 'real' ? 'FCFA' : 'Kobo'}</div>
                    <div className="text-xs text-gray-500">👤 {sellerName} · {placesLeft} place{placesLeft > 1 ? 's' : ''}</div>
                  </div>
                  {!isMine && ad.status === 'active' && (
                    <Link href={`/marketplace/${ad.id}`} className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold">
                      Voir
                    </Link>
                  )}
                  {isMine && tab === 'mine' && (
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${ad.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ad.status === 'pending' ? 'bg-amber-100 text-amber-700' : ad.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {ad.status === 'active' ? '✅ Active' : ad.status === 'pending' ? '⏳ En attente' : ad.status === 'rejected' ? '❌ Rejetée' : 'Pause'}
                      </span>
                      <Link href={`/marketplace/${ad.id}`} className="text-xs text-orange-600 font-bold underline">Voir</Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Nav />
    </div>
  );
}
