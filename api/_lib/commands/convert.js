import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';
import { getSetting } from '../config.js';

// =====================================================
// DÉMARRAGE CONVERSION
// =====================================================
export async function convertStart(ctx) {
  const userId = ctx.from.id;

  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('telegram_id', userId)
    .single();

  const minConvert = Number(await getSetting('min_convert')) || 100;

  if (user.balance < minConvert) {
    return ctx.reply(
      `🔄 *Conversion*\n\n` +
        `❌ Solde insuffisant pour convertir.\n\n` +
        `💰 Ton solde : *${user.balance} Kobo*\n` +
        `📊 Minimum : *${minConvert} Kobo*\n` +
        `Il te manque : *${minConvert - user.balance} Kobo*\n\n` +
        `Continue à gagner des Kobo 💪`,
      { parse_mode: 'Markdown' }
    );
  }

  const rateFcfa = Number(await getSetting('kobo_to_fcfa')) || 1;
  const rateXof = Number(await getSetting('kobo_to_xof')) || 1;
  const rateUsdt = Number(await getSetting('kobo_to_usdt')) || 0;

  const kb = new InlineKeyboard()
    .text(`💵 FCFA (×${rateFcfa})`, 'cv:to:FCFA').row()
    .text(`💴 XOF (×${rateXof})`, 'cv:to:XOF').row()
    .text(`🪙 USDT (×${rateUsdt})`, 'cv:to:USDT').row()
    .text('❌ Annuler', 'cv:cancel');

  await ctx.reply(
    `🔄 *Conversion de Kobo*\n\n` +
      `💰 Solde : *${user.balance} Kobo*\n` +
      `📊 Minimum : *${minConvert} Kobo*\n\n` +
      `Choisis la devise de destination :`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
}

// =====================================================
// CHOIX DEVISE
// =====================================================
export async function convertChooseCurrency(ctx, currency) {
  const userId = ctx.from.id;

  const rateKey = `kobo_to_${currency.toLowerCase()}`;
  const rate = Number(await getSetting(rateKey)) || 0;

  if (rate <= 0) {
    return ctx.answerCallbackQuery({
      text: '❌ Conversion indisponible pour le moment.',
      show_alert: true,
    });
  }

  // Stocker la session en DB
  await supabase.from('user_sessions').upsert({
    user_id: userId,
    data: { step: 'convert_amount', currency },
    updated_at: new Date().toISOString(),
  });

  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('telegram_id', userId)
    .single();

  const minConvert = Number(await getSetting('min_convert')) || 100;

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `🔄 *Conversion en ${currency}*\n\n` +
      `💰 Solde : *${user.balance} Kobo*\n` +
      `📊 Minimum : *${minConvert} Kobo*\n` +
      `💱 Taux : *1 Kobo = ${rate} ${currency}*\n\n` +
      `✍️ Envoie le *nombre de Kobo* à convertir (ex: \`500\`)`,
    { parse_mode: 'Markdown' }
  );
}

// =====================================================
// SAISIE MONTANT
// =====================================================
export async function handleConvertAmount(ctx, text) {
  const userId = ctx.from.id;

  const { data: session } = await supabase
    .from('user_sessions')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (!session || session.data?.step !== 'convert_amount') return false;

  const amount = Number(text.replace(/\s/g, ''));
  if (!amount || isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Montant invalide. Envoie un nombre (ex: `500`).', {
      parse_mode: 'Markdown',
    });
    return true;
  }

  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('telegram_id', userId)
    .single();

  const minConvert = Number(await getSetting('min_convert')) || 100;
  const currency = session.data.currency;
  const rateKey = `kobo_to_${currency.toLowerCase()}`;
  const rate = Number(await getSetting(rateKey)) || 1;

  if (amount < minConvert) {
    await ctx.reply(`❌ Minimum : *${minConvert} Kobo*.`, { parse_mode: 'Markdown' });
    return true;
  }

  if (amount > user.balance) {
    await ctx.reply(`❌ Solde insuffisant. Tu as *${user.balance} Kobo*.`, {
      parse_mode: 'Markdown',
    });
    return true;
  }

  const converted = (amount * rate).toFixed(4);

  const kb = new InlineKeyboard()
    .text('✅ Confirmer', 'cv:confirm')
    .text('❌ Annuler', 'cv:cancel');

  await supabase.from('user_sessions').upsert({
    user_id: userId,
    data: { step: 'convert_confirm', currency, amount, converted },
    updated_at: new Date().toISOString(),
  });

  await ctx.reply(
    `📋 *Récapitulatif*\n\n` +
      `💰 Montant : *${amount} Kobo*\n` +
      `💱 Conversion : *${converted} ${currency}*\n` +
      `📊 Taux : 1 Kobo = ${rate} ${currency}\n\n` +
      `Confirme pour convertir.`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
  return true;
}

// =====================================================
// CONFIRMATION
// =====================================================
export async function convertConfirm(ctx) {
  const userId = ctx.from.id;

  const { data: session } = await supabase
    .from('user_sessions')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (!session || session.data?.step !== 'convert_confirm') {
    return ctx.answerCallbackQuery({ text: '❌ Session expirée. Recommence.', show_alert: true });
  }

  const { currency, amount, converted } = session.data;

  // Débiter les Kobo
  const { data: ok, error } = await supabase.rpc('debit_user', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'convert',
    p_reference: currency,
    p_metadata: { currency, converted },
  });

  if (error || ok === false) {
    await supabase.from('user_sessions').delete().eq('user_id', userId);
    return ctx.answerCallbackQuery({ text: '❌ Erreur : solde insuffisant.', show_alert: true });
  }

  // Créditer le solde retirable
  await supabase.rpc('increment_withdrawable', {
    p_user_id: userId,
    p_amount: amount,
  });

  await supabase.from('user_sessions').delete().eq('user_id', userId);

  await ctx.answerCallbackQuery({ text: '✅ Conversion réussie !', show_alert: true });
  await ctx.editMessageText(
    `✅ *Conversion réussie !*\n\n` +
      `💰 Débité : *${amount} Kobo*\n` +
      `💱 Converti : *${converted} ${currency}*\n\n` +
      `📌 Tu peux maintenant retirer via le bouton 💸 *Retrait*.`,
    { parse_mode: 'Markdown' }
  );
}

// =====================================================
// ANNULER
// =====================================================
export async function convertCancel(ctx) {
  await supabase.from('user_sessions').delete().eq('user_id', ctx.from.id);
  await ctx.answerCallbackQuery({ text: 'Annulé', show_alert: true });
  await ctx.editMessageText('❌ Conversion annulée.');
}