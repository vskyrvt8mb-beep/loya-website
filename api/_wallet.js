// Общий код Google Wallet для функций сайта. Файл начинается с «_» — Vercel не делает из
// него отдельный адрес API.
//
// Схема: один аккаунт эмитента Google Wallet (ваш) выпускает карты для ВСЕХ бизнесов,
// у которых есть активная подписка Loya. Ключ сервисного аккаунта хранится только здесь,
// в переменных окружения Vercel, и никогда не попадает в программу у клиентов.
//
// Переменные окружения Vercel:
//   GOOGLE_WALLET_ISSUER_ID       — идентификатор эмитента (например 3388000000023210114)
//   GOOGLE_WALLET_SERVICE_ACCOUNT — полное содержимое JSON-ключа сервисного аккаунта
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function serviceAccount() {
  const raw = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT;
  if (!raw || !process.env.GOOGLE_WALLET_ISSUER_ID) throw new Error('wallet_not_configured');
  return JSON.parse(raw);
}

function signJwt(sa, payload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign('RSA-SHA256').update(data).sign(sa.private_key);
  return `${data}.${b64url(signature)}`;
}

// Подписка должна быть активной — иначе карты не выпускаем.
async function checkLicense(licenseKey) {
  return require('./_license').licenseActive(licenseKey);
}

// Идентификаторы: бизнес — по хэшу ключа лицензии (сам ключ Google не видит),
// карта — по её уникальному коду. Поэтому карты разных бизнесов никогда не пересекаются.
function ids(licenseKey, cardCode) {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID;
  const biz = crypto.createHash('sha256').update(licenseKey.trim()).digest('hex').slice(0, 16);
  const code = String(cardCode || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 60);
  return { classId: `${issuer}.loya_${biz}`, objectId: `${issuer}.loya_${biz}_${code}` };
}

const TEXT = {
  ru: { hInvite: 'Пригласите друга', inviteDesc: 'Вам обоим — подарок', gift: 'Подарочный сертификат', hBalance: 'Остаток', hTier: 'Уровень', hUntil: 'Действует до', discount: 'Скидочная карта', stamp: 'Карта лояльности', spend: 'Накопительная карта', hDiscount: 'Скидка', hProgress: 'Штампы', hSpent: 'Накоплено', hBonus: 'Бонусы', hRule: 'Правило' },
  uk: { hInvite: 'Запросіть друга', inviteDesc: 'Вам обом — подарунок', gift: 'Подарунковий сертифікат', hBalance: 'Залишок', hTier: 'Рівень', hUntil: 'Діє до', discount: 'Знижкова картка', stamp: 'Картка лояльності', spend: 'Накопичувальна картка', hDiscount: 'Знижка', hProgress: 'Штампи', hSpent: 'Накопичено', hBonus: 'Бонуси', hRule: 'Правило' },
  sk: { hInvite: 'Pozvite priateľa', inviteDesc: 'Darček pre vás oboch', gift: 'Darčeková poukážka', hBalance: 'Zostatok', hTier: 'Úroveň', hUntil: 'Platí do', discount: 'Zľavová karta', stamp: 'Vernostná karta', spend: 'Vernostná karta na nákupy', hDiscount: 'Zľava', hProgress: 'Pečiatky', hSpent: 'Nazbierané', hBonus: 'Bonusy', hRule: 'Pravidlo' },
  en: { hInvite: 'Invite a friend', inviteDesc: 'A gift for you both', gift: 'Gift card', hBalance: 'Balance', hTier: 'Tier', hUntil: 'Valid until', discount: 'Discount card', stamp: 'Loyalty card', spend: 'Spend card', hDiscount: 'Discount', hProgress: 'Stamps', hSpent: 'Collected', hBonus: 'Bonuses', hRule: 'How it works' }
};
const CUR = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴', CZK: 'Kč', PLN: 'zł', HUF: 'Ft', GBP: '£', CHF: 'CHF' };

function clean(v, max) { return String(v == null ? '' : v).slice(0, max); }

