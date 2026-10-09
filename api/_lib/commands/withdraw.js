import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';
import { getSetting } from '../config.js';

const sessions = new Map();

export async function withdrawStart(ctx) {
  const userId = ctx.from.id;

  const { data: user } = await supabase
    .from('users')
    .select('withdrawable_balance, balance')
    .eq('telegram_id', userId)
    .single();

  const minWithdraw = Number(await getSetting('min_withdraw')) || 2000;
  const available = Number(user?.withdrawable_balance || 0);

  if (available < minWithdraw) {
    const missing = minWithdraw - available;
    return ctx.reply(
      `💸 *Retrait*\n\n` +
        `❌ Solde retirable insuffisant.\n\n` +
        `💰 Solde retirable : *${available} FCFA*\n` +
        `📊 Minimum : *${minWithdraw} FCFA*\n` +
        `Il te manque : *${missing} FCFA*\n\n` +
        `🔄 Convertir tes Kobo d'abord via le bouton *Convertir*.`,
      { parse_mode: 'Markdown' }
    );
  }

  sessions.set(userId, { step: 'choose_currency' });

  const methods = (await getSetting('withdraw_methods')) || [];
  const kb = new InlineKeyboard();

  if (methods.includes('orange_money') || methods.includes('mtn') || methods.includes('wave')) {
    kb.text('💵 FCFA / XOF', 'wd:currency:FCFA').row();
  }
  if (methods.includes('usdt')) {
    kb.text('🪙 USDT', 'wd:currency:USDT').row();
  }
  kb.text('❌ Annuler', 'wd:cancel');

  await ctx.reply(
    `💸 *Retrait*\n\n` +
      `💰 Solde retirable : *${available} FCFA*\n` +
      `📊 Minimum : *${minWithdraw} FCFA*\n\n` +
      `Choisis la devise de retrait :`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
}

export async function chooseCurrency(ctx, currency) {
  const userId = ctx.from.id;
  sessions.set(userId, { step: 'choose_method', currency });

  const methods = (await getSetting('withdraw_methods')) || [];
  const kb = new InlineKeyboard();

  if (currency === 'FCFA') {
    if (methods.includes('orange_money')) kb.text('🟠 Orange Money', 'wd:method:orange_money').row();
    if (methods.includes('mtn')) kb.text('🟡 MTN Mobile Money', 'wd:method:mtn').row();
    if (methods.includes('wave')) kb.text('🌊 Wave', 'wd:method:wave').row();
  } else if (currency === 'USDT') {
    kb.text('🪙 USDT (TRC20)', 'wd:method:usdt').row();
  }

  kb.text('🔙 Retour', 'wd:back');

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `💸 *Retrait en ${currency}*\n\nChoisis la méthode :`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
}

export async function chooseMethod(ctx, method) {
  const userId = ctx.from.id;
  const session = sessions.get(userId) || {};
  session.step = 'enter_amount';
  session.method = method;
  sessions.set(userId, session);

  await ctx.answerCallbackQuery();

  const { data: user } = await supabase
    .from('users')
    .select('withdrawable_balance')
    .eq('telegram_id', userId)
    .single();

  const minWithdraw = Number(await getSetting('min_withdraw')) || 2000;
  const available = Number(user.withdrawable_balance || 0);

  await ctx.editMessageText(
    `💸 *Retrait — ${session.currency} via ${formatMethod(method)}*\n\n` +
      `💰 Solde retirable : *${available} ${session.currency}*\n` +
      `📊 Minimum : *${minWithdraw} ${session.currency}*\n\n` +
      `✍️ Envoie le *montant en ${session.currency}* à retirer (ex: \`2000\`)`,
    { parse_mode: 'Markdown' }
  );
}

export async function handleAmountInput(ctx, text) {
  const userId = ctx.from.id;
  const session = sessions.get(userId);
  if (!session || session.step !== 'enter_amount') return false;

  const amount = Number(text.replace(/\s/g, ''));
  if (!amount || isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Montant invalide. Envoie un nombre (ex: `2000`).', { parse_mode: 'Markdown' });
    return true;
  }

  const { data: user } = await supabase
    .from('users')
    .select('withdrawable_balance')
    .eq('telegram_id', userId)
    .single();

  const minWithdraw = Number(await getSetting('min_withdraw')) || 2000;
  const available = Number(user.withdrawable_balance || 0);

  const rateKey = `kobo_to_${session.currency.toLowerCase()}`;
  const rate = Number(await getSetting(rateKey)) || 1;
  const amountInKobo = session.currency === 'USDT' ? amount / rate : amount;

  if (amount < minWithdraw) {
    await ctx.reply(
      `❌ Le minimum est de *${minWithdraw} ${session.currency}*. Réessaie.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (amountInKobo > available) {
    await ctx.reply(
      `❌ Solde insuffisant. Disponible : *${available} ${session.currency}*.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  session.amount = amount;
  session.amountKobo = amountInKobo;
  session.step = 'enter_destination';
  sessions.set(userId, session);

  const destPrompt =
    session.method === 'usdt'
      ? `✍️ Envoie ton *adresse wallet USDT (TRC20)* :`
      : `✍️ Envoie ton *numéro ${formatMethod(session.method)}* (ex: \`+237 6XX XXX XXX\`) :`;

  await ctx.reply(destPrompt, { parse_mode: 'Markdown' });
  return true;
}

export async function handleDestinationInput(ctx, text) {
  const userId = ctx.from.id;
  const session = sessions.get(userId);
  if (!session || session.step !== 'enter_destination') return false;

  session.destination = text.trim();
  session.step = 'confirm';
  sessions.set(userId, session);

  const kb = new InlineKeyboard()
    .text('✅ Confirmer', 'wd:confirm')
    .text('❌ Annuler', 'wd:cancel');

  await ctx.reply(
    `📋 *Récapitulatif*\n\n` +
      `💰 Montant : *${session.amount} ${session.currency}*\n` +
      `📱 Méthode : ${formatMethod(session.method)}\n` +
      `📍 Destination : \`${session.destination}\`\n\n` +
      `Confirme pour envoyer ta demande.`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
  return true;
}

export async function confirmWithdraw(ctx) {
  const userId = ctx.from.id;
  const session = sessions.get(userId);
  if (!session || session.step !== 'confirm') {
    return ctx.answerCallbackQuery({ text: '❌ Session expirée. Recommence.', show_alert: true });
  }

  const { data: ok, error } = await supabase.rpc('debit_withdrawable', {
    p_user_id: userId,
    p_amount: session.amountKobo,
  });

  if (error || ok === false) {
    sessions.delete(userId);
    return ctx.answerCallbackQuery({ text: '❌ Solde insuffisant.', show_alert: true });
  }

  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .insert({
      user_id: userId,
      amount_kobo: session.amountKobo,
      amount_target: session.amount,
      target_currency: session.currency,
      method: session.method,
      destination: session.destination,
      status: 'pending',
    })
    .select()
    .single();

  await supabase.rpc('increment_withdrawn', {
    p_user_id: userId,
    p_amount: session.amountKobo,
  }).catch(() => {});

  sessions.delete(userId);

  await ctx.answerCallbackQuery({ text: '✅ Demande envoyée !', show_alert: true });
  await ctx.editMessageText(
    `✅ *Demande de retrait envoyée !*\n\n` +
      `💰 Montant : *${session.amount} ${session.currency}*\n` +
      `📱 Méthode : ${formatMethod(session.method)}\n` +
      `📍 Destination : \`${session.destination}\`\n\n` +
      `⏳ Traitement sous 24-48h.\n` +
      `Tu seras notifié dès validation.`,
    { parse_mode: 'Markdown' }
  );

  await notifyAdmins(ctx, session, withdrawal?.id);
}

export async function cancelWithdraw(ctx) {
  sessions.delete(ctx.from.id);
  await ctx.answerCallbackQuery({ text: 'Annulé', show_alert: true });
  await ctx.editMessageText('❌ Demande annulée.');
}

export async function withdrawHistory(ctx) {
  const userId = ctx.from.id;

  const { data: list } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  await ctx.answerCallbackQuery();

  if (!list || list.length === 0) {
    return ctx.reply('📊 *Aucun retrait pour le moment.*', { parse_mode: 'Markdown' });
  }

  let text = '📊 *Historique des retraits*\n\n';
  list.forEach((w) => {
    const icon =
      w.status === 'paid' ? '✅' :
      w.status === 'pending' ? '⏳' :
      w.status === 'processing' ? '⚙️' : '❌';
    text += `${icon} *${w.amount_target} ${w.target_currency}*\n`;
    text += `   ${formatMethod(w.method)} · ${new Date(w.created_at).toLocaleDateString('fr-FR')}\n\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

function formatMethod(m) {
  const names = {
    orange_money: 'Orange Money',
    mtn: 'MTN Mobile Money',
    wave: 'Wave',
    usdt: 'USDT (TRC20)',
  };
  return names[m] || m;
}

async function notifyAdmins(ctx, session, withdrawalId) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const text =
    `🔔 *Nouvelle demande de retrait*\n\n` +
    `👤 User ID : \`${ctx.from.id}\`\n` +
    `💰 Montant : *${session.amount} ${session.currency}*\n` +
    `📱 Méthode : ${formatMethod(session.method)}\n` +
    `📍 Destination : \`${session.destination}\`\n` +
    `🆔 ID retrait : \`${withdrawalId}\``;

  for (const adminId of adminIds) {
    try {
      await ctx.api.sendMessage(adminId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`Impossible de notifier admin ${adminId}:`, err.message);
    }
  }
}
