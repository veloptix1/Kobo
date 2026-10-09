import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';
  let query = supabaseAdmin.from('withdrawals').select('*, users(first_name, username, telegram_id)').order('created_at', { ascending: false }).limit(100);
  if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ withdrawals: data });
}

export async function PATCH(req) {
  const { id, status } = await req.json();
  if (!id || !['paid', 'rejected', 'processing'].includes(status)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const { error } = await supabaseAdmin.from('withdrawals').update({ status, processed_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
