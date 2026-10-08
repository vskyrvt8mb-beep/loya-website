// Админка Loya (только для владельца сервиса): кто пользуется программой, деньги, бесплатный доступ, блокировка.
// Вход: пароль из ADMIN_PASSWORD (не короче 12 символов) + код из приложения-аутентификатора, если задан
// ADMIN_TOTP_SECRET. Пока ADMIN_PASSWORD нет — админка выключена. Сессия — подписанный токен на 8 часов;
// смена пароля или «Выйти на всех устройствах» сразу делают все прежние сессии недействительными.
// Каждое действие (и каждый вход) пишется в журнал admin_log.
const crypto = require('crypto');
const { supabase, licenseState, tierOf } = require('./_license');
const RL = require('./_ratelimit');

const SESSION_HOURS = 8;
const PRICE = { starter: 9.99, pro: 19.99 };   // цены тарифов в евро — для подсчёта дохода в месяц
const enabled = () => typeof process.env.ADMIN_PASSWORD === 'string' && process.env.ADMIN_PASSWORD.length >= 12;
const totpSecret = () => String(process.env.ADMIN_TOTP_SECRET || '').replace(/\s+/g, '').toUpperCase();
const secret = () => crypto.createHash('sha256').update('loya-admin:' + (process.env.ADMIN_PASSWORD || '') + ':' + (process.env.SUPABASE_SERVICE_KEY || '') + ':' + totpSecret()).digest();
const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const KEY_RE = /^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

// ---------- настройки админки в базе (admin_settings): момент «выйти на всех устройствах» ----------
let settingsCache = { at: 0, sessionsAfter: 0 };
async function sessionsAfter() {
  if (Date.now() - settingsCache.at < 30e3) return settingsCache.sessionsAfter;
  let v = 0;
  try {
    const { data, error } = await supabase.from('admin_settings').select('value').eq('key', 'sessions_after').limit(1);
    if (!error && data && data[0]) v = Number(data[0].value) || 0;
  } catch (e) { /* таблицы ещё нет */ }
  settingsCache = { at: Date.now(), sessionsAfter: v };
  return v;
}

function sign() {
  const body = b64u(JSON.stringify({ a: 1, iat: Date.now(), exp: Date.now() + SESSION_HOURS * 3600e3 }));
  return body + '.' + b64u(crypto.createHmac('sha256', secret()).update(body).digest());
}
async function check(session) {
  if (!enabled()) return false;
  const [body, sig] = String(session || '').split('.');
  if (!body || !sig) return false;
  const good = b64u(crypto.createHmac('sha256', secret()).update(body).digest());
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return false;
  let p;
  try { p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); } catch (e) { return false; }
  if (!(p.exp > Date.now())) return false;
  return (Number(p.iat) || 0) > (await sessionsAfter());
}

// ---------- журнал действий ----------
async function log(op, ip, detail) {
  try {
    await supabase.from('admin_log').insert({ op: str(op, 40), ip: str(ip, 60), detail: detail || null });
  } catch (e) { /* таблицы ещё нет — не мешаем работе */ }
}

// ---------- одноразовые коды (TOTP, RFC 6238: 6 цифр, 30 секунд, SHA-1) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32decode(s) {
  let bits = '', out = [];
  for (const c of s.replace(/=+$/, '')) { const i = B32.indexOf(c); if (i < 0) return null; bits += i.toString(2).padStart(5, '0'); }
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function b32encode(buf) {
  let bits = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = ''; for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}
function totpAt(key, counter) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
function totpOk(sec, code) {
  const key = b32decode(sec);
  if (!key || !key.length || !/^\d{6}$/.test(String(code || ''))) return false;
  const c = Math.floor(Date.now() / 30e3);
  return [-1, 0, 1].some((d) => crypto.timingSafeEqual(Buffer.from(totpAt(key, c + d)), Buffer.from(String(code))));
}

