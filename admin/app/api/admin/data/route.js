import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function formatMethod(m) {
  const names = { orange_money: 'Orange Money', mtn: 'MTN Mobile Money', wave: 'Wave', usdt: 'USDT (TRC20)' };
  return names[m] || m;
}

async function sendTelegram(userId, message) {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error('BOT_TOKEN manquant');
    return false;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: userId, text: message, parse_mode: 'Markdown' }),
    });
    const j = await r.json();
    if (!j.ok) console.error('Telegram send failed:', j.description);
    return j.ok;
  } catch (err) {
    console.error('sendTelegram error:', err.message);
    return false;
  }
}

async function editTelegram(channelId, messageId, text) {
  const token = process.env.BOT_TOKEN;
  if (!token) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        message_id: messageId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const j = await r.json();
    if (!j.ok) console.error('Telegram edit failed:', j.description);
    return j.ok;
  } catch (err) {
    console.error('editTelegram error:', err.message);
    return false;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');

  try {
    if (resource === 'stats') {
      const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
      const { count: bannedUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true);
      const { count: pendingWD } = await supabaseAdmin.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: sums } = await supabaseAdmin.from('users').select('balance,total_earned,total_withdrawn');
      const totalKobo = sums?.reduce((s, u) => s + Number(u.balance || 0), 0) || 0;
      const totalEarned = sums?.reduce((s, u) => s + Number(u.total_earned || 0), 0) || 0;
      const totalWithdrawn = sums?.reduce((s, u) => s + Number(u.total_withdrawn || 0), 0) || 0;
      return NextResponse.json({ totalUsers, bannedUsers, pendingWD, totalKobo, totalEarned, totalWithdrawn });
    }

    if (resource === 'withdrawals') {
      const { data, error } = await supabaseAdmin
        .from('withdrawals')
        .select('*, users(first_name, username, telegram_id)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (resource === 'tasks') {
      const { data, error } = await supabaseAdmin.from('tasks').select('*').order('id', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (resource === 'users') {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (resource === 'settings') {
      const { data, error } = await supabaseAdmin.from('settings').select('*').order('key');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  const body = await req.json();

  try {
    if (resource === 'withdrawal') {
      const { id, status } = body;
      if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

      const { data: w, error: fetchErr } = await supabaseAdmin
        .from('withdrawals')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !w) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });

      const { error: updateErr } = await supabaseAdmin
        .from('withdrawals')
        .update({ status, processed_at: new Date().toISOString() })
        .eq('id', id);

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

      const channelId = '@koboretrai';

      // 🔔 1. Éditer le message dans le canal retrait
      if (w.channel_message_id) {
        const now = new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        let channelText = '';
        if (status === 'paid') {
          channelText =
            `✅ *Retrait payé*\n\n` +
            `🆔 Demande #${w.id}\n` +
            `💰 Montant : *${w.amount_target} ${w.target_currency}*\n` +
            `📱 Méthode : ${formatMethod(w.method)}\n` +
            `📅 Traité le ${now}\n\n` +
            `🎉 Retrait effectué avec succès.`;
        } else if (status === 'rejected') {
          channelText =
            `❌ *Retrait refusé*\n\n` +
            `🆔 Demande #${w.id}\n` +
            `💰 Montant : *${w.amount_target} ${w.target_currency}*\n` +
            `📱 Méthode : ${formatMethod(w.method)}\n` +
            `📅 Traité le ${now}\n\n` +
            `🔙 Le montant a été remboursé.`;
        }

        if (channelText) {
          await editTelegram(channelId, w.channel_message_id, channelText);
        }
      }

      // 🔔 2. Notifier l'utilisateur
      if (status === 'paid') {
        const message =
          `✅ *Retrait payé !*\n\n` +
          `💰 Montant : *${w.amount_target} ${w.target_currency}*\n` +
          `📱 Méthode : ${formatMethod(w.method)}\n` +
          `📍 Destination : \`${w.destination}\`\n\n` +
          `🎉 Merci d'avoir utilisé Kobo !`;
        await sendTelegram(w.user_id, message);
      } else if (status === 'rejected') {
        try {
          await supabaseAdmin.rpc('increment_withdrawable', {
            p_user_id: w.user_id,
            p_amount: w.amount_kobo,
          });
        } catch (e) {
          console.error('Refund failed:', e.message);
        }

        const message =
          `❌ *Retrait refusé*\n\n` +
          `💰 Montant : *${w.amount_target} ${w.target_currency}*\n\n` +
          `💡 Tes Kobo ont été remboursés sur ton solde retirable.`;
        await sendTelegram(w.user_id, message);
      }

      return NextResponse.json({ ok: true });
    }

    if (resource === 'task') {
      const { id, ...updates } = body;
      const { error } = await supabaseAdmin.from('tasks').update(updates).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (resource === 'user') {
      const { telegram_id, ...updates } = body;
      const { error } = await supabaseAdmin.from('users').update(updates).eq('telegram_id', telegram_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (resource === 'setting') {
      const { key, value } = body;
      const { error } = await supabaseAdmin
        .from('settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  const body = await req.json();

  if (resource === 'task') {
    const { data, error } = await supabaseAdmin.from('tasks').insert(body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, task: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  const body = await req.json();

  if (resource === 'task') {
    const { error } = await supabaseAdmin.from('tasks').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
