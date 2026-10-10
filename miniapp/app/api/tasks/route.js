import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyTelegramInitData } from '@/lib/telegram';

export async function POST(req) {
  const { initData, action, taskId } = await req.json();
  const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!tgUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = tgUser.id;

  // ===== LISTE =====
  if (action === 'list') {
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false });

    const { data: completions } = await supabaseAdmin
      .from('task_completions')
      .select('task_id, status, completed_at')
      .eq('user_id', userId);

    const doneMap = {};
    (completions || []).forEach((c) => {
      if (!doneMap[c.task_id]) doneMap[c.task_id] = [];
      doneMap[c.task_id].push(c);
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const enriched = (tasks || []).map((t) => {
      const records = doneMap[t.id] || [];
      const doneToday = records.filter(
        (r) => new Date(r.completed_at) >= today && r.status !== 'rejected'
      ).length;
      const hasPending = records.some((r) => r.status === 'pending');
      const totalDone = records.filter((r) => r.status === 'approved').length;

      let canDo = true;
      if (t.type === 'one_time' && totalDone > 0) canDo = false;
      if (hasPending) canDo = false;
      if (t.daily_limit && doneToday >= t.daily_limit) canDo = false;

      return { ...t, canDo, doneToday, totalDone, hasPending };
    });

    return NextResponse.json({ ok: true, tasks: enriched });
  }

  // ===== VALIDER =====
  if (action === 'complete') {
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('is_active', true)
      .single();

    if (!task) return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });

    // Vérifier anti-spam
    const { data: existing } = await supabaseAdmin
      .from('task_completions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('task_id', taskId);

    const records = existing || [];
    if (task.type === 'one_time' && records.some((r) => r.status === 'approved')) {
      return NextResponse.json({ error: 'Déjà validée' }, { status: 400 });
    }
    if (records.some((r) => r.status === 'pending')) {
      return NextResponse.json({ error: 'En attente de validation' }, { status: 400 });
    }

    // Crédit immédiat (auto-approve)
    await supabaseAdmin.from('task_completions').insert({
      user_id: userId,
      task_id: taskId,
      status: 'approved',
      reward_paid: task.reward,
    });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, total_earned')
      .eq('telegram_id', userId)
      .single();

    await supabaseAdmin
      .from('users')
      .update({
        balance: Number(user.balance) + Number(task.reward),
        total_earned: Number(user.total_earned) + Number(task.reward),
      })
      .eq('telegram_id', userId);

    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      amount: task.reward,
      type: 'task',
      reference: String(taskId),
      metadata: { task_title: task.title },
    });

    return NextResponse.json({ ok: true, reward: task.reward });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
