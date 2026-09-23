// POST /api/webhook — Stripe сам вызывает этот адрес при каждом событии по подписке
// (успешная оплата, продление, неудачная попытка списания, отмена). Сюда же приходят
// уведомления при автосписании — это и есть механизм "нет оплаты → доступ выключается",
// без какого-либо участия человека.
//
// ВАЖНО: этот файл специально читает "сырое" (raw) тело запроса, а не JSON — подпись
// Stripe (заголовок stripe-signature) считается именно по сырым байтам, и малейшее
// изменение (даже просто JSON.parse + повторная сериализация) сделает проверку подписи
// недействительной. Без этой проверки кто угодно мог бы прислать поддельный запрос
// "оплата прошла" и получить бесплatный доступ — поэтому пропускать эту проверку нельзя
// никогда, даже "временно для теста".
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Отключаем автоматический разбор тела запроса Vercel — нужно именно сырое.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

// LOYA-XXXX-XXXX-XXXX — читаемый на глаз (клиент может продиктовать по телефону
// в поддержку), но с достаточной энтропией, чтобы не подобрать перебором.
function generateLicenseKey() {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `LOYA-${part()}-${part()}-${part()}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Неверная подпись:', err.message);
    res.status(400).send(`Webhook signature error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      // Успешная первая оплата — создаём новый лицензионный ключ.
      case 'checkout.session.completed': {
        const session = event.data.object;
        const licenseKey = generateLicenseKey();
        const email = (session.customer_details && session.customer_details.email) || session.customer_email || '';
        const { error } = await supabase.from('licenses').insert({
          license_key: licenseKey,
          email,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: 'active'
        });
        if (error) console.error('[webhook] Ошибка записи в базу:', error.message);
        break;
      }

      // Успешное продление (автосписание сработало) — снова активна, если вдруг
      // была помечена как просроченная после предыдущей неудачной попытки.
      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabase.from('licenses')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      // Списание не прошло (карта истекла, недостаточно средств и т.п.) — Stripe
      // обычно повторяет попытки автоматически несколько дней подряд (настраивается
      // в Stripe Dashboard → Settings → Subscriptions), и только если все попытки
      // не удались — подписка отменяется сама (см. customer.subscription.deleted ниже).
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await supabase.from('licenses')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      // Подписка отменена окончательно (клиент сам отменил, или Stripe исчерпал
      // все попытки списания) — блокируем доступ.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await supabase.from('licenses')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      default:
        // Остальные типы событий Stripe нам не важны — игнорируем молча.
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] Ошибка обработки:', err.message);
    res.status(500).json({ error: err.message });
  }
};
