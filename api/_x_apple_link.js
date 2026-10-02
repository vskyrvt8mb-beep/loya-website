// POST /api/apple-link — программа просит ссылку «Добавить в Apple Wallet» для карты клиента.
// Тело — как у /api/wallet-link: { licenseKey, card, brand }. Ответ: { ok, link } или { error }.
const A = require('./_apple');
const { licenseActive, supabase } = require('./_license');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const { licenseKey, card, brand } = req.body || {};
    if (!card || !card.code || typeof licenseKey !== 'string') { res.status(400).json({ error: 'bad_request' }); return; }
    if (!A.configured()) { res.status(503).json({ error: 'apple_not_configured' }); return; }
    if (!(await licenseActive(licenseKey))) { res.status(403).json({ error: 'license_inactive' }); return; }
    const serial = A.serialFor(licenseKey, card.code);
    const clean = {
      code: String(card.code).slice(0, 80), type: ['stamp', 'discount', 'spend'].includes(card.type) ? card.type : 'stamp',
      title: String(card.title || '').slice(0, 80), client_name: String(card.client_name || '').slice(0, 100), lang: ['ru', 'uk', 'sk', 'en'].includes(card.lang) ? card.lang : 'en',
      stamp_count: Number(card.stamp_count) || 0, stamp_target: Number(card.stamp_target) || 0, discount_percent: Number(card.discount_percent) || 0,
      spend_accumulated: Number(card.spend_accumulated) || 0, spend_target: Number(card.spend_target) || 0
    };
    const b = brand || {};
    const cleanBrand = { name: String(b.name || 'Loya').slice(0, 60), color: /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#d4af37', currency: String(b.currency || 'EUR').slice(0, 6), niche: String(b.niche || 'other').slice(0, 24) };
    const { error } = await supabase.from('apple_passes').upsert({ serial, license_key: licenseKey.trim(), card: clean, brand: cleanBrand, updated_at: new Date().toISOString() });
    if (error) { res.status(500).json({ error: 'db_error', detail: String(error.message || '').slice(0, 140) }); return; }
    res.status(200).json({ ok: true, link: `${A.SITE_URL}/api/apple-pass?s=${encodeURIComponent(serial)}&t=${A.downloadTokenFor(serial)}` });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
};
