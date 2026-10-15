// Облачная копия базы (с версии программы 2.19).
// Программа раз в день шифрует копию своей базы (AES-256-GCM; ключ шифрования выводится из ключа подписки
// на стороне программы) и присылает её частями по ~3 МБ — так укладываемся в лимит запроса Vercel.
// Сервер хранит только зашифрованные байты и ничего не расшифровывает. На каждое устройство — 3 последние копии.
// Восстановить копию можно с любого устройства, которое прошло проверку того же ключа подписки
// (даже если подписка уже закончилась — данные остаются клиенту).
// Таблицы: cloud_backups и cloud_backup_parts (schema_2_19.sql). Нет таблиц — ответ not_ready, программа просто попробует позже.
const L = require('./_license');
const { supabase } = L;
const RL = require('./_ratelimit');

const isKey = (k) => /^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(String(k || ''));
const isDev = (d) => /^[0-9a-f]{64}$/.test(String(d || ''));
const isId = (v) => /^[0-9a-f]{24}$/.test(String(v || ''));
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const MAX_PARTS = 16;
const PART_MAX = 3400000;          // символов base64 в одной части
const KEEP = 3;                    // сколько готовых копий хранить на одно устройство

async function auth(body, needActive) {
  if (!isKey(body.licenseKey) || !isDev(body.device)) return { status: 400, error: 'bad_request' };
  const row = await L.getLicense(body.licenseKey);
  if (!row) return { status: 403, error: 'license_inactive' };
  if (needActive && !L.isActive(row)) return { status: 403, error: 'license_inactive' };
  const { data, error } = await supabase.from('license_devices').select('device').eq('license_key', body.licenseKey).eq('device', body.device).limit(1);
  if (error) return { status: 503, error: 'not_ready' };
  if (!data || !data.length) return { status: 401, error: 'device' };
  return { ok: true, row };
}

async function removeBackup(id) {
  await supabase.from('cloud_backup_parts').delete().eq('backup_id', id);
  await supabase.from('cloud_backups').delete().eq('id', id);
}

async function put(body, ip) {
  if (await RL.limited('cloud-put:' + ip, 200, 3600e3)) return { status: 429, error: 'too_many' };
  const a = await auth(body, true); if (!a.ok) return a;
  const parts = Math.round(Number(body.parts)), part = Math.round(Number(body.part)), size = Math.round(Number(body.size));
  const data = String(body.data || '');
  if (!isId(body.id) || !(parts >= 1 && parts <= MAX_PARTS) || !(part >= 0 && part < parts) || !(size > 0 && size <= MAX_PARTS * 2600000)
    || !/^[0-9a-f]{64}$/.test(String(body.sha || '')) || !data || data.length > PART_MAX || !/^[A-Za-z0-9+/=]+$/.test(data)) return { status: 400, error: 'bad_request' };
  const { data: head, error: hErr } = await supabase.from('cloud_backups').select('id, license_key, device, parts, complete').eq('id', body.id).limit(1);
  if (hErr) return { status: 503, error: 'not_ready' };
  let h = head && head[0];
  if (h && (h.license_key !== body.licenseKey || h.device !== body.device)) return { status: 409, error: 'id_taken' };
  if (!h) {
    if (part !== 0) return { status: 409, error: 'no_header' };
    const m = body.meta && typeof body.meta === 'object' ? body.meta : {};
    const meta = { v: clean(m.v, 20), clients: Math.max(0, Math.min(10000000, Math.round(Number(m.clients) || 0))), reason: clean(m.reason, 20) };
    const { error } = await supabase.from('cloud_backups').insert({ id: body.id, license_key: body.licenseKey, device: body.device, device_name: clean(body.deviceName, 60) || null,
      point: clean(body.point, 60) || null, parts, size, sha: body.sha, meta, complete: false, created_at: new Date().toISOString() });
    if (error) return { status: 503, error: 'not_ready' };
    h = { id: body.id, parts, complete: false };
  }
  if (h.complete) return { status: 200, ok: true, done: true };
  const { error: pErr } = await supabase.from('cloud_backup_parts').upsert({ backup_id: body.id, part, data }, { onConflict: 'backup_id,part' });
  if (pErr) return { status: 503, error: 'not_ready' };
  if (part !== parts - 1) return { status: 200, ok: true };
  // Последняя часть: проверяем, что дошли все, и отмечаем копию готовой. Старые копии устройства удаляем.
  const { data: got } = await supabase.from('cloud_backup_parts').select('part').eq('backup_id', body.id);
  if ((got || []).length !== parts) return { status: 409, error: 'missing_parts' };
  await supabase.from('cloud_backups').update({ complete: true }).eq('id', body.id);
  const { data: mine } = await supabase.from('cloud_backups').select('id, complete, created_at').eq('license_key', body.licenseKey).eq('device', body.device).order('created_at', { ascending: false });
  const done = (mine || []).filter((r) => r.complete);
  for (const old of done.slice(KEEP)) await removeBackup(old.id);
  const dayAgo = new Date(Date.now() - 86400e3).toISOString();
  for (const r of (mine || []).filter((x) => !x.complete && String(x.created_at) < dayAgo)) await removeBackup(r.id);   // недокачанные
  return { status: 200, ok: true, done: true };
}

async function list(body, ip) {
  if (await RL.limited('cloud-list:' + ip, 120, 3600e3)) return { status: 429, error: 'too_many' };
  const a = await auth(body, false); if (!a.ok) return a;
  const { data, error } = await supabase.from('cloud_backups').select('id, device, device_name, point, size, meta, created_at, complete').eq('license_key', body.licenseKey).order('created_at', { ascending: false }).limit(60);
  if (error) return { status: 503, error: 'not_ready' };
  const items = (data || []).filter((r) => r.complete).slice(0, 30).map((r) => ({ id: r.id, device_name: r.device_name || '', point: r.point || '', size: r.size, meta: r.meta || {}, created_at: r.created_at, mine: r.device === body.device }));
  return { status: 200, ok: true, items };
}

async function get(body, ip) {
  if (await RL.limited('cloud-get:' + ip, 300, 3600e3)) return { status: 429, error: 'too_many' };
  const a = await auth(body, false); if (!a.ok) return a;
  const part = Math.round(Number(body.part));
  if (!isId(body.id) || !(part >= 0 && part < MAX_PARTS)) return { status: 400, error: 'bad_request' };
  const { data: head, error } = await supabase.from('cloud_backups').select('id, license_key, parts, sha, size, complete').eq('id', body.id).limit(1);
  if (error) return { status: 503, error: 'not_ready' };
  const h = head && head[0];
  if (!h || h.license_key !== body.licenseKey || !h.complete) return { status: 404, error: 'not_found' };
  if (part >= h.parts) return { status: 400, error: 'bad_request' };
  const { data: p } = await supabase.from('cloud_backup_parts').select('data').eq('backup_id', body.id).eq('part', part).limit(1);
  if (!p || !p[0]) return { status: 404, error: 'not_found' };
  return { status: 200, ok: true, data: p[0].data, parts: h.parts, sha: h.sha, size: h.size };
}

module.exports = { put, list, get };
