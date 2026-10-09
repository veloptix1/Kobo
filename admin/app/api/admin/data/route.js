import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  try {
    if (resource === 'stats') {
      const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
      const { count: bannedUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true);
      const { count: pendingWD } = await supabaseAdmin.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { data: sums } = await supabaseAdmin.from('users').select('balance,total_earned,total_withdrawn');
      const totalKobo = sums?.reduce((s, u) => s + Number(u.balance || 0), 0) || 0;
      const totalEarned = sums?.reduce((s, u) => s + Number(u.total_earned || 0), 0) || 0;
      const totalWithdrawn = sums?.reduce((s, u) => s + Number(u.total_withdrawn || 0), 0) || 0;
      return NextResponse.json({ totalUsers, bannedUsers, pendingWD, totalKobo, totalEarned, totalWithdrawn });
    }
    if (resource === 'withdrawals') {
      const { data, error } = await supabaseAdmin.from('withdrawals').select('*, users(first_name, username, telegram_id)').order('created_at', { ascending: false }).limit(200);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    if (resource === 'tasks') {
      const { data, error } = await supabaseAdmin.from('tasks').select('*').order('id', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    if (resource === 'users') {
      const { data, error } = await supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    if (resource === 'settings') {
      const { data, error } = await supabaseAdmin.from('settings').select('*').order('key');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  const body = await req.json();
  try {
    if (resource === 'withdrawal') {
      const { error } = await supabaseAdmin.from('withdrawals').update({ status: body.status, processed_at: new Date().toISOString() }).eq('id', body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (resource === 'task') {
      const { id, ...updates } = body;
      const { error } = await supabaseAdmin.from('tasks').update(updates).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (resource === 'user') {
      const { telegram_id, ...updates } = body;
      const { error } = await supabaseAdmin.from('users').update(updates).eq('telegram_id', telegram_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (resource === 'setting') {
      const { error } = await supabaseAdmin.from('settings').update({ value: body.value, updated_at: new Date().toISOString() }).eq('key', body.key);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  const body = await req.json();
  if (resource === 'task') {
    const { data, error } = await supabaseAdmin.from('tasks').insert(body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, task: data });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  const body = await req.json();
  if (resource === 'task') {
    const { error } = await supabaseAdmin.from('tasks').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
