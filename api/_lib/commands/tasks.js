import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';
import { getSetting } from '../config.js';

export async function tasksCommand(ctx) {
  await showTasks(ctx, ctx.from.id);
}

export async function showTasks(ctx, userId, edit = false) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false })
    .limit(10);

  if (!tasks || tasks.length === 0) {
    const text = '📋 *Aucune tâche disponible pour le moment.*\n\nReviens plus tard !';
    const kb = new InlineKeyboard().text('🔙 Menu', 'menu:home');
    if (edit) return ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
    return ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
  }

  // Récupérer les tâches déjà faites par l'utilisateur
  const { data: done } = await supabase
    .from('task_completions')
    .select('task_id, status')
    .eq('user_id', userId);

  const doneMap = new Map((done || []).map((d) => [d.task_id, d.status]));

  const kb = new InlineKeyboard();
  let text = `📋 *Tâches disponibles* (${tasks.length})\n\n`;

  tasks.forEach((t, i) => {
    const status = doneMap.get(t.id);
    const badge = status === 'approved' ? '✅' : status === 'pending' ? '⏳' : '';
    text += `${i + 1}. ${badge} *${t.title}* — 💰 ${t.reward} Kobo\n`;
    if (t.description) text += `   _${t.description}_\n`;

    if (!status) {
      kb.text(`▶️ ${t.title}`, `task:view:${t.id}`).row();
    } else if (status === 'pending') {
      kb.text(`⏳ ${t.title} (en attente)`, `task:noop`).row();
    } else {
      kb.text(`✅ ${t.title} (terminée)`, `task:noop`).row();
    }
  });

  kb.text('🔙 Menu', 'menu:home');

  if (edit) {
    return ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
  }
  return ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
}

export async function viewTask(ctx, taskId) {
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task || !task.is_active) {
    return ctx.answerCallbackQuery({ text: '❌ Tâche indisponible', show_alert: true });
  }

  let text = `🎯 *${task.title}*\n\n`;
  if (task.description) text += `${task.description}\n\n`;
  text += `💰 Récompense : *${task.reward} Kobo*\n`;
  if (task.type === 'channel_join') text += `\n👉 Rejoins le canal puis clique sur "J'ai rejoint".`;

  const kb = new InlineKeyboard();
  if (task.link) {
    kb.url('🔗 Ouvrir le lien', task.link).row();
  }
  kb.text("✅ J'ai terminé", `task:complete:${task.id}`).row();
  kb.text('🔙 Retour', 'menu:tasks');

  await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
}

export async function completeTask(ctx, taskId) {
  const userId = ctx.from.id;

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('is_active', true)
    .single();

  if (!task) {
    return ctx.answerCallbackQuery({ text: '❌ Tâche indisponible', show_alert: true });
  }

  // Vérifier si déjà faite
  const { data: existing } = await supabase
    .from('task_completions')
    .select('id, status')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (existing) {
    return ctx.answerCallbackQuery({
      text:
        existing.status === 'approved'
          ? '✅ Tu as déjà validé cette tâche.'
          : '⏳ Ta tâche est déjà en attente de validation.',
      show_alert: true,
    });
  }

  // Vérif canaux obligatoires si la tâche est channel_join
  if (task.type === 'channel_join' && task.channel_id) {
    try {
      const member = await ctx.api.getChatMember(task.channel_id, userId);
      if (member.status === 'left' || member.status === 'kicked') {
        return ctx.answerCallbackQuery({
          text: "❌ Tu n'as pas encore rejoint le canal.",
          show_alert: true,
        });
      }
    } catch {
      return ctx.answerCallbackQuery({
        text: '❌ Impossible de vérifier. Vérifie que tu as rejoint le canal.',
        show_alert: true,
      });
    }
  }

  // Créditer immédiatement (ou mettre en attente si mode manuel)
  const autoApprove = true; // on activera un setting plus tard

  if (autoApprove) {
    await supabase.from('task_completions').insert({
      user_id: userId,
      task_id: taskId,
      status: 'approved',
      reward_paid: task.reward,
    });

    await supabase.rpc('credit_user', {
      p_user_id: userId,
      p_amount: task.reward,
      p_type: 'task',
      p_reference: String(taskId),
      p_metadata: { task_title: task.title, task_type: task.type },
    });

    await ctx.answerCallbackQuery({ text: `✅ +${task.reward} Kobo !`, show_alert: true });
  } else {
    await supabase.from('task_completions').insert({
      user_id: userId,
      task_id: taskId,
      status: 'pending',
    });
    await ctx.answerCallbackQuery({
      text: '⏳ Tâche enregistrée. En attente de validation.',
      show_alert: true,
    });
  }

  // Rafraîchir la liste
  await showTasks(ctx, userId, true);
}