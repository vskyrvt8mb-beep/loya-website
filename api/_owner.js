// Доступ из дома: вход по секретной ссылке и паролю, копия показателей, очередь правок.
// Пароль не хранится: программа присылает только соль и хеш (scrypt), сервер сверяет хеш.
const crypto = require('crypto');
const { supabase, licenseActive } = require('./_mail');

const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';
const SESSION_HOURS = 12;
const MAX_FAILS = 8;
const LOCK_MIN = 15;

function secret() { return process.env.OWNER_SECRET || crypto.createHash('sha256').update('loya-owner:' + (process.env.SUPABASE_SERVICE_KEY || 'dev')).digest('hex'); }
const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const validToken = (t) => /^[a-f0-9]{48}$/.test(String(t || ''));

function signSession(token) {
  const body = b64u(JSON.stringify({ t: token, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }));
  return body + '.' + b64u(crypto.createHmac('sha256', secret()).update(body).digest());
}
function checkSession(session, token) {
  const [body, sig] = String(session || '').split('.');
  if (!body || !sig) return false;
  const good = b64u(crypto.createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try { const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); return p.t === token && p.exp > Date.now(); } catch (e) { return false; }
}
function hashPassword(pass, salt) { return crypto.scryptSync(String(pass), String(salt), 32).toString('hex'); }

// Программа → сервер: синхронизация. access передаётся при включении/смене пароля/новой ссылке.
async function sync({ licenseKey, access, snapshot, touch, done, disable }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = licenseKey.trim();
  if (disable) {
    await supabase.from('owner_access').delete().eq('license_key', key);
    await supabase.from('owner_commands').delete().eq('license_key', key);
    return { status: 200, ok: true, disabled: true };
  }
  if (access) {
    if (!validToken(access.token) || !/^[a-f0-9]{16,64}$/.test(String(access.salt || '')) || !/^[a-f0-9]{64}$/.test(String(access.hash || ''))) return { status: 400, error: 'bad_access' };
    const { data: taken } = await supabase.from('owner_access').select('license_key').eq('token', access.token).maybeSingle();
    if (taken && taken.license_key !== key) return { status: 409, error: 'token_taken' };
    const { error } = await supabase.from('owner_access').upsert({ license_key: key, token: access.token, pass_salt: access.salt, pass_hash: access.hash, fail_count: 0, locked_until: null });
    if (error) return { status: 500, error: 'save_failed' };
  }
  const { data: row } = await supabase.from('owner_access').select('license_key, token').eq('license_key', key).maybeSingle();
  if (!row) return { status: 404, error: 'not_enabled' };
  if (snapshot && typeof snapshot === 'object') {
    const json = JSON.stringify(snapshot);
    if (json.length > 3 * 1024 * 1024) return { status: 413, error: 'too_large' };
    await supabase.from('owner_access').update({ snapshot, snapshot_at: new Date().toISOString() }).eq('license_key', key);
  } else if (touch) {
    // «Пульс»: данные не менялись — просто отмечаем, что касса на связи (без пересылки всего снимка).
    await supabase.from('owner_access').update({ snapshot_at: new Date().toISOString() }).eq('license_key', key);
  }
  if (Array.isArray(done) && done.length) {
    for (const d of done.slice(0, 50)) {
      const id = Number(d && d.id); if (!Number.isInteger(id)) continue;
      await supabase.from('owner_commands').update({ status: d.ok ? 'done' : 'failed', result: String(d.error || '').slice(0, 40), done_at: new Date().toISOString() }).eq('license_key', key).eq('id', id);
    }
  }
  const { data: cmds } = await supabase.from('owner_commands').select('id, cmd').eq('license_key', key).eq('status', 'pending').order('id', { ascending: true }).limit(20);
  return { status: 200, ok: true, url: `${SITE_URL}/owner/${row.token}`, commands: (cmds || []).map(c => ({ id: c.id, cmd: c.cmd })) };
}

