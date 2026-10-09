import { InlineKeyboard } from 'grammy';
import { supabase } from '../supabase.js';
import { getSetting } from '../config.js';

// =====================================================
// COMMANDE /tasks
// =====================================================
export async function tasksCommand(ctx) {
  await showTasks(ctx, ctx.from.id);
}

// =====================================================
// LISTE DES TÂCHES
// =====================================================
export async function showTasks(ctx, userId, edit = false) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: false })
    .limit(15);

  // Vérif check-in : dans les dernières 24h ?
  const { data: lastCheckin } = await supabase
    .from('task_completions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('task_id', -1)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let checkinDone = false;
  let checkinTimeLeft = '';
  if (lastCheckin) {
    const lastTime = new Date(lastCheckin.completed_at).getTime();
    const diffHours = (Date.now() - lastTime) / (1000 * 60 * 60);
    if (diffHours < 24) {
      checkinDone = true;
      const remaining = 24 - diffHours;
      const h = Math.floor(remaining);
      const m = Math.floor((remaining - h) * 60);
      checkinTimeLeft = ` (dans ${h}h${m}min)`;
    }
  }

  const checkinBonus = Number(await getSetting('daily_checkin')) || 10;

  // Récupérer les tâches déjà faites par l'utilisateur
  const { data: done } = await supabase
    .from('task_completions')
    .select('task_id, status, completed_at')
    .eq('user_id', userId);

  const doneMap = new Map();
  (done || []).forEach((d) => {
    if (!doneMap.has(d.task_id)) doneMap.set(d.task_id, []);
    doneMap.get(d.task_id).push(d);
  });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const kb = new InlineKeyboard();

  // Bouton check-in quotidien
  if (checkinDone) {
    kb.text(`✅ Check-in fait${checkinTimeLeft}`, 'task:noop').row();
  } else {
    kb.text(`🎁 Check-in quotidien (+${checkinBonus} Kobo)`, 'task:daily_checkin').row();
  }

  let text = `📋 *Tâches disponibles*\n\n`;
  let availableCount = 0;

  if (!tasks || tasks.length === 0) {
    text += '_Aucune tâche disponible pour le moment._\n';
  } else {
    tasks.forEach((t) => {
      const records = doneMap.get(t.id) || [];
      const completedToday = records.filter(
        (r) => new Date(r.completed_at) >= startOfDay && r.status !== 'rejected'
      ).length;
      const pending = records.some((r) => r.status === 'pending');
      const totalDone = records.filter((r) => r.status === 'approved').length;

      let canDo = true;
      let badge = '';

      if (t.type === 'one_time' && totalDone > 0) {
        canDo = false;
        badge = ' ✅';
      } else if (pending) {
        canDo = false;
        badge = ' ⏳';
      } else if (t.daily_limit && completedToday >= t.daily_limit) {
        canDo = false;
        badge = ' ⏱️';
      }

      if (canDo) availableCount++;

      text += `*${t.title}*${badge}\n`;
      text += `💰 ${t.reward} Kobo`;
      if (t.daily_limit > 1) text += ` · ${completedToday}/${t.daily_limit} aujourd'hui`;
      text += `\n\n`;

      if (canDo) {
        kb.text(`▶️ ${t.title}`, `task:view:${t.id}`).row();
      }
    });
  }

  if (availableCount === 0 && tasks && tasks.length > 0) {
    text += '_Aucune tâche disponible pour le moment. Reviens plus tard !_';
  }

  kb.text('🔙 Menu', 'menu:home');

  if (edit) {
    return ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
  }
  return ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
}

