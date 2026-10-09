import { supabase } from '../supabase.js';

export async function notifyUser(api, telegramId, message, options = {}) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('telegram_id, is_banned')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!user || user.is_banned) return false;

    await api.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
      ...options,
    });

    // Enregistrer dans l'historique (sans bloquer si erreur)
    try {
      await supabase.from('notifications').insert({
        user_id: telegramId,
        message,
        type: options.type || 'general',
        sent_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error('DB insert notification failed:', dbErr.message);
    }

    return true;
  } catch (err) {
    console.error(`Notify failed for ${telegramId}:`, err.message);
    return false;
  }
}

// ============================================================
// Nouveau filleul inscrit
// ============================================================
export async function notifyReferralSignup(api, referrerId, referredName, bonus) {
  const msg =
    `🎉 *Nouveau filleul !*\n\n` +
    `👤 *${referredName}* vient de s'inscrire avec ton lien !\n\n` +
    `💰 Tu as reçu *+${bonus} Kobo*\n\n` +
    `💡 Plus tu parraines, plus tu gagnes !`;
  return notifyUser(api, referrerId, msg, { type: 'referral_signup' });
}

// ============================================================
// Retrait payé
// ============================================================
export async function notifyWithdrawalPaid(api, userId, amount, currency, method) {
  const msg =
    `✅ *Retrait payé !*\n\n` +
    `💰 Montant : *${amount} ${currency}*\n` +
    `📱 Méthode : ${formatMethod(method)}\n\n` +
    `🎉 Merci d'avoir utilisé Kobo !`;
  return notifyUser(api, userId, msg, { type: 'withdrawal_paid' });
}

// ============================================================
// Retrait refusé
// ============================================================
export async function notifyWithdrawalRejected(api, userId, amount, currency) {
  const msg =
    `❌ *Retrait refusé*\n\n` +
    `💰 Montant : *${amount} ${currency}*\n\n` +
    `💡 Tes Kobo ont été remboursés sur ton solde retirable.`;
  return notifyUser(api, userId, msg, { type: 'withdrawal_rejected' });
}

// ============================================================
// Tâche validée
// ============================================================
export async function notifyTaskApproved(api, userId, taskTitle, reward) {
  const msg =
    `✅ *Tâche validée !*\n\n` +
    `🎯 ${taskTitle}\n` +
    `💰 *+${reward} Kobo*\n\n` +
    `Continue comme ça 💪`;
  return notifyUser(api, userId, msg, { type: 'task_approved' });
}

// ============================================================
// Tâche refusée
// ============================================================
export async function notifyTaskRejected(api, userId, taskTitle) {
  const msg =
    `❌ *Tâche refusée*\n\n` +
    `🎯 ${taskTitle}\n\n` +
    `Tu peux réessayer plus tard.`;
  return notifyUser(api, userId, msg, { type: 'task_rejected' });
}

// ============================================================
// Conversion réussie
// ============================================================
export async function notifyConversion(api, userId, kobo, converted, currency) {
  const msg =
    `🔄 *Conversion réussie*\n\n` +
    `💰 ${kobo} Kobo\n` +
    `💱 → *${converted} ${currency}*\n\n` +
    `💸 Tu peux maintenant retirer depuis le menu Retrait.`;
  return notifyUser(api, userId, msg, { type: 'conversion' });
}

function formatMethod(m) {
  const names = {
    orange_money: 'Orange Money',
    mtn: 'MTN Mobile Money',
    wave: 'Wave',
    usdt: 'USDT (TRC20)',
  };
  return names[m] || m;
}
