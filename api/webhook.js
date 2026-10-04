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
// В новых версиях API Stripe (с 2025 года) у счёта (invoice) пропало поле `subscription`: номер подписки
// теперь лежит в `parent.subscription_details.subscription`. У новых аккаунтов вебхуки приходят именно
// в новом виде — без этой функции события «оплачено» и «платёж не прошёл» молча ничего бы не меняли.
function subscriptionIdOf(invoice) {
  const pick = (v) => (v && typeof v === 'object' ? v.id : v) || null;
  return pick(invoice.subscription)
    || pick(invoice.parent && invoice.parent.subscription_details && invoice.parent.subscription_details.subscription)
    || pick(invoice.lines && invoice.lines.data && invoice.lines.data[0] && invoice.lines.data[0].parent && invoice.lines.data[0].parent.subscription_item_details && invoice.lines.data[0].parent.subscription_item_details.subscription)
    || null;
}

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
        if (session.mode !== 'subscription' || !session.subscription) break;   // нас интересуют только подписки
        // Stripe может прислать одно событие дважды (повтор после сбоя) — второй ключ создавать нельзя:
        // иначе у клиента окажется два ключа, а страница успеха не сможет выбрать нужный.
        const { data: existing } = await supabase.from('licenses').select('license_key').eq('stripe_subscription_id', session.subscription).limit(1);
        if (existing && existing.length) break;
        const email = (session.customer_details && session.customer_details.email) || session.customer_email || '';
        const tier = (session.metadata && session.metadata.tier === 'pro') ? 'pro' : 'starter';
        const lang = (session.metadata && session.metadata.lang) || (session.locale && String(session.locale).slice(0, 2)) || 'en';
        // Был пробный ключ на этот email — продолжаем с ним: программа уже настроена, ключ менять не нужно.
        if (email) {
          const pattern = String(email).trim().toLowerCase().replace(/[\\%_]/g, '\\$&');
          const { data: trials } = await supabase.from('licenses').select('license_key').eq('plan', 'trial').ilike('email', pattern).limit(1);
          if (trials && trials[0]) {
            const key = trials[0].license_key;
            let { error: e1 } = await supabase.from('licenses').update({ plan: 'stripe', tier, status: 'active', stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, livemode: !!event.livemode, updated_at: new Date().toISOString() }).eq('license_key', key);
            if (e1 && /livemode/i.test(String(e1.message))) ({ error: e1 } = await supabase.from('licenses').update({ plan: 'stripe', tier, status: 'active', stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, updated_at: new Date().toISOString() }).eq('license_key', key));
            if (e1) { console.error('[webhook] Не удалось перевести пробный ключ:', e1.message); throw new Error('db_update_failed'); }
            try { await require('./_billing').sendKeyEmail({ email, key, lang, kind: 'upgraded' }); } catch (e) { console.error('[webhook] Письмо не отправилось:', e.message); }
            break;
          }
        }
        const licenseKey = generateLicenseKey();
        const row = { license_key: licenseKey, email, tier, stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, status: 'active' };
        // livemode: ключ создан по настоящей оплате (true) или по тестовой (false) — в админке тестовые видно и можно удалить.
        let { error } = await supabase.from('licenses').insert({ ...row, livemode: !!event.livemode });
        if (error && /livemode/i.test(String(error.message))) ({ error } = await supabase.from('licenses').insert(row));   // колонку ещё не добавили в базе
        if (error) {
          if (error.code === '23505') break;   // параллельная копия этого же события уже создала ключ
          console.error('[webhook] Ошибка записи в базу:', error.message);
          throw new Error('db_insert_failed');    // 500 → Stripe повторит доставку позже
        }
        // Ключ — на почту: страницу успеха клиент может закрыть, не скопировав ключ.
        if (email) {
          try { await require('./_billing').sendKeyEmail({ email, key: licenseKey, lang }); }
          catch (e) { console.error('[webhook] Письмо с ключом не отправилось:', e.message); }
        }
        break;
      }

      // Любое изменение подписки: приводим статус ключа к статусу в Stripe. Это страхует от настройки
      // «если все попытки списания не удались — пометить как неоплаченную» (тогда «удалена» не приходит).
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const map = { active: 'active', trialing: 'active', past_due: 'past_due', unpaid: 'canceled', canceled: 'canceled', incomplete_expired: 'canceled' };
        const status = map[sub.status];
        // Сменили тариф в кабинете Stripe (Starter ↔ Pro) — меняем и у ключа.
        const item = sub.items && sub.items.data && sub.items.data[0];
        const newTier = require('./_license').tierForPrice(item && item.price && item.price.id);
        const upd = { updated_at: new Date().toISOString() };
        if (status) upd.status = status;
        if (newTier) upd.tier = newTier;
        if (status || newTier) await supabase.from('licenses').update(upd).eq('stripe_subscription_id', sub.id);
        break;
      }

      // Успешное продление (автосписание сработало) — снова активна, если вдруг
      // была помечена как просроченная после предыдущей неудачной попытки.
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subId = subscriptionIdOf(invoice);
        if (subId) {
          await supabase.from('licenses')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId);
        }
        break;
      }

      // Списание не прошло (карта истекла, недостаточно средств и т.п.) — Stripe
      // обычно повторяет попытки автоматически несколько дней подряд (настраивается
      // в Stripe Dashboard → Settings → Subscriptions), и только если все попытки
      // не удались — подписка отменяется сама (см. customer.subscription.deleted ниже).
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = subscriptionIdOf(invoice);
        if (subId) {
          await supabase.from('licenses')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId);
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
    res.status(500).json({ error: 'webhook_failed' });
  }
};
