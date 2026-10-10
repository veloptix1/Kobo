import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function sendTelegram(userId, message) {
  const token = process.env.BOT_TOKEN;
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: userId, text: message, parse_mode: 'Markdown' }),
    });
    return true;
  } catch (e) { return false; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';

  let query = supabaseAdmin
    .from('marketplace_ads')
    .select('*, users(first_name, username, telegram_id)')
    .order('boosted', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: reports } = await supabaseAdmin
    .from('marketplace_reports')
    .select('*, marketplace_ads(title), users(first_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  // Statistiques
  const { count: totalActive } = await supabaseAdmin.from('marketplace_ads').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: totalPending } = await supabaseAdmin.from('marketplace_ads').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { data: orders } = await supabaseAdmin.from('marketplace_orders').select('commission, amount');
  const totalCommission = (orders || []).reduce((s, o) => s + Number(o.commission || 0), 0);
  const totalVolume = (orders || []).reduce((s, o) => s + Number(o.amount || 0), 0);

  return NextResponse.json({
    ok: true,
    ads: data || [],
    reports: reports || [],
    stats: {
      totalActive: totalActive || 0,
      totalPending: totalPending || 0,
      totalCommission,
      totalVolume,
      totalOrders: (orders || []).length,
    },
  });
}

export async function PATCH(req) {
  const body = await req.json();
  const { adId, action, reason } = body;

  if (!adId || !action) return NextResponse.json({ error: 'adId et action requis' }, { status: 400 });

  const { data: ad } = await supabaseAdmin.from('marketplace_ads').select('*').eq('id', adId).single();
  if (!ad) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 });

  // ===== APPROUVER =====
  if (action === 'approve') {
    await supabaseAdmin.from('marketplace_ads').update({ status: 'active' }).eq('id', adId);

    await sendTelegram(ad.seller_id,
      `✅ *Ton annonce est approuvée !*\n\n📢 ${ad.title}\n💰 Prix : ${Math.round(ad.price)} ${ad.currency === 'real' ? 'FCFA' : 'Kobo'}\n\n🎉 Elle est maintenant visible par tous.`
    );

    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_id: ad.seller_id, action: 'marketplace_approved', details: { ad_id: adId, title: ad.title },
      });
    } catch (e) {}

    // Publier dans les canaux si demandé
    if (ad.broadcast_to_channels) {
      const { data: settings } = await supabaseAdmin.from('settings').select('value').eq('key', 'marketplace_broadcast_channels').single();
      const channels = settings?.value || [];
      const token = process.env.BOT_TOKEN;
      const msg = `🛒 *Nouvelle annonce*\n\n📢 *${ad.title}*\n\n${ad.description}\n\n💰 Prix : ${Math.round(ad.price)} ${ad.currency === 'real' ? 'FCFA' : 'Kobo'}\n\n👉 Voir dans la mini app !`;

      for (const ch of channels) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ch, text: msg, parse_mode: 'Markdown' }),
          });
        } catch (e) {}
      }
    }

    return NextResponse.json({ ok: true });
  }

  // ===== REJETER =====
  if (action === 'reject') {
    await supabaseAdmin.from('marketplace_ads').update({ status: 'rejected', admin_note: reason || null }).eq('id', adId);

    // Rembourser
    if (ad.publish_fee && Number(ad.publish_fee) > 0) {
      await supabaseAdmin.rpc('credit_user', {
        p_user_id: ad.seller_id,
        p_amount: Number(ad.publish_fee),
        p_type: 'admin_adjust',
        p_reference: 'marketplace_refund',
        p_metadata: { ad_id: adId, reason: 'rejet' },
      });
    }

    await sendTelegram(ad.seller_id,
      `❌ *Ton annonce a été refusée*\n\n📢 ${ad.title}\n\n${reason ? `📝 Motif : ${reason}\n\n` : ''}💰 Tes frais de publication t'ont été remboursés.`
    );

    return NextResponse.json({ ok: true });
  }

  // ===== BOOST =====
  if (action === 'boost') {
    const { data: setting } = await supabaseAdmin.from('settings').select('value').eq('key', 'marketplace_boost_days').single();
    const days = Number(setting?.value) || 7;
    const until = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

    await supabaseAdmin.from('marketplace_ads').update({ boosted: true, boosted_until: until }).eq('id', adId);

    await sendTelegram(ad.seller_id,
      `🚀 *Ton annonce est boostée !*\n\n📢 ${ad.title}\n\n🎯 Elle apparaîtra en priorité pendant ${days} jours.`
    );

    return NextResponse.json({ ok: true });
  }

  // ===== UNBOOST =====
  if (action === 'unboost') {
    await supabaseAdmin.from('marketplace_ads').update({ boosted: false, boosted_until: null }).eq('id', adId);
    return NextResponse.json({ ok: true });
  }

  // ===== SUPPRIMER =====
  if (action === 'delete') {
    await supabaseAdmin.from('marketplace_ads').update({ status: 'deleted' }).eq('id', adId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
