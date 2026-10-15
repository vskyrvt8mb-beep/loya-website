// Касса бизнеса → Loya через интернет (для облачных касс, которые умеют слать веб-хук).
// Касса шлёт копию чека на личный адрес бизнеса https://loya-loyalty.com/api/pos/<ключ>,
// сервер кладёт чек в очередь, программа на компьютере раз в минуту забирает новые чеки.
// Фискальный чек печатает сама касса — Loya только начисляет бонусы и ведёт склад.
const crypto = require('crypto');
const { supabase, licenseActive } = require('./_license');
const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';

const hits = new Map();
function limited(key, max, ms) { const now = Date.now(); const a = (hits.get(key) || []).filter(t => now - t < ms); if (a.length >= max) { hits.set(key, a); return true; } a.push(now); hits.set(key, a); return false; }

async function key({ licenseKey, rotate }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const lk = licenseKey.trim();
  const { data: row, error } = await supabase.from('pos_keys').select('key').eq('license_key', lk).maybeSingle();
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  let k = row && row.key;
  if (!k || rotate) {
    k = crypto.randomBytes(20).toString('hex');
    const { error: e2 } = await supabase.from('pos_keys').upsert({ license_key: lk, key: k, created_at: new Date().toISOString() });
    if (e2) return { status: 500, error: 'db_error', detail: String(e2.message || '').slice(0, 140) };
  }
  return { status: 200, ok: true, key: k, url: `${SITE_URL}/api/pos/${k}` };
}

async function incoming(k, body) {
  if (!/^[a-f0-9]{40}$/.test(String(k || ''))) return { status: 404, error: 'not_found' };
  if (limited('k:' + k, 300, 60e3)) return { status: 429, error: 'too_many' };
  const { data: row } = await supabase.from('pos_keys').select('license_key').eq('key', k).maybeSingle();
  if (!row) return { status: 404, error: 'not_found' };
  if (!(await licenseActive(row.license_key))) return { status: 403, error: 'license_inactive' };
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, error: 'bad_json' };
  if (JSON.stringify(body).length > 65536) return { status: 413, error: 'too_large' };
  const total = Number(String(body.total == null ? '' : body.total).replace(',', '.'));
  if (!Number.isFinite(total) || total < 0) return { status: 400, error: 'invalid_total' };
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count } = await supabase.from('pos_events').select('id', { count: 'exact', head: true }).eq('license_key', row.license_key).gte('created_at', since);
  if ((count || 0) >= 20000) return { status: 429, error: 'daily_limit' };
  const { error } = await supabase.from('pos_events').insert({ license_key: row.license_key, payload: body });
  if (error) return { status: 500, error: 'db_error' };
  return { status: 200, ok: true };
}

async function pull({ licenseKey, ack }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const lk = licenseKey.trim();
  try { await dkPoll(lk); } catch (e) { /* касса недоступна — чеки придут при следующем обмене */ }
  const ids = Array.isArray(ack) ? ack.map(Number).filter(Number.isInteger).slice(0, 500) : [];
  if (ids.length) await supabase.from('pos_events').update({ delivered_at: new Date().toISOString() }).eq('license_key', lk).in('id', ids);
  // Переданные чеки храним неделю (на случай повторной выгрузки), потом удаляем.
  await supabase.from('pos_events').delete().eq('license_key', lk).lt('delivered_at', new Date(Date.now() - 7 * 86400e3).toISOString());
  const { data, error } = await supabase.from('pos_events').select('id, payload, created_at').eq('license_key', lk).is('delivered_at', null).order('id', { ascending: true }).limit(200);
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  return { status: 200, ok: true, items: (data || []).map(r => ({ id: r.id, payload: r.payload, receivedAt: r.created_at })) };
}

