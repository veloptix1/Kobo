'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(data.error || 'Erreur');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl font-bold">K</div>
          <h1 className="text-2xl font-bold">Kobo Admin</h1>
          <p className="text-white/60 text-sm mt-1">Panneau d'administration</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Identifiant" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full" required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" required />
          {error && <div className="bg-red-500/20 border border-red-500/40 text-red-200 rounded-lg p-3 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Connexion...' : 'Se connecter'}</button>
        </form>
      </div>
    </div>
  );
}
