import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData, action } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  if (action === 'status') {
    const { data: vip } = await supabaseAdmin
      .from('user_vip')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['vip_enabled', 'vip_price_monthly', 'vip_bonus_percent', 'vip_ads_bonus_percent', 'vip_mining_bonus_percent']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const isActive = vip && vip.expires_at && new Date(vip.expires_at) > new Date();

    return NextResponse.json({
      ok: true,
      enabled: s.vip_enabled !== false,
      is_active: isActive,
      vip: vip || null,
      price: Number(s.vip_price_monthly) || 500,
      bonus_tasks: Number(s.vip_bonus_percent) || 20,
      bonus_ads: Number(s.vip_ads_bonus_percent) || 50,
      bonus_mining: Number(s.vip_mining_bonus_percent) || 30,
    });
  }

  if (action === 'buy') {
    const { data, error } = await supabaseAdmin.rpc('buy_vip', { p_user_id: userId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === 'cancel') {
    await supabaseAdmin
      .from('user_vip')
      .update({ auto_renew: false })
      .eq('user_id', userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
