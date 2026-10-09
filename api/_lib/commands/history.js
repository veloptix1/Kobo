import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';

export async function showHistory(ctx) {
  const userId = ctx.from.id;

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount,type,reference,metadata,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);

  let text = '📊 *Historique de tes transactions*\n\n';

  if (!txs || txs.length === 0) {
    text += '_Aucune transaction pour le moment._';
  } else {
    const labels = {
      signup: '🎁 Bonus inscription',
      task: '🎯 Tâche',
      referral: '👥 Parrainage',
      withdrawal: '💸 Retrait',
      admin_adjust: '⚙️ Ajustement admin',
      convert: '🔄 Conversion',
    };

    txs.forEach((t) => {
      const sign = t.amount >= 0 ? '+' : '';
      const label = labels[t.type] || t.type;
      const date = new Date(t.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      text += `${label} · *${sign}${t.amount} Kobo*\n`;
      text += `_${date}_\n\n`;
    });
  }

  const kb = new InlineKeyboard()
    .text('💸 Mes retraits', 'menu:withdraw_history').row()
    .text('🔙 Menu', 'menu:home');

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
  }
}