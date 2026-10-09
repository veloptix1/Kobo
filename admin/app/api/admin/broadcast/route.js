import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  const { message } = await req.json();
  if (!message) return NextResponse.json({ error: 'Message requis' }, { status: 400 });
  const { data: users } = await supabaseAdmin.from('users').select('telegram_id').eq('is_banned', false);
  if (!users) return NextResponse.json({ error: 'Erreur chargement users' }, { status: 500 });
  const token = process.env.BOT_TOKEN;
  let sent = 0, failed = 0;
  for (const u of users) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: u.telegram_id, text: message, parse_mode: 'Markdown' }),
      });
      const j = await r.json();
      if (j.ok) sent++; else failed++;
    } catch { failed++; }
    await new Promise((r) => setTimeout(r, 50));
  }
  return NextResponse.json({ ok: true, sent, failed });
}
