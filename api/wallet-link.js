// POST /api/wallet-link — программа Loya просит ссылку «Добавить в Google Wallet» для карты клиента.
// Тело: { licenseKey, card: { code, type, title, client_name, lang, stamp_count, stamp_target,
//         discount_percent, spend_accumulated, spend_target }, brand: { name, color, currency } }
// Ответ: { ok: true, link } или { error }.
const W = require('./_wallet');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const { licenseKey, card, brand } = req.body || {};
    if (!card || !card.code) { res.status(400).json({ error: 'bad_request' }); return; }
    if (!(await W.checkLicense(licenseKey))) { res.status(403).json({ error: 'license_inactive' }); return; }
    const sa = W.serviceAccount();
    const { classId, object } = W.buildObject(licenseKey, card, brand || {});
    const jwt = W.signJwt(sa, {
      iss: sa.client_email, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000), origins: [],
      // Класс передаём прямо в ссылке — Google создаст его сам при первом сохранении.
      payload: { genericClasses: [{ id: classId }], genericObjects: [object] }
    });
    res.status(200).json({ ok: true, link: `https://pay.google.com/gp/v/save/${jwt}` });
  } catch (err) {
    res.status(err.message === 'wallet_not_configured' ? 503 : 500).json({ error: err.message });
  }
};
