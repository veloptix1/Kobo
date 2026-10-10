'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

export default function Publish() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Abonnement');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('real');
  const [places, setPlaces] = useState('1');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [broadcast, setBroadcast] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) { setLoading(false); return; }
    try {
      const r = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'list' }),
      });
      const d = await r.json();
      if (d.ok) setData(d.settings || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    if (!title.trim() || title.length < 5) return alert('Titre trop court (min 5 caractères)');
    if (!description.trim() || description.length < 20) return alert('Description trop courte (min 20)');
    if (!price || Number(price) <= 0) return alert('Prix invalide');

    setSending(true);
    const initData = window.Telegram?.WebApp?.initData;
    const r = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData, action: 'publish',
        title: title.trim(), description: description.trim(), category,
        price: Number(price), currency, places: Number(places) || 1,
        link: link.trim(), image_url: imageUrl.trim(),
        broadcast,
      }),
    });
    const d = await r.json();
    setSending(false);

    if (d.ok) {
      setToast('✅ Annonce publiée !');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setTimeout(() => {
        setToast(null);
        window.location.href = '/marketplace';
      }, 1500);
    } else {
      const errors = {
        insufficient_kobo: `Solde Kobo insuffisant (requis : ${d.required || '?'} Kobo)`,
        max_ads_reached: 'Tu as atteint le maximum d\'annonces',
        user_not_found: 'Utilisateur introuvable',
      };
      alert(errors[d.error] || d.error);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;

  const publishFee = Number(data?.marketplace_publish_fee) || 100;
  const broadcastFee = Number(data?.marketplace_broadcast_fee) || 2000;
  const totalKobo = publishFee + (broadcast ? broadcastFee : 0);
  const categories = data?.marketplace_categories || ["Abonnement","Design","Partage","Application","Service","Autre"];

  return (
    <div className="min-h-screen pb-24">
      <header className="p-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">➕ Publier</h1>
          <Link href="/marketplace" className="text-sm text-orange-600 font-semibold">← Retour</Link>
        </div>
      </header>

      <div className="px-5 pt-5">
        {/* Info frais */}
        <div className="rounded-xl p-3 mb-5 bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
          📝 Publication : <b>{publishFee} Kobo</b>
          <br />
          📢 Diffusion dans les canaux : <b>{broadcastFee} Kobo</b> (optionnel)
          <br />
          💼 Commission sur chaque vente : <b>{data?.marketplace_commission || 20}%</b>
        </div>

        <div className="form-group mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Titre</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Abonnez-vous à mon canal" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" maxLength={80} />
          <div className="text-xs text-gray-400 mt-1">{title.length}/80</div>
        </div>

        <div className="form-group mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Décris ton produit/service..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" maxLength={500} />
          <div className="text-xs text-gray-400 mt-1">{description.length}/500</div>
        </div>

        <div className="form-group mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Devise du prix</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCurrency('real')} className={`py-3 rounded-xl text-sm font-semibold ${currency === 'real' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              💵 Argent réel
            </button>
            <button onClick={() => setCurrency('kobo')} className={`py-3 rounded-xl text-sm font-semibold ${currency === 'kobo' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              🪙 Kobo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="form-group">
            <label className="block text-sm font-bold text-gray-700 mb-2">Prix</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="500" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" />
          </div>
          <div className="form-group">
            <label className="block text-sm font-bold text-gray-700 mb-2">Places</label>
            <input type="number" value={places} onChange={e => setPlaces(e.target.value)} placeholder="1" min="1" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" />
          </div>
        </div>

        <div className="form-group mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Lien à envoyer à l'acheteur</label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://t.me/moncanal" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" />
        </div>

        <div className="form-group mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Image (URL, optionnel)</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none" />
        </div>

        {/* Option broadcast */}
        <div className={`rounded-xl p-4 mb-5 border-2 ${broadcast ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={broadcast} onChange={e => setBroadcast(e.target.checked)} className="mt-1 w-5 h-5" />
            <div className="flex-1">
              <div className="font-bold text-gray-800 text-sm">📢 Publier aussi dans les canaux</div>
              <div className="text-xs text-gray-600 mt-1">Ton annonce sera diffusée dans nos canaux officiels pour plus de visibilité.</div>
              <div className="text-xs font-bold text-purple-700 mt-2">Coût supplémentaire : {broadcastFee} Kobo</div>
            </div>
          </label>
        </div>

        {/* Total */}
        <div className="rounded-xl p-4 mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-800">💰 Total à payer</span>
            <span className="text-xl font-black text-orange-600">{totalKobo} Kobo</span>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={sending || !title || !description || !price}
          className={`w-full py-4 rounded-2xl font-bold ${!sending && title && description && price ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}
        >
          {sending ? 'Publication...' : `✅ Publier (${totalKobo} Kobo)`}
        </button>
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
