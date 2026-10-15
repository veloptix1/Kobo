import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch (e) {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 });
  }

  const { initData, packId } = body;
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = tgUser.id;

  if (!packId) return NextResponse.json({ error: 'packId requis' }, { status: 400 });

  // Récupérer le pack
  const { data: pack } = await supabaseAdmin.from('kobo_packs').select('*').eq('id', packId).single();
  if (!pack) return NextResponse.json({ error: 'Pack introuvable' }, { status: 404 });

  // Récupérer le user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('first_name, username')
    .eq('telegram_id', userId)
    .single();

  const bonus = pack.kobo_amount * pack.bonus_percent / 100;

  // Créer la commande en DB
  const { data: purchase, error: insertError } = await supabaseAdmin
    .from('kobo_purchases')
    .insert({
      user_id: userId,
      pack_id: packId,
      amount_paid: pack.price,
      currency: pack.currency,
      kobo_received: pack.kobo_amount,
      bonus_kobo: bonus,
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
        amount: Number(pack.price),
        currency: pack.currency === 'XOF' ? 'XOF' : 'XOF', // LeekPay accepte XOF, EUR, USD
        description: `Achat ${pack.name} - ${pack.kobo_amount} Kobo`,
        return_url: 'https://kobo-miniapp.vercel.app/success',
        cancel_url: 'https://kobo-miniapp.vercel.app/cancel',
        webhook_url: process.env.LEEKPAY_WEBHOOK_URL,
        customer_name: user?.first_name || user?.username || 'Utilisateur Kobo',
        metadata: {
          type: 'kobo_purchase',
          user_id: String(userId),
          reference_id: String(purchase.id),
        },
      }),
    });

    const data = await r.json();

    if (!data.success || !data.data?.payment_url) {
      // Si erreur, marquer comme rejeté
      await supabaseAdmin.from('kobo_purchases').update({ status: 'rejected', admin_note: data.message || 'Erreur LeekPay' }).eq('id', purchase.id);
      return NextResponse.json({ error: data.message || 'Erreur LeekPay' }, { status: 400 });
    }

    // Sauvegarder l'ID LeekPay
    await supabaseAdmin.from('kobo_purchases').update({ proof: data.data.id }).eq('id', purchase.id);

    return NextResponse.json({
      ok: true,
      purchase_id: purchase.id,
      payment_url: data.data.payment_url,
      checkout_id: data.data.id,
    });
  } catch (err) {
    await supabaseAdmin.from('kobo_purchases').update({ status: 'rejected', admin_note: err.message }).eq('id', purchase.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
