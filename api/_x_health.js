// POST/GET /api/health — «диагностика»: что на этом сервере настроено. Секретов не отдаёт —
// только да/нет. Нужна кнопке «Проверить связь с сервером» в программе (раздел «Подписка»).
const { supabase } = require('./_mail');

const SITE_VERSION = '2.7.0';
let priceCache = { at: 0, v: null };
// Режим Stripe определяем по префиксу ключа (sk_live_… / sk_test_…), а цену проверяем запросом к Stripe:
// частая ошибка при запуске — боевой ключ с тестовой ценой (или наоборот), оплата тогда просто не открывается.
async function stripeInfo(out) {
  const key = process.env.STRIPE_SECRET_KEY || '';
  out.stripeMode = /^(sk|rk)_live_/.test(key) ? 'live' : /^(sk|rk)_test_/.test(key) ? 'test' : (key ? 'unknown' : 'none');
  out.stripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET;
  out.stripePriceSet = !!process.env.STRIPE_PRICE_ID;
  out.stripePortal = /^https:\/\/billing\.stripe\.com\//.test(process.env.STRIPE_PORTAL_URL || '');
  out.stripePrice = null;
  if ((out.stripeMode === 'live' || out.stripeMode === 'test') && out.stripePriceSet) {
    if (priceCache.v && Date.now() - priceCache.at < 60000 && priceCache.key === key + process.env.STRIPE_PRICE_ID) { out.stripePrice = priceCache.v; return; }
    try {
      const stripe = require('stripe')(key);
      const price = await Promise.race([stripe.prices.retrieve(process.env.STRIPE_PRICE_ID), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4500))]);
      out.stripePrice = { ok: true, livemode: !!price.livemode, active: !!price.active, recurring: !!price.recurring, interval: price.recurring ? price.recurring.interval : null, amount: price.unit_amount, currency: price.currency };
    } catch (e) { out.stripePrice = { ok: false, error: String((e && (e.code || e.type || e.message)) || 'error').slice(0, 40) }; }
    priceCache = { at: Date.now(), v: out.stripePrice, key: key + process.env.STRIPE_PRICE_ID };
  }
}

async function collect(body) {
  const out = {
    ok: true,
    time: new Date().toISOString(),
    publicUrl: process.env.PUBLIC_URL || '',
    wallet: !!(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT),
    walletKeyValid: false,
    mail: !!(process.env.MAIL_USER && process.env.MAIL_PASS),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    apple: (() => { try { return require('./_apple').configured(); } catch (e) { return false; } })(),
    db: false
  };
  try { const sa = JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT || ''); out.walletKeyValid = !!(sa && sa.client_email && sa.private_key); } catch (e) { /* не JSON */ }
  try { const { error } = await supabase.from('licenses').select('license_key').limit(1); out.db = !error; } catch (e) { out.db = false; }
  // Таблицы базы: если их не создали (не выполнен schema.sql), функции регистрации по ссылке, доступа
  // из дома и счётчика писем работать не будут — показываем, каких именно не хватает.
  out.tablesMissing = [];
  if (out.db) {
    for (const t of ['licenses', 'mail_log', 'business_profiles', 'online_registrations', 'owner_access', 'owner_commands', 'apple_passes', 'apple_registrations', 'pos_keys', 'pos_events', 'sync_devices', 'sync_entities', 'sync_applied', 'owner_logins']) {
      try { const { error } = await supabase.from(t).select('*').limit(1); if (error) out.tablesMissing.push(t); } catch (e) { out.tablesMissing.push(t); }
    }
    // Новые колонки для админки (бесплатный доступ, блокировка, «последний вход»).
    if (!out.tablesMissing.includes('licenses')) {
      try { const { error } = await supabase.from('licenses').select('plan, banned, note, free_until, last_seen_at, app_version, livemode').limit(1); if (error) out.tablesMissing.push('licenses (новые колонки)'); } catch (e) { out.tablesMissing.push('licenses (новые колонки)'); }
    }
  }
  out.siteVersion = SITE_VERSION;
  // Баннер карты: пробуем нарисовать тестовую картинку — так видно, что шрифты и рисовалка на месте.
  out.hero = false; out.heroError = '';
  try {
    const { renderHeroPng } = require('./_walletHero');
    const png = renderHeroPng({ card: { type: 'stamp', stamp_count: 3, stamp_target: 8 }, brand: { name: 'Café', color: '#d4af37' }, niche: 'coffee', lang: 'ru' });
    out.hero = !!(png && png.length > 1000);
    if (!out.hero) out.heroError = 'empty';
  } catch (e) { out.heroError = String((e && e.message) || e).slice(0, 120); }
  const key = typeof body.licenseKey === 'string' ? body.licenseKey.trim().slice(0, 100) : '';
  if (key && out.db) {
    try {
      const L = require('./_license');
      out.license = L.licenseState(await L.getLicense(key));
    } catch (e) { out.license = 'unknown'; }
  }
  return out;
}

module.exports = async (req, res) => {
  const body = req.method === 'POST' ? (req.body || {}) : {};
  const out = await collect(body);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
};
module.exports.collect = collect;
module.exports.stripeInfo = stripeInfo;
