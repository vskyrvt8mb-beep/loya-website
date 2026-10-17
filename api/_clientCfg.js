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
  review_url: (v) => (v === '' ? '' : /^https:\/\/[^\s<>"']{4,300}$/.test(String(v || '')) ? String(v) : null)
};
const LOGO_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]{20,}$/;

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

module.exports = { FIELDS, clean, poll, adminGet, adminSave };
