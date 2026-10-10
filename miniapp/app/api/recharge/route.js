import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData, action, amount, method, destination, proof } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  // ==================== STATUT ====================
  if (action === 'status') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('real_balance, balance, real_currency')
      .eq('telegram_id', userId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['recharge_enabled', 'recharge_methods', 'recharge_min_amount', 'recharge_bonus_percent', 'recharge_instructions']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));

    const { data: lastRecharges } = await supabaseAdmin
      .from('recharges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      real_balance: Number(user?.real_balance || 0),
      kobo_balance: Number(user?.balance || 0),
      currency: user?.real_currency || 'FCFA',
      enabled: s.recharge_enabled !== false,
      methods: s.recharge_methods || ['orange_money', 'mtn', 'wave', 'usdt'],
      min_amount: Number(s.recharge_min_amount) || 500,
      bonus_percent: Number(s.recharge_bonus_percent) || 0,
      instructions: s.recharge_instructions || '',
      recharges: lastRecharges || [],
    });
  }

  // ==================== CRÉER RECHARGE ====================
  if (action === 'create') {
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    if (!method) return NextResponse.json({ error: 'Méthode requise' }, { status: 400 });

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['recharge_min_amount']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const minAmount = Number(s.recharge_min_amount) || 500;

    if (Number(amount) < minAmount) {
      return NextResponse.json({ error: `Minimum ${minAmount} FCFA` }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('recharges')
      .insert({
        user_id: userId,
        amount: Number(amount),
        method,
        destination: destination || null,
        proof: proof || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log
    await supabaseAdmin.from('activity_logs').insert({
      user_id: userId,
      action: 'recharge_requested',
      details: { amount, method, recharge_id: data.id },
    }).then(() => {}).catch(() => {});

    // Notifier l'admin
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
    const token = process.env.BOT_TOKEN;
    const msg = `💳 *Nouvelle recharge*\n\n👤 User ID : \`${userId}\`\n💰 Montant : *${amount} FCFA*\n📱 Méthode : ${method}\n🆔 ID : \`${data.id}\``;
    for (const adminId of adminIds) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminId, text: msg, parse_mode: 'Markdown' }),
        });
      } catch (e) {}
    }

    return NextResponse.json({ ok: true, recharge: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
