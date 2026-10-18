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
      code: String(card.code).slice(0, 80), type: ['stamp', 'discount', 'spend', 'gift'].includes(card.type) ? card.type : 'stamp',
      title: String(card.title || '').slice(0, 80), client_name: String(card.client_name || '').slice(0, 100), lang: ['ru', 'uk', 'sk', 'en'].includes(card.lang) ? card.lang : 'en',
      stamp_count: Number(card.stamp_count) || 0, stamp_target: Number(card.stamp_target) || 0, discount_percent: Number(card.discount_percent) || 0,
      spend_accumulated: Number(card.spend_accumulated) || 0, spend_target: Number(card.spend_target) || 0,
      bonus_balance: Math.max(0, Math.round(Number(card.bonus_balance) || 0)), spend_bonus_points: Math.max(1, Math.round(Number(card.spend_bonus_points) || 1)),
      // 2.19: сертификат и уровень клиента
      gift_amount: Math.max(0, Number(card.gift_amount) || 0), gift_balance: Math.max(0, Math.round((Number(card.gift_balance) || 0) * 100) / 100),
      expires_at: /^\d{4}-\d{2}-\d{2}/.test(String(card.expires_at || '')) ? String(card.expires_at).slice(0, 10) : '',
      tier: ['basic', 'silver', 'gold'].includes(card.tier) ? card.tier : '',
      tier_next: ['silver', 'gold'].includes(card.tier_next) ? card.tier_next : '', tier_next_left: Math.max(0, Math.min(100000, Math.round(Number(card.tier_next_left) || 0))),
      invite_url: require('./_wallet').cleanInvite(card.invite_url)
    };
    const b = brand || {};
    const geo = require('./_wallet').cleanGeo(b.geo);
    const cleanBrand = { name: String(b.name || 'Loya').slice(0, 60), color: /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#d4af37', currency: String(b.currency || 'EUR').slice(0, 6), niche: String(b.niche || 'other').slice(0, 24), ...(geo ? { geo } : {}) };
    const { error } = await supabase.from('apple_passes').upsert({ serial, license_key: licenseKey.trim(), card: clean, brand: cleanBrand, updated_at: new Date().toISOString() });
    if (error) { res.status(500).json({ error: 'db_error', detail: String(error.message || '').slice(0, 140) }); return; }
    res.status(200).json({ ok: true, link: `${A.SITE_URL}/api/apple-pass?s=${encodeURIComponent(serial)}&t=${A.downloadTokenFor(serial)}` });
  } catch (err) { res.status(500).json({ error: 'server_error' }); }
};
