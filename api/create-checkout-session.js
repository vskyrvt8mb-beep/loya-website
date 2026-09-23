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
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'email обязателен' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      // {CHECKOUT_SESSION_ID} — плейсхолдер, который Stripe сам подставит в ссылку редиректа.
      success_url: `${process.env.PUBLIC_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.PUBLIC_URL}/pricing.html`,
      // Позволяет клиенту отменить подписку самому, без обращения к вам — Stripe сам
      // покажет ему защищённую страницу управления подпиской (Customer Portal нужно
      // один раз включить в настройках Stripe: Settings → Billing → Customer portal).
      allow_promotion_codes: true
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
