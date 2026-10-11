// Учёт устройств по ключу подписки (с версии программы 2.14): один ключ нельзя раздать на десятки
// заведений. Считаются устройства, которые выходили на связь за последние 30 дней — старый компьютер
// или планшет, которым перестали пользоваться, через месяц освобождает место сам. Владелец сервиса
// может сбросить список в админке («Сбросить устройства») или убрать одно устройство.
// Лимиты меняются переменными окружения LICENSE_DEVICES_STARTER / LICENSE_DEVICES_PRO.
// С 2.17: в админке можно дать ключу дополнительные устройства (licenses.extra_devices) — бесплатно
// или за доплату; устройства присылают своё имя и точку — они видны в админке.
// Если таблицы license_devices ещё нет — ограничение просто не действует (ничего не ломается).
const { supabase } = require('./_license');
const ACTIVE_MS = 30 * 86400e3;
const extraOf = (row) => { const x = Math.round(Number(row && row.extra_devices)); return x >= 0 && x <= 200 ? x : 0; };
function baseLimit(tier, plan) {
  const n = (v, d) => { const x = Math.round(Number(v)); return x >= 1 && x <= 500 ? x : d; };
  if (plan === 'trial') return n(process.env.LICENSE_DEVICES_TRIAL, 3);
  return tier === 'pro' ? n(process.env.LICENSE_DEVICES_PRO, 10) : n(process.env.LICENSE_DEVICES_STARTER, 3);
}
// row — строка licenses (нужна для доп. устройств из админки); без неё — только тариф.
function limitFor(tier, plan, row) { return baseLimit(tier, plan) + extraOf(row); }
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

// { limited: false, others } — можно (others — сколько ещё устройств на ключе); { limited: true, limit } — превышен лимит.
async function touch(licenseKey, device, platform, tier, plan, meta, row) {
  if (!/^[0-9a-f]{64}$/.test(String(device || ''))) return { limited: false, others: 0 };
  const key = String(licenseKey).trim();
  try {
    const since = new Date(Date.now() - ACTIVE_MS).toISOString();
    const { data, error } = await supabase.from('license_devices').select('device').eq('license_key', key).gte('last_seen', since);
    if (error) return { limited: false, others: 0 };
    const known = (data || []).some((r) => r.device === device);
    const limit = limitFor(tier, plan, row);
    if (!known && (data || []).length >= limit) return { limited: true, limit };
    const base = { license_key: key, device, platform: clean(platform, 20) || null, last_seen: new Date().toISOString() };
    const m = meta || {};
    const extra = {};
    if (m.name) extra.name = clean(m.name, 60);
    if (m.point) extra.point = clean(m.point, 60);
    let { error: e2 } = await supabase.from('license_devices').upsert({ ...base, ...extra }, { onConflict: 'license_key,device' });
    if (e2 && Object.keys(extra).length) await supabase.from('license_devices').upsert(base, { onConflict: 'license_key,device' });   // колонок name/point ещё нет
    const others = (data || []).filter((r) => r.device !== device).length;
    return { limited: false, others, limit, known };
  } catch (e) { return { limited: false, others: 0 }; }
}
async function count() {
  const out = {};
  try {
    const since = new Date(Date.now() - ACTIVE_MS).toISOString();
    const { data, error } = await supabase.from('license_devices').select('license_key').gte('last_seen', since);
    if (error) return out;
    for (const r of data || []) out[r.license_key] = (out[r.license_key] || 0) + 1;
  } catch (e) { /* нет таблицы */ }
  return out;
}
// Все устройства ключа (для админки и для программы): имя, точка, система, когда были на связи.
async function list(licenseKey) {
  const key = String(licenseKey).trim();
  try {
    let { data, error } = await supabase.from('license_devices').select('device, platform, name, point, first_seen, last_seen').eq('license_key', key).order('first_seen', { ascending: true });
    if (error) ({ data, error } = await supabase.from('license_devices').select('device, platform, first_seen, last_seen').eq('license_key', key).order('first_seen', { ascending: true }));
    if (error) return [];
    const since = Date.now() - ACTIVE_MS;
    return (data || []).map((r) => ({ id: r.device.slice(0, 12), device: r.device, platform: r.platform || '', name: r.name || '', point: r.point || '',
      firstSeen: r.first_seen, lastSeen: r.last_seen, active: new Date(r.last_seen).getTime() >= since }));
  } catch (e) { return []; }
}
async function reset(licenseKey) {
  const { error } = await supabase.from('license_devices').delete().eq('license_key', String(licenseKey).trim());
  return !error;
}
// Убрать одно устройство (по первым 12 знакам отпечатка — полный отпечаток в админку не отдаём).
async function removeOne(licenseKey, shortId) {
  if (!/^[0-9a-f]{12}$/.test(String(shortId || ''))) return false;
  const all = await list(licenseKey);
  const d = all.find((x) => x.id === shortId);
  if (!d) return false;
  const { error } = await supabase.from('license_devices').delete().eq('license_key', String(licenseKey).trim()).eq('device', d.device);
  return !error;
}
module.exports = { touch, count, list, reset, removeOne, limitFor, baseLimit, extraOf };
