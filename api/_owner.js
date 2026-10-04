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

// В сеансе — номер «поколения»: «Выйти со всех устройств» увеличивает его, и все прежние сеансы перестают действовать.
function signSession(token, gen) {
  const body = b64u(JSON.stringify({ t: token, g: Number(gen) || 0, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }));
  return body + '.' + b64u(crypto.createHmac('sha256', secret()).update(body).digest());
}
function sessionPayload(session, token) {
  const [body, sig] = String(session || '').split('.');
  if (!body || !sig) return null;
  const good = b64u(crypto.createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); return p.t === token && p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
const maskIp = (ip) => { const s = String(ip || '').split(',')[0].trim(); if (s.includes(':')) return s.split(':').slice(0, 2).join(':') + ':…'; const p = s.split('.'); return p.length === 4 ? `${p[0]}.${p[1]}.*.*` : ''; };
async function recordLogin(licenseKey, method, ok, meta) {
  try { await supabase.from('owner_logins').insert({ license_key: licenseKey, at: new Date().toISOString(), method, ok: !!ok, ip: maskIp(meta && meta.ip), ua: String((meta && meta.ua) || '').slice(0, 90) }); } catch (e) { /* журнал не критичен */ }
}
async function recentLogins(licenseKey) {
  try { const { data } = await supabase.from('owner_logins').select('at, method, ok, ip, ua').eq('license_key', licenseKey).order('at', { ascending: false }).limit(8); return (data || []).map(l => ({ at: l.at, method: l.method, ok: !!l.ok, ip: l.ip || '', ua: l.ua || '' })); } catch (e) { return []; }
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
async function sync({ licenseKey, access, snapshot, touch, done, disable, logoutAll }) {
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
    // Новый пароль или новая ссылка — все прежние сеансы закрываются. Срок ссылки — по выбору владельца.
    const { data: prev } = await supabase.from('owner_access').select('session_gen').eq('license_key', key).maybeSingle();
    const days = [0, 30, 90].includes(Number(access.expiresDays)) ? Number(access.expiresDays) : 0;
    const { error } = await supabase.from('owner_access').upsert({ license_key: key, token: access.token, pass_salt: access.salt, pass_hash: access.hash, fail_count: 0, locked_until: null,
      session_gen: ((prev && prev.session_gen) || 0) + 1, token_expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null });
    if (error) return { status: 500, error: 'save_failed' };
  }
  const { data: row } = await supabase.from('owner_access').select('license_key, token, session_gen, token_expires_at').eq('license_key', key).maybeSingle();
  if (!row) return { status: 404, error: 'not_enabled' };
  if (logoutAll) await supabase.from('owner_access').update({ session_gen: (row.session_gen || 0) + 1 }).eq('license_key', key);
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
  return { status: 200, ok: true, url: `${SITE_URL}/owner/${row.token}`, linkExpires: row.token_expires_at || null, logins: await recentLogins(key), commands: (cmds || []).map(c => ({ id: c.id, cmd: c.cmd })) };
}

async function login({ token, password }, meta) {
  if (!validToken(token) || typeof password !== 'string' || password.length < 1 || password.length > 200) return { status: 400, error: 'bad_request' };
  if (ipLimited('login:' + ((meta && meta.ip) || ''), 30, 3600e3)) return { status: 429, error: 'locked' };
  const { data: row } = await supabase.from('owner_access').select('*').eq('token', token).maybeSingle();
  if (!row) { await new Promise(r => setTimeout(r, 400)); return { status: 401, error: 'wrong' }; }
  if (row.token_expires_at && new Date(row.token_expires_at).getTime() < Date.now()) return { status: 410, error: 'link_expired' };
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { status: 429, error: 'locked' };
  if (!(await licenseActive(row.license_key))) return { status: 403, error: 'license_inactive' };
  const got = Buffer.from(hashPassword(password, row.pass_salt), 'hex'), want = Buffer.from(row.pass_hash, 'hex');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    const fails = (row.fail_count || 0) + 1;
    await supabase.from('owner_access').update(fails >= MAX_FAILS ? { fail_count: 0, locked_until: new Date(Date.now() + LOCK_MIN * 60000).toISOString() } : { fail_count: fails }).eq('token', token);
    await recordLogin(row.license_key, 'link', false, meta);
    return { status: 401, error: fails >= MAX_FAILS ? 'locked' : 'wrong' };
  }
  await supabase.from('owner_access').update({ fail_count: 0, locked_until: null }).eq('token', token);
  await recordLogin(row.license_key, 'link', true, meta);
  return { status: 200, ok: true, session: signSession(token, row.session_gen) };
}

