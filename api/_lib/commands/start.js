import { InlineKeyboard } from 'grammy';
import { persistentMenu } from '../utils/keyboards.js';
import { getOrCreateUser } from '../utils/users.js';
import { checkMandatoryChannels } from '../utils/checkChannel.js';
import { t, getUserLang, detectLanguageFromTelegram } from '../utils/i18n.js';
import { supabase } from '../supabase.js';

export async function startCommand(ctx) {
  const payload = ctx.match || null;
  const { user, isNew } = await getOrCreateUser(ctx, payload);

  // ===== Détecter et sauvegarder la langue à l'inscription =====
  if (isNew && ctx.from.language_code) {
    const detected = detectLanguageFromTelegram(ctx.from.language_code);
    try {
      await supabase
        .from('users')
        .update({ language: detected })
        .eq('telegram_id', ctx.from.id);
    } catch (e) {
      console.error('save language failed:', e.message);
    }
  }

  // ===== Banni ? =====
  if (user.is_banned) {
    const lang = await getUserLang(ctx.from.id);
    return ctx.reply('🚫 ' + (await t('error', lang)) + ' : compte suspendu.');
  }

  // ===== Vérification canaux obligatoires =====
  const { ok, missing } = await checkMandatoryChannels(ctx);
  if (!ok) {
    const kb = new InlineKeyboard();
    for (const ch of missing) {
      kb.url(
        `Rejoindre ${ch.name || ch.id}`,
        ch.url || `https://t.me/${ch.id.replace('@', '')}`
      ).row();
    }
    kb.text("✅ J'ai rejoint", 'check:channels');
    return ctx.reply(
      '🔒 Pour utiliser le bot, tu dois rejoindre tous les canaux obligatoires :',
      { reply_markup: kb }
    );
  }

  // ===== Récupérer la langue =====
  const lang = await getUserLang(ctx.from.id);
  const name = ctx.from.first_name || ctx.from.username || 'Utilisateur';

  // ===== Message de bienvenue =====
  const welcomeMsg = isNew
    ? await t('welcome_new', lang, { name })
    : await t('welcome_back', lang, { name });

  const bonusLine = isNew
    ? '\n\n' + await t('signup_bonus', lang, { amount: user.balance })
    : '\n\n' + await t('your_balance', lang) + ' : *' + user.balance + ' Kobo*';

  const hintLine = '\n\n' + await t('menu_hint', lang);

  await ctx.reply(
    welcomeMsg + bonusLine + hintLine + ' 👇',
    {
      parse_mode: 'Markdown',
      reply_markup: persistentMenu(),
    }
  );
}
