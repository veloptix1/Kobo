'use client';
import { useEffect, useState } from 'react';

export default function ErrorBanner() {
  const [error, setError] = useState(null);

  useEffect(() => {
    function handleError(e) {
      setError(e.message || 'Erreur inconnue');
    }
    function handleRejection(e) {
      setError(e.reason?.message || 'Promesse rejetée');
    }
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-xs z-[9999] break-all">
      <div className="font-bold mb-1">⚠️ Erreur :</div>
      {error}
      <button onClick={() => setError(null)} className="ml-2 underline">Fermer</button>
    </div>
  );
}
