import { Bot, webhookCallback } from 'grammy';
import { startCommand } from './commands/start.js';
import { registerCallbacks } from './callbacks/index.js';

export const bot = new Bot(process.env.BOT_TOKEN);

bot.command('start', startCommand);

registerCallbacks(bot);

bot.catch((err) => {
  console.error('Bot error:', err);
});

export { webhookCallback };