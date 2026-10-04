// Pro: общая база между компьютерами одной организации (организация = ключ Pro).
// Схема: программа сохраняет всё сразу у себя, а раз в пару минут отправляет изменения пачкой и забирает чужие.
// Каждая запись (клиент, карта, визит) хранится на сервере с версией; запись принимается, только если устройство
// знало последнюю версию (иначе — конфликт, устройство сливает изменения и пробует снова). Повтор той же
// отправки после обрыва связи распознаётся по номеру операции и второй раз не применяется.
const crypto = require('crypto');
const L = require('./_license');
const { supabase } = L;

const ENTITIES = ['client', 'card', 'scan'];
const MAX_DEVICES = 20;
const MAX_PUSH = 100;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const isKey = (k) => /^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(String(k || ''));
const isHex = (v, n) => new RegExp(`^[0-9a-f]{${n}}$`).test(String(v || ''));

const hits = new Map();
function limited(key, max, ms) { const now = Date.now(); const a = (hits.get(key) || []).filter(t => now - t < ms); if (a.length >= max) { hits.set(key, a); return true; } a.push(now); hits.set(key, a); return false; }

// Синхронизация — только для активного ключа уровня Pro (проверка на сервере при каждом запросе).
async function proLicense(licenseKey) {
  if (!isKey(licenseKey)) return { error: 'key', status: 400 };
  const row = await L.getLicense(licenseKey);
  if (!row || !L.isActive(row)) return { error: 'license_inactive', status: 403 };
  if (L.tierOf(row) !== 'pro') return { error: 'pro_required', status: 403 };
  return { row };
}
async function device(licenseKey, deviceId, deviceKey) {
  if (!isHex(deviceId, 24) || !isHex(deviceKey, 64)) return null;
  const { data } = await supabase.from('sync_devices').select('id, license_key, token_hash, revoked, name').eq('id', deviceId).limit(1);
  const d = data && data[0];
  if (!d || d.revoked || d.license_key !== licenseKey) return null;
  const a = Buffer.from(d.token_hash), b = Buffer.from(sha(deviceKey));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return d;
}

async function register({ licenseKey, deviceKey, name }, ip) {
  if (limited('reg:' + ip, 20, 3600e3)) return { status: 429, error: 'too_many' };
  const lic = await proLicense(licenseKey); if (lic.error) return { status: lic.status, error: lic.error };
  if (!isHex(deviceKey, 64)) return { status: 400, error: 'device' };
  const { data: list } = await supabase.from('sync_devices').select('id').eq('license_key', licenseKey).eq('revoked', false);
  if ((list || []).length >= MAX_DEVICES) return { status: 409, error: 'too_many_devices' };
  const id = crypto.randomBytes(12).toString('hex');
  const { error } = await supabase.from('sync_devices').insert({ id, license_key: licenseKey, name: String(name || '').slice(0, 60), token_hash: sha(deviceKey), last_seen_at: new Date().toISOString() });
  if (error) return { status: 500, error: 'db_error' };
  // Есть ли уже общая база у организации — от этого зависит, загружать свою или забирать общую.
  const { data: any } = await supabase.from('sync_entities').select('uid').eq('license_key', licenseKey).limit(1);
  return { status: 200, ok: true, deviceId: id, orgHasData: !!(any && any.length) };
}

async function push({ licenseKey, deviceId, deviceKey, ops }, ip) {
  if (limited('push:' + deviceId, 120, 3600e3)) return { status: 429, error: 'too_many' };
  const lic = await proLicense(licenseKey); if (lic.error) return { status: lic.status, error: lic.error };
  const dev = await device(licenseKey, deviceId, deviceKey); if (!dev) return { status: 401, error: 'device' };
  if (!Array.isArray(ops) || ops.length > MAX_PUSH) return { status: 400, error: 'ops' };
  const results = [];
  for (const o of ops) {
    if (!o || !ENTITIES.includes(o.entity) || !isHex(o.uid, 32) || !isHex(o.op, 32) || !Number.isInteger(o.base) || o.base < 0 || !o.data || typeof o.data !== 'object' || JSON.stringify(o.data).length > 20000) {
      results.push({ op: o && o.op, status: 'invalid' }); continue;
    }
    const { data, error } = await supabase.rpc('sync_apply', { p_license: licenseKey, p_entity: o.entity, p_uid: o.uid, p_base: o.base, p_data: o.data, p_op: o.op, p_device: deviceId });
    if (error) { results.push({ op: o.op, status: 'error' }); continue; }
    results.push({ op: o.op, ...(data || {}) });
  }
  await supabase.from('sync_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', deviceId);
  return { status: 200, ok: true, results };
}

async function pull({ licenseKey, deviceId, deviceKey, after, limit, inflight }) {
  const lic = await proLicense(licenseKey); if (lic.error) return { status: lic.status, error: lic.error };
  const dev = await device(licenseKey, deviceId, deviceKey); if (!dev) return { status: 401, error: 'device' };
  const lim = Math.max(1, Math.min(500, Number(limit) || 500));
  // Изменения последних 5 секунд не отдаём: так ни одна ещё не завершённая запись не будет пропущена.
  const settled = new Date(Date.now() - 5000).toISOString();
  // Судьба наших неподтверждённых отправок: какие из них сервер уже применил.
  let applied = [];
  const ids = (Array.isArray(inflight) ? inflight : []).filter(x => isHex(x, 32)).slice(0, 200);
  if (ids.length) { const { data: ap } = await supabase.from('sync_applied').select('op, ver').eq('license_key', licenseKey).in('op', ids); applied = ap || []; }
  const { data, error } = await supabase.from('sync_entities').select('entity, uid, ver, data, seq, device_id, last_op')
    .eq('license_key', licenseKey).gt('seq', Number(after) || 0).lt('updated_at', settled).order('seq', { ascending: true }).limit(lim);
  if (error) return { status: 500, error: 'db_error' };
  await supabase.from('sync_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', deviceId);
  return { status: 200, ok: true, items: data || [], applied, more: (data || []).length === lim };
}

async function devices({ licenseKey, deviceId, deviceKey }) {
  const lic = await proLicense(licenseKey); if (lic.error) return { status: lic.status, error: lic.error };
  const dev = await device(licenseKey, deviceId, deviceKey); if (!dev) return { status: 401, error: 'device' };
  const { data } = await supabase.from('sync_devices').select('id, name, created_at, last_seen_at, revoked').eq('license_key', licenseKey).order('created_at', { ascending: true });
  return { status: 200, ok: true, devices: (data || []).map(d => ({ id: d.id, name: d.name, created: d.created_at, lastSeen: d.last_seen_at, revoked: !!d.revoked, me: d.id === deviceId })) };
}
async function revoke({ licenseKey, deviceId, deviceKey, target }) {
  const lic = await proLicense(licenseKey); if (lic.error) return { status: lic.status, error: lic.error };
  const dev = await device(licenseKey, deviceId, deviceKey); if (!dev) return { status: 401, error: 'device' };
  if (!isHex(target, 24)) return { status: 400, error: 'target' };
  await supabase.from('sync_devices').update({ revoked: true }).eq('id', target).eq('license_key', licenseKey);
  return { status: 200, ok: true };
}

module.exports = { register, push, pull, devices, revoke, ENTITIES, MAX_PUSH };
