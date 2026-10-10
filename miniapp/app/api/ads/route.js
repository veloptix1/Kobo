import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData, action, viewId } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  // ===== STATUT =====
  if (action === 'status') {
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['ads_enabled', 'ads_url', 'ads_reward', 'ads_min_watch_seconds', 'ads_daily_limit', 'ads_cooldown_seconds']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));

    // Compter les pubs vues aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabaseAdmin
      .from('ads_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('opened_at', today.toISOString())
      .not('completed_at', 'is', null);

    // Dernière pub
    const { data: lastView } = await supabaseAdmin
      .from('ads_views')
      .select('completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cooldown = Number(s.ads_cooldown_seconds) || 30;
    const canWatch = !lastView ||
      (Date.now() - new Date(lastView.completed_at).getTime()) / 1000 >= cooldown;

    const nextIn = lastView && !canWatch
      ? cooldown - Math.floor((Date.now() - new Date(lastView.completed_at).getTime()) / 1000)
      : 0;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('telegram_id', userId)
      .single();

    return NextResponse.json({
      ok: true,
      balance: Number(user?.balance || 0),
      enabled: s.ads_enabled !== false,
      url: s.ads_url || '',
      reward: Number(s.ads_reward) || 10,
      minWatch: Number(s.ads_min_watch_seconds) || 15,
      dailyLimit: Number(s.ads_daily_limit) || 20,
      todayCount: todayCount || 0,
      canWatch,
      nextIn,
      cooldown,
    });
  }

  // ===== DÉMARRER UNE PUB =====
  if (action === 'start') {
    const { data: view } = await supabaseAdmin
      .from('ads_views')
      .insert({ user_id: userId, opened_at: new Date().toISOString() })
      .select()
      .single();

    return NextResponse.json({ ok: true, viewId: view.id });
  }

  // ===== TERMINER UNE PUB =====
  if (action === 'complete') {
    if (!viewId) return NextResponse.json({ error: 'viewId requis' }, { status: 400 });

    const { data: view } = await supabaseAdmin
      .from('ads_views')
      .select('*')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();

    if (!view) return NextResponse.json({ error: 'Vue introuvable' }, { status: 404 });
    if (view.completed_at) return NextResponse.json({ error: 'Déjà complétée' }, { status: 400 });

    // Vérifier le temps de visionnage
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['ads_min_watch_seconds', 'ads_reward']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const minWatch = Number(s.ads_min_watch_seconds) || 15;
    const reward = Number(s.ads_reward) || 10;

    const elapsed = (Date.now() - new Date(view.opened_at).getTime()) / 1000;
    if (elapsed < minWatch) {
      return NextResponse.json({ error: `Tu dois regarder au moins ${minWatch}s` }, { status: 400 });
    }

    // Créditer
    await supabaseAdmin.from('ads_views').update({ completed_at: new Date().toISOString(), reward }).eq('id', viewId);

    await supabaseAdmin.rpc('credit_user', {
      p_user_id: userId,
      p_amount: reward,
      p_type: 'task',
      p_reference: 'ads',
      p_metadata: { view_id: viewId },
    });

    return NextResponse.json({ ok: true, reward });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