// ---------- вход ----------
async function login({ password, code }, ip) {
  if (!enabled()) return { status: 503, error: 'admin_disabled' };
  // общий лимит для всех экземпляров функции: 10 попыток за 15 минут с одного IP и 40 — со всех вместе
  if (await RL.limited('admin-login-ip:' + ip, 10, 15 * 60e3) || await RL.limited('admin-login-all', 40, 15 * 60e3)) {
    return { status: 429, error: 'locked' };
  }
  const a = crypto.createHash('sha256').update(String(password || '')).digest(), b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 500));
    await log('login_fail', ip, { reason: 'password' });
    return { status: 401, error: 'wrong' };
  }
  const sec = totpSecret();
  if (sec) {
    if (!code) return { status: 401, error: 'need_code' };
    if (!totpOk(sec, code)) { await log('login_fail', ip, { reason: 'code' }); return { status: 401, error: 'bad_code' }; }
  }
  await log('login', ip, { twofa: !!sec });
  const TG = require('./_tg');
  await TG.notify(`🔐 <b>Вход в админку</b>\nIP ${TG.esc(ip)}${sec ? ' · с кодом 2FA' : ' · без 2FA'}\nЕсли это не вы — смените ADMIN_PASSWORD и нажмите «Выйти на всех устройствах»`);
  return { status: 200, ok: true, session: sign(), twofa: !!sec };
}

function genKey() { const part = () => crypto.randomBytes(2).toString('hex').toUpperCase(); return `LOYA-${part()}-${part()}-${part()}`; }

// ---------- деньги и динамика ----------
function money(rows) {
  const isLive = (r) => r.livemode !== false;
  const paying = rows.filter((r) => licenseState(r) === 'active' && r.plan === 'stripe' && isLive(r));
  const mrr = paying.reduce((s, r) => s + (PRICE[tierOf(r)] || PRICE.starter), 0);
  // по месяцам за последние 12: новые платные подписки и отмены
  const months = [];
  const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0);
  for (let i = 11; i >= 0; i--) { const m = new Date(d); m.setUTCMonth(m.getUTCMonth() - i); months.push(m.toISOString().slice(0, 7)); }
  const by = (field, pred) => months.map((m) => rows.filter((r) => pred(r) && String(r[field] || '').slice(0, 7) === m).length);
  const newPaid = by('created_at', (r) => r.plan === 'stripe' && isLive(r) && !r.machine_hash);
  // пробные ключи, ставшие платными, считаем по месяцу обновления
  const converted = by('updated_at', (r) => r.plan === 'stripe' && isLive(r) && r.machine_hash);
  const canceled = by('updated_at', (r) => isLive(r) && r.plan === 'stripe' && licenseState(r) === 'canceled');
  const trialsTotal = rows.filter((r) => r.machine_hash).length;
  const trialsPaid = rows.filter((r) => r.machine_hash && r.plan === 'stripe' && isLive(r)).length;
  const trialsActive = rows.filter((r) => r.plan === 'trial' && licenseState(r) === 'active').length;
  const decided = trialsTotal - trialsActive;
  return {
    mrr: Math.round(mrr * 100) / 100, arr: Math.round(mrr * 12 * 100) / 100, payingLive: paying.length,
    starter: paying.filter((r) => tierOf(r) !== 'pro').length, pro: paying.filter((r) => tierOf(r) === 'pro').length,
    months, newPaid: newPaid.map((n, i) => n + converted[i]), canceled,
    trials: { total: trialsTotal, paid: trialsPaid, active: trialsActive, rate: decided > 0 ? Math.round(trialsPaid / decided * 1000) / 10 : null },
  };
}

