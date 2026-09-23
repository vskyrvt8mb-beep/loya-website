// GET /api/get-license-by-session?session_id=... — вызывается со страницы success.html
// сразу после того, как Stripe перенаправил туда клиента после успешной оплаты.
// Проблема, которую это решает: вебхук (api/webhook.js) может обработаться на секунду
// позже, чем клиент долистает до страницы успеха — поэтому здесь несколько попыток
// с паузой, а не один мгновенный запрос.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      res.status(400).json({ error: 'missing session_id' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    let license = null;
    for (let attempt = 0; attempt < 6 && !license; attempt++) {
      const { data } = await supabase
        .from('licenses')
        .select('license_key')
        .eq('stripe_subscription_id', session.subscription)
        .single();
      if (data) { license = data; break; }
      await wait(1000);
    }

    res.status(200).json({
      licenseKey: license ? license.license_key : null,
      email: (session.customer_details && session.customer_details.email) || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
