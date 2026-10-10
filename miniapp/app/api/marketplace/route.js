import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

async function log(userId, action, details) {
  try {
    await supabaseAdmin.from('activity_logs').insert({ user_id: userId, action, details });
  } catch (e) {}
}

export async function POST(req) {
  const { initData, action } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = tgUser.id;

  // ==================== LISTE DES ANNONCES ====================
  if (action === 'list') {
    const body = await req.json().catch(() => ({}));
    const category = req.body?.category || '';
    const search = req.body?.search || '';

    let query = supabaseAdmin
      .from('marketplace_ads')
      .select('*, users(first_name, username, telegram_id)')
      .eq('status', 'active')
      .order('boosted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (category && category !== 'all') query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let ads = data || [];
    if (search) {
      const s = search.toLowerCase();
      ads = ads.filter(a => (a.title || '').toLowerCase().includes(s) || (a.description || '').toLowerCase().includes(s));
    }

    // Enrichir avec nombre de ventes
    const { data: settings } = await supabaseAdmin.from('settings').select('key, value')
      .in('key', ['marketplace_categories', 'marketplace_min_price_real', 'marketplace_min_price_kobo', 'marketplace_publish_fee', 'marketplace_boost_fee', 'marketplace_broadcast_fee', 'marketplace_commission']);
    const s = Object.fromEntries((settings || []).map(x => [x.key, x.value]));

    return NextResponse.json({ ok: true, ads, settings: s });
  }

  // ==================== MES ANNONCES ====================
  if (action === 'mine') {
    const { data } = await supabaseAdmin
      .from('marketplace_ads')
      .select('*')
      .eq('seller_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    return NextResponse.json({ ok: true, ads: data || [] });
  }

  // ==================== MES ACHATS ====================
  if (action === 'orders') {
    const { data } = await supabaseAdmin
      .from('marketplace_orders')
      .select('*, marketplace_ads(title, link, seller_id)')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return NextResponse.json({ ok: true, orders: data || [] });
  }

  // ==================== PUBLIER ====================
  if (action === 'publish') {
    const { title, description, category, price, currency, places, link, image_url, broadcast } = req.body || {};

    if (!title || !description || !category || !price) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('publish_marketplace_ad', {
      p_user_id: userId,
      p_title: title,
      p_description: description,
      p_category: category,
      p_price: Number(price),
      p_currency: currency || 'real',
      p_places: Number(places) || 1,
      p_link: link || null,
      p_image_url: image_url || null,
      p_broadcast: broadcast === true,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ==================== ACHETER ====================
  if (action === 'buy') {
    const { adId, currency } = req.body || {};
    if (!adId) return NextResponse.json({ error: 'adId requis' }, { status: 400 });

    const { data, error } = await supabaseAdmin.rpc('pay_marketplace_order_v2', {
      p_ad_id: adId,
      p_buyer_id: userId,
      p_currency: currency || 'real',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ==================== SUPPRIMER ====================
  if (action === 'delete') {
    const { adId } = req.body || {};
    const { data: ad } = await supabaseAdmin.from('marketplace_ads').select('seller_id').eq('id', adId).single();
    if (!ad || ad.seller_id !== userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    await supabaseAdmin.from('marketplace_ads').update({ status: 'deleted' }).eq('id', adId);
    await log(userId, 'marketplace_delete', { ad_id: adId });
    return NextResponse.json({ ok: true });
  }

  // ==================== SIGNALER ====================
  if (action === 'report') {
    const { adId, reason, details } = req.body || {};
    await supabaseAdmin.from('marketplace_reports').insert({
      ad_id: adId, reporter_id: userId, reason, details,
    });
    await log(userId, 'marketplace_report', { ad_id: adId, reason });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
