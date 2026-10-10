import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

async function sendTelegram(userId, message) {
  const token = process.env.BOT_TOKEN;
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: userId, text: message, parse_mode: 'Markdown' }),
    });
    return true;
  } catch (e) { return false; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';

  let query = supabaseAdmin
    .from('kobo_purchases')
    .select('*, users(first_name, username, telegram_id), kobo_packs(name, icon)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: pending } = await supabaseAdmin.from('kobo_purchases').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { data: paid } = await supabaseAdmin.from('kobo_purchases').select('amount_paid').eq('status', 'paid');
  const totalRevenue = (paid || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);

  return NextResponse.json({ ok: true, purchases: data || [], pending: pending || 0, totalRevenue });
}

export async function PATCH(req) {
  const body = await req.json();
  const { purchaseId, action, reason } = body;

  if (!purchaseId || !action) return NextResponse.json({ error: 'purchaseId et action requis' }, { status: 400 });

  const { data: p } = await supabaseAdmin.from('kobo_purchases').select('*, kobo_packs(name)').eq('id', purchaseId).single();
  if (!p) return NextResponse.json({ error: 'Achat introuvable' }, { status: 404 });

  if (action === 'approve') {
    const { data, error } = await supabaseAdmin.rpc('approve_kobo_purchase', { p_purchase_id: purchaseId, p_note: null });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await sendTelegram(p.user_id,
      `✅ *Achat de Kobo validé !*\n\n📦 Pack : ${p.kobo_packs?.name || 'Pack'}\n🪙 Kobo reçus : *${data.kobo_total}*\n\n🎉 Bon jeu !`
    );

    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const { error } = await supabaseAdmin.rpc('reject_kobo_purchase', { p_purchase_id: purchaseId, p_note: reason || 'Non conforme' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await sendTelegram(p.user_id,
      `❌ *Achat de Kobo refusé*\n\n${reason ? `📝 Motif : ${reason}\n\n` : ''}Tu peux réessayer.`
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
