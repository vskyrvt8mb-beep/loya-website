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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ active: false, message: 'method_not_allowed' });
    return;
  }

  try {
    const { licenseKey } = req.body || {};
    if (!licenseKey || typeof licenseKey !== 'string') {
      res.status(200).json({ active: false, message: 'Ключ не указан.' });
      return;
    }

    const { data, error } = await supabase
      .from('licenses')
      .select('status')
      .eq('license_key', licenseKey.trim())
      .single();

    if (error || !data) {
      res.status(200).json({ active: false, message: 'Ключ не найден. Проверьте, что скопировали его полностью.' });
      return;
    }

    const active = data.status === 'active';
    const messages = {
      past_due: 'Не удалось списать оплату за подписку. Проверьте карту на сайте.',
      canceled: 'Подписка отменена.'
    };

    res.status(200).json({
      active,
      status: data.status,
      message: active ? '' : (messages[data.status] || 'Подписка неактивна.')
    });
  } catch (err) {
    // Собственная ошибка сервера — намеренно НЕ блокируем (active: true не отдаём, но
    // и не считаем это причиной жёсткого отказа): приложение само трактует любой сбой
    // сети/сервера как "не удалось проверить" и не блокирует работу до следующей попытки.
    res.status(500).json({ active: false, message: 'Ошибка сервера, попробуйте позже.' });
  }
};
