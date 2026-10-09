import { mainMenu } from '../utils/keyboards.js';
import { getOrCreateUser } from '../utils/users.js';
import { checkMandatoryChannels } from '../utils/checkChannel.js';

export async function startCommand(ctx) {
  const payload = ctx.match || null; // code de parrainage éventuel
  const { user, isNew } = await getOrCreateUser(ctx, payload);

  if (user.is_banned) {
    return ctx.reply('🚫 Ton compte est suspendu.');
  }

  // Vérif canaux obligatoires
  const { ok, missing } = await checkMandatoryChannels(ctx);
  if (!ok) {
    const kb = new (await import('grammy')).InlineKeyboard();
    for (const ch of missing) {
      kb.url(`Rejoindre ${ch.name || ch.id}`, ch.url || `https://t.me/${ch.id.replace('@', '')}`).row();
    }
    kb.text('✅ J\'ai rejoint', 'check:channels');
    return ctx.reply(
      '🔒 Pour utiliser le bot, tu dois rejoindre tous les canaux obligatoires :',
      { reply_markup: kb }
    );
  }

  await ctx.reply(
    isNew
      ? `🎉 Bienvenue sur *Kobo*, ${ctx.from.first_name} !\n\nTu as reçu *${user.balance} Kobo* à l'inscription.\n\nUtilise le menu ci-dessous pour commencer 👇`
      : `👋 Re-bonjour ${ctx.from.first_name} !\n\nSolde : *${user.balance} Kobo*`,
    { parse_mode: 'Markdown', reply_markup: mainMenu() }
  );
}