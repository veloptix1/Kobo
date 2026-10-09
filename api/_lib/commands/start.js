import { InlineKeyboard } from 'grammy';
import { mainMenu, persistentMenu } from '../utils/keyboards.js';
import { getOrCreateUser } from '../utils/users.js';
import { checkMandatoryChannels } from '../utils/checkChannel.js';

export async function startCommand(ctx) {
  const payload = ctx.match || null;
  const { user, isNew } = await getOrCreateUser(ctx, payload);

  if (user.is_banned) {
    return ctx.reply('🚫 Ton compte est suspendu.');
  }

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

  const name = ctx.from.first_name || ctx.from.username || 'Utilisateur';

  // Message de bienvenue avec clavier persistant
  await ctx.reply(
    isNew
      ? `🎉 Bienvenue sur *Kobo*, ${name} !\n\nTu as reçu *${user.balance} Kobo* à l'inscription.\n\nUtilise le menu en bas de l'écran pour naviguer 👇`
      : `👋 Re-bonjour ${name} !\n\nSolde : *${user.balance} Kobo*`,
    {
      parse_mode: 'Markdown',
      reply_markup: persistentMenu(),
    }
  );

  // Petit message d'aide avec menu inline
  await ctx.reply(
    '📌 *Voici tes options rapides* :',
    {
      parse_mode: 'Markdown',
      reply_markup: mainMenu(),
    }
  );
}