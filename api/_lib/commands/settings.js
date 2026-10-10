import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';
import { t, getUserLang, getUserCurrency, setUserLanguage, setUserCurrency, getActiveCurrencies, getActiveLanguages } from '../utils/i18n.js';

// Menu paramètres
export async function settingsCommand(ctx) {
  const userId = ctx.from.id;
  const lang = await getUserLang(userId);
  const currency = await getUserCurrency(userId);

  const langInfo = await t('language', lang);
  const currInfo = await t('currency', lang);

  const kb = new InlineKeyboard()
    .text('🌐 ' + langInfo, 'settings:lang').row()
    .text('💱 ' + currInfo, 'settings:currency').row()
    .text('🔙 ' + await t('back', lang), 'menu:home');

  await ctx.reply(
    `⚙️ *${await t('settings', lang)}*\n\n` +
      `🌐 ${langInfo} : *${lang.toUpperCase()}*\n` +
      `💱 ${currInfo} : *${currency}*`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
}

// Choix de langue
export async function showLanguages(ctx) {
  const userId = ctx.from.id;
  const lang = await getUserLang(userId);
  const languages = await getActiveLanguages();

  const kb = new InlineKeyboard();
  for (const l of languages) {
    kb.text(`${l.flag} ${l.name}`, `settings:setlang:${l.code}`).row();
  }
  kb.text('🔙 ' + await t('back', lang), 'settings:back');

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `🌐 *${await t('change_language', lang)}*`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
}

// Choix de devise
export async function showCurrencies(ctx) {
  const userId = ctx.from.id;
  const lang = await getUserLang(userId);
  const currencies = await getActiveCurrencies();

  const kb = new InlineKeyboard();
  for (const c of currencies) {
    kb.text(`${c.symbol} ${c.code} — ${c.name}`, `settings:setcurr:${c.code}`).row();
  }
  kb.text('🔙 ' + await t('back', lang), 'settings:back');

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `💱 *${await t('change_currency', lang)}*\n\n` +
      `Choisis ta devise par défaut`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
}

// Définir la langue
export async function setLanguage(ctx, code) {
  const userId = ctx.from.id;
  await setUserLanguage(userId, code);

  const newLang = code;
  await ctx.answerCallbackQuery('✅ ' + await t('success', newLang));
  await ctx.editMessageText(
    `${await t('success', newLang)} ! ${await t('language', newLang)}: *${code.toUpperCase()}*`,
    { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 ' + await t('back', newLang), 'settings:back') }
  );
}

// Définir la devise
export async function setCurrency(ctx, code) {
  const userId = ctx.from.id;
  await setUserCurrency(userId, code);
  const lang = await getUserLang(userId);

  await ctx.answerCallbackQuery('✅ ' + await t('success', lang));
  await ctx.editMessageText(
    `${await t('success', lang)} ! ${await t('currency', lang)}: *${code}*`,
    { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 ' + await t('back', lang), 'settings:back') }
  );
}
