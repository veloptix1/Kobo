import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData } = await req.json();

  const user = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('telegram_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dbUser) {
    return NextResponse.json({ error: 'User not registered. Start the bot first.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: dbUser });
}