// Публичный адрес сайта — им подписаны ссылки на картинку баннера (heroImage), которую
// у себя на серверах скачивает и кеширует сам Google.
const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';

// Ссылка на «баннер» карты: своя картинка для каждого бизнеса (имя, цвет, вид бизнеса)
// и для текущего состояния карты клиента (сколько штампов уже есть, сколько накоплено).
// Картинку рисует /api/wallet-hero.png — она пересоздаётся заново при каждом изменении
// прогресса, потому что состояние закодировано прямо в адресе ссылки.
function heroImageUrl(card, brand, lang, design) {
  const q = new URLSearchParams({
    type: card.type, name: clean(brand.name || 'Loya', 60), color: brand.color || '', niche: brand.niche || 'other',
    currency: brand.currency || 'EUR', lang: ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'ru',
    v: String(card.stamp_count || 0) + '.' + String(card.spend_accumulated || 0) + '.' + String(card.bonus_balance || 0) // меняет URL при каждом скане
  });
  if (card.type === 'stamp') { q.set('count', card.stamp_count || 0); q.set('target', card.stamp_target || 10); }
  else if (card.type === 'spend') { q.set('acc', card.spend_accumulated || 0); q.set('target', card.spend_target || 0); if (Number(card.bonus_balance) > 0) q.set('bonus', Math.round(Number(card.bonus_balance))); }
  else if (card.type === 'discount') { q.set('pct', card.discount_percent || 0); }
  else if (card.type === 'gift') { q.set('gb', card.gift_balance || 0); q.set('v', String(card.gift_balance || 0)); }
  // Свой баннер заведения: картинка берётся из wallet_designs по «отпечатку» бизнеса и версии дизайна.
  if (design && design.hasHero) { q.set('b', design.biz); q.set('dv', String(design.ver)); if (!design.heroStamps) q.set('hs', '0'); }
  q.set('action', 'hero');
  return `${SITE_URL}/api/wallet?${q.toString()}`;
}

// Прогресс карты для строки на пассе.
function progress(card, lang, currency) {
  const W = TEXT[lang] || TEXT.en;
  const cur = CUR[currency] || '€';
  const money = (v) => { const n = Math.round((Number(v) || 0) * 100) / 100; let t = Number.isInteger(n) ? String(n) : n.toFixed(2); if (lang !== 'en') t = t.replace('.', ','); return lang === 'en' ? cur + t : `${t} ${cur}`; };
  // 2.19: сертификат — остаток из номинала; срок — отдельной строкой.
  if (card.type === 'gift') {
    const until = /^\d{4}-\d{2}-\d{2}/.test(String(card.expires_at || '')) ? String(card.expires_at).slice(0, 10).split('-').reverse().join('.') : '';
    return { header: W.hBalance, body: `${money(card.gift_balance)} / ${money(card.gift_amount)}`, rule: until ? { header: W.hUntil, body: until } : null };
  }
  if (card.type === 'discount') return { header: W.hDiscount, body: `-${Number(card.discount_percent) || 0}%` };
  if (card.type === 'spend') {
    const acc = money(card.spend_accumulated);
    const bonus = Math.max(0, Math.round(Number(card.bonus_balance) || 0));
    const pts = Math.max(1, Math.round(Number(card.spend_bonus_points) || 1));
    // С 2.17: бонусы копятся — за каждые «порог» денег клиент получает N бонусов (2000 при пороге 500 → 4 × N).
    return { header: W.hSpent, body: Number(card.spend_target) > 0 ? `${acc} / ${money(card.spend_target)}` : acc,
      bonus: Number(card.spend_target) > 0 ? { header: W.hBonus, body: String(bonus) } : null,
      rule: Number(card.spend_target) > 0 ? { header: W.hRule, body: `${money(card.spend_target)} → +${pts}` } : null };
  }
  return { header: W.hProgress, body: `${Number(card.stamp_count) || 0} / ${Number(card.stamp_target) || 0}` };
}

