import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('referral_code, referral_count')
    .eq('telegram_id', userId)
    .single();

  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select('*, referred:referred_id(first_name, username, created_at)')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    ok: true,
    referral_code: user?.referral_code,
    referral_count: user?.referral_count || 0,
    referrals: referrals || [],
  });
}
