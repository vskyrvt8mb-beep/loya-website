// Сеть точек (с версии программы 2.17): один ключ подписки — одна организация, у неё может быть несколько точек.
//  • point  — устройство присылает короткую сводку статистики СВОЕЙ точки (без имён и телефонов клиентов);
//  • points — программа и «Доступ из дома» видят статистику каждой точки и общую;
//  • shared-get / shared-put — общие настройки организации (сейчас — Telegram-бот, чтобы вторая точка могла
//    «подтянуть» того же бота). Токен бота хранится на сервере зашифрованным (AES-256-GCM, ключ выводится из
//    ключа подписки и секрета сервера) — копия базы Supabase без ключа подписки его не раскрывает.
// Доступ — по действующему ключу подписки + отпечатку устройства, которое уже прошло проверку ключа (license_devices).
const crypto = require('crypto');
const L = require('./_license');
const { supabase } = L;
const RL = require('./_ratelimit');

const isKey = (k) => /^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(String(k || ''));
const isDev = (d) => /^[0-9a-f]{64}$/.test(String(d || ''));
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const num = (v, max = 1e12) => { const n = Number(v); return Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 100) / 100 : 0; };

async function auth({ licenseKey, device }) {
  if (!isKey(licenseKey) || !isDev(device)) return { status: 400, error: 'bad_request' };
  const row = await L.getLicense(licenseKey);
  if (!row || !L.isActive(row)) return { status: 403, error: 'license_inactive' };
  const { data, error } = await supabase.from('license_devices').select('device').eq('license_key', licenseKey).eq('device', device).limit(1);
  if (error) return { status: 503, error: 'not_ready' };            // таблицы ещё нет — схема 2.14 не выполнена
  if (!data || !data.length) return { status: 401, error: 'device' }; // устройство ещё не проверяло ключ
  return { ok: true, row };
}

// Сводка точки: только числа. Всё, что пришло, жёстко ограничиваем по типам и размеру.
function cleanStats(s) {
  const o = s && typeof s === 'object' ? s : {};
  const k = o.kpi && typeof o.kpi === 'object' ? o.kpi : {};
  const kpi = {};
  for (const f of ['clients', 'newMonth', 'active30', 'scansToday', 'scansMonth', 'scansTotal', 'rewardsMonth', 'revenueMonth', 'revenuePrevMonth', 'revenueTotal', 'avgCheck', 'checksMonth', 'cards', 'bonusBalance', 'repeatRate']) kpi[f] = num(k[f]);
  const days = Array.isArray(o.days) ? o.days.slice(-31).map((d) => ({ d: clean(d && d.d, 10), n: num(d && d.n, 1e7), r: num(d && d.r) })) : [];
  const months = Array.isArray(o.months) ? o.months.slice(-12).map((m) => ({ m: clean(m && m.m, 7), r: num(m && m.r), n: num(m && m.n, 1e8) })) : [];
  const top = Array.isArray(o.top) ? o.top.slice(0, 5).map((t) => ({ n: clean(t && t.n, 40), v: num(t && t.v, 1e7) })) : [];
  return { kpi, days, months, top, cur: clean(o.cur, 4), at: new Date().toISOString() };
}

