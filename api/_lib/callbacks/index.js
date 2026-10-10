import { supabase } from '../supabase.js';
import { checkMandatoryChannels } from '../utils/checkChannel.js';
import { mainMenu } from '../utils/keyboards.js';
import { showTasks, viewTask, completeTask, dailyCheckin } from '../commands/tasks.js';
import {
  chooseCurrency,
  chooseMethod,
  confirmWithdraw,
  cancelWithdraw,
  withdrawStart,
  withdrawHistory,
} from '../commands/withdraw.js';
import { convertStart, convertChooseCurrency, convertConfirm, convertCancel } from '../commands/convert.js';
import { showLeaderboard } from '../commands/leaderboard.js';
import { showHistory } from '../commands/history.js';

export function registerCallbacks(bot) {
  // ===== CANAUX =====
  bot.callbackQuery('check:channels', async (ctx) => {
    const { ok } = await checkMandatoryChannels(ctx);
    if (!ok) {
      return ctx.answerCallbackQuery({
        text: "❌ Tu n'as pas encore rejoint tous les canaux.",
        show_alert: true,
      });
    }
    await supabase.from('users').update({ is_verified: true }).eq('telegram_id', ctx.from.id);
    await ctx.answerCallbackQuery('✅ Vérifié !');
    await ctx.editMessageText('✅ Accès autorisé. Utilise le menu 👇', {
      reply_markup: mainMenu(),
    });
  });

  // ===== MENU =====
  bot.callbackQuery('menu:home', async (ctx) => {
    await ctx.answerCallbackQuery();
    const { data: user } = await supabase
      .from('users')
      .select('balance,first_name')
      .eq('telegram_id', ctx.from.id)
      .single();
    await ctx.editMessageText(
      `🏠 *Menu principal*\n\n👤 ${user.first_name || 'Utilisateur'}\n💰 Solde : *${user.balance} Kobo*`,
      { parse_mode: 'Markdown', reply_markup: mainMenu() }
    );
  });

  bot.callbackQuery('menu:balance', async (ctx) => {
    const { data: user } = await supabase
      .from('users')
      .select('balance,total_earned,total_withdrawn')
      .eq('telegram_id', ctx.from.id)
      .single();
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `💰 *Ton solde Kobo*\n\n` +
        `Solde actuel : *${user.balance} Kobo*\n` +
        `Total gagné : ${user.total_earned} Kobo\n` +
        `Total retiré : ${user.total_withdrawn} Kobo`,
      { parse_mode: 'Markdown', reply_markup: mainMenu() }
    );
  });

  // ===== TÂCHES =====
  bot.callbackQuery('menu:tasks', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showTasks(ctx, ctx.from.id, true);
  });

  bot.callbackQuery(/^task:view:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await viewTask(ctx, Number(ctx.match[1]));
  });

  bot.callbackQuery(/^task:complete:(\d+)$/, async (ctx) => {
    await completeTask(ctx, Number(ctx.match[1]));
  });

  bot.callbackQuery('task:noop', (ctx) => ctx.answerCallbackQuery());

  bot.callbackQuery('task:daily_checkin', async (ctx) => {
    await dailyCheckin(ctx);
    await showTasks(ctx, ctx.from.id, true);
  });

  // ===== PARRAINAGE =====
  bot.callbackQuery('menu:referral', async (ctx) => {
    const { data: user } = await supabase
      .from('users')
      .select('referral_code,referral_count')
      .eq('telegram_id', ctx.from.id)
      .single();
    const link = `https://t.me/${process.env.BOT_USERNAME}?start=${user.referral_code}`;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `👥 *Parrainage*\n\n` +
        `Ton lien :\n\`${link}\`\n\n` +
        `Filleuls validés : *${user.referral_count}*\n\n` +
        `Partage ce lien pour gagner des Kobo par filleul.`,
      { parse_mode: 'Markdown', reply_markup: mainMenu() }
    );
  });

  // ===== RETRAIT =====
  bot.callbackQuery('menu:withdraw', async (ctx) => {
    await ctx.answerCallbackQuery();
    await withdrawStart(ctx);
  });

  bot.callbackQuery(/^wd:currency:(.+)$/, (ctx) => chooseCurrency(ctx, ctx.match[1]));
  bot.callbackQuery(/^wd:method:(.+)$/, (ctx) => chooseMethod(ctx, ctx.match[1]));
  bot.callbackQuery('wd:confirm', confirmWithdraw);
  bot.callbackQuery('wd:cancel', cancelWithdraw);

  bot.callbackQuery('wd:back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await withdrawStart(ctx);
  });

  bot.callbackQuery('menu:withdraw_history', async (ctx) => {
    await ctx.answerCallbackQuery();
    await withdrawHistory(ctx);
  });

  // ===== CONVERSION =====
  bot.callbackQuery('menu:convert', async (ctx) => {
    await ctx.answerCallbackQuery();
    await convertStart(ctx);
  });

  bot.callbackQuery(/^cv:to:(.+)$/, (ctx) => convertChooseCurrency(ctx, ctx.match[1]));
  bot.callbackQuery('cv:confirm', convertConfirm);
  bot.callbackQuery('cv:cancel', convertCancel);

  // ===== CLASSEMENT =====
  bot.callbackQuery('menu:top', showLeaderboard);

  // ===== HISTORIQUE =====
  bot.callbackQuery('menu:history', showHistory);

  // ===== INFO =====

  // ===== Paramètres =====
  bot.callbackQuery('menu:settings', async (ctx) => {
    try {
      const { settingsCommand } = await import('../commands/settings.js');
      await ctx.answerCallbackQuery();
      await settingsCommand(ctx);
    } catch (e) {
      console.error('Settings error:', e);
      await ctx.answerCallbackQuery({ text: 'Erreur', show_alert: true });
    }
  });
  bot.callbackQuery('menu:info', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `ℹ️ *À propos de Kobo*\n\n` +
        `Kobo est un bot qui te permet de gagner des Kobo 💰 en accomplissant des tâches simples.\n\n` +
        `🎯 *Tâches* : complète des missions et gagne des Kobo\n` +
        `👥 *Parrainage* : invite des amis et gagne plus\n` +
        `🔄 *Convertir* : convertis tes Kobo en FCFA, XOF ou USDT\n` +
        `💸 *Retrait* : retire tes gains\n` +
        `📊 *Historique* : voir toutes tes transactions\n\n` +
        `📌 *Taux de base* : 1 Kobo = 1 FCFA\n\n` +
        `❓ Besoin d'aide ? Contacte le support.`,
      { parse_mode: 'Markdown', reply_markup: mainMenu() }
    );
  });
}