// Уровень клиента (2.19, если у заведения включены привилегии уровней).
function tierLabel(t) { return t === 'gold' ? '🥇 GOLD' : t === 'silver' ? '🥈 SILVER' : t === 'basic' ? 'BASIC' : ''; }
// Координаты заведения для «Wallet рядом» (2.19).
function cleanGeo(g) {
  if (!g || typeof g !== 'object') return null;
  const lat = Number(g.lat), lng = Number(g.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, text: clean(String(g.text || '').replace(/[\u0000-\u001f<>]/g, ' ').trim(), 120) };
}
// Текст для экрана блокировки iPhone рядом с заведением: свой или прогресс карты.
function nearText(card, lang, geo, currency) {
  if (geo && geo.text) return geo.text;
  const N = { ru: { st: (n) => `Ещё ${n} до подарка — заходите!`, ready: 'Подарок ждёт вас — заходите!', bonus: (n) => `У вас ${n} бонусов — заходите!`, gift: (m) => `На сертификате ${m} — заходите!`, any: 'Вы рядом — заходите!' },
    uk: { st: (n) => `Ще ${n} до подарунка — заходьте!`, ready: 'Подарунок чекає — заходьте!', bonus: (n) => `У вас ${n} бонусів — заходьте!`, gift: (m) => `На сертифікаті ${m} — заходьте!`, any: 'Ви поруч — заходьте!' },
    sk: { st: (n) => `Ešte ${n} do darčeka — zastavte sa!`, ready: 'Darček na vás čaká — zastavte sa!', bonus: (n) => `Máte ${n} bodov — zastavte sa!`, gift: (m) => `Na poukážke máte ${m} — zastavte sa!`, any: 'Ste blízko — zastavte sa!' },
    en: { st: (n) => `${n} more to your reward — drop in!`, ready: 'Your reward is waiting — drop in!', bonus: (n) => `You have ${n} points — drop in!`, gift: (m) => `${m} on your gift card — drop in!`, any: 'You are nearby — drop in!' } }[lang] || null;
  const T = N || { st: (n) => `${n} more to your reward`, ready: 'Your reward is waiting', bonus: (n) => `${n} points`, gift: (m) => m, any: 'You are nearby' };
  if (card.type === 'stamp') { const left = (Number(card.stamp_target) || 0) - (Number(card.stamp_count) || 0); return left > 0 ? T.st(left) : T.ready; }
  if (card.type === 'spend' && Number(card.bonus_balance) > 0) return T.bonus(Math.round(Number(card.bonus_balance)));
  if (card.type === 'gift') { const cur = CUR[currency] || '€'; return T.gift(lang === 'en' ? cur + (Number(card.gift_balance) || 0) : `${Number(card.gift_balance) || 0} ${cur}`); }
  return T.any;
}

