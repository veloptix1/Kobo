import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData, action } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  // ===== STATUT =====
  if (action === 'status') {
    const { data: mining } = await supabaseAdmin
      .from('mining')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, first_name')
      .eq('telegram_id', userId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', [
        'mining_enabled',
        'mining_reward_per_click',
        'mining_cooldown_seconds',
        'mining_daily_limit',
        'mining_level_up_clicks',
        'mining_level_bonus',
        'mining_boost_price',
        'mining_boost_multiplier',
        'mining_boost_duration_hours',
      ]);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));

    return NextResponse.json({
      ok: true,
      mining: mining || {
        total_mined: 0,
        total_clicks: 0,
        level: 1,
        daily_clicks: 0,
        boost_multiplier: 1,
        boost_expires_at: null,
      },
      user,
      settings: s,
    });
  }

  // ===== MINER =====
  if (action === 'mine') {
    const { data, error } = await supabaseAdmin.rpc('mine_click', { p_user_id: userId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ===== ACHETER UN BOOST =====
  if (action === 'buy_boost') {
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['mining_boost_price', 'mining_boost_multiplier', 'mining_boost_duration_hours']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const price = Number(s.mining_boost_price) || 500;
    const mult = Number(s.mining_boost_multiplier) || 2;
    const hours = Number(s.mining_boost_duration_hours) || 24;

    // Vérifier le solde
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('telegram_id', userId)
      .single();

    if (!user || Number(user.balance) < price) {
      return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
    }

    // Débiter
    await supabaseAdmin
      .from('users')
      .update({ balance: Number(user.balance) - price })
      .eq('telegram_id', userId);

    // Activer le boost
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await supabaseAdmin
      .from('mining')
      .update({ boost_multiplier: mult, boost_expires_at: expiresAt })
      .eq('user_id', userId);

    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      amount: -price,
      type: 'admin_adjust',
      metadata: { reason: 'mining_boost', multiplier: mult, hours },
    });

    return NextResponse.json({ ok: true, expiresAt, multiplier: mult });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
