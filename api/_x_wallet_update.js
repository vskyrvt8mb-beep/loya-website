// POST /api/wallet-update — после скана программа сообщает новый прогресс карты, и карта
// у клиента обновляется сама: в Google Wallet (PATCH объекта) и в Apple Wallet (push на iPhone).
// Если клиент карту никуда не сохранял — это нормально (ответ ok, saved:false).
const W = require('./_wallet');

async function googleUpdate(licenseKey, card, brand) {
  let sa; try { sa = W.serviceAccount(); } catch (e) { return { skipped: true }; }
  const design = await require('./_walletDesign').getDesignInfo(licenseKey);
  const { object } = W.buildObject(licenseKey, card, brand || {}, design);
  const token = await W.accessToken(sa);
  // Логотип и баннер тоже обновляем — так новый дизайн заведения доходит и до уже сохранённых карт.
  const patchBody = (withImages) => ({ textModulesData: object.textModulesData, header: object.header, cardTitle: object.cardTitle, hexBackgroundColor: object.hexBackgroundColor, ...(withImages ? { heroImage: object.heroImage, logo: object.logo } : {}) });
  const path = `genericObject/${encodeURIComponent(object.id)}`;
  const call = async (b) => fetch(`https://walletobjects.googleapis.com/walletobjects/v1/${path}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  let r = await call(patchBody(true));
  // Баннер не приняли — обновляем текст без него: прогресс на карте важнее картинки.
  if (!r.ok && r.status >= 400 && r.status < 500 && r.status !== 404) r = await call(patchBody(false));
  if (r.status === 404) return { saved: false };
  if (!r.ok) return { error: 'google_' + r.status };
  return { saved: true };
}

async function appleUpdate(licenseKey, card, brand) {
  const A = require('./_apple');
  if (!A.configured()) return { skipped: true };
  const { supabase } = require('./_license');
  const serial = A.serialFor(licenseKey, card.code);
  const { data: row } = await supabase.from('apple_passes').select('serial, card, brand').eq('serial', serial).maybeSingle();
  if (!row) return { saved: false };   // в Apple Wallet эту карту не добавляли
  const next = { ...(row.card || {}), stamp_count: Number(card.stamp_count) || 0, stamp_target: Number(card.stamp_target) || 0, discount_percent: Number(card.discount_percent) || 0,
    spend_accumulated: Number(card.spend_accumulated) || 0, spend_target: Number(card.spend_target) || 0, title: String(card.title || (row.card || {}).title || '').slice(0, 80) };
  await supabase.from('apple_passes').update({ card: next, updated_at: new Date().toISOString() }).eq('serial', serial);
  const { data: regs } = await supabase.from('apple_registrations').select('device_id, push_token').eq('serial', serial);
  const tokens = [...new Set((regs || []).map(r => r.push_token).filter(Boolean))];
  if (!tokens.length) return { saved: true, pushed: 0 };
  const results = await A.pushUpdate(A.config(), tokens);
  // 410 — устройство удалило карту или приложение: забываем этот токен.
  for (const r of results) if (r.status === 410) await supabase.from('apple_registrations').delete().eq('push_token', r.token).eq('serial', serial);
  return { saved: true, pushed: results.filter(r => r.status === 200).length };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const { licenseKey, card, brand } = req.body || {};
    if (!card || !card.code) { res.status(400).json({ error: 'bad_request' }); return; }
    if (!(await W.checkLicense(licenseKey))) { res.status(403).json({ error: 'license_inactive' }); return; }
    const [g, a] = await Promise.all([
      googleUpdate(licenseKey, card, brand).catch(() => ({ error: 'google_failed' })),
      appleUpdate(licenseKey, card, brand).catch(() => ({ error: 'apple_failed' }))
    ]);
    const saved = !!(g.saved || a.saved);
    if (!saved && g.error && !a.saved) { res.status(502).json({ error: g.error, apple: a }); return; }
    res.status(200).json({ ok: true, saved, google: g, apple: a });
  } catch (err) {
    res.status(500).json({ error: 'server_error' });
  }
};
