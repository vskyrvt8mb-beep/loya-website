// 2.23: настройки клиента, заданные в админке: оформление программы, страница регистрации, акции.
// Хранится в admin_settings: «ccfg:КЛЮЧ» = { ver, at, cfg }. Программа клиента раз в несколько минут
// спрашивает /api/online?action=client-cfg и применяет новую версию (последнее изменение побеждает:
// владелец может потом поправить у себя). Заодно программа присылает снимок своих текущих настроек
// («csnap:КЛЮЧ»), чтобы в админке было видно, что сейчас стоит у клиента.
const { supabase, licenseActive } = require('./_license');

const HEX = /^#[0-9a-fA-F]{6}$/;
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const int = (v, a, b) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= a && x <= b ? String(x) : null; };
const oneOf = (list) => (v) => (list.includes(String(v)) ? String(v) : null);
const bool = (v) => (v === true || v === '1' || v === 1 ? '1' : v === false || v === '0' || v === 0 ? '0' : null);
const hex = (v) => (v === '' ? '' : HEX.test(String(v || '')) ? String(v) : null);
const hhmm = (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v) : null);
const days = (v) => { const d = String(v == null ? '' : v).split(',').filter(Boolean); return d.every(x => /^[0-6]$/.test(x)) ? [...new Set(d)].join(',') : null; };

// JSON-поля (онлайн-запись, «Wallet рядом»): разбираем, чистим и снова превращаем в строку.
const json = (fn) => (v) => { try { const x = fn(typeof v === 'string' ? JSON.parse(v) : v); return x == null ? null : JSON.stringify(x); } catch (e) { return null; } };
const idOf = (v, i, p) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || (p + (i + 1));
const svcList = (a) => (Array.isArray(a) ? a : []).slice(0, 40).map((x, i) => ({ id: idOf(x && x.id, i, 's'), n: str(x && x.n, 60), d: Math.max(5, Math.min(480, Math.round(Number(x && x.d) || 60))), p: x && x.p !== '' && x.p != null && Number.isFinite(Number(x.p)) ? Math.max(0, Math.min(100000, Number(x.p))) : null })).filter(x => x.n);
const staffList = (a) => (Array.isArray(a) ? a : []).slice(0, 20).map((x, i) => ({ id: idOf(x && x.id, i, 'm'), n: str(x && x.n, 40), s: (Array.isArray(x && x.s) ? x.s : []).map(String).slice(0, 40) })).filter(x => x.n);
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const hoursMap = (o) => { const out = {}; for (let d = 0; d < 7; d++) out[d] = (Array.isArray(o && o[d]) ? o[d] : []).filter(r => Array.isArray(r) && HM.test(r[0]) && HM.test(r[1]) && r[1] > r[0]).slice(0, 3).map(r => [r[0], r[1]]); return out; };
const geoList = (a) => (Array.isArray(a) ? a : []).map(x => ({ lat: Number(x && x.lat), lng: Number(x && x.lng), name: str(x && x.name, 60) })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng) && Math.abs(x.lat) <= 90 && Math.abs(x.lng) <= 180 && !(x.lat === 0 && x.lng === 0)).slice(0, 10).map(x => ({ ...x, lat: Math.round(x.lat * 1e6) / 1e6, lng: Math.round(x.lng * 1e6) / 1e6 }));

