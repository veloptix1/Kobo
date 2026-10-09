import { getSetting } from '../config.js';

export async function checkMandatoryChannels(ctx) {
  const channels = await getSetting('mandatory_channels');
  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return { ok: true, missing: [] };
  }

  const missing = [];
  for (const ch of channels) {
    try {
      const member = await ctx.api.getChatMember(ch.id, ctx.from.id);
      const status = member.status;
      if (status === 'left' || status === 'kicked') missing.push(ch);
    } catch {
      missing.push(ch);
    }
  }
  return { ok: missing.length === 0, missing };
}