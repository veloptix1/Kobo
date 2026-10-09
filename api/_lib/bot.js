import { Bot, webhookCallback } from 'grammy';
import { startCommand } from './commands/start.js';
import { tasksCommand, showTasks, dailyCheckin } from './commands/tasks.js';
import {
  withdrawStart,
  handleAmountInput,
  handleDestinationInput,
  withdrawHistory,
} from './commands/withdraw.js';
import { registerCallbacks } from './callbacks/index.js';
import { persistentMenu } from './utils/keyboards.js';
import { supabase } from './supabase.js';

export const bot = new Bot(process.env.BOT_TOKEN);

// ===== Commandes =====
bot.command('start', startCommand);
bot.command('tasks', tasksCommand);
bot.command('menu', (ctx) => ctx.reply('📌 Menu principal :', { reply_markup: persistentMenu() }));
bot.command('history', withdrawHistory);

// ===== Boutons du clavier persistant =====

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

bot.hears('🎯 Tâches', async (ctx) => {
  await showTasks(ctx, ctx.from.id);
});

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

bot.hears('💸 Retrait', withdrawStart);

bot.hears('🔄 Convertir', async (ctx) => {
  await ctx.reply('🔄 *Convertir*\n\n🚧 En construction — bientôt disponible !', {
    parse_mode: 'Markdown',
  });
});

bot.hears('🏆 Classement', async (ctx) => {
  await ctx.reply('🏆 *Classement*\n\n🚧 En construction — bientôt disponible !', {
    parse_mode: 'Markdown',
  });
});

bot.hears('ℹ️ Info', async (ctx) => {
  await ctx.reply(
    `ℹ️ *À propos de Kobo*\n\n` +
      `Kobo est un bot qui te permet de gagner des Kobo 💰 en accomplissant des tâches simples.\n\n` +
      `🎯 *Tâches* : complète des missions et gagne des Kobo\n` +
      `👥 *Parrainage* : invite des amis et gagne plus\n` +
      `🔄 *Convertir* : convertis tes Kobo en FCFA, XOF ou USDT\n` +
      `💸 *Retrait* : retire tes gains\n\n` +
      `📌 *Taux de base* : 1 Kobo = 1 FCFA\n\n` +
      `❓ Besoin d'aide ? Contacte le support.`,
    { parse_mode: 'Markdown' }
  );
});

// ===== Gestion des messages texte (montants, destinations) =====
bot.on('message:text', async (ctx, next) => {
  // Ignore les commandes
  if (ctx.message.text.startsWith('/')) return next();

  // Ignore les boutons du menu
  const menuButtons = ['💰 Solde', '🎯 Tâches', '👥 Parrainage', '💸 Retrait', '🔄 Convertir', '🏆 Classement', 'ℹ️ Info'];
  if (menuButtons.includes(ctx.message.text)) return next();

  // Essaie de traiter comme saisie de montant
  const handledAmount = await handleAmountInput(ctx, ctx.message.text);
  if (handledAmount) return;

  // Essaie de traiter comme saisie de destination
  const handledDest = await handleDestinationInput(ctx, ctx.message.text);
  if (handledDest) return;

  return next();
});

// ===== Callbacks inline =====
registerCallbacks(bot);

bot.catch((err) => {
  console.error('Bot error:', err);
});

export { webhookCallback };