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
} from '../commands/withdraw.js';

export function registerCallbacks(bot) {
  // Vérif canaux obligatoires
  bot.callbackQuery('check:channels', async (ctx) => {
    const { ok } = await checkMandatoryChannels(ctx);
    if (!ok) {
      return ctx.answerCallbackQuery({
        text: "❌ Tu n'as pas encore rejoint tous les canaux.",
        show_alert: true,
      });
    }
    await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('telegram_id', ctx.from.id);
    await ctx.answerCallbackQuery('✅ Vérifié !');
    await ctx.editMessageText('✅ Accès autorisé. Utilise le menu 👇', {
      reply_markup: mainMenu(),
    });
  });

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

  bot.callbackQuery(/^wd:currency:(.+)$/, async (ctx) => {
    await chooseCurrency(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^wd:method:(.+)$/, async (ctx) => {
    await chooseMethod(ctx, ctx.match[1]);
  });

  bot.callbackQuery('wd:confirm', async (ctx) => {
    await confirmWithdraw(ctx);
  });

  bot.callbackQuery('wd:cancel', async (ctx) => {
    await cancelWithdraw(ctx);
  });

  bot.callbackQuery('wd:back', async (ctx) => {
    await ctx.answerCallbackQuery();
    await withdrawStart(ctx);
  });

  // Placeholder
  ['menu:convert', 'menu:top', 'menu:info'].forEach((key) => {
    bot.callbackQuery(key, (ctx) =>
      ctx.answerCallbackQuery({ text: '🚧 En construction', show_alert: true })
    );
  });
}