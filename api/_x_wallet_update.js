// POST /api/wallet-update — после скана программа сообщает новый прогресс карты, и карта в
// Google Wallet у клиента обновляется сама (штампы, сумма). Если клиент карту не сохранял —
// Google ответит 404, это нормально.
const W = require('./_wallet');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const { licenseKey, card, brand } = req.body || {};
    if (!card || !card.code) { res.status(400).json({ error: 'bad_request' }); return; }
    if (!(await W.checkLicense(licenseKey))) { res.status(403).json({ error: 'license_inactive' }); return; }
    const sa = W.serviceAccount();
    const { object } = W.buildObject(licenseKey, card, brand || {});
    const token = await W.accessToken(sa);
    const patchBody = (withHero) => ({ textModulesData: object.textModulesData, header: object.header, cardTitle: object.cardTitle, hexBackgroundColor: object.hexBackgroundColor, ...(withHero ? { heroImage: object.heroImage } : {}) });
    const path = `genericObject/${encodeURIComponent(object.id)}`;
    const gcall = async (b) => fetch(`https://walletobjects.googleapis.com/walletobjects/v1/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    let r = await gcall(patchBody(true));
    // Баннер не приняли — обновляем текст без него: прогресс на карте важнее картинки.
    if (!r.ok && r.status >= 400 && r.status < 500 && r.status !== 404) r = await gcall(patchBody(false));
    if (r.status === 404) { res.status(200).json({ ok: true, saved: false }); return; }
    if (!r.ok) { res.status(502).json({ error: 'google_' + r.status }); return; }
    res.status(200).json({ ok: true, saved: true });
  } catch (err) {
    res.status(err.message === 'wallet_not_configured' ? 503 : 500).json({ error: err.message === 'wallet_not_configured' ? 'wallet_not_configured' : 'server_error' });
  }
};
