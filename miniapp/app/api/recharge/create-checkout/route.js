import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch (e) {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 });
  }

  const { initData, amount } = body;
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = tgUser.id;

  const amt = Number(amount);
  if (!amt || amt <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });

  // Vérif minimum
  const { data: settings } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', ['recharge_min_amount']);

  const s = Object.fromEntries((settings || []).map(x => [x.key, x.value]));
  const minAmount = Number(s.recharge_min_amount) || 500;

  if (amt < minAmount) {
    return NextResponse.json({ error: `Minimum ${minAmount} FCFA` }, { status: 400 });
  }

  // Récupérer user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('first_name, username')
    .eq('telegram_id', userId)
    .single();

  // Créer la recharge en DB
  const { data: recharge, error: insertError } = await supabaseAdmin
    .from('recharges')
    .insert({
      user_id: userId,
      amount: amt,
      currency: 'XOF',
      method: 'leekpay',
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Appeler LeekPay
  const secretKey = process.env.LEEKPAY_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'LeekPay non configuré' }, { status: 500 });

  try {
    const r = await fetch('https://leekpay.fr/api/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amt,
        currency: 'XOF',
        description: `Recharge solde Kobo - ${amt} FCFA`,
        return_url: 'https://kobo-miniapp.vercel.app/success',
        cancel_url: 'https://kobo-miniapp.vercel.app/cancel',
        webhook_url: process.env.LEEKPAY_WEBHOOK_URL,
        customer_name: user?.first_name || user?.username || 'Utilisateur Kobo',
        metadata: {
          type: 'recharge',
          user_id: String(userId),
          reference_id: String(recharge.id),
        },
      }),
    });

    const data = await r.json();

    if (!data.success || !data.data?.payment_url) {
      await supabaseAdmin.from('recharges').update({ status: 'rejected', admin_note: data.message || 'Erreur LeekPay' }).eq('id', recharge.id);
      return NextResponse.json({ error: data.message || 'Erreur LeekPay' }, { status: 400 });
    }

    // Sauvegarder l'ID LeekPay
    await supabaseAdmin.from('recharges').update({ proof: data.data.id }).eq('id', recharge.id);

    return NextResponse.json({
      ok: true,
      recharge_id: recharge.id,
      payment_url: data.data.payment_url,
      checkout_id: data.data.id,
    });
  } catch (err) {
    await supabaseAdmin.from('recharges').update({ status: 'rejected', admin_note: err.message }).eq('id', recharge.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
