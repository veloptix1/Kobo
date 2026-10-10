import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: top, error } = await supabaseAdmin
    .from('users')
    .select('telegram_id, first_name, username, total_earned')
    .eq('is_banned', false)
    .order('total_earned', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: me } = await supabaseAdmin
    .from('users')
    .select('total_earned')
    .eq('telegram_id', tgUser.id)
    .single();

  const { count: myRank } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('total_earned', me?.total_earned || 0);

  return NextResponse.json({
    ok: true,
    top: top || [],
    myRank: (myRank || 0) + 1,
    myTotal: me?.total_earned || 0,
    myId: tgUser.id,
  });
}