async function login({ token, password }) {
  if (!validToken(token) || typeof password !== 'string' || password.length < 1 || password.length > 200) return { status: 400, error: 'bad_request' };
  const { data: row } = await supabase.from('owner_access').select('*').eq('token', token).maybeSingle();
  if (!row) { await new Promise(r => setTimeout(r, 400)); return { status: 401, error: 'wrong' }; }
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { status: 429, error: 'locked' };
  if (!(await licenseActive(row.license_key))) return { status: 403, error: 'license_inactive' };
  const got = Buffer.from(hashPassword(password, row.pass_salt), 'hex'), want = Buffer.from(row.pass_hash, 'hex');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    const fails = (row.fail_count || 0) + 1;
    await supabase.from('owner_access').update(fails >= MAX_FAILS ? { fail_count: 0, locked_until: new Date(Date.now() + LOCK_MIN * 60000).toISOString() } : { fail_count: fails }).eq('token', token);
    return { status: 401, error: fails >= MAX_FAILS ? 'locked' : 'wrong' };
  }
  await supabase.from('owner_access').update({ fail_count: 0, locked_until: null }).eq('token', token);
  return { status: 200, ok: true, session: signSession(token) };
}

async function guard(token, session) {
  if (!validToken(token) || !checkSession(session, token)) return { status: 401, error: 'session' };
  const { data: row } = await supabase.from('owner_access').select('license_key, snapshot, snapshot_at').eq('token', token).maybeSingle();
  if (!row) return { status: 404, error: 'not_enabled' };
  if (!(await licenseActive(row.license_key))) return { status: 403, error: 'license_inactive' };
  return { ok: true, row };
}

async function data({ token, session }) {
  const g = await guard(token, session); if (!g.ok) return g;
  const { count } = await supabase.from('owner_commands').select('id', { count: 'exact', head: true }).eq('license_key', g.row.license_key).eq('status', 'pending');
  const { data: recent } = await supabase.from('owner_commands').select('id, cmd, status, result, created_at').eq('license_key', g.row.license_key).order('id', { ascending: false }).limit(8);
  return { status: 200, ok: true, snapshot: g.row.snapshot || null, at: g.row.snapshot_at, pending: count || 0, recent: recent || [] };
}

const str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
async function command({ token, session, cmd }) {
  const g = await guard(token, session); if (!g.ok) return g;
  if (!cmd || typeof cmd !== 'object' || !['client_add', 'client_edit', 'card_add'].includes(cmd.type)) return { status: 400, error: 'bad_command' };
  let clean;
  if (cmd.type === 'card_add') {
    // Выдать клиенту карту: тип и параметры строго в разумных пределах; name — только для подписи в списке правок.
    const id = Number(cmd.id); if (!Number.isInteger(id) || id < 1) return { status: 400, error: 'bad_id' };
    const cardType = ['stamp', 'discount', 'spend'].includes(cmd.cardType) ? cmd.cardType : null;
    if (!cardType) return { status: 400, error: 'bad_card' };
    const n = Number(cmd.value);
    const ok = cardType === 'stamp' ? Number.isInteger(n) && n >= 2 && n <= 50 : cardType === 'discount' ? Number.isInteger(n) && n >= 1 && n <= 100 : Number.isFinite(n) && n >= 1 && n <= 1000000;
    if (!ok) return { status: 400, error: 'bad_value' };
    clean = { type: 'card_add', id, cardType, value: cardType === 'spend' ? Math.round(n * 100) / 100 : n, title: str(cmd.title, 80), send: cmd.send !== false, name: str(cmd.name, 100) };
  } else {
    clean = { type: cmd.type, name: str(cmd.name, 100), phone: str(cmd.phone, 30), email: str(cmd.email, 120).toLowerCase(), notes: str(cmd.notes, 500) };
    if (!clean.name) return { status: 400, error: 'bad_name' };
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) return { status: 400, error: 'bad_email' };
    if (cmd.type === 'client_edit') { clean.id = Number(cmd.id); if (!Number.isInteger(clean.id) || clean.id < 1) return { status: 400, error: 'bad_id' }; }
  }
  const { count } = await supabase.from('owner_commands').select('id', { count: 'exact', head: true }).eq('license_key', g.row.license_key).eq('status', 'pending');
  if ((count || 0) >= 20) return { status: 429, error: 'queue_full' };
  const { data: row, error } = await supabase.from('owner_commands').insert({ license_key: g.row.license_key, cmd: clean }).select().single();
  if (error || !row) return { status: 500, error: 'save_failed' };
  return { status: 200, ok: true, id: row.id };
}

module.exports = { sync, login, data, command, hashPassword, signSession, checkSession, validToken };