// ---------- вход без ссылки: email владельца + код из письма + пароль ----------
const ipHits = new Map();
function ipLimited(key, max, ms) { const now = Date.now(); const a = (ipHits.get(key) || []).filter(t => now - t < ms); if (a.length >= max) { ipHits.set(key, a); return true; } a.push(now); ipHits.set(key, a); return false; }
const CODE_MIN = 10, CODE_TRIES = 5;
const codeHash = (code, token) => crypto.createHash('sha256').update(String(code) + ':' + String(token) + ':' + secret()).digest('hex');
async function rowByEmail(email) {
  const addr = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr) || addr.length > 160) return null;
  const pattern = addr.replace(/[\\%_]/g, '\\$&');
  const { data: lic } = await supabase.from('licenses').select('license_key').ilike('email', pattern).limit(5);
  for (const l of lic || []) {
    const { data: row } = await supabase.from('owner_access').select('*').eq('license_key', l.license_key).maybeSingle();
    if (row) return row;
  }
  return null;
}
const CODE_TXT = {
  ru: ['Код входа Loya', (c, m) => `Ваш код для входа в «Доступ из дома»: <b style="font-size:22px;letter-spacing:3px">${c}</b><br>Код действует ${m} минут. Если вы не входили — просто проигнорируйте письмо.`],
  uk: ['Код входу Loya', (c, m) => `Ваш код для входу в «Доступ з дому»: <b style="font-size:22px;letter-spacing:3px">${c}</b><br>Код діє ${m} хвилин. Якщо ви не входили — просто проігноруйте лист.`],
  sk: ['Prihlasovací kód Loya', (c, m) => `Váš kód na prihlásenie do „Prístupu z domu“: <b style="font-size:22px;letter-spacing:3px">${c}</b><br>Kód platí ${m} minút. Ak ste sa neprihlasovali, e-mail ignorujte.`],
  en: ['Your Loya sign-in code', (c, m) => `Your code for “Access from home”: <b style="font-size:22px;letter-spacing:3px">${c}</b><br>It is valid for ${m} minutes. If it wasn’t you, just ignore this email.`]
};
// Шаг 1: код на почту. Ответ всегда одинаковый — по нему нельзя узнать, есть ли такой адрес.
async function codeRequest({ email, lang }, meta) {
  const ip = (meta && meta.ip) || '';
  if (ipLimited('code-ip:' + ip, 10, 3600e3)) return { status: 429, error: 'too_many' };
  const addr = String(email || '').trim().toLowerCase();
  if (ipLimited('code-em:' + addr, 5, 3600e3)) return { status: 200, ok: true };
  const row = await rowByEmail(addr);
  if (row && (await licenseActive(row.license_key))) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await supabase.from('owner_access').update({ login_code_hash: codeHash(code, row.token), login_code_exp: new Date(Date.now() + CODE_MIN * 60000).toISOString(), login_code_tries: 0 }).eq('license_key', row.license_key);
    const t = CODE_TXT[['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'en'];
    try { await require('./_mail').sendSystemMail({ to: addr, subject: t[0], html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${t[1](code, CODE_MIN)}</div>` }); } catch (e) { /* ответ всё равно одинаковый */ }
  }
  return { status: 200, ok: true };
}
// Шаг 2: код + пароль. Пять неверных попыток — код сгорает, нужен новый.
async function codeLogin({ email, code, password, lang }, meta) {
  const ip = (meta && meta.ip) || '';
  if (ipLimited('codelogin:' + ip, 30, 3600e3)) return { status: 429, error: 'locked' };
  if (!/^\d{6}$/.test(String(code || '')) || typeof password !== 'string' || !password || password.length > 200) return { status: 400, error: 'bad_request' };
  const row = await rowByEmail(email);
  if (!row || !row.login_code_hash) { await new Promise(r => setTimeout(r, 400)); return { status: 401, error: 'wrong' }; }
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { status: 429, error: 'locked' };
  if (!row.login_code_exp || new Date(row.login_code_exp).getTime() < Date.now() || (row.login_code_tries || 0) >= CODE_TRIES) return { status: 401, error: 'code_expired' };
  const okCode = (() => { const a = Buffer.from(codeHash(code, row.token)), b = Buffer.from(row.login_code_hash); return a.length === b.length && crypto.timingSafeEqual(a, b); })();
  const got = Buffer.from(hashPassword(password, row.pass_salt), 'hex'), want = Buffer.from(row.pass_hash, 'hex');
  const okPass = got.length === want.length && crypto.timingSafeEqual(got, want);
  if (!okCode || !okPass) {
    await supabase.from('owner_access').update({ login_code_tries: (row.login_code_tries || 0) + 1 }).eq('license_key', row.license_key);
    await recordLogin(row.license_key, 'code', false, meta);
    return { status: 401, error: 'wrong' };
  }
  if (!(await licenseActive(row.license_key))) return { status: 403, error: 'license_inactive' };
  await supabase.from('owner_access').update({ login_code_hash: null, login_code_exp: null, login_code_tries: 0 }).eq('license_key', row.license_key);
  await recordLogin(row.license_key, 'code', true, meta);
  return { status: 200, ok: true, token: row.token, session: signSession(row.token, row.session_gen) };
}
// «Выйти со всех устройств» — со страницы владельца.
async function logoutAll({ token, session }) {
  const g = await guard(token, session); if (!g.ok) return g;
  await supabase.from('owner_access').update({ session_gen: (g.row.session_gen || 0) + 1 }).eq('license_key', g.row.license_key);
  return { status: 200, ok: true };
}

async function guard(token, session) {
  const p = validToken(token) ? sessionPayload(session, token) : null;
  if (!p) return { status: 401, error: 'session' };
  const { data: row } = await supabase.from('owner_access').select('license_key, snapshot, snapshot_at, session_gen').eq('token', token).maybeSingle();
  if (!row) return { status: 404, error: 'not_enabled' };
  if ((Number(p.g) || 0) !== (row.session_gen || 0)) return { status: 401, error: 'session' };   // вышли со всех устройств / сменили пароль
  if (!(await licenseActive(row.license_key))) return { status: 403, error: 'license_inactive' };
  return { ok: true, row };
}

async function data({ token, session }) {
  const g = await guard(token, session); if (!g.ok) return g;
  const { count } = await supabase.from('owner_commands').select('id', { count: 'exact', head: true }).eq('license_key', g.row.license_key).eq('status', 'pending');
  const { data: recent } = await supabase.from('owner_commands').select('id, cmd, status, result, created_at').eq('license_key', g.row.license_key).order('id', { ascending: false }).limit(8);
  return { status: 200, ok: true, snapshot: g.row.snapshot || null, at: g.row.snapshot_at, pending: count || 0, recent: recent || [], logins: await recentLogins(g.row.license_key) };
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

module.exports = { sync, login, data, command, codeRequest, codeLogin, logoutAll, hashPassword, signSession, checkSession, validToken, maskIp };
