import { supabase } from '../supabase.js';
import { getSetting } from '../config.js';

export async function getOrCreateUser(ctx, referralCode = null) {
  const from = ctx.from;
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', from.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('users')
      .update({
        username: from.username,
        first_name: from.first_name,
        last_name: from.last_name,
        last_seen: new Date().toISOString(),
      })
      .eq('telegram_id', from.id);
    return { user: existing, isNew: false };
  }

  // Nouveau user : code unique + bonus
  const { data: codeData } = await supabase.rpc('generate_referral_code');
  const myCode = codeData;
  const signupBonus = Number(await getSetting('signup_bonus')) || 0;

  // Résoudre le parrain
  let referrerId = null;
  if (referralCode && referralCode !== myCode) {
    const { data: referrer } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (referrer) referrerId = referrer.telegram_id;
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: from.id,
      username: from.username,
      first_name: from.first_name,
      last_name: from.last_name,
      referral_code: myCode,
      referred_by: referrerId,
      balance: signupBonus,
    })
    .select()
    .single();

  if (error) throw error;

  // Transaction de bienvenue
  if (signupBonus > 0) {
    await supabase.from('transactions').insert({
      user_id: from.id,
      amount: signupBonus,
      type: 'signup',
      metadata: { reason: 'signup_bonus' },
    });
  }

  // Enregistrer le parrainage + payer le parrain
  if (referrerId) {
    const referralBonus = Number(await getSetting('referral_bonus')) || 0;
    await supabase.from('referrals').insert({
      referrer_id: referrerId,
      referred_id: from.id,
      bonus_paid: referralBonus,
      signup_bonus_paid: signupBonus,
      status: 'validated',
    });

    if (referralBonus > 0) {
      await supabase.rpc('credit_user', {
        p_user_id: referrerId,
        p_amount: referralBonus,
        p_type: 'referral',
        p_reference: String(from.id),
        p_metadata: { referred_username: from.username },
      });

      // Incrémenter le compteur du parrain
      await supabase.rpc('increment_referral_count', { p_user_id: referrerId })
        .catch(() => {}); // fallback silencieux
    }
  }

  return { user: newUser, isNew: true };
}