import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

async function getLimit(key) {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', key).single();
  return Number(data?.value) || 0;
}

async function checkDaily(userId, counter, limit) {
  const { data } = await supabaseAdmin
    .from('daily_counters')
    .select(counter)
    .eq('user_id', userId)
    .eq('day', new Date().toISOString().split('T')[0])
    .maybeSingle();
  const current = Number(data?.[counter] || 0);
  return { current, blocked: limit > 0 && current >= limit };
}

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

  if (action === 'status') {
    const { data: user } = await supabaseAdmin.from('users').select('balance').eq('telegram_id', userId).single();

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
      .in('key', ['wheel_enabled', 'wheel_free_interval_hours', 'wheel_paid_price', 'wheel_prizes', 'slots_enabled', 'slots_price', 'slots_jackpot', 'slots_multipliers', 'limit_wheel_paid_daily', 'limit_slots_daily']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const interval = (s.wheel_free_interval_hours || 24) * 3600;
    const canFreeSpin = !lastFree || (Date.now() - new Date(lastFree.created_at).getTime()) / 1000 >= interval;
    const nextFreeIn = lastFree && !canFreeSpin ? interval - Math.floor((Date.now() - new Date(lastFree.created_at).getTime()) / 1000) : 0;

    const wheelPaidLimit = Number(s.limit_wheel_paid_daily) || 0;
    const slotsLimit = Number(s.limit_slots_daily) || 0;
    const wheelPaidCount = (await checkDaily(userId, 'wheel_paid', wheelPaidLimit)).current;
    const slotsCount = (await checkDaily(userId, 'slots', slotsLimit)).current;

    return NextResponse.json({
      ok: true,
      balance: Number(user?.balance || 0),
      canFreeSpin, nextFreeIn,
      wheelPaidLeft: Math.max(0, wheelPaidLimit - wheelPaidCount),
      slotsLeft: Math.max(0, slotsLimit - slotsCount),
      settings: s,
    });
  }

  if (action === 'spin_free' || action === 'spin') {
    const isFree = action === 'spin_free';

    // Vérif limite quotidienne (roue payante)
    if (!isFree) {
      const limit = await getLimit('limit_wheel_paid_daily');
      const { blocked, current } = await checkDaily(userId, 'wheel_paid', limit);
      if (blocked) {
        await log(userId, 'limit_reached', { game: 'wheel_paid', limit, current });
        return NextResponse.json({ error: `Limite atteinte (${limit}/jour)` }, { status: 429 });
      }
    }

    // Vérif plafond gains journaliers
    const checkLimit = await supabaseAdmin.rpc('check_daily_limit', { p_user_id: userId, p_amount: 100 });
    if (checkLimit.data && checkLimit.data.ok === false) {
      return NextResponse.json({ error: 'Plafond journalier atteint' }, { status: 429 });
    }

    const { data, error } = await supabaseAdmin.rpc('spin_wheel', { p_user_id: userId, p_is_free: isFree });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Incrémenter le compteur
    await supabaseAdmin.rpc('increment_daily_counter', { p_user_id: userId, p_counter: isFree ? 'wheel_free' : 'wheel_paid' });
    if (data && data.ok && data.prize > 0) {
      await supabaseAdmin.rpc('increment_daily_counter', { p_user_id: userId, p_counter: 'tasks', p_amount: data.prize });
    }

    await log(userId, 'game_spin', { isFree, prize: data?.prize });
    return NextResponse.json(data);
  }

  if (action === 'slots') {
    const limit = await getLimit('limit_slots_daily');
    const { blocked, current } = await checkDaily(userId, 'slots', limit);
    if (blocked) {
      await log(userId, 'limit_reached', { game: 'slots', limit, current });
      return NextResponse.json({ error: `Limite atteinte (${limit}/jour)` }, { status: 429 });
    }

    const { data: settings } = await supabaseAdmin.from('settings').select('key, value')
      .in('key', ['slots_price', 'slots_multipliers', 'slots_probabilities']);
    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const price = Number(s.slots_price) || 30;
    const multipliers = s.slots_multipliers || [0, 1, 2, 5, 10, 20];
    const probs = s.slots_probabilities || [55, 25, 12, 5, 2, 1];

    const { data: user } = await supabaseAdmin.from('users').select('balance').eq('telegram_id', userId).single();
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
      await supabaseAdmin.rpc('credit_user', { p_user_id: userId, p_amount: reward, p_type: 'task', p_reference: 'slots', p_metadata: { multiplier, index } });
    } else {
      await supabaseAdmin.from('transactions').insert({ user_id: userId, amount: -price, type: 'admin_adjust', metadata: { reason: 'slots_loss' } });
    }

    await supabaseAdmin.from('game_plays').insert({ user_id: userId, game: 'slots', bet: price, reward, outcome: { multiplier, index } });
    await supabaseAdmin.rpc('increment_daily_counter', { p_user_id: userId, p_counter: 'slots' });

    await log(userId, 'game_slots', { multiplier, reward });
    return NextResponse.json({ ok: true, multiplier, reward, index });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
