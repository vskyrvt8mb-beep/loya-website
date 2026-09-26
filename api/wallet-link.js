// POST /api/wallet-link — программа Loya просит ссылку «Add to Google Wallet» для карты клиента.
// Тело: { licenseKey, card: { code, type, title, client_name, lang, stamp_count, stamp_target,
//         discount_percent, spend_accumulated, spend_target }, brand: { name, color, currency } }
// Ответ: { ok: true, link } или { error }.
//
// Карту сначала создаём (или обновляем) на стороне Google через REST API, а в ссылку кладём
// только её идентификатор. Так ссылка получается короткой (~600 символов) и надёжно
// открывается из письма в любом почтовом клиенте. Если REST по какой-то причине недоступен —
// отдаём «полную» ссылку со всеми данными карты внутри (тоже рабочую, но длиннее).
const W = require('./_wallet');
const API = 'https://walletobjects.googleapis.com/walletobjects/v1';

async function upsert(token, kind, body) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const r = await fetch(`${API}/${kind}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (r.ok) return true;
  if (r.status === 409) {
    // Уже есть — для карты обновляем данные, класс оставляем как есть.
    if (kind === 'genericClass') return true;
    const p = await fetch(`${API}/${kind}/${encodeURIComponent(body.id)}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
    return p.ok;
  }
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const { licenseKey, card, brand } = req.body || {};
    if (!card || !card.code) { res.status(400).json({ error: 'bad_request' }); return; }
    if (!(await W.checkLicense(licenseKey))) { res.status(403).json({ error: 'license_inactive' }); return; }
    const sa = W.serviceAccount();
    const { classId, object } = W.buildObject(licenseKey, card, brand || {});

    let payload;
    try {
      const token = await W.accessToken(sa);
      const okClass = await upsert(token, 'genericClass', { id: classId });
      const okObject = okClass && await upsert(token, 'genericObject', object);
      if (okObject) payload = { genericObjects: [{ id: object.id, classId }] };
    } catch (e) { /* ниже — запасной вариант */ }
    if (!payload) payload = { genericClasses: [{ id: classId }], genericObjects: [object] };

    const jwt = W.signJwt(sa, { iss: sa.client_email, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000), origins: [], payload });
    res.status(200).json({ ok: true, link: `https://pay.google.com/gp/v/save/${jwt}` });
  } catch (err) {
    res.status(err.message === 'wallet_not_configured' ? 503 : 500).json({ error: err.message });
  }
};