// ключ настройки программы → проверка значения (null — отбросить)
const FIELDS = {
  brand_name: (v) => str(v, 60) || null,
  business_niche: (v) => (/^[a-z_]{2,20}$/.test(String(v || '')) ? String(v) : null),
  app_language: oneOf(['ru', 'uk', 'sk', 'en']),
  spend_currency: (v) => (/^[A-Z]{3}$/.test(String(v || '')) ? String(v) : null),
  theme_name: oneOf(['glossy', 'gold', 'coffee', 'mint', 'ocean', 'berry', 'graphite', 'custom']),
  theme_primary: hex, theme_sidebar: hex, theme_screen: hex, theme_text: hex,
  selfreg_card_type: oneOf(['stamp', 'discount', 'spend']),
  selfreg_stamp_target: (v) => int(v, 2, 50), selfreg_stamp_title: (v) => str(v, 60),
  selfreg_discount_percent: (v) => int(v, 1, 90),
  selfreg_spend_target: (v) => int(v, 1, 100000), selfreg_spend_title: (v) => str(v, 60), selfreg_spend_points: (v) => int(v, 1, 1000),
  registration_heading: (v) => str(v, 80), registration_subtitle: (v) => str(v, 240), registration_button_text: (v) => str(v, 40),
  reg_page_color2: hex, reg_page_bg: oneOf(['', 'dark', 'light']),
  welcome_double: bool,
  bonus_stamps_enabled: bool, bonus_stamps_mult: oneOf(['2', '3']), bonus_stamps_from: hhmm, bonus_stamps_to: hhmm, bonus_stamps_days: days,
  scan_cooldown_min: oneOf(['0', '5', '15', '30', '60', '180', '720']),
  referral_enabled: bool, referral_bonus_stamps: (v) => int(v, 0, 5), referral_friend_stamps: (v) => int(v, 0, 5),
  review_url: (v) => (v === '' ? '' : /^https:\/\/[^\s<>"']{4,300}$/.test(String(v || '')) ? String(v) : null),
  // 2.24: всё, что владелец настраивает в программе, — и из админки
  selfreg_mode: oneOf(['wifi', 'online']),
  online_reg_enabled: bool, online_bonus_title: (v) => str(v, 80), online_bonus_percent: (v) => int(v, 1, 100), online_bonus_days: (v) => int(v, 1, 90),
  book_on: bool, book_services: json(svcList), book_staff: json(staffList), book_hours: json(hoursMap),
  book_step: oneOf(['10', '15', '20', '30', '60']), book_lead: (v) => int(v, 0, 2880), book_days: (v) => int(v, 1, 90),
  book_note: (v) => str(v, 300), book_address: (v) => str(v, 120), book_phone: (v) => str(v, 30),
  geo_on: bool, geo_points: json(geoList), geo_text: (v) => str(v, 120),
  tier_perks_on: bool, auto_winback_enabled: bool, auto_near_enabled: bool, auto_welcome_enabled: bool, auto_birthday_enabled: bool,
  feature_inventory: bool, feature_network: bool, feature_staff: bool, feature_weather: bool
};
const LOGO_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]{20,}$/;
const SECRET_KEY = /(pass|secret|token|json|_key$|^license|pin|hash|smtp_user|session|private|cookie|device_id|apikey|api_key)/i;

function clean(cfg) {
  const out = {};
  for (const [k, fn] of Object.entries(FIELDS)) {
    if (!cfg || !(k in cfg)) continue;
    const v = fn(cfg[k]);
    if (v !== null && v !== undefined) out[k] = v;
  }
  // логотип заведения (PNG до ~400 КБ) или null — убрать
  if (cfg && 'brand_logo' in cfg) {
    if (cfg.brand_logo === null || cfg.brand_logo === '') out.brand_logo = null;
    else if (LOGO_RE.test(String(cfg.brand_logo)) && String(cfg.brand_logo).length < 560000) out.brand_logo = String(cfg.brand_logo);
  }
  return out;
}

async function getKV(key) {
  const { data, error } = await supabase.from('admin_settings').select('value').eq('key', key).limit(1);
  if (error) throw new Error(error.message);
  if (!data || !data[0]) return null;
  try { return JSON.parse(data[0].value); } catch (e) { return null; }
}
async function setKV(key, obj) {
  const { error } = await supabase.from('admin_settings').upsert({ key, value: JSON.stringify(obj) });
  if (error) throw new Error(error.message);
}

const walletState = () => ({
  google: (() => { try { require('./_wallet').serviceAccount(); return true; } catch (e) { return false; } })(),
  apple: (() => { try { return !!require('./_apple').configured(); } catch (e) { return false; } })()
});

// Программа: { licenseKey, ver (применённая версия), snap (текущие настройки) } → { ver, cfg? , wallet }
async function poll({ licenseKey, ver, snap }) {
  const key = String(licenseKey || '').trim();
  if (!/^[A-Z0-9-]{8,64}$/i.test(key)) return { status: 400, error: 'bad_request' };
  if (!(await licenseActive(key))) return { status: 403, error: 'license_inactive' };
  let cur = null;
  try { cur = await getKV('ccfg:' + key); } catch (e) { return { status: 200, ok: true, ver: 0, wallet: walletState() }; }   // таблицы admin_settings нет — просто без настроек
  if (snap && typeof snap === 'object') {
    const s = clean(snap); s.has_logo = snap.has_logo ? '1' : '0'; s.version = str(snap.version, 20);
    // 2.24: все остальные настройки программы (без паролей и ключей) — только для просмотра в админке
    if (snap.all && typeof snap.all === 'object') { const all = {}; let size = 0; for (const [k, v] of Object.entries(snap.all).slice(0, 600)) { if (!/^[a-z0-9_]{1,60}$/.test(k) || SECRET_KEY.test(k)) continue; const val = str(v, 4000); size += k.length + val.length; if (size > 120000) break; all[k] = val; } s.all = all; }
    try { await setKV('csnap:' + key, { at: new Date().toISOString(), s }); } catch (e) { /* не критично */ }
  }
  const v = cur ? Number(cur.ver) || 0 : 0;
  let walletVer = 0;
  try { const { data } = await supabase.from('wallet_designs').select('ver').eq('biz', require('./_walletDesign').bizOf(key)).maybeSingle(); walletVer = data ? Number(data.ver) || 0 : 0; } catch (e) { /* нет таблицы */ }
  const out = { status: 200, ok: true, ver: v, walletVer, wallet: walletState() };
  if (cur && v > (Number(ver) || 0)) out.cfg = cur.cfg || {};
  return out;
}

// Админка: прочитать (снимок программы + заданные настройки + Wallet) и сохранить.
async function adminGet(key) {
  const [cur, snap] = await Promise.all([getKV('ccfg:' + key).catch(() => null), getKV('csnap:' + key).catch(() => null)]);
  const WD = require('./_walletDesign');
  let wallet = null;
  try {
    const { data } = await supabase.from('wallet_designs').select('biz, ver, bg_color, hero_stamps, has_logo, has_hero').eq('biz', WD.bizOf(key)).maybeSingle();
    const info = data ? { biz: data.biz, ver: Number(data.ver) || 1, hasLogo: !!data.has_logo, hasHero: !!data.has_hero, bg: data.bg_color || '', heroStamps: data.hero_stamps !== false } : null;
    wallet = info ? { ...info, logoUrl: info.hasLogo ? WD.assetUrl(info, 'logo') : '', heroUrl: info.hasHero ? WD.assetUrl(info, 'hero') : '' } : { hasLogo: false, hasHero: false, bg: '', heroStamps: true };
  } catch (e) { wallet = null; }
  return { status: 200, ok: true, cfg: (cur && cur.cfg) || {}, ver: cur ? Number(cur.ver) || 0 : 0, at: cur ? cur.at : '', snap: (snap && snap.s) || null, snapAt: snap ? snap.at : '', wallet };
}
async function adminSave(key, cfg, wallet) {
  const c = clean(cfg || {});
  let cur = null;
  try { cur = await getKV('ccfg:' + key); } catch (e) { return { status: 500, error: 'db_error', detail: 'admin_settings: ' + e.message }; }
  const prev = (cur && cur.cfg) || {};
  const merged = { ...prev, ...c };
  // логотип программа применяет, только когда он поменялся (номер logo_rev), а не при каждой правке
  if ('brand_logo' in c) merged.logo_rev = (Number(prev.logo_rev) || 0) + 1;
  const ver = (cur ? Number(cur.ver) || 0 : 0) + 1;
  try { await setKV('ccfg:' + key, { ver, at: new Date().toISOString(), cfg: merged }); } catch (e) { return { status: 500, error: 'db_error', detail: e.message }; }
  let walletRes = null;
  if (wallet && typeof wallet === 'object' && Object.keys(wallet).length) walletRes = await require('./_walletDesign').saveDesign(key, wallet);
  return { status: 200, ok: true, ver, wallet: walletRes };
}

// 2.24: предпросмотр страниц клиента в админке — та же вёрстка, что увидит гость, с несохранёнными правками.
async function preview(key, kind, cfg, emoji) {
  const O = require('./_online');
  let row = null; try { row = await O.profileByLicense(key); } catch (e) { row = null; }
  const p = JSON.parse(JSON.stringify((row && row.profile) || {}));
  const c = clean(cfg || {});
  const has = (k) => Object.prototype.hasOwnProperty.call(c, k);
  if (has('brand_name')) p.name = c.brand_name;
  if (has('business_niche')) p.niche = c.business_niche;
  if (emoji) p.emoji = str(emoji, 8);
  if (has('theme_primary') && c.theme_primary) p.color = c.theme_primary;
  if (has('app_language')) p.lang = c.app_language;
  if (has('spend_currency')) p.currency = c.spend_currency;
  p.card = Object.assign({}, p.card || {});
  if (has('selfreg_card_type')) p.card.type = c.selfreg_card_type;
  if (has('selfreg_stamp_target')) p.card.stampTarget = Number(c.selfreg_stamp_target);
  if (has('selfreg_stamp_title')) p.card.title = c.selfreg_stamp_title;
  if (has('selfreg_discount_percent')) p.card.discount = Number(c.selfreg_discount_percent);
  if (has('selfreg_spend_target')) p.card.spendTarget = Number(c.selfreg_spend_target);
  if (has('selfreg_spend_title')) p.card.spendTitle = c.selfreg_spend_title;
  if (has('welcome_double')) p.card.welcomeDouble = c.welcome_double === '1';
  p.page = Object.assign({}, p.page || {});
  if (has('registration_heading')) p.page.title = c.registration_heading;
  if (has('registration_subtitle')) p.page.text = c.registration_subtitle;
  if (has('registration_button_text')) p.page.button = c.registration_button_text;
  if (has('reg_page_color2')) p.page.color2 = c.reg_page_color2;
  if (has('reg_page_bg')) p.page.bg = c.reg_page_bg;
  if (has('brand_logo')) p.page.logo = c.brand_logo || '';
  if (has('online_bonus_title')) p.bonusTitle = c.online_bonus_title;
  if (has('online_bonus_percent')) p.bonusPercent = Number(c.online_bonus_percent);
  if (has('online_bonus_days')) p.bonusDays = Number(c.online_bonus_days);
  if (has('referral_enabled')) p.refOn = c.referral_enabled === '1';
  p.enabled = true; p.join = true; p.promo = true;
  const slug = (row && row.slug) || 'preview';
  let html;
  if (kind === 'book') {
    const B = require('./_book');
    const b = Object.assign({}, p.book || {});
    const pj = (k) => { try { return JSON.parse(c[k]); } catch (e) { return undefined; } };
    if (has('book_services')) b.services = pj('book_services');
    if (has('book_staff')) b.staff = pj('book_staff');
    if (has('book_hours')) b.hours = pj('book_hours');
    for (const k of ['step', 'lead', 'days']) if (has('book_' + k)) b[k] = Number(c['book_' + k]);
    for (const k of ['note', 'address', 'phone']) if (has('book_' + k)) b[k] = c['book_' + k];
    b.on = true; b.currency = p.currency || b.currency;
    html = require('./_x_book_page').page({ slug, profile: p, book: B.cleanBook(b) }, {});
  } else {
    const wal = walletState();
    html = require('./_x_online_page').html(slug, p, kind === 'join' ? 'join' : 'promo', wal);
  }
  // В предпросмотре ничего не отправляется: форма и ссылки не работают.
  const guard = '<script>document.addEventListener("submit",function(e){e.preventDefault();e.stopImmediatePropagation()},true);document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a){e.preventDefault()}},true);</script>';
  html = String(html).replace('<head>', '<head>' + guard);
  // язык предпросмотра — язык заведения (а не браузера админа)
  const pl = ['ru', 'uk', 'sk', 'en'].includes(p.lang) ? p.lang : 'ru';
  html = html.split("new URLSearchParams(location.search).get('lang')").join(JSON.stringify(pl));
  return { status: 200, ok: true, html, slug: row ? row.slug : '' };
}

module.exports = { FIELDS, clean, poll, adminGet, adminSave, preview };
