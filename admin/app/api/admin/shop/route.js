import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource') || 'purchases';
  const status = searchParams.get('status') || 'all';

  try {
    // ==================== ACHATS DE KOBO ====================
    if (resource === 'purchases') {
      let q = supabaseAdmin
        .from('kobo_purchases')
        .select('*, users(first_name, username, telegram_id), kobo_packs(name, icon)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (status !== 'all') q = q.eq('status', status);

      const { data } = await q;

      // Stats
      const { data: all } = await supabaseAdmin
        .from('kobo_purchases')
        .select('amount_paid, status, kobo_received, bonus_kobo');

      const paid = (all || []).filter(p => p.status === 'paid');
      const stats = {
        total: (all || []).length,
        paid: paid.length,
        pending: (all || []).filter(p => p.status === 'pending').length,
        rejected: (all || []).filter(p => p.status === 'rejected').length,
        revenue: paid.reduce((s, p) => s + Number(p.amount_paid || 0), 0),
        kobo_sold: paid.reduce((s, p) => s + Number(p.kobo_received || 0) + Number(p.bonus_kobo || 0), 0),
      };

      return NextResponse.json({ ok: true, purchases: data || [], stats });
    }

    // ==================== RECHARGES ====================
    if (resource === 'recharges') {
      let q = supabaseAdmin
        .from('recharges')
        .select('*, users(first_name, username, telegram_id)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (status !== 'all') q = q.eq('status', status);

      const { data } = await q;

      const { data: all } = await supabaseAdmin
        .from('recharges')
        .select('amount, status');

      const paid = (all || []).filter(r => r.status === 'paid');
      const stats = {
        total: (all || []).length,
        paid: paid.length,
        pending: (all || []).filter(r => r.status === 'pending').length,
        rejected: (all || []).filter(r => r.status === 'rejected').length,
        revenue: paid.reduce((s, r) => s + Number(r.amount || 0), 0),
      };

      return NextResponse.json({ ok: true, recharges: data || [], stats });
    }

    // ==================== PACKS ====================
    if (resource === 'packs') {
      const { data } = await supabaseAdmin.from('kobo_packs').select('*').order('position');
      return NextResponse.json({ ok: true, packs: data || [] });
    }

    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const body = await req.json();
  const { resource, id, action, ...updates } = body;

  try {
    // ==================== VALIDER UN ACHAT ====================
    if (resource === 'purchase' && action === 'approve') {
      const { data: p } = await supabaseAdmin.from('kobo_purchases').select('*').eq('id', id).single();
      if (!p) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
      if (p.status === 'paid') return NextResponse.json({ error: 'Déjà payé' }, { status: 400 });

      const totalKobo = Number(p.kobo_received) + Number(p.bonus_kobo || 0);

      await supabaseAdmin.rpc('credit_user', {
        p_user_id: p.user_id,
        p_amount: totalKobo,
        p_type: 'kobo_purchase',
        p_reference: String(p.id),
        p_metadata: { amount_paid: p.amount_paid, currency: p.currency, admin: true },
      });

      await supabaseAdmin.from('kobo_purchases').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', id);
      return NextResponse.json({ ok: true, kobo: totalKobo });
    }

    // ==================== REJETER UN ACHAT ====================
    if (resource === 'purchase' && action === 'reject') {
      await supabaseAdmin.from('kobo_purchases').update({ status: 'rejected', admin_note: body.reason || 'Admin', processed_at: new Date().toISOString() }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    // ==================== VALIDER UNE RECHARGE ====================
    if (resource === 'recharge' && action === 'approve') {
      const { data: r } = await supabaseAdmin.from('recharges').select('*').eq('id', id).single();
      if (!r) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
      if (r.status === 'paid') return NextResponse.json({ error: 'Déjà payé' }, { status: 400 });

      const { data: u } = await supabaseAdmin.from('users').select('real_balance').eq('telegram_id', r.user_id).single();
      await supabaseAdmin.from('users').update({ real_balance: Number(u?.real_balance || 0) + Number(r.amount) }).eq('telegram_id', r.user_id);

      await supabaseAdmin.from('recharges').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    // ==================== REJETER UNE RECHARGE ====================
    if (resource === 'recharge' && action === 'reject') {
      await supabaseAdmin.from('recharges').update({ status: 'rejected', admin_note: body.reason || 'Admin', processed_at: new Date().toISOString() }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    // ==================== MODIFIER UN PACK ====================
    if (resource === 'pack') {
      const { error } = await supabaseAdmin.from('kobo_packs').update(updates).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ==================== CRÉER UN PACK ====================
    if (resource === 'pack_create') {
      const { data, error } = await supabaseAdmin.from('kobo_packs').insert(updates).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, pack: data });
    }

    // ==================== SUPPRIMER UN PACK ====================
    if (resource === 'pack_delete') {
      await supabaseAdmin.from('kobo_packs').update({ is_active: false }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
