import { bot } from './_lib/bot.js';

export default async function handler(req, res) {
  console.log('=== WEBHOOK HIT ===', req.method);

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('Kobo bot is alive.');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  console.log('Secret reçu:', secret ? 'OK' : 'MANQUANT');

  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    console.log('Secret invalide !');
    return res.status(401).send('Unauthorized');
  }

  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Update reçu:', JSON.stringify(update).slice(0, 200));

    // Vérif env vars
    console.log('BOT_TOKEN présent:', !!process.env.BOT_TOKEN);
    console.log('SUPABASE_URL présent:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_SERVICE_KEY présent:', !!process.env.SUPABASE_SERVICE_KEY);

    await bot.handleUpdate(update);
    console.log('Update traité avec succès');
    return res.status(200).send('OK');
  } catch (err) {
    console.error('!!! ERREUR WEBHOOK !!!', err);
    console.error('Message:', err?.message);
    console.error('Stack:', err?.stack);
    return res.status(200).send('OK');
  }
}