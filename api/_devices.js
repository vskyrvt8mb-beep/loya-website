// Учёт устройств по ключу подписки (с версии программы 2.14): один ключ нельзя раздать на десятки
// заведений. Считаются устройства, которые выходили на связь за последние 30 дней — старый компьютер
// или планшет, которым перестали пользоваться, через месяц освобождает место сам. Владелец сервиса
// может сбросить список в админке («Сбросить устройства»).
// Лимиты меняются переменными окружения LICENSE_DEVICES_STARTER / LICENSE_DEVICES_PRO.
// Если таблицы license_devices ещё нет — ограничение просто не действует (ничего не ломается).
const { supabase } = require('./_license');
const ACTIVE_MS = 30 * 86400e3;
function limitFor(tier, plan) {
  const n = (v, d) => { const x = Math.round(Number(v)); return x >= 1 && x <= 500 ? x : d; };
  if (plan === 'trial') return n(process.env.LICENSE_DEVICES_TRIAL, 3);
  return tier === 'pro' ? n(process.env.LICENSE_DEVICES_PRO, 10) : n(process.env.LICENSE_DEVICES_STARTER, 3);
}
// { limited: false } — можно; { limited: true, limit } — превышен лимит, этот компьютер новый.
async function touch(licenseKey, device, platform, tier, plan) {
  if (!/^[0-9a-f]{64}$/.test(String(device || ''))) return { limited: false };
  const key = String(licenseKey).trim();
  try {
    const since = new Date(Date.now() - ACTIVE_MS).toISOString();
    const { data, error } = await supabase.from('license_devices').select('device').eq('license_key', key).gte('last_seen', since);
    if (error) return { limited: false };
    const known = (data || []).some((r) => r.device === device);
    const limit = limitFor(tier, plan);
    if (!known && (data || []).length >= limit) return { limited: true, limit };
    await supabase.from('license_devices').upsert({ license_key: key, device, platform: String(platform || '').slice(0, 20) || null, last_seen: new Date().toISOString() }, { onConflict: 'license_key,device' });
    return { limited: false };
  } catch (e) { return { limited: false }; }
}
async function count(licenseKeys) {
  const out = {};
  try {
    const since = new Date(Date.now() - ACTIVE_MS).toISOString();
    const { data, error } = await supabase.from('license_devices').select('license_key').gte('last_seen', since);
    if (error) return out;
    for (const r of data || []) out[r.license_key] = (out[r.license_key] || 0) + 1;
  } catch (e) { /* нет таблицы */ }
  return out;
}
async function reset(licenseKey) {
  const { error } = await supabase.from('license_devices').delete().eq('license_key', String(licenseKey).trim());
  return !error;
}
module.exports = { touch, count, reset, limitFor };
