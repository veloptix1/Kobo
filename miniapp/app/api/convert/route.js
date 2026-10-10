import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData, action, amount, direction } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  // ==================== STATUT ====================
  if (action === 'status') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, real_balance, real_currency')
      .eq('telegram_id', userId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['min_convert', 'kobo_to_fcfa', 'kobo_to_xof', 'kobo_to_usdt', 'convert_enabled', 'convert_fee_percent']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));

    return NextResponse.json({
      ok: true,
      kobo_balance: Number(user?.balance || 0),
      real_balance: Number(user?.real_balance || 0),
      currency: user?.real_currency || 'FCFA',
      enabled: s.convert_enabled !== false,
      min_convert: Number(s.min_convert) || 100,
      rate_fcfa: Number(s.kobo_to_fcfa) || 1,
      rate_xof: Number(s.kobo_to_xof) || 1,
      rate_usdt: Number(s.kobo_to_usdt) || 0.002,
      fee_percent: Number(s.convert_fee_percent) || 0,
    });
  }

  // ==================== CONVERSION ====================
  if (action === 'convert') {
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    if (!direction) return NextResponse.json({ error: 'Direction requise' }, { status: 400 });

    const amt = Number(amount);

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, real_balance')
      .eq('telegram_id', userId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['min_convert', 'convert_fee_percent', 'convert_enabled']);

    const s = Object.fromEntries((settings || []).map((x) => [x.key, x.value]));
    const minConvert = Number(s.min_convert) || 100;
    const feePercent = Number(s.convert_fee_percent) || 0;

    if (s.convert_enabled === false) return NextResponse.json({ error: 'Conversion désactivée' }, { status: 400 });

    if (direction === 'kobo_to_real') {
      // Kobo → Argent réel (1:1 avec FCFA)
      if (amt < minConvert) return NextResponse.json({ error: `Minimum ${minConvert} Kobo` }, { status: 400 });
      if (Number(user.balance) < amt) return NextResponse.json({ error: 'Solde Kobo insuffisant' }, { status: 400 });

      const fee = amt * feePercent / 100;
      const received = amt - fee;

      await supabaseAdmin.from('users').update({ balance: Number(user.balance) - amt }).eq('telegram_id', userId);
      await supabaseAdmin.from('users').update({ real_balance: Number(user.real_balance) + received }).eq('telegram_id', userId);

      await supabaseAdmin.from('transactions').insert({
        user_id: userId, amount: -amt, type: 'convert',
        metadata: { direction, from: 'kobo', to: 'real', received, fee },
      });

      await supabaseAdmin.from('activity_logs').insert({
        user_id: userId, action: 'convert_kobo_to_real',
        details: { amount: amt, received, fee },
      }).then(() => {}).catch(() => {});

      return NextResponse.json({ ok: true, received, fee });
    }

    if (direction === 'real_to_kobo') {
      // Argent réel → Kobo (1:1)
      if (amt < minConvert) return NextResponse.json({ error: `Minimum ${minConvert} FCFA` }, { status: 400 });
      if (Number(user.real_balance) < amt) return NextResponse.json({ error: 'Solde réel insuffisant' }, { status: 400 });

      const fee = amt * feePercent / 100;
      const received = amt - fee;

      await supabaseAdmin.from('users').update({ real_balance: Number(user.real_balance) - amt }).eq('telegram_id', userId);
      await supabaseAdmin.from('users').update({ balance: Number(user.balance) + received, total_earned: 0 }).eq('telegram_id', userId);

      await supabaseAdmin.from('transactions').insert({
        user_id: userId, amount: received, type: 'convert',
        metadata: { direction, from: 'real', to: 'kobo', fee },
      });

      await supabaseAdmin.from('activity_logs').insert({
        user_id: userId, action: 'convert_real_to_kobo',
        details: { amount: amt, received, fee },
      }).then(() => {}).catch(() => {});

      return NextResponse.json({ ok: true, received, fee });
    }

    return NextResponse.json({ error: 'Direction inconnue' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
