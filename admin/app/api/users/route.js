import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  let query = supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(100);
  if (search) {
    query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,telegram_id.eq.${search}`);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function PATCH(req) {
  const { id, credit, ...updates } = await req.json();

  if (credit !== undefined && credit !== 0) {
    const { data: user } = await supabaseAdmin.from('users').select('balance').eq('telegram_id', id).single();
    const newBalance = Math.max(0, Number(user.balance) + Number(credit));
    updates.balance = newBalance;

    await supabaseAdmin.from('transactions').insert({
      user_id: id,
      amount: credit,
      type: 'admin_adjust',
      metadata: { reason: 'admin_panel' },
    });
  }

  const { error } = await supabaseAdmin.from('users').update(updates).eq('telegram_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
