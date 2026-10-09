import { supabase } from './supabase.js';

let cache = null;
let cacheTime = 0;
const TTL = 60_000;

export async function getSettings() {
  const now = Date.now();
  if (cache && now - cacheTime < TTL) return cache;

  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) throw error;

  cache = Object.fromEntries(data.map((r) => [r.key, r.value]));
  cacheTime = now;
  return cache;
}

export async function getSetting(key) {
  const s = await getSettings();
  return s[key];
}

export function invalidateSettingsCache() {
  cache = null;
}