async function data({ session }) {
  if (!(await check(session))) return { status: 401, error: 'session' };
  const { data: rows, error } = await supabase.from('licenses').select('*').order('created_at', { ascending: false }).limit(2000);
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  const now = Date.now();
  const list = (rows || []).map((r) => {
    const state = licenseState(r);
    return { key: r.license_key, email: r.email || '', state, status: r.status || '', plan: r.plan || 'stripe', banned: !!r.banned, note: r.note || '',
      tier: tierOf(r), trialUntil: r.trial_until || '',
      freeUntil: r.free_until ? String(r.free_until).slice(0, 10) : '', created: r.created_at || '', lastSeen: r.last_seen_at || '', version: r.app_version || '',
      hasStripe: !!r.stripe_subscription_id, fromTrial: !!r.machine_hash,
      livemode: r.livemode === true ? true : r.livemode === false ? false : null };
  });
  const recent = (x) => x.lastSeen && now - new Date(x.lastSeen).getTime() < 7 * 86400e3;
  const stats = {
    total: list.length,
    active: list.filter((x) => x.state === 'active').length,
    paying: list.filter((x) => x.state === 'active' && x.plan !== 'free' && x.plan !== 'trial').length,
    free: list.filter((x) => x.state === 'active' && x.plan === 'free').length,
    banned: list.filter((x) => x.banned).length,
    pastDue: list.filter((x) => x.state === 'past_due').length,
    canceled: list.filter((x) => x.state === 'canceled' || x.state === 'free_expired').length,
    online7: list.filter(recent).length,
    test: list.filter((x) => x.livemode === false).length,
    trial: list.filter((x) => x.plan === 'trial' && x.state === 'active').length,
    pro: list.filter((x) => x.state === 'active' && x.tier === 'pro' && x.plan !== 'trial').length,
  };
  const key = process.env.STRIPE_SECRET_KEY || '';
  const stripeMode = /^(sk|rk)_live_/.test(key) ? 'live' : /^(sk|rk)_test_/.test(key) ? 'test' : (key ? 'unknown' : 'none');
  let ready = null;
  try { ready = await require('./_ready').readiness(); } catch (e) { ready = null; }
  let journal = null;
  try {
    const { data: lg, error: le } = await supabase.from('admin_log').select('at, op, ip, detail').order('at', { ascending: false }).limit(80);
    if (!le) journal = lg || [];
  } catch (e) { journal = null; }
  return { status: 200, ok: true, stats, money: money(rows || []), list, stripeMode, ready, journal, twofa: !!totpSecret(), settingsOk: await settingsTableOk() };
}
async function settingsTableOk() {
  try { const { error } = await supabase.from('admin_settings').select('key').limit(1); return !error; } catch (e) { return false; }
}

// ---------- карточка клиента ----------
async function client(key) {
  const { data: rows } = await supabase.from('licenses').select('*').eq('license_key', key).limit(1);
  const row = rows && rows[0];
  if (!row) return { status: 404, error: 'not_found' };
  const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { return fallback; } };
  const pattern = String(row.email || '').replace(/[\\%_]/g, '\\$&');
  const sameEmail = await safe(async () => {
    const { data } = await supabase.from('licenses').select('license_key, plan, status, created_at, banned, trial_until, free_until').ilike('email', pattern).limit(20);
    return (data || []).map((r) => ({ key: r.license_key, plan: r.plan, state: licenseState(r), created: r.created_at }));
  }, []);
  const logins = await safe(async () => {
    const { data } = await supabase.from('owner_logins').select('at, method, ok, ip').eq('license_key', key).order('at', { ascending: false }).limit(10);
    return data || [];
  }, []);
  const count = async (table, since) => safe(async () => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true }).eq('license_key', key);
    if (since) q = q.gte(table === 'mail_log' ? 'sent_at' : 'created_at', since);
    const { count: c, error } = await q; return error ? null : c;
  }, null);
  const month = new Date(Date.now() - 30 * 86400e3).toISOString();
  const profile = await safe(async () => {
    const { data } = await supabase.from('business_profiles').select('slug, profile').eq('license_key', key).limit(1);
    const p = data && data[0]; return p ? { slug: p.slug, name: (p.profile && (p.profile.name || p.profile.title)) || '' } : null;
  }, null);
  return { status: 200, ok: true, client: {
    key, email: row.email || '', plan: row.plan, tier: tierOf(row), state: licenseState(row), created: row.created_at, lastSeen: row.last_seen_at, version: row.app_version || '',
    trialUntil: row.trial_until || '', freeUntil: row.free_until || '', note: row.note || '', hasStripe: !!row.stripe_subscription_id, livemode: row.livemode,
    fromTrial: !!row.machine_hash, sameEmail, logins,
    regsTotal: await count('online_registrations'), mail30: await count('mail_log', month), profile,
  } };
}

