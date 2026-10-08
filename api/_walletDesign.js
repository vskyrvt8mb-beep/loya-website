// _walletDesign.js — свой дизайн карт заведения в Google Wallet и Apple Wallet:
// логотип, картинка-баннер и цвет фона. Хранится в Supabase (таблица wallet_designs),
// картинки — base64 прямо в строке (небольшие: логотип до ~350 КБ, баннер до ~600 КБ).
// Google сам скачивает картинки по публичной ссылке /api/wallet?action=asset&b=…&k=…&v=…,
// поэтому в ссылке нет ключа подписки — только «отпечаток» бизнеса (как в id карт Google).
const crypto = require('crypto');
const { supabase, licenseActive } = require('./_license');

const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';
const MAX = { logo: 350 * 1024, hero: 600 * 1024 };

function bizOf(licenseKey) { return crypto.createHash('sha256').update(String(licenseKey || '').trim()).digest('hex').slice(0, 16); }
const validBiz = (b) => /^[a-f0-9]{16}$/.test(String(b || ''));
const validColor = (c) => /^#[0-9a-fA-F]{6}$/.test(String(c || ''));

// data:image/png;base64,… → { mime, buf } только для настоящих PNG/JPEG (проверяем «подпись» файла).
function parseImage(dataUrl, kind) {
  const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'bad_image' };
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX[kind]) return { error: 'too_big' };
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!(png || jpg)) return { error: 'bad_image' };
  return { mime: png ? 'image/png' : 'image/jpeg', b64: m[2], buf };
}

function publicInfo(row) {
  if (!row) return { ver: 0, hasLogo: false, hasHero: false, bg: '', heroStamps: true };
  const hasLogo = 'has_logo' in row ? !!row.has_logo : !!row.logo, hasHero = 'has_hero' in row ? !!row.has_hero : !!row.hero;
  return { biz: row.biz, ver: Number(row.ver) || 1, hasLogo, hasHero, bg: validColor(row.bg_color) ? row.bg_color : '', heroStamps: row.hero_stamps !== false };
}
function assetUrl(info, kind) { return `${SITE_URL}/api/wallet?action=asset&b=${info.biz}&k=${kind}&v=${info.ver}`; }

// Без картинок — для сборки карт (чтобы не таскать base64 лишний раз).
async function getDesignInfo(licenseKey) {
  try {
    const { data, error } = await supabase.from('wallet_designs').select('biz, ver, bg_color, hero_stamps, has_logo, has_hero').eq('biz', bizOf(licenseKey)).maybeSingle();
    if (error || !data) return publicInfo(null);
    return publicInfo(data);
  } catch (e) { return publicInfo(null); }
}
// С картинками: кешируем в памяти функции по (бизнес, версия) — версия меняется при каждом сохранении.
const cache = new Map();
async function getDesignFull(biz, ver) {
  if (!validBiz(biz)) return null;
  const key = biz + ':' + (ver || '');
  if (ver && cache.has(key)) return cache.get(key);
  const { data } = await supabase.from('wallet_designs').select('*').eq('biz', biz).maybeSingle();
  if (!data) return null;
  if (cache.size > 50) cache.clear();
  cache.set(biz + ':' + data.ver, data);
  return data;
}

// POST /api/wallet?action=design  { licenseKey, op: 'get' | 'save', logo?, hero?, bgColor?, heroStamps? }
// logo/hero: data-URL — заменить, null — убрать, не передано — оставить как есть.
async function handleDesign(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const { licenseKey, op } = req.body || {};
  if (typeof licenseKey !== 'string' || !licenseKey.trim()) { res.status(400).json({ error: 'bad_request' }); return; }
  if (!(await licenseActive(licenseKey))) { res.status(403).json({ error: 'license_inactive' }); return; }
  const biz = bizOf(licenseKey);
  const { data: cur, error: readErr } = await supabase.from('wallet_designs').select('*').eq('biz', biz).maybeSingle();
  if (readErr) { res.status(500).json({ error: 'db_error', detail: String(readErr.message || '').slice(0, 140) }); return; }
  if (op !== 'save') {
    const info = publicInfo(cur);
    res.status(200).json({ ok: true, ...info, logoUrl: info.hasLogo ? assetUrl(info, 'logo') : '', heroUrl: info.hasHero ? assetUrl(info, 'hero') : '' });
    return;
  }
  const b = req.body;
  const row = { biz, license_key: licenseKey.trim(), logo: cur ? cur.logo : null, logo_mime: cur ? cur.logo_mime : null, hero: cur ? cur.hero : null, hero_mime: cur ? cur.hero_mime : null,
    bg_color: cur ? cur.bg_color : null, hero_stamps: cur ? cur.hero_stamps !== false : true, ver: (cur ? Number(cur.ver) || 1 : 0) + 1, updated_at: new Date().toISOString() };
  for (const kind of ['logo', 'hero']) {
    if (!(kind in b)) continue;
    if (b[kind] === null || b[kind] === '') { row[kind] = null; row[kind + '_mime'] = null; continue; }
    const img = parseImage(b[kind], kind);
    if (img.error) { res.status(400).json({ error: img.error, field: kind }); return; }
    row[kind] = img.b64; row[kind + '_mime'] = img.mime;
  }
  row.has_logo = !!row.logo; row.has_hero = !!row.hero;
  if ('bgColor' in b) row.bg_color = validColor(b.bgColor) ? b.bgColor : null;
  if ('heroStamps' in b) row.hero_stamps = b.heroStamps !== false;
  const { error } = await supabase.from('wallet_designs').upsert(row);
  if (error) { res.status(500).json({ error: 'db_error', detail: String(error.message || '').slice(0, 140) }); return; }
  const info = publicInfo(row);
  res.status(200).json({ ok: true, ...info, logoUrl: info.hasLogo ? assetUrl(info, 'logo') : '', heroUrl: info.hasHero ? assetUrl(info, 'hero') : '' });
}

// GET /api/wallet?action=asset&b=<бизнес>&k=logo|hero&v=<версия> — картинка для Google Wallet.
async function handleAsset(req, res) {
  const q = req.query || {};
  const kind = q.k === 'hero' ? 'hero' : 'logo';
  const row = await getDesignFull(String(q.b || ''), String(q.v || ''));
  if (!row || !row[kind]) { res.status(404).json({ error: 'not_found' }); return; }
  // Подписка закончилась — свой дизайн больше не раздаём (карта покажет стандартный).
  if (!(await licenseActive(row.license_key))) { res.status(404).json({ error: 'not_found' }); return; }
  res.setHeader('Content-Type', row[kind + '_mime'] || 'image/png');
  res.setHeader('Cache-Control', String(q.v) === String(row.ver) ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  res.status(200).send(Buffer.from(row[kind], 'base64'));
}

module.exports = { bizOf, getDesignInfo, getDesignFull, handleDesign, handleAsset, assetUrl, parseImage, MAX };
