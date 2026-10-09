import { bot } from './_lib/bot.js';

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await bot.init();
    initialized = true;
    console.log('Bot initialisé:', bot.botInfo.username);
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('Kobo bot is alive.');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  try {
    await ensureInit();

    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await bot.handleUpdate(update);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err?.message || err);
    return res.status(200).send('OK');
  }
}