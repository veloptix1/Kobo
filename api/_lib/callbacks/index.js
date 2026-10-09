import { supabase } from '../supabase.js';
import { checkMandatoryChannels } from '../utils/checkChannel.js';
import { mainMenu } from '../utils/keyboards.js';
import { showTasks, viewTask, completeTask } from '../commands/tasks.js';

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

  // Menu principal
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

  // Solde
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

  // Tâches — affichage
  bot.callbackQuery('menu:tasks', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showTasks(ctx, ctx.from.id, true);
  });

  // Tâches — voir une tâche
  bot.callbackQuery(/^task:view:(\d+)$/, async (ctx) => {
    const taskId = Number(ctx.match[1]);
    await ctx.answerCallbackQuery();
    await viewTask(ctx, taskId);
  });

  // Tâches — compléter
  bot.callbackQuery(/^task:complete:(\d+)$/, async (ctx) => {
    const taskId = Number(ctx.match[1]);
    await completeTask(ctx, taskId);
  });

  // Tâches — noop
  bot.callbackQuery('task:noop', async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // Parrainage
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
        `Ton lien : \`${link}\`\n\n` +
        `Filleuls validés : *${user.referral_count}*\n\n` +
        `Partage ce lien pour gagner des Kobo par filleul.`,
      { parse_mode: 'Markdown', reply_markup: mainMenu() }
    );
  });

  // Placeholder pour les autres
  ['menu:withdraw', 'menu:top', 'menu:help'].forEach((key) => {
    bot.callbackQuery(key, async (ctx) => {
      await ctx.answerCallbackQuery({ text: '🚧 En construction', show_alert: true });
    });
  });
}