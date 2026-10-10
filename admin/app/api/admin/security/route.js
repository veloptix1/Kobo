import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');

  try {
    // ==================== LOGS ====================
    if (resource === 'logs') {
      const limit = Number(searchParams.get('limit')) || 100;
      const { data, error } = await supabaseAdmin
        .from('activity_logs')
        .select('*, users(first_name, username)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, logs: data || [] });
    }

    // ==================== ALERTES ====================
    if (resource === 'alerts') {
      const alerts = [];

      // 1. Devices partagés par plusieurs users
      const { data: multiDevices } = await supabaseAdmin
        .from('user_devices')
        .select('device_hash, user_id');
      
      const deviceMap = {};
      (multiDevices || []).forEach(d => {
        if (!deviceMap[d.device_hash]) deviceMap[d.device_hash] = [];
        deviceMap[d.device_hash].push(d.user_id);
      });

      Object.entries(deviceMap).forEach(([hash, users]) => {
        if (users.length > 1) {
          alerts.push({
            type: 'multi_device',
            device_hash: hash,
            count: users.length,
            users: Array.from(new Set(users)),
          });
        }
      });

      // 2. Utilisateurs qui spam les limites
      const { data: limitLogs } = await supabaseAdmin
        .from('activity_logs')
        .select('user_id, created_at, users(first_name, username)')
        .eq('action', 'limit_reached')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());

      const userMap = {};
      (limitLogs || []).forEach(l => {
        if (!userMap[l.user_id]) userMap[l.user_id] = { count: 0, last_at: l.created_at, name: l.users?.first_name || l.users?.username };
        userMap[l.user_id].count++;
        if (new Date(l.created_at) > new Date(userMap[l.user_id].last_at)) {
          userMap[l.user_id].last_at = l.created_at;
        }
      });

      Object.entries(userMap).forEach(([userId, info]) => {
        if (info.count >= 5) {
          alerts.push({
            type: 'limit_spam',
            user_id: userId,
            count: info.count,
            last_at: info.last_at,
            name: info.name,
          });
        }
      });

      return NextResponse.json({ ok: true, alerts });
    }

    // ==================== DEVICES ====================
    if (resource === 'devices') {
      const { data, error } = await supabaseAdmin
        .from('user_devices')
        .select('device_hash, user_id, first_seen, last_seen');
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      const grouped = {};
      (data || []).forEach(d => {
        if (!grouped[d.device_hash]) {
          grouped[d.device_hash] = {
            device_hash: d.device_hash,
            users: new Set(),
            first_seen: d.first_seen,
            last_seen: d.last_seen,
          };
        }
        grouped[d.device_hash].users.add(d.user_id);
        if (new Date(d.first_seen) < new Date(grouped[d.device_hash].first_seen)) {
          grouped[d.device_hash].first_seen = d.first_seen;
        }
        if (new Date(d.last_seen) > new Date(grouped[d.device_hash].last_seen)) {
          grouped[d.device_hash].last_seen = d.last_seen;
        }
      });

      const devices = Object.values(grouped).map(g => ({
        device_hash: g.device_hash,
        user_count: g.users.size,
        first_seen: g.first_seen,
        last_seen: g.last_seen,
      })).sort((a, b) => b.user_count - a.user_count);

      return NextResponse.json({ ok: true, devices });
    }

    // ==================== COMPTEURS ====================
    if (resource === 'counters') {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabaseAdmin
        .from('daily_counters')
        .select('*, users(first_name, username)')
        .eq('day', today)
        .order('total_earned', { ascending: false })
        .limit(20);

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      const { data: allToday } = await supabaseAdmin
        .from('daily_counters')
        .select('wheel_free, wheel_paid, slots, ads, mining, tasks, total_earned')
        .eq('day', today);

      const totals = (allToday || []).reduce((acc, c) => ({
        wheel: (acc.wheel || 0) + (c.wheel_free || 0) + (c.wheel_paid || 0),
        slots: (acc.slots || 0) + (c.slots || 0),
        ads: (acc.ads || 0) + (c.ads || 0),
        mining: (acc.mining || 0) + (c.mining || 0),
        tasks: (acc.tasks || 0) + (c.tasks || 0),
        earned: (acc.earned || 0) + Number(c.total_earned || 0),
      }), {});

      return NextResponse.json({ ok: true, counters: data || [], totals });
    }

    return NextResponse.json({ ok: false, error: 'Unknown resource' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
