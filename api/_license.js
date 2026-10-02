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
  if (row.plan === 'free') return (row.free_until && String(row.free_until).slice(0, 10) < todayISO()) ? 'free_expired' : 'active';
  return row.status || 'unknown';
}
function isActive(row) { return licenseState(row) === 'active'; }
async function getLicense(key) {
  if (!key || typeof key !== 'string' || key.length > 100) return null;
  const { data, error } = await supabase.from('licenses').select('*').eq('license_key', key.trim()).maybeSingle();
  return error ? null : (data || null);
}
async function licenseActive(key) { return isActive(await getLicense(key)); }

module.exports = { supabase, getLicense, licenseActive, licenseState, isActive };
