// Общая проверка подписки. Правила:
//  • заблокирован (banned) — доступа нет, что бы ни было в Stripe;
//  • бесплатный доступ (plan = 'free'), выданный вручную в админке, — активен, пока не наступила
//    дата free_until (если она задана). Stripe такие ключи не трогает;
//  • обычная подписка — активна, когда status = 'active'.
// Выбираем все поля (select('*')), чтобы проверка работала и до того, как в базу добавили новые колонки.
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function todayISO() { return new Date().toISOString().slice(0, 10); }
function licenseState(row) {
  if (!row) return 'not_found';
  if (row.banned === true) return 'banned';
  if (row.plan === 'trial') return (row.trial_until && new Date(row.trial_until).getTime() > Date.now()) ? 'active' : 'trial_expired';
  if (row.plan === 'free') return (row.free_until && String(row.free_until).slice(0, 10) < todayISO()) ? 'free_expired' : 'active';
  return row.status || 'unknown';
}
// Тариф ключа. Пробный период — полный доступ уровня Pro; ключ, выданный вручную в админке, — Pro,
// если в админке не выбрано иначе; оплата через Stripe — тариф, за который платят (starter / pro).
const TIERS = ['starter', 'pro'];
function tierOf(row) {
  if (!row) return null;
  if (row.plan === 'trial') return 'pro';
  if (TIERS.includes(row.tier)) return row.tier;
  return row.plan === 'free' ? 'pro' : 'starter';
}
// Цена Stripe → тариф (STRIPE_PRICE_ID — Starter, STRIPE_PRICE_ID_PRO — Pro).
function tierForPrice(priceId) {
  if (!priceId) return null;
  if (process.env.STRIPE_PRICE_ID_PRO && priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  if (process.env.STRIPE_PRICE_ID && priceId === process.env.STRIPE_PRICE_ID) return 'starter';
  return null;
}
function isActive(row) { return licenseState(row) === 'active'; }
async function getLicense(key) {
  if (!key || typeof key !== 'string' || key.length > 100) return null;
  const { data, error } = await supabase.from('licenses').select('*').eq('license_key', key.trim()).maybeSingle();
  return error ? null : (data || null);
}
async function licenseActive(key) { return isActive(await getLicense(key)); }

module.exports = { supabase, getLicense, licenseActive, licenseState, isActive, tierOf, tierForPrice, TIERS };
