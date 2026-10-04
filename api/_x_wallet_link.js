// POST /api/wallet-link — программа Loya просит ссылку «Add to Google Wallet» для карты клиента.
// Тело: { licenseKey, card: { code, type, title, client_name, lang, stamp_count, stamp_target,
//         discount_percent, spend_accumulated, spend_target }, brand: { name, color, currency, niche } }
// Ответ: { ok: true, link } или { error, detail? }.
//
// Карту сначала создаём (или обновляем) на стороне Google через REST API, а в ссылку кладём только
// её идентификатор — ссылка короткая и надёжно открывается из письма. Если Google ЯВНО отклонил
// карту (ошибка 4xx), мы не отдаём «запасную» ссылку — она всё равно закончилась бы страницей
// «Произошла ошибка» у клиента, — а возвращаем причину от Google (detail), чтобы её было видно в программе.
// Запасная ссылка со всеми данными внутри остаётся только на случай сбоя связи с Google (сеть, 5xx).
const W = require('./_wallet');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const { licenseKey, card, brand } = req.body || {};
    if (!card || !card.code) { res.status(400).json({ error: 'bad_request' }); return; }
    if (!(await W.checkLicense(licenseKey))) { res.status(403).json({ error: 'license_inactive' }); return; }
    const sa = W.serviceAccount();
    const { classId, object } = W.buildObject(licenseKey, card, brand || {});

    let payload, rejected = null, heroDropped = false;
    try {
      const token = await W.accessToken(sa);
      const c = await W.putClass(token, classId);
      if (!c.ok) { if (c.status >= 400 && c.status < 500) rejected = `class: ${c.status} ${c.message}`; }
      else {
        const o = await W.putObject(token, object);
        if (o.ok) { payload = { genericObjects: [{ id: object.id, classId }] }; heroDropped = !!o.heroDropped; }
        else if (o.status >= 400 && o.status < 500) rejected = `${o.status} ${o.message}`;
      }
    } catch (e) { /* сеть/токен — ниже запасной вариант */ }
    if (rejected) { res.status(200).json({ error: 'wallet_rejected', detail: rejected.slice(0, 240) }); return; }
    if (!payload) payload = { genericClasses: [{ id: classId }], genericObjects: [object] };

    const jwt = W.signJwt(sa, { iss: sa.client_email, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000), origins: [], payload });
    res.status(200).json({ ok: true, link: `https://pay.google.com/gp/v/save/${jwt}`, heroDropped });
  } catch (err) {
    res.status(err.message === 'wallet_not_configured' ? 503 : 500).json({ error: err.message === 'wallet_not_configured' ? 'wallet_not_configured' : 'server_error' });
  }
};
