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
      freeUntil: r.free_until ? String(r.free_until).slice(0, 10) : '', created: r.created_at || '', lastSeen: r.last_seen_at || '', version: r.app_version || '' };
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
    online7: list.filter(recent).length
  };
  return { status: 200, ok: true, stats, list };
}

async function action({ session, op, key, email, note, freeUntil }) {
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
  const k = str(key, 40);
  if (!/^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(k)) return { status: 400, error: 'key' };
  const patch = op === 'ban' ? { banned: true }
    : op === 'unban' ? { banned: false }
    : op === 'make_free' ? { plan: 'free', free_until: until }
    : op === 'make_paid' ? { plan: 'stripe', free_until: null }
    : op === 'note' ? { note: str(note, 300) || null }
    : null;
  if (!patch) return { status: 400, error: 'op' };
  const { error } = await supabase.from('licenses').update({ ...patch, updated_at: new Date().toISOString() }).eq('license_key', k);
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  return { status: 200, ok: true };
}

module.exports = { login, data, action, enabled, check, genKey };
