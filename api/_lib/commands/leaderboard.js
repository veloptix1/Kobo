import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';

export async function showLeaderboard(ctx) {
  const userId = ctx.from.id;

  // Top 10 par total_earned
  const { data: top } = await supabase
    .from('users')
    .select('telegram_id,first_name,username,total_earned,balance')
    .eq('is_banned', false)
    .order('total_earned', { ascending: false })
    .limit(10);

  // Rang de l'utilisateur
  const { data: me } = await supabase
    .from('users')
    .select('total_earned')
    .eq('telegram_id', userId)
    .single();

  const { count: myRank } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('total_earned', me?.total_earned || 0);

  let text = '🏆 *Classement des meilleurs gagnants*\n\n';
  const medals = ['🥇', '🥈', '🥉'];

  if (!top || top.length === 0) {
    text += '_Aucun utilisateur pour le moment._';
  } else {
    top.forEach((u, i) => {
      const medal = medals[i] || `${i + 1}.`;
      const name = u.first_name || u.username || 'Utilisateur';
      const me_ = u.telegram_id === userId ? ' ← *toi*' : '';
      text += `${medal} ${name} — *${u.total_earned} Kobo*${me_}\n`;
    });
  }

  text += `\n━━━━━━━━━━━━━━\n`;
  text += `📍 *Ton rang* : #${(myRank || 0) + 1}\n`;
  text += `💰 *Total gagné* : ${me?.total_earned || 0} Kobo`;

  const kb = new InlineKeyboard().text('🔙 Menu', 'menu:home');

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
  }
}