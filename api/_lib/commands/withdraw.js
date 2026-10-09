import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';
import { getSetting } from '../config.js';

// Stockage temporaire des conversations (en mémoire, reset au redéploiement)
// Pour la prod, on utilisera la DB mais ça suffit pour commencer
const sessions = new Map();

// =====================================================
// DÉMARRAGE
// =====================================================
export async function withdrawStart(ctx) {
  const userId = ctx.from.id;

  const { data: user } = await supabase
    .from('users')
    .select('balance,total_withdrawn')
    .eq('telegram_id', userId)
    .single();

  const minWithdraw = Number(await getSetting('min_withdraw')) || 2000;

  if (user.balance < minWithdraw) {
    const missing = minWithdraw - user.balance;
    return ctx.reply(
      `💸 *Retrait*\n\n` +
        `❌ Solde insuffisant.\n\n` +
        `Ton solde : *${user.balance} Kobo*\n` +
        `Minimum requis : *${minWithdraw} Kobo*\n` +
        `Il te manque : *${missing} Kobo*\n\n` +
        `Continue à faire des tâches pour atteindre le seuil 💪`,
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
      `💰 Solde disponible : *${user.balance} Kobo*\n` +
      `📊 Minimum : *${minWithdraw} Kobo*\n\n` +
      `Choisis la devise de retrait :`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
}

// =====================================================
// CHOIX DEVISE
// =====================================================
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

// =====================================================
// CHOIX MÉTHODE
// =====================================================
export async function chooseMethod(ctx, method) {
  const userId = ctx.from.id;
  const session = sessions.get(userId) || {};
  session.step = 'enter_amount';
  session.method = method;
  sessions.set(userId, session);

  await ctx.answerCallbackQuery();

  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('telegram_id', userId)
    .single();

  const minWithdraw = Number(await getSetting('min_withdraw')) || 2000;

  await ctx.editMessageText(
    `💸 *Retrait — ${session.currency} via ${formatMethod(method)}*\n\n` +
      `💰 Solde : *${user.balance} Kobo*\n` +
      `📊 Minimum : *${minWithdraw} Kobo*\n\n` +
      `✍️ Envoie le *montant en Kobo* à retirer (ex: \`2000\`)`,
    { parse_mode: 'Markdown' }
  );
}

// =====================================================
// SAISIE MONTANT
// =====================================================
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
    .select('balance')
    .eq('telegram_id', userId)
    .single();

  const minWithdraw = Number(await getSetting('min_withdraw')) || 2000;

  if (amount < minWithdraw) {
    await ctx.reply(
      `❌ Le minimum est de *${minWithdraw} Kobo*. Réessaie.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (amount > user.balance) {
    await ctx.reply(
      `❌ Solde insuffisant. Ton solde : *${user.balance} Kobo*. Réessaie.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  session.amount = amount;
  session.step = 'enter_destination';
  sessions.set(userId, session);

  const destPrompt =
    session.method === 'usdt'
      ? `✍️ Envoie ton *adresse wallet USDT (TRC20)* :`
      : `✍️ Envoie ton *numéro ${formatMethod(session.method)}* (ex: \`+237 6XX XXX XXX\`) :`;

  await ctx.reply(destPrompt, { parse_mode: 'Markdown' });
  return true;
}

// =====================================================
// SAISIE DESTINATION
// =====================================================
export async function handleDestinationInput(ctx, text) {
  const userId = ctx.from.id;
  const session = sessions.get(userId);
  if (!session || session.step !== 'enter_destination') return false;

  session.destination = text.trim();
  session.step = 'confirm';
  sessions.set(userId, session);

  const rate = await getRate(session.currency);
  const converted = (session.amount * rate).toFixed(2);

  const kb = new InlineKeyboard()
    .text('✅ Confirmer', 'wd:confirm')
    .text('❌ Annuler', 'wd:cancel');

  await ctx.reply(
    `📋 *Récapitulatif*\n\n` +
      `💰 Montant : *${session.amount} Kobo*\n` +
      `💱 Conversion : *${converted} ${session.currency}*\n` +
      `📱 Méthode : ${formatMethod(session.method)}\n` +
      `📍 Destination : \`${session.destination}\`\n\n` +
      `Confirme pour envoyer ta demande.`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
  return true;
}

// =====================================================
// CONFIRMATION FINALE
// =====================================================
export async function confirmWithdraw(ctx) {
  const userId = ctx.from.id;
  const session = sessions.get(userId);
  if (!session || session.step !== 'confirm') {
    return ctx.answerCallbackQuery({ text: '❌ Session expirée. Recommence.', show_alert: true });
  }

  const rate = await getRate(session.currency);
  const converted = (session.amount * rate).toFixed(2);

  // Débiter le solde
  const ok = await supabase.rpc('debit_user', {
    p_user_id: userId,
    p_amount: session.amount,
    p_type: 'withdrawal',
    p_reference: null,
    p_metadata: {
      currency: session.currency,
      method: session.method,
      destination: session.destination,
    },
  });

  if (ok.error || ok.data === false) {
    sessions.delete(userId);
    return ctx.answerCallbackQuery({ text: '❌ Solde insuffisant.', show_alert: true });
  }

  // Enregistrer le retrait
  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .insert({
      user_id: userId,
      amount_kobo: session.amount,
      amount_target: Number(converted),
      target_currency: session.currency,
      method: session.method,
      destination: session.destination,
      status: 'pending',
    })
    .select()
    .single();

  // Incrémenter total_withdrawn
  await supabase.rpc('increment_withdrawn', {
    p_user_id: userId,
    p_amount: session.amount,
  }).catch(() => {});

  sessions.delete(userId);

  await ctx.answerCallbackQuery({ text: '✅ Demande envoyée !', show_alert: true });
  await ctx.editMessageText(
    `✅ *Demande de retrait envoyée !*\n\n` +
      `💰 Montant : *${session.amount} Kobo*\n` +
      `💱 Tu recevras : *${converted} ${session.currency}*\n` +
      `📱 Méthode : ${formatMethod(session.method)}\n` +
      `📍 Destination : \`${session.destination}\`\n\n` +
      `⏳ Traitement sous 24-48h.\n` +
      `Tu seras notifié dès validation.`,
    { parse_mode: 'Markdown' }
  );

  // Notifier les admins
  await notifyAdmins(ctx, session, converted, withdrawal?.id);
}

// =====================================================
// ANNULER
// =====================================================
export async function cancelWithdraw(ctx) {
  sessions.delete(ctx.from.id);
  await ctx.answerCallbackQuery({ text: 'Annulé', show_alert: true });
  await ctx.editMessageText('❌ Demande annulée.');
}

// =====================================================
// HISTORIQUE
// =====================================================
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
    text += `${icon} *${w.amount_kobo} Kobo* → ${w.amount_target} ${w.target_currency}\n`;
    text += `   ${formatMethod(w.method)} · ${new Date(w.created_at).toLocaleDateString('fr-FR')}\n\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// =====================================================
// HELPERS
// =====================================================
async function getRate(currency) {
  const key = `kobo_to_${currency.toLowerCase()}`;
  return Number(await getSetting(key)) || 1;
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

async function notifyAdmins(ctx, session, converted, withdrawalId) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const text =
    `🔔 *Nouvelle demande de retrait*\n\n` +
    `👤 User ID : \`${ctx.from.id}\`\n` +
    `💰 Montant : *${session.amount} Kobo*\n` +
    `💱 À envoyer : *${converted} ${session.currency}*\n` +
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