// 2.20: «Приведи друга» — личная ссылка гостя (только на страницу регистрации этого сайта).
function cleanInvite(u) { const s = String(u || ''); return /^https:\/\/[a-z0-9.-]+\/[jr]\/[a-z0-9-]{3,48}\?ref=[A-Z0-9]{4,12}$/.test(s) && (s.startsWith(SITE_URL + '/j/') || s.startsWith(SITE_URL + '/r/')) ? s : ''; }
// design — из _walletDesign.getDesignInfo(): свой логотип, баннер и цвет фона заведения (если есть).
function buildObject(licenseKey, card, brand, design) {
  const lang = TEXT[card.lang] ? card.lang : 'en';
  const W = TEXT[lang];
  const { classId, objectId } = ids(licenseKey, card.code);
  const color = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#b8862d';
  // Сама карта — тёмная графитовая, как в программе; фирменный цвет — в акцентах баннера.
  const passBg = design && /^#[0-9a-fA-F]{6}$/.test(design.bg || '') ? design.bg : '#20252d';
  const D = require('./_walletDesign');
  const logoUri = design && design.hasLogo ? D.assetUrl(design, 'logo') : `${SITE_URL}/logo.png`;
  const p = progress(card, lang, brand.currency);
  const typeName = card.type === 'gift' ? W.gift : card.type === 'discount' ? W.discount : card.type === 'spend' ? W.spend : W.stamp;
  const tier = tierLabel(card.tier);
  return {
    classId,
    object: {
      id: objectId,
      classId,
      state: 'ACTIVE',
      hexBackgroundColor: passBg,
      logo: { sourceUri: { uri: logoUri }, contentDescription: { defaultValue: { language: lang, value: clean(brand.name || 'Loya', 60) } } },
      heroImage: { sourceUri: { uri: heroImageUrl(card, brand, lang, design) }, contentDescription: { defaultValue: { language: lang, value: clean(brand.name || 'Loya', 60) } } },
      cardTitle: { defaultValue: { language: lang, value: clean(brand.name || 'Loya', 60) } },
      subheader: { defaultValue: { language: lang, value: clean(card.title || typeName, 60) } },
      header: { defaultValue: { language: lang, value: clean(card.client_name || typeName, 60) } },
      textModulesData: [{ id: 'progress', header: p.header, body: p.body }].concat(p.bonus ? [{ id: 'bonus', header: p.bonus.header, body: p.bonus.body }] : [], tier ? [{ id: 'tier', header: W.hTier, body: tier }] : [], p.rule ? [{ id: 'rule', header: p.rule.header, body: p.rule.body }] : []),
      ...(cleanInvite(card.invite_url) ? { linksModuleData: { uris: [{ id: 'invite', uri: cleanInvite(card.invite_url), description: `🤝 ${W.hInvite} — ${W.inviteDesc}` }] } } : {}),
      barcode: { type: 'QR_CODE', value: clean(card.code, 80), alternateText: clean(card.code, 80) }
    }
  };
}

// OAuth-токен сервисного аккаунта для обновления уже сохранённых карт.
let cachedToken = null;
async function accessToken(sa) {
  if (cachedToken && cachedToken.exp > Date.now() + 60000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(sa, {
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('token_error');
  cachedToken = { value: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

// ---- Запись карты в Google (REST) ----
const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1';
async function gcall(token, method, path, body) {
  const r = await fetch(`${WALLET_API}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let msg = '';
  if (!r.ok) { try { const j = await r.json(); msg = (j && j.error && j.error.message) || ''; } catch (e) { /* не JSON */ } }
  return { ok: r.ok, status: r.status, message: String(msg).slice(0, 220) };
}
// Создаёт или обновляет карту. Если Google отклоняет карту из-за картинки-баннера (например, она
// временно недоступна), пробуем без баннера: лучше карта без картинки, чем ошибка у клиента.
async function putObject(token, object) {
  async function once(obj) {
    const r = await gcall(token, 'POST', 'genericObject', obj);
    if (r.status === 409) return gcall(token, 'PATCH', `genericObject/${encodeURIComponent(obj.id)}`, obj);
    return r;
  }
  let r = await once(object);
  if (!r.ok && r.status >= 400 && r.status < 500 && object.heroImage) {
    const bare = { ...object }; delete bare.heroImage;
    const r2 = await once(bare);
    if (r2.ok) return { ...r2, heroDropped: true, heroError: r.message };
    return { ...r2, message: r2.message || r.message };
  }
  return r;
}
async function putClass(token, classId) {
  const r = await gcall(token, 'POST', 'genericClass', { id: classId });
  return r.status === 409 ? { ok: true, status: 200, message: '' } : r;   // класс уже есть — это нормально
}

// Google Wallet: места заведения на классе карт — Google сам покажет карту рядом (если поддерживает для этого типа).
// Ошибку не считаем фатальной: карта без мест всё равно работает.
async function putClassLocations(token, classId, geo) {
  if (!geo) return { skipped: true };
  try { return await gcall(token, 'PATCH', `genericClass/${encodeURIComponent(classId)}`, { id: classId, merchantLocations: [{ latitude: geo.lat, longitude: geo.lng }] }); }
  catch (e) { return { ok: false }; }
}

module.exports = { progress, TEXT, putObject, putClass, putClassLocations, serviceAccount, signJwt, checkLicense, buildObject, accessToken, tierLabel, cleanGeo, nearText , cleanInvite };
