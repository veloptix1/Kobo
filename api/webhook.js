import { bot, webhookCallback } from '../src/bot.js';

const handler = webhookCallback(bot, 'std/http', {
  secretToken: process.env.WEBHOOK_SECRET,
});

export default async function (req, res) {
  if (req.method === 'POST') {
    return handler(req, res);
  }
  if (req.method === 'GET') {
    return res.status(200).send('Kobo bot is alive.');
  }
  return res.status(405).send('Method not allowed');
}