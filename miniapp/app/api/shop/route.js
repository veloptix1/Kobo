import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

async function log(userId, action, details) {
  try { await supabaseAdmin.from('activity_logs').insert({ user_id: userId, action, details }); } catch (e) {}
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch (e) {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  const { initData, action } = body;
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = tgUser.id;

  // ==================== STATUT ====================
  if (action === 'status') {
    const { data: packs } = await supabaseAdmin
      .from('kobo_packs')
      .select('*')
      .eq('is_active', true)
      .order('position');

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, real_balance, real_currency')
      .eq('telegram_id', userId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['kobo_shop_enabled', 'kobo_shop_methods', 'kobo_shop_min_amount', 'kobo_shop_instructions', 'kobo_shop_bonus_percent']);

    const s = Object.fromEntries((settings || []).map(x => [x.key, x.value]));

    const { data: lastPurchases } = await supabaseAdmin
      .from('kobo_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      packs: packs || [],
      balance: Number(user?.balance || 0),
      real_balance: Number(user?.real_balance || 0),
      currency: user?.real_currency || 'FCFA',
      enabled: s.kobo_shop_enabled !== false,
      methods: s.kobo_shop_methods || ['orange_money', 'mtn', 'wave', 'usdt'],
      min_amount: Number(s.kobo_shop_min_amount) || 500,
      instructions: s.kobo_shop_instructions || '',
      purchases: lastPurchases || [],
    });
  }

  // ==================== ACHAT ====================
  if (action === 'buy') {
    const { packId, method, destination, proof } = body;
    if (!packId || !method) return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });

    const { data: pack } = await supabaseAdmin.from('kobo_packs').select('*').eq('id', packId).single();
    if (!pack) return NextResponse.json({ error: 'Pack introuvable' }, { status: 404 });

    const bonus = pack.kobo_amount * pack.bonus_percent / 100;

    const { data, error } = await supabaseAdmin
      .from('kobo_purchases')
      .insert({
        user_id: userId,
        pack_id: packId,
        amount_paid: pack.price,
        currency: pack.currency,
        kobo_received: pack.kobo_amount,
        bonus_kobo: bonus,
        method,
        destination: destination || null,
        proof: proof || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await log(userId, 'kobo_purchase_requested', { pack_id: packId, amount: pack.price, method });

    // Notifier l'admin
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
    const token = process.env.BOT_TOKEN;
    const msg = `🛒 *Nouvel achat de Kobo*\n\n👤 User ID : \`${userId}\`\n📦 Pack : ${pack.name}\n💰 Payé : *${pack.price} ${pack.currency}*\n🪙 Kobo : *${pack.kobo_amount + bonus}*\n📱 Méthode : ${method}\n🆔 ID : \`${data.id}\``;
    for (const adminId of adminIds) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminId, text: msg, parse_mode: 'Markdown' }),
        });
      } catch (e) {}
    }

    return NextResponse.json({ ok: true, purchase: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
