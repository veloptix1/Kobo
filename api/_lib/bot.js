import { Bot, webhookCallback } from 'grammy';
import { startCommand } from './commands/start.js';
import { tasksCommand, showTasks } from './commands/tasks.js';
import { registerCallbacks } from './callbacks/index.js';
import { persistentMenu } from './utils/keyboards.js';
import { supabase } from './supabase.js';

export const bot = new Bot(process.env.BOT_TOKEN);

// ===== Commandes =====
bot.command('start', startCommand);
bot.command('tasks', tasksCommand);
bot.command('menu', (ctx) => ctx.reply('📌 Menu principal :', { reply_markup: persistentMenu() }));

// ===== Boutons du clavier persistant =====

// 💰 Solde
bot.hears('💰 Solde', async (ctx) => {
  const { data: user } = await supabase
    .from('users')
    .select('balance,total_earned,total_withdrawn')
    .eq('telegram_id', ctx.from.id)
    .single();

  await ctx.reply(
    `💰 *Ton solde Kobo*\n\n` +
      `Solde actuel : *${user.balance} Kobo*\n` +
      `Total gagné : ${user.total_earned} Kobo\n` +
      `Total retiré : ${user.total_withdrawn} Kobo`,
    { parse_mode: 'Markdown' }
  );
});

// 🎯 Tâches
bot.hears('🎯 Tâches', async (ctx) => {
  await showTasks(ctx, ctx.from.id);
});

// 👥 Parrainage
bot.hears('👥 Parrainage', async (ctx) => {
  const { data: user } = await supabase
    .from('users')
    .select('referral_code,referral_count')
    .eq('telegram_id', ctx.from.id)
    .single();

  const link = `https://t.me/${process.env.BOT_USERNAME}?start=${user.referral_code}`;

  await ctx.reply(
    `👥 *Parrainage*\n\n` +
      `Ton lien :\n\`${link}\`\n\n` +
      `Filleuls validés : *${user.referral_count}*\n\n` +
      `Partage ce lien pour gagner des Kobo par filleul.`,
    { parse_mode: 'Markdown' }
  );
});

// 💸 Retrait (placeholder pour l'instant)
bot.hears('💸 Retrait', async (ctx) => {
  await ctx.reply('💸 *Retrait*\n\n🚧 En construction — bientôt disponible !', {
    parse_mode: 'Markdown',
  });
});

// 🏆 Classement
bot.hears('🏆 Classement', async (ctx) => {
  await ctx.reply('🏆 *Classement*\n\n🚧 En construction — bientôt disponible !', {
    parse_mode: 'Markdown',
  });
});

// ℹ️ Aide
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

// ===== Callbacks inline (pour les futurs usages) =====
registerCallbacks(bot);

bot.catch((err) => {
  console.error('Bot error:', err);
});

export { webhookCallback };