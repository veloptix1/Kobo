import Sidebar from '@/components/Sidebar';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
  const { count: pendingWithdrawals } = await supabaseAdmin.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { data: recentWithdrawals } = await supabaseAdmin.from('withdrawals').select('*, users(first_name, username)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
  const { data: stats } = await supabaseAdmin.from('users').select('balance,withdrawable_balance,total_earned');

  const totalBalance = stats?.reduce((s, u) => s + Number(u.balance || 0), 0) || 0;
  const totalEarned = stats?.reduce((s, u) => s + Number(u.total_earned || 0), 0) || 0;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">📊 Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Utilisateurs" value={totalUsers || 0} icon="👥" />
          <StatCard label="Retraits en attente" value={pendingWithdrawals || 0} icon="💸" color="orange" />
          <StatCard label="Kobo en circulation" value={totalBalance.toFixed(0)} icon="🪙" />
          <StatCard label="Total distribué" value={totalEarned.toFixed(0)} icon="📈" color="green" />
        </div>
        <div className="card">
          <h2 className="text-xl font-bold mb-4">⏳ Retraits en attente</h2>
          {recentWithdrawals?.length ? (
            <div className="space-y-3">
              {recentWithdrawals.map((w) => (
                <div key={w.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <div>
                    <div className="font-semibold">{w.users?.first_name || 'Utilisateur'} <span className="text-white/50 text-sm">@{w.users?.username || '—'}</span></div>
                    <div className="text-sm text-white/60">{w.amount_target} {w.target_currency} · {w.method} · {w.destination}</div>
                  </div>
                  <div className="text-orange-400 font-bold">{w.amount_kobo} Kobo</div>
                </div>
              ))}
            </div>
          ) : <p className="text-white/50">Aucun retrait en attente ✅</p>}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color = 'default' }) {
  const colors = { default: 'from-white/5 to-white/10', orange: 'from-orange-500/20 to-orange-600/10', green: 'from-emerald-500/20 to-emerald-600/10' };
  return (
    <div className={`card bg-gradient-to-br ${colors[color]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-white/60 text-sm">{label}</div>
    </div>
  );
}
