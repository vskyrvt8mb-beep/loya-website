// POST /api/create-checkout-session — вызывается со страницы pricing.html, когда
// человек нажимает "Оформить подписку". Создаёт сессию оплаты в Stripe (готовая,
// размещённая у Stripe страница — вводить номер карты на нашей стороне не нужно
// и не стоит, за безопасность карт целиком отвечает сам Stripe) и возвращает на неё
// ссылку для редиректа.
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Защита от злоупотреблений: лимиты по IP и по email (общий счётчик в Supabase, см. _ratelimit.js), проверка формата email и источника запроса.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const RL = require('./_ratelimit');
// Запрос должен идти с нашего сайта: заголовок Origin (его ставит браузер) совпадает с хостом
// или с адресом из PUBLIC_URL. Запросы без Origin (curl и т.п.) не пропускаем.
function sameOrigin(req) {
  const origin = String((req.headers && req.headers.origin) || '');
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const allowed = new Set([String(req.headers.host || ''), 'loya-loyalty.com', 'www.loya-loyalty.com']);
    if (process.env.PUBLIC_URL) allowed.add(new URL(process.env.PUBLIC_URL).host);
    return allowed.has(host);
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!sameOrigin(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const ip = RL.clientIp(req);
  if (await RL.limited('checkout-ip:' + ip, 10, 3600e3)) {
    res.status(429).json({ error: 'too_many' });
    return;
  }

  try {
    const { lang, tier: rawTier } = req.body || {};
    const email = typeof (req.body || {}).email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const tier = rawTier === 'pro' ? 'pro' : 'starter';
    // Язык сайта — чтобы после оплаты (или отмены) человек вернулся на свой язык.
    const safeLang = ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'en';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'bad_email' });
      return;
    }
    // Один адрес — не больше 3 сессий за 10 минут.
    if (await RL.limited('checkout-em:' + email, 3, 600e3)) {
      res.status(429).json({ error: 'too_many' });
      return;
    }

    const priceId = tier === 'pro' ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID;
    if (!priceId || !process.env.STRIPE_SECRET_KEY) {
      res.status(503).json({ error: 'not_configured' });
      return;
    }
    const base = process.env.PUBLIC_URL || 'https://loya-loyalty.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Язык — в данные сессии: по нему вебхук пришлёт письмо с ключом на языке клиента.
      metadata: { lang: safeLang, tier },
      // Для бизнес-клиентов: поле для налогового номера (VAT ID) в счёте. Включается переменной STRIPE_COLLECT_TAX_ID=1.
      ...(process.env.STRIPE_COLLECT_TAX_ID === '1' ? { tax_id_collection: { enabled: true } } : {}),
      ...(process.env.STRIPE_BILLING_ADDRESS === 'required' ? { billing_address_collection: 'required' } : {}),
      // Пробный период теперь выдаётся в самой программе (14 дней, без карты), поэтому здесь
      // оплата сразу. При желании можно вернуть дни Stripe переменной STRIPE_TRIAL_DAYS.
      subscription_data: { ...(Number(process.env.STRIPE_TRIAL_DAYS) > 0 ? { trial_period_days: Math.min(30, Number(process.env.STRIPE_TRIAL_DAYS)) } : {}), metadata: { lang: safeLang, tier } },
      // {CHECKOUT_SESSION_ID} — плейсхолдер, который Stripe сам подставит в ссылку редиректа.
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}&lang=${safeLang}`,
      cancel_url: `${base}/pricing.html?lang=${safeLang}`,
      // Позволяет клиенту отменить подписку самому, без обращения к вам — Stripe сам
      // покажет ему защищённую страницу управления подпиской (Customer Portal нужно
      // один раз включить в настройках Stripe: Settings → Billing → Customer portal).
      allow_promotion_codes: true
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    // Подробности — только в журнал Vercel; клиенту внутренние тексты ошибок Stripe не показываем.
    console.error('[checkout]', err && err.message);
    res.status(500).json({ error: 'checkout_failed' });
  }
};
