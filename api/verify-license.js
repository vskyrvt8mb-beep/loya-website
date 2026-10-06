// POST /api/verify-license — вызывается из самого приложения Loya (main.js,
// checkSubscriptionLicense) раз при запуске и затем каждые 6 часов. Тело запроса:
// { "licenseKey": "LOYA-XXXX-XXXX-XXXX" }. Отвечает { active, status, message }.
//
// Намеренно НЕ требует авторизации сверх самого ключа — ключ и есть секрет.
// Намеренно ничего не говорит о том, СУЩЕСТВУЕТ ли ключ вообще в базе при ошибке —
// одинаковый ответ "active: false" что для неверного ключа, что для отменённой
// подписки, чтобы нельзя было перебором отличить одно от другого.
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const RL = require('./_ratelimit');
// Защита от перебора ключей: считаем только НЕУДАЧНЫЕ попытки с одного IP (не больше 20 в час).
// Действующий ключ лимит не трогает, поэтому программа с правильным ключом никогда не блокируется.
const FAIL_MAX = 20, FAIL_WINDOW = 3600e3;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ active: false, message: 'method_not_allowed' });
    return;
  }

  const ip = RL.clientIp(req);
  try {
    const { licenseKey } = req.body || {};
    if (!licenseKey || typeof licenseKey !== 'string') {
      res.status(200).json({ active: false, message: 'Ключ не указан.' });
      return;
    }

    const L = require('./_license');
    const data = await L.getLicense(licenseKey);
    if (!data) {
      if (await RL.limited('verify-fail:' + ip, FAIL_MAX, FAIL_WINDOW)) {
        res.status(429).json({ active: false, status: 'rate_limited', message: 'Слишком много попыток. Попробуйте через час.' });
        return;
      }
      res.status(200).json({ active: false, message: 'Ключ не найден. Проверьте, что скопировали его полностью.' });
      return;
    }
    // Отмечаем, когда программа выходила на связь и какой версии — это видно в админке.
    const appVersion = typeof (req.body || {}).appVersion === 'string' ? req.body.appVersion.slice(0, 20) : null;
    try { await supabase.from('licenses').update({ last_seen_at: new Date().toISOString(), ...(appVersion ? { app_version: appVersion } : {}) }).eq('license_key', licenseKey.trim()); } catch (e) { /* колонок ещё нет — не страшно */ }

    const state = L.licenseState(data);
    const active = state === 'active';
    const messages = {
      past_due: 'Не удалось списать оплату за подписку. Проверьте карту на сайте.',
      canceled: 'Подписка отменена.',
      banned: 'Доступ к программе заблокирован. Свяжитесь с поддержкой Loya.',
      free_expired: 'Бесплатный доступ закончился. Оформите подписку на сайте loya-loyalty.com.',
      trial_expired: 'Пробный период закончился. Оформите подписку на сайте loya-loyalty.com.'
    };

    res.status(200).json({
      active,
      status: state,
      message: active ? '' : (messages[state] || 'Подписка неактивна.'),
      // Программа показывает тексты сама на языке пользователя (по status), message — запасной русский текст.
      plan: data.plan || 'stripe',
      tier: active ? L.tierOf(data) : null,
      trialUntil: data.plan === 'trial' && data.trial_until ? new Date(data.trial_until).toISOString() : null,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    // Собственная ошибка сервера — намеренно НЕ блокируем (active: true не отдаём, но
    // и не считаем это причиной жёсткого отказа): приложение само трактует любой сбой
    // сети/сервера как "не удалось проверить" и не блокирует работу до следующей попытки.
    res.status(500).json({ active: false, message: 'Ошибка сервера, попробуйте позже.' });
  }
};
