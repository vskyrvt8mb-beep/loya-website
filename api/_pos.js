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
  const ids = Array.isArray(ack) ? ack.map(Number).filter(Number.isInteger).slice(0, 500) : [];
  if (ids.length) await supabase.from('pos_events').update({ delivered_at: new Date().toISOString() }).eq('license_key', lk).in('id', ids);
  // Переданные чеки храним неделю (на случай повторной выгрузки), потом удаляем.
  await supabase.from('pos_events').delete().eq('license_key', lk).lt('delivered_at', new Date(Date.now() - 7 * 86400e3).toISOString());
  const { data, error } = await supabase.from('pos_events').select('id, payload, created_at').eq('license_key', lk).is('delivered_at', null).order('id', { ascending: true }).limit(200);
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  return { status: 200, ok: true, items: (data || []).map(r => ({ id: r.id, payload: r.payload, receivedAt: r.created_at })) };
}

module.exports = { key, incoming, pull };
