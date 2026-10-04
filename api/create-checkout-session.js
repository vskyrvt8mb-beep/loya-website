// POST /api/create-checkout-session — вызывается со страницы pricing.html, когда
// человек нажимает "Оформить подписку". Создаёт сессию оплаты в Stripe (готовая,
// размещённая у Stripe страница — вводить номер карты на нашей стороне не нужно
// и не стоит, за безопасность карт целиком отвечает сам Stripe) и возвращает на неё
// ссылку для редиректа.
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { email, lang, tier: rawTier } = req.body || {};
    const tier = rawTier === 'pro' ? 'pro' : 'starter';
    // Язык сайта — чтобы после оплаты (или отмены) человек вернулся на свой язык.
    const safeLang = ['ru', 'uk', 'sk', 'en'].includes(lang) ? lang : 'en';
    if (!email) {
      res.status(400).json({ error: 'email обязателен' });
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
