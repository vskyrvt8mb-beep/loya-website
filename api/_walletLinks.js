// 2.23: ссылки «Добавить в Google Wallet / Apple Wallet» прямо на сервере — для гостя, который только что
// зарегистрировался по ссылке (программа на кассе в этот момент может быть выключена).
// Логика та же, что у /api/wallet-link и /api/apple-link; ошибки не бросаются — просто нет ссылки.
const { supabase } = require('./_license');

async function googleLink(licenseKey, card, brand) {
  try {
    const W = require('./_wallet');
    const sa = W.serviceAccount();
    const design = await require('./_walletDesign').getDesignInfo(licenseKey);
    const { classId, object } = W.buildObject(licenseKey, card, brand || {}, design);
    let payload = null;
    try {
      const token = await W.accessToken(sa);
      const c = await W.putClass(token, classId);
      if (c.ok) { await W.syncClassLocations(token, classId, W.cleanGeo((brand || {}).geo)).catch(() => {}); const o = await W.putObject(token, object); if (o.ok) payload = { genericObjects: [{ id: object.id, classId }] }; else if (o.status >= 400 && o.status < 500) return ''; }
      else if (c.status >= 400 && c.status < 500) return '';
    } catch (e) { /* сеть — ниже ссылка со всеми данными внутри */ }
    if (!payload) payload = { genericClasses: [{ id: classId }], genericObjects: [object] };
    const jwt = W.signJwt(sa, { iss: sa.client_email, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000), origins: [], payload });
    return `https://pay.google.com/gp/v/save/${jwt}`;
  } catch (e) { return ''; }
}

async function appleLink(licenseKey, card, brand) {
  try {
    const A = require('./_apple');
    if (!A.configured()) return '';
    const serial = A.serialFor(licenseKey, card.code);
    const b = brand || {};
    const cleanBrand = { name: String(b.name || 'Loya').slice(0, 60), color: /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#d4af37', currency: String(b.currency || 'EUR').slice(0, 6), niche: String(b.niche || 'other').slice(0, 24), ...require('./_cardModel').cleanLook(b), ...(require('./_wallet').cleanGeo(b.geo) ? { geo: require('./_wallet').cleanGeo(b.geo) } : {}) };
    const { error } = await supabase.from('apple_passes').upsert({ serial, license_key: licenseKey.trim(), card, brand: cleanBrand, updated_at: new Date().toISOString() });
    if (error) return '';
    return `${A.SITE_URL}/api/apple-pass?s=${encodeURIComponent(serial)}&t=${A.downloadTokenFor(serial)}`;
  } catch (e) { return ''; }
}

// Карта, которую программа заведёт для гостя (тот же код, то же правило), — в формате /api/wallet-link.
function joinCard(prof, code, name, lang) {
  const c = (prof && prof.card) || {};
  const combo = c.type === 'combo';   // 2.25: «штампы + скидка» = штамп-карта с процентом
  const type = combo ? 'stamp' : ['stamp', 'discount', 'spend'].includes(c.type) ? c.type : 'stamp';
  return {
    code, type, title: type === 'spend' ? (c.spendTitle || '') : (c.title || ''), client_name: String(name || '').slice(0, 100), lang,
    stamp_count: 0, stamp_target: type === 'stamp' ? (Number(c.stampTarget) || 10) : 0, discount_percent: type === 'discount' || combo ? (Number(c.discount) || 5) : 0,
    spend_accumulated: 0, spend_target: type === 'spend' ? (Number(c.spendTarget) || 100) : 0, bonus_balance: 0, spend_bonus_points: Number(c.spendPoints) || 1
  };
}

module.exports = { googleLink, appleLink, joinCard };
