import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  const body = await req.json();
  const { message, target, channelId } = body;

  if (!message) return NextResponse.json({ error: 'Message requis' }, { status: 400 });

  const token = process.env.BOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'BOT_TOKEN non configuré' }, { status: 500 });

  if (target === 'channel') {
    if (!channelId) return NextResponse.json({ error: 'channelId requis' }, { status: 400 });
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId, text: message, parse_mode: 'Markdown' }),
      });
      const j = await r.json();
      if (j.ok) return NextResponse.json({ ok: true, sent: 1, failed: 0, target: channelId });
      return NextResponse.json({ error: j.description || 'Échec envoi canal' }, { status: 500 });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('telegram_id')
    .eq('is_banned', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!users || users.length === 0) return NextResponse.json({ ok: true, sent: 0, failed: 0 });

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const u of users) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: u.telegram_id, text: message, parse_mode: 'Markdown' }),
      });
      const j = await r.json();
      if (j.ok) sent++;
      else { failed++; errors.push(`${u.telegram_id}: ${j.description}`); }
    } catch (err) {
      failed++;
      errors.push(`${u.telegram_id}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  return NextResponse.json({ ok: true, sent, failed, errors: errors.slice(0, 5) });
}
