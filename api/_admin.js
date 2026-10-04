// Админка Loya (только для владельца сервиса): кто пользуется программой, бесплатный доступ, блокировка.
// Вход по паролю из переменной окружения ADMIN_PASSWORD (не короче 12 символов). Пока её нет —
// админка выключена. Сессия — подписанный токен на 8 часов; смена пароля сразу выкидывает всех.
const crypto = require('crypto');
const { supabase, licenseState } = require('./_license');

const SESSION_HOURS = 8;
const enabled = () => typeof process.env.ADMIN_PASSWORD === 'string' && process.env.ADMIN_PASSWORD.length >= 12;
const secret = () => crypto.createHash('sha256').update('loya-admin:' + (process.env.ADMIN_PASSWORD || '') + ':' + (process.env.SUPABASE_SERVICE_KEY || '')).digest();
const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function sign() { const body = b64u(JSON.stringify({ a: 1, exp: Date.now() + SESSION_HOURS * 3600e3 })); return body + '.' + b64u(crypto.createHmac('sha256', secret()).update(body).digest()); }
function check(session) {
  if (!enabled()) return false;
  const [body, sig] = String(session || '').split('.');
  if (!body || !sig) return false;
  const good = b64u(crypto.createHmac('sha256', secret()).update(body).digest());
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return false;
  try { return JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).exp > Date.now(); } catch (e) { return false; }
}
const fails = new Map();
async function login({ password }, ip) {
  if (!enabled()) return { status: 503, error: 'admin_disabled' };
  const f = fails.get(ip) || { n: 0, t: 0 };
  if (f.n >= 10 && Date.now() - f.t < 15 * 60e3) return { status: 429, error: 'locked' };
  const a = crypto.createHash('sha256').update(String(password || '')).digest(), b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) { fails.set(ip, { n: f.n + 1, t: Date.now() }); await new Promise(r => setTimeout(r, 500)); return { status: 401, error: 'wrong' }; }
  fails.delete(ip);
  return { status: 200, ok: true, session: sign() };
}

function genKey() { const part = () => crypto.randomBytes(2).toString('hex').toUpperCase(); return `LOYA-${part()}-${part()}-${part()}`; }
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

async function data({ session }) {
  if (!check(session)) return { status: 401, error: 'session' };
  const { data: rows, error } = await supabase.from('licenses').select('*').order('created_at', { ascending: false }).limit(2000);
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  const now = Date.now();
  const list = (rows || []).map(r => {
    const state = licenseState(r);
    return { key: r.license_key, email: r.email || '', state, status: r.status || '', plan: r.plan || 'stripe', banned: !!r.banned, note: r.note || '',
      tier: require('./_license').tierOf(r), trialUntil: r.trial_until || '',
      freeUntil: r.free_until ? String(r.free_until).slice(0, 10) : '', created: r.created_at || '', lastSeen: r.last_seen_at || '', version: r.app_version || '',
      // есть ли у ключа подписка Stripe (сами id наружу не отдаём) — чтобы предупредить при удалении
      hasStripe: Object.keys(r).some(k => /^stripe_/.test(k) && r[k]),
      // true — настоящая оплата, false — тестовая, null — создан до учёта режима
      livemode: r.livemode === true ? true : r.livemode === false ? false : null };
  });
  const recent = (x) => x.lastSeen && now - new Date(x.lastSeen).getTime() < 7 * 86400e3;
  const stats = {
    total: list.length,
    active: list.filter(x => x.state === 'active').length,
    paying: list.filter(x => x.state === 'active' && x.plan !== 'free').length,
    free: list.filter(x => x.state === 'active' && x.plan === 'free').length,
    banned: list.filter(x => x.banned).length,
    pastDue: list.filter(x => x.state === 'past_due').length,
    canceled: list.filter(x => x.state === 'canceled' || x.state === 'free_expired').length,
    online7: list.filter(recent).length,
    test: list.filter(x => x.livemode === false).length,
    trial: list.filter(x => x.plan === 'trial' && x.state === 'active').length,
    pro: list.filter(x => x.state === 'active' && x.tier === 'pro' && x.plan !== 'trial').length
  };
  const key = process.env.STRIPE_SECRET_KEY || '';
  const stripeMode = /^(sk|rk)_live_/.test(key) ? 'live' : /^(sk|rk)_test_/.test(key) ? 'test' : (key ? 'unknown' : 'none');
  let ready = null;
  try { ready = await require('./_ready').readiness(); } catch (e) { ready = null; }
  return { status: 200, ok: true, stats, list, stripeMode, ready };
}

// Полное удаление ключа и всего, что к нему относится (пробные и тестовые ключи). Необратимо.
// Подписку в Stripe это НЕ отменяет — её отменяют в кабинете Stripe (в окне удаления это написано).
const LINKED_TABLES = ['owner_commands', 'owner_access', 'online_registrations', 'business_profiles', 'pos_events', 'pos_keys', 'mail_log'];
async function deleteKeys(keys) {
  const deleted = [], failed = [];
  for (const k of keys) {
    // карты Apple Wallet: сначала устройства (по номерам карт), потом сами карты
    try {
      const { data: passes } = await supabase.from('apple_passes').select('serial').eq('license_key', k);
      const serials = (passes || []).map(p => p.serial);
      if (serials.length) await supabase.from('apple_registrations').delete().in('serial', serials);
      await supabase.from('apple_passes').delete().eq('license_key', k);
    } catch (e) { /* таблиц ещё нет — нечего удалять */ }
    for (const t of LINKED_TABLES) { try { await supabase.from(t).delete().eq('license_key', k); } catch (e) { /* таблицы нет */ } }
    const { error } = await supabase.from('licenses').delete().eq('license_key', k);
    if (error) failed.push(k); else deleted.push(k);
  }
  return { deleted, failed };
}

async function action({ session, op, key, keys, email, note, freeUntil, tier }) {
  if (!check(session)) return { status: 401, error: 'session' };
  const until = /^\d{4}-\d{2}-\d{2}$/.test(String(freeUntil || '')) ? freeUntil : null;
  if (op === 'create_free') {
    const mail = str(email, 160);
    if (!mail) return { status: 400, error: 'email' };
    const newKey = genKey();
    const { error } = await supabase.from('licenses').insert({ license_key: newKey, email: mail, status: 'active', plan: 'free', note: str(note, 300) || null, free_until: until });
    if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
    return { status: 200, ok: true, key: newKey };
  }
  if (op === 'delete') {
    const list = (Array.isArray(keys) ? keys : [key]).map(v => str(v, 40)).filter(v => /^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(v));
    if (!list.length) return { status: 400, error: 'key' };
    if (list.length > 200) return { status: 400, error: 'too_many' };
    const r = await deleteKeys([...new Set(list)]);
    return { status: 200, ok: true, deleted: r.deleted.length, failed: r.failed.length };
  }
  const k = str(key, 40);
  if (!/^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(k)) return { status: 400, error: 'key' };
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

module.exports = { login, data, action, enabled, check, genKey };
