import { bot, webhookCallback } from './_lib/bot.js';

const handler = webhookCallback(bot, 'node', {
  secretToken: process.env.WEBHOOK_SECRET,
});

export default async function (req, res) {
  if (req.method === 'POST') {
    return handler(req, res);
  }
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('Kobo bot is alive.');
  }
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  return res.end('Method not allowed');
}