// ---------- 2.20: Dotykačka (облачная касса) ----------
// Владелец один раз нажимает «Подключить Dotykačka» в программе: открывается страница входа Dotykačka,
// он выбирает своё облако — и сервер получает ключ доступа (refresh token). Дальше при каждом обмене
// программы с сервером (раз в минуту) новые оплаченные чеки забираются из Dotykačka и попадают в общую
// очередь чеков — как от любой другой кассы. Ключи приложения: DOTYKACKA_CLIENT_ID / DOTYKACKA_CLIENT_SECRET
// (выдаёт Dotykačka после заявки), только в переменных Vercel.
const DK_API = 'https://api.dotykacka.cz/v2';
const DK_CONNECT = 'https://admin.dotykacka.cz/client/connect/v2';
const dkReady = () => !!(process.env.DOTYKACKA_CLIENT_ID && process.env.DOTYKACKA_CLIENT_SECRET);

async function dkStart({ licenseKey }) {
  if (!dkReady()) return { status: 200, error: 'dk_not_configured' };
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const lk = String(licenseKey).trim();
  const state = crypto.randomBytes(16).toString('hex');
  const { data: prev } = await supabase.from('pos_connectors').select('license_key').eq('license_key', lk).maybeSingle();
  const row = { state, state_at: new Date().toISOString() };
  const { error } = prev ? await supabase.from('pos_connectors').update(row).eq('license_key', lk)
    : await supabase.from('pos_connectors').insert({ license_key: lk, kind: 'dotykacka', ...row });
  if (error) return { status: 500, error: 'db_error' };
  return { status: 200, ok: true, url: `${SITE_URL}/dk/${state}` };
}

