import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData, action } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  if (action === 'status') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('telegram_id', userId)
      .single();

    const { data: lastFree } = await supabaseAdmin
      .from('game_plays')
      .select('created_at')
      .eq('user_id', userId)
      .eq('game', 'wheel')
      .eq('bet', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['wheel_enabled', 'wheel_free_interval_hours', 'wheel_paid_price', 'wheel_prizes', 'slots_enabled', 'slots_price', 'slots_jackpot', 'slots_multipliers']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const interval = (s.wheel_free_interval_hours || 24) * 3600;
    const canFreeSpin = !lastFree || (Date.now() - new Date(lastFree.created_at).getTime()) / 1000 >= interval;
    const nextFreeIn = lastFree && !canFreeSpin
      ? interval - Math.floor((Date.now() - new Date(lastFree.created_at).getTime()) / 1000)
      : 0;

    return NextResponse.json({ ok: true, balance: Number(user?.balance || 0), canFreeSpin, nextFreeIn, settings: s });
  }

  if (action === 'spin_free' || action === 'spin') {
    const { data, error } = await supabaseAdmin.rpc('spin_wheel', {
      p_user_id: userId,
      p_is_free: action === 'spin_free',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === 'slots') {
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['slots_price', 'slots_jackpot', 'slots_multipliers', 'slots_probabilities']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const price = Number(s.slots_price) || 30;
    const multipliers = s.slots_multipliers || [0, 1, 2, 5, 10, 20];
    const probs = s.slots_probabilities || [55, 25, 12, 5, 2, 1];

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('telegram_id', userId)
      .single();

    if (!user || Number(user.balance) < price) return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });

    const rand = Math.random() * 100;
    let cumulative = 0, index = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += Number(probs[i]);
      if (rand <= cumulative) { index = i; break; }
    }

    const multiplier = Number(multipliers[index]);
    const reward = price * multiplier;

    await supabaseAdmin.from('users').update({ balance: Number(user.balance) - price }).eq('telegram_id', userId);

    if (reward > 0) {
      await supabaseAdmin.rpc('credit_user', {
        p_user_id: userId,
        p_amount: reward,
        p_type: 'task',
        p_reference: 'slots',
        p_metadata: { multiplier, index },
      });
    } else {
      await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        amount: -price,
        type: 'admin_adjust',
        metadata: { reason: 'slots_loss' },
      });
    }

    await supabaseAdmin.from('game_plays').insert({
      user_id: userId,
      game: 'slots',
      bet: price,
      reward,
      outcome: { multiplier, index },
    });

    return NextResponse.json({ ok: true, multiplier, reward, index });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