// ---------- Stripe: отмена подписки ----------
async function cancelStripe(key, atPeriodEnd) {
  const { data: rows } = await supabase.from('licenses').select('stripe_subscription_id').eq('license_key', key).limit(1);
  const sub = rows && rows[0] && rows[0].stripe_subscription_id;
  if (!sub) return { status: 400, error: 'no_subscription' };
  if (!process.env.STRIPE_SECRET_KEY) return { status: 503, error: 'stripe_off' };
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  try {
    if (atPeriodEnd) await stripe.subscriptions.update(sub, { cancel_at_period_end: true });
    else {
      await stripe.subscriptions.cancel(sub);
      await supabase.from('licenses').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('license_key', key);
    }
    return { status: 200, ok: true };
  } catch (e) {
    return { status: 502, error: 'stripe_error', detail: String((e && (e.code || e.message)) || '').slice(0, 120) };
  }
}

// Полное удаление ключа и всего, что к нему относится (пробные и тестовые ключи). Необратимо.
// Подписку в Stripe это НЕ отменяет — для этого есть отдельное действие «Отменить подписку».
const LINKED_TABLES = ['owner_commands', 'owner_access', 'online_registrations', 'business_profiles', 'pos_events', 'pos_keys', 'mail_log', 'sync_entities', 'sync_devices', 'sync_applied', 'owner_logins', 'wallet_designs'];
async function deleteKeys(keys) {
  const deleted = [], failed = [];
  for (const k of keys) {
    try {
      const { data: passes } = await supabase.from('apple_passes').select('serial').eq('license_key', k);
      const serials = (passes || []).map((p) => p.serial);
      if (serials.length) await supabase.from('apple_registrations').delete().in('serial', serials);
      await supabase.from('apple_passes').delete().eq('license_key', k);
    } catch (e) { /* таблиц ещё нет — нечего удалять */ }
    for (const t of LINKED_TABLES) { try { await supabase.from(t).delete().eq('license_key', k); } catch (e) { /* таблицы нет */ } }
    const { error } = await supabase.from('licenses').delete().eq('license_key', k);
    if (error) failed.push(k); else deleted.push(k);
  }
  return { deleted, failed };
}

async function action({ session, op, key, keys, email, note, freeUntil, tier, days, lang, atPeriodEnd, secret: setupSecret, code }, ip) {
  if (!(await check(session))) return { status: 401, error: 'session' };
  const res = await doAction({ op, key, keys, email, note, freeUntil, tier, days, lang, atPeriodEnd, setupSecret, code });
  if (res.status === 200 && !['client', 'totp_setup', 'totp_test', 'tg_test'].includes(op)) {
    await log(op, ip, { key: KEY_RE.test(String(key || '')) ? key : undefined, keys: Array.isArray(keys) ? keys.slice(0, 50) : undefined,
      email: op === 'create_free' ? str(email, 160) : undefined, newKey: res.key, tier, days: op === 'extend_trial' ? Number(days) : undefined, atPeriodEnd: op === 'cancel_stripe' ? !!atPeriodEnd : undefined,
      deleted: res.deleted });
  }
  return res;
}