const DK_TX = {
  ru: { go: 'Переходим в Dotykačka…', btn: 'Продолжить', ok: 'Dotykačka подключена ✓', okSub: 'Можно закрыть эту страницу и вернуться в Loya. Новые чеки будут приходить сами.', bad: 'Не получилось подключить Dotykačka', badSub: 'Ссылка устарела или вход отменён. Нажмите «Подключить» в Loya ещё раз.' },
  uk: { go: 'Переходимо в Dotykačka…', btn: 'Продовжити', ok: 'Dotykačka підключено ✓', okSub: 'Можна закрити цю сторінку й повернутися в Loya. Нові чеки надходитимуть самі.', bad: 'Не вдалося підключити Dotykačka', badSub: 'Посилання застаріло або вхід скасовано. Натисніть «Підключити» в Loya ще раз.' },
  sk: { go: 'Presmerúvame do Dotykačky…', btn: 'Pokračovať', ok: 'Dotykačka je pripojená ✓', okSub: 'Túto stránku môžete zavrieť a vrátiť sa do Loya. Nové účtenky budú prichádzať samé.', bad: 'Dotykačku sa nepodarilo pripojiť', badSub: 'Odkaz vypršal alebo bolo prihlásenie zrušené. V Loya kliknite na „Pripojiť“ znova.' },
  en: { go: 'Opening Dotykačka…', btn: 'Continue', ok: 'Dotykačka connected ✓', okSub: 'You can close this page and return to Loya. New receipts will arrive automatically.', bad: 'Could not connect Dotykačka', badSub: 'The link expired or sign-in was cancelled. Click “Connect” in Loya again.' }
};
function dkLang(req) { const a = String((req.headers && req.headers['accept-language']) || '').slice(0, 2).toLowerCase(); return a === 'cs' ? 'sk' : (DK_TX[a] ? a : 'en'); }
function dkShell(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Loya × Dotykačka</title>
<style>body{font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;background:#0e0c09;color:#f6f1e7;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:20px}
.c{max-width:440px;text-align:center;background:#17140f;border:1px solid #3a3122;border-radius:22px;padding:30px 26px}h1{font-size:22px;margin:0 0 10px}p{color:#bfb49e;line-height:1.5;margin:0}
button{margin-top:18px;height:50px;padding:0 26px;border:0;border-radius:14px;background:#e3b857;color:#17130c;font-weight:800;font-size:16px;cursor:pointer}</style></head><body><div class="c">${body}</div></body></html>`;
}
// /dk/<state>: страница сама отправляет форму в Dotykačka (подпись действует ±1 минуту — считаем её сейчас).
async function dkPage(req) {
  const state = String((req.query && req.query.state) || '');
  const T = DK_TX[dkLang(req)];
  if (!/^[a-f0-9]{32}$/.test(state) || !dkReady()) return { status: 404, html: dkShell(`<h1>${T.bad}</h1><p>${T.badSub}</p>`) };
  const { data: row } = await supabase.from('pos_connectors').select('license_key, state_at').eq('state', state).maybeSingle();
  if (!row || Date.now() - new Date(row.state_at).getTime() > 30 * 60e3) return { status: 410, html: dkShell(`<h1>${T.bad}</h1><p>${T.badSub}</p>`) };
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', process.env.DOTYKACKA_CLIENT_SECRET).update(ts).digest('hex');
  const f = (n, v) => `<input type="hidden" name="${n}" value="${String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`;
  const html = dkShell(`<h1>${T.go}</h1><form id="f" method="post" action="${DK_CONNECT}">${f('client_id', process.env.DOTYKACKA_CLIENT_ID)}${f('timestamp', ts)}${f('signature', sig)}${f('scope', '*')}${f('redirect_uri', `${SITE_URL}/api/dk-callback`)}${f('state', state)}<button type="submit">${T.btn}</button></form><script>document.getElementById('f').submit()</script>`);
  return { status: 200, html };
}
async function dkToken(row) {
  if (row.access_token && row.access_exp && new Date(row.access_exp).getTime() - Date.now() > 120e3) return row.access_token;
  const r = await fetch(`${DK_API}/signin/token`, { method: 'POST', headers: { 'Authorization': `User ${row.refresh_token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ _cloudId: String(row.cloud_id) }) });
  if (r.status === 401) throw Object.assign(new Error('dk_unauthorized'), { code: 'dk_unauthorized' });
  const j = await r.json().catch(() => ({}));
  if (!j.accessToken) throw new Error('dk_token');
  await supabase.from('pos_connectors').update({ access_token: j.accessToken, access_exp: new Date(Date.now() + 50 * 60e3).toISOString() }).eq('license_key', row.license_key);
  return j.accessToken;
}
async function dkGet(token, path) {
  const r = await fetch(`${DK_API}${path}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
  if (r.status === 404 || r.status === 204) return null;
  if (!r.ok) throw new Error('dk_http_' + r.status);
  return r.json();
}
// Последние заказы облака (новые первыми).
async function dkLatestOrders(token, cloudId, limit) {
  const j = await dkGet(token, `/clouds/${encodeURIComponent(cloudId)}/orders?page=1&limit=${limit}&sort=-id&include=orderItems`);
  return Array.isArray(j) ? j : (j && Array.isArray(j.data) ? j.data : []);
}
// Вход в Dotykačka завершён: приходит refresh token и выбранное облако.
async function dkCallback(req) {
  const q = req.query || {};
  const T = DK_TX[dkLang(req)];
  const fail = { status: 400, html: dkShell(`<h1>${T.bad}</h1><p>${T.badSub}</p>`) };
  const state = String(q.state || ''), token = String(q.token || ''), cloud = String(q.cloudid || '');
  if (!/^[a-f0-9]{32}$/.test(state) || !token || token.length > 2000 || !/^\d{1,20}$/.test(cloud)) return fail;
  const { data: row } = await supabase.from('pos_connectors').select('*').eq('state', state).maybeSingle();
  if (!row || Date.now() - new Date(row.state_at).getTime() > 30 * 60e3) return fail;
  const upd = { refresh_token: token, cloud_id: cloud, state: null, connected_at: new Date().toISOString(), access_token: null, access_exp: null, last_order_id: null, last_error: null };
  await supabase.from('pos_connectors').update(upd).eq('license_key', row.license_key);
  // Старые чеки не тянем: начинаем с самого нового заказа на момент подключения.
  try {
    const fresh = { ...row, ...upd };
    const at = await dkToken(fresh);
    const list = await dkLatestOrders(at, cloud, 1);
    await supabase.from('pos_connectors').update({ last_order_id: list.length ? Number(list[0].id) : 0 }).eq('license_key', row.license_key);
  } catch (e) { await supabase.from('pos_connectors').update({ last_order_id: 0, last_error: String(e.code || e.message || 'dk').slice(0, 80) }).eq('license_key', row.license_key); }
  return { status: 200, html: dkShell(`<h1>${T.ok}</h1><p>${T.okSub}</p>`) };
}
async function dkStatus({ licenseKey }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const { data: row } = await supabase.from('pos_connectors').select('cloud_id, connected_at, last_poll, last_error').eq('license_key', String(licenseKey).trim()).maybeSingle();
  return { status: 200, ok: true, ready: dkReady(), connected: !!(row && row.connected_at && row.cloud_id), cloudId: row && row.cloud_id, connectedAt: row && row.connected_at, lastPoll: row && row.last_poll, lastError: row && row.last_error };
}
async function dkDisconnect({ licenseKey }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  await supabase.from('pos_connectors').delete().eq('license_key', String(licenseKey).trim());
  return { status: 200, ok: true };
}
// Забрать новые оплаченные заказы → в очередь чеков. Не чаще раза в 30 секунд на бизнес.
async function dkPoll(lk) {
  if (!dkReady()) return;
  const { data: row } = await supabase.from('pos_connectors').select('*').eq('license_key', lk).maybeSingle();
  if (!row || !row.connected_at || !row.refresh_token || row.last_order_id == null) return;
  if (row.last_poll && Date.now() - new Date(row.last_poll).getTime() < 30e3) return;
  await supabase.from('pos_connectors').update({ last_poll: new Date().toISOString() }).eq('license_key', lk);
  try {
    const at = await dkToken(row);
    const list = (await dkLatestOrders(at, row.cloud_id, 50)).filter(o => Number(o.id) > Number(row.last_order_id || 0)).sort((a, b) => Number(a.id) - Number(b.id));
    let maxId = Number(row.last_order_id || 0);
    const phones = new Map();
    for (const o of list) {
      maxId = Math.max(maxId, Number(o.id));
      if (!o.paid || o.status === 'CANCELED' || o.status === 'CANCELLED') continue;
      let phone;
      if (o._customerId) {
        if (!phones.has(o._customerId)) {
          try { const c = await dkGet(at, `/clouds/${encodeURIComponent(row.cloud_id)}/customers/${encodeURIComponent(o._customerId)}`); phones.set(o._customerId, c && (c.phone || c.mobilePhone) || ''); } catch (e) { phones.set(o._customerId, ''); }
        }
        phone = phones.get(o._customerId) || undefined;
      }
      const items = Array.isArray(o.orderItems) ? o.orderItems : [];
      const payload = {
        id: 'DK-' + o.id, total: Number(o.totalValueRounded) || 0, currency: o.currency || undefined, created_at: o.completed || o.created, phone,
        items: items.slice(0, 200).map(it => ({ name: it.name, qty: Number(it.quantity) || 1, price: Number(it.billedUnitPriceWithVat) || 0, barcode: Array.isArray(it.ean) ? it.ean[0] : it.ean, sku: it._productId ? String(it._productId) : undefined }))
      };
      await supabase.from('pos_events').insert({ license_key: lk, payload });
    }
    await supabase.from('pos_connectors').update({ last_order_id: maxId, last_error: null }).eq('license_key', lk);
  } catch (e) {
    await supabase.from('pos_connectors').update({ last_error: String(e.code || e.message || 'dk').slice(0, 80) }).eq('license_key', lk);
  }
}

module.exports = { key, incoming, pull, dkStart, dkPage, dkCallback, dkStatus, dkDisconnect, dkPoll };
