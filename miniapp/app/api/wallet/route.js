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
    .select('balance, withdrawable_balance, total_earned, total_withdrawn')
    .eq('telegram_id', userId)
    .single();

  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  const { data: withdrawals } = await supabaseAdmin
    .from('withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    ok: true,
    user: user || { balance: 0, withdrawable_balance: 0, total_earned: 0, total_withdrawn: 0 },
    transactions: transactions || [],
    withdrawals: withdrawals || [],
  });
}