async function doAction({ op, key, keys, email, note, freeUntil, tier, days, lang, atPeriodEnd, setupSecret, code }) {
  const until = /^\d{4}-\d{2}-\d{2}$/.test(String(freeUntil || '')) ? freeUntil : null;
  if (op === 'logout_all') {
    const { error } = await supabase.from('admin_settings').upsert({ key: 'sessions_after', value: String(Date.now()) });
    if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
    settingsCache = { at: 0, sessionsAfter: 0 };
    return { status: 200, ok: true };
  }
  if (op === 'totp_setup') {
    if (totpSecret()) return { status: 400, error: 'already' };
    const sec = b32encode(crypto.randomBytes(20));
    const uri = `otpauth://totp/Loya:admin?secret=${sec}&issuer=Loya&algorithm=SHA1&digits=6&period=30`;
    let svg = '';
    try { svg = await require('qrcode').toString(uri, { type: 'svg', margin: 1, color: { dark: '#0b0b0d', light: '#ffffff' } }); } catch (e) { svg = ''; }
    return { status: 200, ok: true, secret: sec, uri, svg };
  }
  if (op === 'tg_connect') return require('./_tg').connect();
  if (op === 'tg_test') return require('./_tg').test();
  if (op === 'totp_test') {
    const sec = String(setupSecret || '').toUpperCase();
    return /^[A-Z2-7]{16,64}$/.test(sec) && totpOk(sec, code) ? { status: 200, ok: true } : { status: 400, error: 'bad_code' };
  }
  if (op === 'create_free') {
    const mail = str(email, 160);
    if (!mail) return { status: 400, error: 'email' };
    const newKey = genKey();
    const { error } = await supabase.from('licenses').insert({ license_key: newKey, email: mail, status: 'active', plan: 'free', note: str(note, 300) || null, free_until: until });
    if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
    return { status: 200, ok: true, key: newKey };
  }
  if (op === 'delete') {
    const list = (Array.isArray(keys) ? keys : [key]).map((v) => str(v, 40)).filter((v) => KEY_RE.test(v));
    if (!list.length) return { status: 400, error: 'key' };
    if (list.length > 200) return { status: 400, error: 'too_many' };
    const r = await deleteKeys([...new Set(list)]);
    return { status: 200, ok: true, deleted: r.deleted.length, failed: r.failed.length };
  }
  const k = str(key, 40);
  if (!KEY_RE.test(k)) return { status: 400, error: 'key' };
  if (op === 'client') return client(k);
  if (op === 'cancel_stripe') return cancelStripe(k, !!atPeriodEnd);
  if (op === 'resend_key') {
    const { data: rows } = await supabase.from('licenses').select('email, plan, trial_until').eq('license_key', k).limit(1);
    const row = rows && rows[0];
    if (!row || !row.email) return { status: 400, error: 'email' };
    try {
      await require('./_billing').sendKeyEmail({ email: row.email, key: k, lang: ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'en',
        ...(row.plan === 'trial' ? { kind: 'trial', until: row.trial_until } : {}) });
    } catch (e) { return { status: 502, error: 'mail_error' }; }
    return { status: 200, ok: true };
  }
  if (op === 'extend_trial') {
    const n = Math.round(Number(days));
    if (!(n >= 1 && n <= 90)) return { status: 400, error: 'days' };
    const { data: rows } = await supabase.from('licenses').select('trial_until, plan').eq('license_key', k).limit(1);
    const row = rows && rows[0];
    if (!row || row.plan !== 'trial') return { status: 400, error: 'not_trial' };
    const base = Math.max(Date.now(), new Date(row.trial_until || 0).getTime() || 0);
    const { error } = await supabase.from('licenses').update({ trial_until: new Date(base + n * 86400e3).toISOString(), updated_at: new Date().toISOString() }).eq('license_key', k);
    if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
    return { status: 200, ok: true };
  }
  const patch = op === 'ban' ? { banned: true }
    : op === 'unban' ? { banned: false }
    : op === 'make_free' ? { plan: 'free', free_until: until }
    : op === 'make_paid' ? { plan: 'stripe', free_until: null }
    : op === 'note' ? { note: str(note, 300) || null }
    : op === 'set_tier' ? (['starter', 'pro'].includes(tier) ? { tier } : null)
    : op === 'end_trial' ? { trial_until: new Date().toISOString() }
    : null;
  if (!patch) return { status: 400, error: 'op' };
  const { error } = await supabase.from('licenses').update({ ...patch, updated_at: new Date().toISOString() }).eq('license_key', k);
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  return { status: 200, ok: true };
}

module.exports = { login, data, action, enabled, check, genKey, totpOk, b32encode, totpAt, b32decode };
