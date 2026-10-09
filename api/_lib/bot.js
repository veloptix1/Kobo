import { Bot, webhookCallback } from 'grammy';
import { startCommand } from './commands/start.js';
import { tasksCommand, showTasks } from './commands/tasks.js';
import { registerCallbacks } from './callbacks/index.js';
import { persistentMenu } from './utils/keyboards.js';

export const bot = new Bot(process.env.BOT_TOKEN);

// Commandes
bot.command('start', startCommand);
bot.command('tasks', tasksCommand);
bot.command('menu', (ctx) => ctx.reply('📌 Menu principal :', { reply_markup: persistentMenu() }));

// Boutons du clavier persistant (texte)
bot.hears('💰 Solde', async (ctx) => {
  await ctx.reply('💰 *Ton solde*\n\nUtilise le bouton ci-dessous pour voir le détail :', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '📊 Voir le détail', callback_data: 'menu:balance' }]] },
  });
});

bot.hears('🎯 Tâches', async (ctx) => {
  await showTasks(ctx, ctx.from.id);
});

bot.hears('👥 Parrainage', async (ctx) => {
  await ctx.reply('👥 *Parrainage*\n\nUtilise le bouton ci-dessous :', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔗 Mon lien', callback_data: 'menu:referral' }]] },
  });
});

bot.hears('💸 Retrait', async (ctx) => {
  await ctx.reply('💸 *Retrait*\n\nBientôt disponible 🚧', { parse_mode: 'Markdown' });
});

bot.hears('🏆 Classement', async (ctx) => {
  await ctx.reply('🏆 *Classement*\n\nBientôt disponible 🚧', { parse_mode: 'Markdown' });
});

bot.hears('ℹ️ Aide', async (ctx) => {
  await ctx.reply(
    'ℹ️ *Aide Kobo*\n\n' +
      '🎯 Gagne des Kobo en faisant des tâches\n' +
      '👥 Invite des amis pour gagner plus\n' +
      '💸 Convertis tes Kobo en FCFA/XOF/USDT\n\n' +
      'Besoin d\'aide ? Contacte le support.',
    { parse_mode: 'Markdown' }
  );
});

// Callbacks
registerCallbacks(bot);

bot.catch((err) => {
  console.error('Bot error:', err);
});

export { webhookCallback };