import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const signature = req.headers['x-leekpay-signature'];
  if (!signature) return res.status(401).json({ error: 'Missing signature' });

  let rawBody = '';
  try {
    rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid body' });
  }

  const publicKey = process.env.LEEKPAY_PUBLIC_KEY;
  if (!publicKey) return res.status(500).json({ error: 'Config error' });

  const expected = crypto.createHmac('sha256', publicKey).update(rawBody).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (e) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const event = body.event;
  const data = body.data;

  console.log('LeekPay:', event, data?.transaction_id);

  if (event !== 'payment.completed' || !data) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const metadata = data.metadata || {};
  const { type, user_id, reference_id } = metadata;

  if (!user_id) return res.status(200).json({ ok: true });

  try {
    // ===== ACHAT DE KOBO =====
    if (type === 'kobo_purchase' && reference_id) {
      const { data: purchase } = await supabase.from('kobo_purchases').select('*').eq('id', reference_id).single();
      if (!purchase || purchase.status === 'paid') return res.status(200).json({ ok: true, already: true });

      const totalKobo = Number(purchase.kobo_received) + Number(purchase.bonus_kobo || 0);

      await supabase.rpc('credit_user', {
        p_user_id: user_id,
        p_amount: totalKobo,
        p_type: 'kobo_purchase',
        p_reference: String(reference_id),
        p_metadata: { paid: purchase.amount_paid, currency: purchase.currency, tx: data.transaction_id },
      });

      await supabase.from('kobo_purchases').update({ status: 'paid', processed_at: new Date().toISOString(), proof: data.transaction_id }).eq('id', reference_id);

      await supabase.from('activity_logs').insert({
        user_id, action: 'kobo_purchase_paid',
        details: { kobo: totalKobo, tx: data.transaction_id },
      }).then(() => {}).catch(() => {});

      await sendTelegram(user_id,
        `✅ *Achat de Kobo validé !*\n\n💰 Payé : *${purchase.amount_paid} ${purchase.currency}*\n🪙 Reçu : *${totalKobo} Kobo*\n🆔 TX : \`${data.transaction_id}\`\n\n🎉 Bon jeu !`
      );
    }

    // ===== RECHARGE SOLDE RÉEL =====
    if (type === 'recharge' && reference_id) {
      const { data: recharge } = await supabase.from('recharges').select('*').eq('id', reference_id).single();
      if (!recharge || recharge.status === 'paid') return res.status(200).json({ ok: true, already: true });

      const amount = Number(recharge.amount);
      const { data: u } = await supabase.from('users').select('real_balance').eq('telegram_id', user_id).single();

      await supabase.from('users').update({ real_balance: Number(u?.real_balance || 0) + amount }).eq('telegram_id', user_id);
      await supabase.from('recharges').update({ status: 'paid', processed_at: new Date().toISOString(), proof: data.transaction_id }).eq('id', reference_id);

      await supabase.from('activity_logs').insert({
        user_id, action: 'recharge_paid',
        details: { amount, method: recharge.method, tx: data.transaction_id },
      }).then(() => {}).catch(() => {});

      await sendTelegram(user_id,
        `✅ *Recharge validée !*\n\n💰 Montant : *${amount} ${recharge.currency}*\n🆔 TX : \`${data.transaction_id}\`\n\n🎉 Solde crédité !`
      );
    }

    // ===== VIP =====
    if (type === 'vip' && reference_id) {
      const { data: v } = await supabase.from('vip_purchases').select('*').eq('id', reference_id).single();
      if (!v || v.status === 'paid') return res.status(200).json({ ok: true, already: true });

      await supabase.from('vip_purchases').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', reference_id);
      await supabase.rpc('buy_vip', { p_user_id: user_id });

      await sendTelegram(user_id, `✅ *VIP activé !*\n\n🆔 TX : \`${data.transaction_id}\``);
    }

    // ===== MARKETPLACE =====
    if (type === 'marketplace' && reference_id) {
      const { data: order } = await supabase.from('marketplace_orders').select('*').eq('id', reference_id).single();
      if (order && order.status !== 'paid') {
        await supabase.from('marketplace_orders').update({ status: 'paid' }).eq('id', reference_id);
        await sendTelegram(user_id, `✅ *Achat marketplace validé !*\n\n🆔 TX : \`${data.transaction_id}\``);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
