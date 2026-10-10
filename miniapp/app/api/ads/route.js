import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

async function getLimit(key) {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', key).single();
  return Number(data?.value) || 0;
}

async function log(userId, action, details) {
  try { await supabaseAdmin.from('activity_logs').insert({ user_id: userId, action, details }); } catch (e) {}
}

export async function POST(req) {
  const { initData, action, viewId } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = tgUser.id;

  if (action === 'status') {
    const { data: settings } = await supabaseAdmin.from('settings').select('key, value')
      .in('key', ['ads_enabled', 'ads_url', 'ads_reward', 'ads_min_watch_seconds', 'ads_daily_limit', 'ads_cooldown_seconds']);
    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabaseAdmin.from('ads_views').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('opened_at', today.toISOString()).not('completed_at', 'is', null);

    const { data: lastView } = await supabaseAdmin.from('ads_views').select('completed_at')
      .eq('user_id', userId).not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).limit(1).maybeSingle();

    const cooldown = Number(s.ads_cooldown_seconds) || 30;
    const canWatch = !lastView || (Date.now() - new Date(lastView.completed_at).getTime()) / 1000 >= cooldown;
    const nextIn = lastView && !canWatch ? cooldown - Math.floor((Date.now() - new Date(lastView.completed_at).getTime()) / 1000) : 0;

    const { data: user } = await supabaseAdmin.from('users').select('balance').eq('telegram_id', userId).single();

    return NextResponse.json({
      ok: true,
      balance: Number(user?.balance || 0),
      enabled: s.ads_enabled !== false,
      url: s.ads_url || '',
      reward: Number(s.ads_reward) || 10,
      minWatch: Number(s.ads_min_watch_seconds) || 15,
      dailyLimit: Number(s.ads_daily_limit) || 20,
      todayCount: todayCount || 0,
      canWatch, nextIn, cooldown,
    });
  }

  if (action === 'start') {
    const dailyLimit = await getLimit('ads_daily_limit');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin.from('ads_views').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gte('opened_at', today.toISOString()).not('completed_at', 'is', null);

    if (dailyLimit > 0 && count >= dailyLimit) {
      await log(userId, 'limit_reached', { game: 'ads', limit: dailyLimit });
      return NextResponse.json({ error: `Limite atteinte (${dailyLimit}/jour)` }, { status: 429 });
    }

    const { data: view } = await supabaseAdmin.from('ads_views')
      .insert({ user_id: userId, opened_at: new Date().toISOString() })
      .select().single();
    return NextResponse.json({ ok: true, viewId: view.id });
  }

  if (action === 'complete') {
    if (!viewId) return NextResponse.json({ error: 'viewId requis' }, { status: 400 });

    const { data: view } = await supabaseAdmin.from('ads_views').select('*')
      .eq('id', viewId).eq('user_id', userId).single();
    if (!view) return NextResponse.json({ error: 'Vue introuvable' }, { status: 404 });
    if (view.completed_at) return NextResponse.json({ error: 'Déjà complétée' }, { status: 400 });

    const { data: settings } = await supabaseAdmin.from('settings').select('key, value')
      .in('key', ['ads_min_watch_seconds', 'ads_reward']);
    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const minWatch = Number(s.ads_min_watch_seconds) || 15;
    const reward = Number(s.ads_reward) || 10;

    const elapsed = (Date.now() - new Date(view.opened_at).getTime()) / 1000;
    if (elapsed < minWatch) {
      await log(userId, 'ads_too_fast', { elapsed, minWatch });
      return NextResponse.json({ error: `Regarde au moins ${minWatch}s` }, { status: 400 });
    }

    // Plafond gains
    const checkLimit = await supabaseAdmin.rpc('check_daily_limit', { p_user_id: userId, p_amount: reward });
    if (checkLimit.data && checkLimit.data.ok === false) {
      return NextResponse.json({ error: 'Plafond journalier atteint' }, { status: 429 });
    }

    await supabaseAdmin.from('ads_views').update({ completed_at: new Date().toISOString(), reward }).eq('id', viewId);
    await supabaseAdmin.rpc('credit_user', { p_user_id: userId, p_amount: reward, p_type: 'task', p_reference: 'ads', p_metadata: { view_id: viewId } });
    await supabaseAdmin.rpc('increment_daily_counter', { p_user_id: userId, p_counter: 'ads' });

    await log(userId, 'ads_complete', { reward, elapsed });
    return NextResponse.json({ ok: true, reward });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