// =====================================================
// VOIR UNE TÂCHE
// =====================================================
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

  if (task.type === 'channel_join') {
    text += `\n👉 Rejoins le canal puis clique sur "J'ai terminé".`;
  } else if (task.type === 'watch_ad' || task.type === 'share_link') {
    text += `\n👉 Ouvre le lien, accomplis l'action, puis clique sur "J'ai terminé".`;
  } else if (task.type === 'custom') {
    text += `\n👉 Envoie une capture d'écran comme preuve.`;
  }

  const kb = new InlineKeyboard();
  if (task.link) {
    kb.url('🔗 Ouvrir le lien', task.link).row();
  }
  kb.text("✅ J'ai terminé", `task:complete:${task.id}`).row();
  kb.text('🔙 Retour', 'menu:tasks');

  await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
}

// =====================================================
// COMPLÉTER UNE TÂCHE
// =====================================================
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

  // Vérif anti-spam
  const { data: existing } = await supabase
    .from('task_completions')
    .select('id, status, completed_at')
    .eq('user_id', userId)
    .eq('task_id', taskId);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const records = existing || [];

  if (task.type === 'one_time' && records.some((r) => r.status === 'approved')) {
    return ctx.answerCallbackQuery({
      text: '✅ Tu as déjà validé cette tâche.',
      show_alert: true,
    });
  }

  if (records.some((r) => r.status === 'pending')) {
    return ctx.answerCallbackQuery({
      text: '⏳ Ta tâche est déjà en attente de validation.',
      show_alert: true,
    });
  }

  if (task.daily_limit) {
    const doneToday = records.filter(
      (r) => new Date(r.completed_at) >= startOfDay && r.status === 'approved'
    ).length;
    if (doneToday >= task.daily_limit) {
      return ctx.answerCallbackQuery({
        text: `⏱️ Tu as atteint la limite (${task.daily_limit}/jour). Reviens demain !`,
        show_alert: true,
      });
    }
  }

  // Vérif canaux obligatoires si channel_join
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
        text: '❌ Impossible de vérifier. Rejoins le canal puis réessaie.',
        show_alert: true,
      });
    }
  }

  // Mode : auto ou manuel
  const autoApprove = await getSetting('task_auto_approve');
  const requireProof = task.type === 'custom';

  if (requireProof || autoApprove === false) {
    await supabase.from('task_completions').insert({
      user_id: userId,
      task_id: taskId,
      status: 'pending',
    });

    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📸 *Preuve requise*\n\nEnvoie une capture d'écran ou un texte comme preuve pour *${task.title}*.\n\nLe montant sera crédité après validation.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Crédit immédiat
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

  await ctx.answerCallbackQuery({
    text: `✅ +${task.reward} Kobo !`,
    show_alert: true,
  });

  await showTasks(ctx, userId, true);
}

// =====================================================
// CHECK-IN QUOTIDIEN (1 fois par 24h max)
// =====================================================
export async function dailyCheckin(ctx) {
  const userId = ctx.from.id;

  // Chercher le dernier check-in
  const { data: lastCheckin } = await supabase
    .from('task_completions')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('task_id', -1)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Vérifier si moins de 24h se sont écoulées
  if (lastCheckin) {
    const lastTime = new Date(lastCheckin.completed_at).getTime();
    const now = Date.now();
    const diffHours = (now - lastTime) / (1000 * 60 * 60);

    if (diffHours < 24) {
      const remaining = 24 - diffHours;
      const hours = Math.floor(remaining);
      const minutes = Math.floor((remaining - hours) * 60);

      return ctx.answerCallbackQuery({
        text: `⏱️ Check-in déjà fait !\nReviens dans ${hours}h ${minutes}min.`,
        show_alert: true,
      });
    }
  }

  const bonus = Number(await getSetting('daily_checkin')) || 10;

  await supabase.from('task_completions').insert({
    user_id: userId,
    task_id: -1,
    status: 'approved',
    reward_paid: bonus,
  });

  await supabase.rpc('credit_user', {
    p_user_id: userId,
    p_amount: bonus,
    p_type: 'task',
    p_reference: 'daily_checkin',
    p_metadata: { type: 'daily_checkin' },
  });

  await ctx.answerCallbackQuery({
    text: `🎁 +${bonus} Kobo ! Reviens dans 24h.`,
    show_alert: true,
  });
}