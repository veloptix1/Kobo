import { supabase } from '../supabase.js';

// Cache des traductions par langue
const translationsCache = {};
let cacheTime = 0;
const TTL = 5 * 60 * 1000; // 5 minutes

// Langue par défaut
let defaultLang = 'fr';
let defaultCurrency = 'FCFA';

// Charger toutes les traductions
async function loadTranslations() {
  const now = Date.now();
  if (Object.keys(translationsCache).length > 0 && now - cacheTime < TTL) return;

  const { data } = await supabase.from('translations').select('lang, key, value');
  Object.keys(translationsCache).forEach(k => delete translationsCache[k]);

  (data || []).forEach(t => {
    if (!translationsCache[t.lang]) translationsCache[t.lang] = {};
    translationsCache[t.lang][t.key] = t.value;
  });
  cacheTime = now;
}

// Traduire une clé
export async function t(key, lang = 'fr', vars = {}) {
  await loadTranslations();
  let text = translationsCache[lang]?.[key] || translationsCache['fr']?.[key] || key;
  
  // Remplacer les variables {name}
  Object.keys(vars).forEach(k => {
    text = text.replace(new RegExp('{' + k + '}', 'g'), vars[k]);
  });
  return text;
}

// Récupérer la langue d'un utilisateur
export async function getUserLang(userId) {
  const { data } = await supabase
    .from('users')
    .select('language')
    .eq('telegram_id', userId)
    .maybeSingle();
  return data?.language || defaultLang;
}

// Récupérer la devise d'un utilisateur
export async function getUserCurrency(userId) {
  const { data } = await supabase
    .from('users')
    .select('currency')
    .eq('telegram_id', userId)
    .maybeSingle();
  return data?.currency || defaultCurrency;
}

// Détecter la langue depuis le code Telegram (fr, en, ar, es)
export function detectLanguageFromTelegram(code) {
  if (!code) return 'fr';
  const short = code.split('-')[0].toLowerCase();
  if (['fr', 'en', 'ar', 'es'].includes(short)) return short;
  return 'fr';
}

// Liste des devises actives
export async function getActiveCurrencies() {
  const { data } = await supabase
    .from('currencies')
    .select('*')
    .eq('is_active', true)
    .order('position');
  return data || [];
}

// Liste des langues actives
export async function getActiveLanguages() {
  const { data } = await supabase
    .from('languages')
    .select('*')
    .eq('is_active', true)
    .order('position');
  return data || [];
}

// Mettre à jour la langue d'un user
export async function setUserLanguage(userId, lang) {
  await supabase.from('users').update({ language: lang }).eq('telegram_id', userId);
}

// Mettre à jour la devise d'un user
export async function setUserCurrency(userId, currency) {
  await supabase.from('users').update({ currency }).eq('telegram_id', userId);
}

// Formater un montant avec devise
export function formatMoney(amount, currency = 'FCFA') {
  const num = Number(amount || 0);
  if (num >= 1000) return Math.round(num).toLocaleString('fr-FR') + ' ' + currency;
  return num.toFixed(2) + ' ' + currency;
}
