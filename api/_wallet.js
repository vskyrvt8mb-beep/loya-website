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
  if (!licenseKey || typeof licenseKey !== 'string') return false;
  const { data, error } = await supabase.from('licenses').select('status').eq('license_key', licenseKey.trim()).single();
  return !error && data && data.status === 'active';
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
  ru: { discount: 'Скидочная карта', stamp: 'Карта лояльности', spend: 'Накопительная карта', hDiscount: 'Скидка', hProgress: 'Штампы', hSpent: 'Накоплено' },
  uk: { discount: 'Знижкова картка', stamp: 'Картка лояльності', spend: 'Накопичувальна картка', hDiscount: 'Знижка', hProgress: 'Штампи', hSpent: 'Накопичено' },
  sk: { discount: 'Zľavová karta', stamp: 'Vernostná karta', spend: 'Vernostná karta na nákupy', hDiscount: 'Zľava', hProgress: 'Pečiatky', hSpent: 'Nazbierané' },
  en: { discount: 'Discount card', stamp: 'Loyalty card', spend: 'Spend card', hDiscount: 'Discount', hProgress: 'Stamps', hSpent: 'Collected' }
};
const CUR = { EUR: '€', USD: '$', RUB: '₽', UAH: '₴' };

function clean(v, max) { return String(v == null ? '' : v).slice(0, max); }

// Публичный адрес сайта — им подписаны ссылки на картинку баннера (heroImage), которую
// у себя на серверах скачивает и кеширует сам Google.
const SITE_URL = process.env.PUBLIC_URL || 'https://loya-website-one.vercel.app';

// Ссылка на «баннер» карты: своя картинка для каждого бизнеса (имя, цвет, вид бизнеса)
// и для текущего состояния карты клиента (сколько штампов уже есть, сколько накоплено).
// Картинку рисует /api/wallet-hero.png — она пересоздаётся заново при каждом изменении
// прогресса, потому что состояние закодировано прямо в адресе ссылки.
function heroImageUrl(card, brand, lang) {
  const q = new URLSearchParams({
    type: card.type, name: clean(brand.name || 'Loya', 60), color: brand.color || '', niche: brand.niche || 'other',
    currency: brand.currency || 'EUR', lang: ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'ru',
    v: String(card.stamp_count || 0) + '.' + String(card.spend_accumulated || 0) // меняет URL при каждом скане
  });
  if (card.type === 'stamp') { q.set('count', card.stamp_count || 0); q.set('target', card.stamp_target || 10); }
  else if (card.type === 'spend') { q.set('acc', card.spend_accumulated || 0); q.set('target', card.spend_target || 0); }
  else if (card.type === 'discount') { q.set('pct', card.discount_percent || 0); }
  return `${SITE_URL}/api/wallet-hero.png?${q.toString()}`;
}

// Прогресс карты для строки на пассе.
function progress(card, lang, currency) {
  const W = TEXT[lang] || TEXT.en;
  const cur = CUR[currency] || '€';
  const money = (v) => { const n = Math.round((Number(v) || 0) * 100) / 100; const t = Number.isInteger(n) ? String(n) : n.toFixed(2); return lang === 'en' ? cur + t : `${t} ${cur}`; };
  if (card.type === 'discount') return { header: W.hDiscount, body: `-${Number(card.discount_percent) || 0}%` };
  if (card.type === 'spend') {
    const acc = money(card.spend_accumulated);
    return { header: W.hSpent, body: Number(card.spend_target) > 0 ? `${acc} / ${money(card.spend_target)}` : acc };
  }
  return { header: W.hProgress, body: `${Number(card.stamp_count) || 0} / ${Number(card.stamp_target) || 0}` };
}

function buildObject(licenseKey, card, brand) {
  const lang = TEXT[card.lang] ? card.lang : 'en';
  const W = TEXT[lang];
  const { classId, objectId } = ids(licenseKey, card.code);
  const color = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#b8862d';
  // Сама карта — тёмная графитовая, как в программе; фирменный цвет — в акцентах баннера.
  const passBg = '#20252d';
  const p = progress(card, lang, brand.currency);
  const typeName = card.type === 'discount' ? W.discount : card.type === 'spend' ? W.spend : W.stamp;
  return {
    classId,
    object: {
      id: objectId,
      classId,
      state: 'ACTIVE',
      hexBackgroundColor: passBg,
      logo: { sourceUri: { uri: 'https://loya-website-one.vercel.app/logo.png' }, contentDescription: { defaultValue: { language: lang, value: 'Loya' } } },
      heroImage: { sourceUri: { uri: heroImageUrl(card, brand, lang) }, contentDescription: { defaultValue: { language: lang, value: clean(brand.name || 'Loya', 60) } } },
      cardTitle: { defaultValue: { language: lang, value: clean(brand.name || 'Loya', 60) } },
      subheader: { defaultValue: { language: lang, value: clean(card.title || typeName, 60) } },
      header: { defaultValue: { language: lang, value: clean(card.client_name || typeName, 60) } },
      textModulesData: [{ id: 'progress', header: p.header, body: p.body }],
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

module.exports = { serviceAccount, signJwt, checkLicense, buildObject, accessToken };