async function pushPoint(body, ip) {
  if (await RL.limited('org-point:' + ip, 240, 3600e3)) return { status: 429, error: 'too_many' };
  const a = await auth(body); if (!a.ok) return a;
  const point = clean(body.point, 60);
  if (!point) return { status: 400, error: 'point' };
  const rec = { license_key: body.licenseKey, device: body.device, point, device_name: clean(body.deviceName, 60) || null, shared: !!body.shared,
    stats: { ...cleanStats(body.stats), ...(body.shared && body.org ? { org: cleanStats(body.org) } : {}) }, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('org_points').upsert(rec, { onConflict: 'license_key,device' });
  if (error) return { status: 503, error: 'not_ready' };
  try { await supabase.from('license_devices').update({ point, ...(rec.device_name ? { name: rec.device_name } : {}) }).eq('license_key', body.licenseKey).eq('device', body.device); } catch (e) { /* колонок нет */ }
  return { status: 200, ok: true };
}

// Список точек организации со сводками. Несколько устройств одной точки (компьютер и телефон в одном кафе)
// при общей базе присылают одинаковые числа — берём самую свежую сводку; при раздельных базах — складываем.
async function listPoints(licenseKey) {
  const { data, error } = await supabase.from('org_points').select('device, point, device_name, shared, stats, updated_at').eq('license_key', licenseKey).order('updated_at', { ascending: false });
  if (error) return null;
  const since = Date.now() - 45 * 86400e3;
  const rows = (data || []).filter((r) => new Date(r.updated_at).getTime() >= since);
  const by = new Map();
  for (const r of rows) {
    const k = r.point.toLowerCase();
    const p = by.get(k) || { point: r.point, devices: [], shared: false, stats: null, updated: r.updated_at };
    p.devices.push({ name: r.device_name || '', at: r.updated_at });
    if (!p.stats) { p.stats = r.stats; p.shared = !!r.shared; }
    else if (r.shared && p.shared && r.stats && r.stats.org && !p.stats.org) p.stats = { ...p.stats, org: r.stats.org };
    else if (!r.shared && !p.shared && r.stats && p.stats) p.stats = sumStats(p.stats, r.stats);
    by.set(k, p);
  }
  return [...by.values()];
}
function sumStats(a, b) {
  const kpi = {};
  for (const f of Object.keys({ ...a.kpi, ...b.kpi })) kpi[f] = num((a.kpi[f] || 0) + (b.kpi[f] || 0));
  // Средний чек — по числу чеков с суммой (а не визитов); repeatRate — средний.
  kpi.avgCheck = kpi.checksMonth ? num((kpi.revenueMonth || 0) / kpi.checksMonth) : 0;
  kpi.repeatRate = Math.round(((a.kpi.repeatRate || 0) + (b.kpi.repeatRate || 0)) / 2);
  const mergeBy = (x, y, key) => { const m = new Map(); for (const it of [...(x || []), ...(y || [])]) { const o = m.get(it[key]) || { ...it, n: 0, r: 0 }; o.n = num(o.n + (it.n || 0)); o.r = num(o.r + (it.r || 0)); m.set(it[key], o); } return [...m.values()].sort((p, q) => String(p[key]).localeCompare(String(q[key]))); };
  return { ...a, kpi, days: mergeBy(a.days, b.days, 'd'), months: mergeBy(a.months, b.months, 'm'), top: [...(a.top || []), ...(b.top || [])].sort((p, q) => q.v - p.v).slice(0, 5) };
}
// Итог по всем точкам. Точки с общей базой присылают ещё и итог всей общей базы (org) — берём самый свежий,
// чтобы клиенты, которые ходят в несколько точек, не считались дважды; точки со своей базой — прибавляем.
function totalOf(points) {
  const withStats = points.filter((p) => p.stats);
  if (!withStats.length) return null;
  const sharedOrg = withStats.filter((p) => p.shared && p.stats.org).sort((a, b) => String(b.stats.at).localeCompare(String(a.stats.at)))[0];
  let t = sharedOrg ? JSON.parse(JSON.stringify(sharedOrg.stats.org)) : null;
  for (const p of withStats) {
    if (sharedOrg && p.shared) continue;
    const st = { ...p.stats }; delete st.org;
    t = t ? sumStats(t, st) : JSON.parse(JSON.stringify(st));
  }
  return t;
}

async function points(body) {
  const a = await auth(body); if (!a.ok) return a;
  const list = await listPoints(body.licenseKey);
  if (!list) return { status: 503, error: 'not_ready' };
  const devs = await require('./_devices').list(body.licenseKey);
  return { status: 200, ok: true, points: list, total: totalOf(list), limit: require('./_devices').limitFor(L.tierOf(a.row), a.row.plan, a.row),
    devices: devs.filter((d) => d.active).map((d) => ({ name: d.name, point: d.point, platform: d.platform, lastSeen: d.lastSeen, me: d.device === body.device })) };
}

// ---------- общие настройки организации ----------
function secret() { return process.env.OWNER_SECRET || crypto.createHash('sha256').update('loya-org:' + (process.env.SUPABASE_SERVICE_KEY || 'dev')).digest('hex'); }
const encKey = (licenseKey) => crypto.createHash('sha256').update('loya-org-enc:' + licenseKey + ':' + secret()).digest();
function enc(licenseKey, obj) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', encKey(licenseKey), iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString('base64')).join('.');
}
function dec(licenseKey, s) {
  try { const [iv, tag, body] = String(s).split('.').map((x) => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', encKey(licenseKey), iv); d.setAuthTag(tag); return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString('utf8')); } catch (e) { return null; }
}
const SHARED = { telegram: (v) => (v && /^\d{5,12}:[A-Za-z0-9_-]{30,60}$/.test(String(v.token || '')) ? { token: String(v.token), username: clean(v.username, 40), owner: clean(v.owner, 60) } : null) };

async function sharedPut(body, ip) {
  if (await RL.limited('org-shared:' + ip, 30, 3600e3)) return { status: 429, error: 'too_many' };
  const a = await auth(body); if (!a.ok) return a;
  const name = String(body.name || '');
  if (!SHARED[name]) return { status: 400, error: 'name' };
  if (body.value === null) { await supabase.from('org_shared').delete().eq('license_key', body.licenseKey).eq('name', name); return { status: 200, ok: true }; }
  const v = SHARED[name](body.value); if (!v) return { status: 400, error: 'value' };
  const { error } = await supabase.from('org_shared').upsert({ license_key: body.licenseKey, name, data: enc(body.licenseKey, v), updated_at: new Date().toISOString(), updated_by: body.device.slice(0, 12) }, { onConflict: 'license_key,name' });
  return error ? { status: 503, error: 'not_ready' } : { status: 200, ok: true };
}
async function sharedGet(body) {
  const a = await auth(body); if (!a.ok) return a;
  const name = String(body.name || '');
  if (!SHARED[name]) return { status: 400, error: 'name' };
  const { data, error } = await supabase.from('org_shared').select('data, updated_at, updated_by').eq('license_key', body.licenseKey).eq('name', name).limit(1);
  if (error) return { status: 503, error: 'not_ready' };
  const r = data && data[0];
  return { status: 200, ok: true, value: r ? dec(body.licenseKey, r.data) : null, updated: r ? r.updated_at : null, mine: !!(r && r.updated_by === body.device.slice(0, 12)) };
}

module.exports = { pushPoint, points, sharedPut, sharedGet, listPoints, totalOf, cleanStats };
