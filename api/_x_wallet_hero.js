// GET /api/wallet-hero.png?type=stamp&name=...&color=...&niche=coffee&count=3&target=10&lang=ru
// Отдаёт PNG-баннер карты (Google Wallet heroImage). Ссылку на этот адрес сохраняет
// _wallet.js прямо в саму карту — картинку скачивает и кеширует сам Google, поэтому
// запрос не требует ключа подписки: в адресе нет ничего секретного, только то, что и
// так видно на самой карте (название бизнеса, штампы, сумма).
const { renderHeroPng } = require('./_walletHero');

function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).end(); return; }
  try {
    const q = req.query || {};
    const type = ['stamp', 'spend', 'discount'].includes(q.type) ? q.type : 'stamp';
    const card = {
      type,
      stamp_count: num(q.count, 0), stamp_target: Math.max(1, num(q.target, 10)),
      spend_accumulated: num(q.acc, 0), spend_target: Math.max(0, num(q.target, 0)),
      discount_percent: Math.min(99, Math.max(0, num(q.pct, 0)))
    };
    const brand = { name: String(q.name || 'Loya').slice(0, 60), color: String(q.color || ''), currency: String(q.currency || 'EUR').slice(0, 6) };
    const niche = String(q.niche || 'other').slice(0, 30);
    const lang = ['ru', 'uk', 'sk', 'en'].includes(q.lang) ? q.lang : 'ru';

    // Свой баннер заведения (картинка из «Дизайн карт в Wallet»): b — отпечаток бизнеса, dv — версия.
    let bgImage = null, showProgress = true;
    if (q.b && q.dv) {
      try {
        const row = await require('./_walletDesign').getDesignFull(String(q.b), String(q.dv));
        if (row && row.hero && (await require('./_license').licenseActive(row.license_key))) {
          bgImage = `data:${row.hero_mime || 'image/jpeg'};base64,${row.hero}`;
          showProgress = q.hs !== '0';
        }
      } catch (e) { /* без картинки — стандартный баннер */ }
    }
    const png = renderHeroPng({ card, brand, niche, lang, bgImage, showProgress });
    // Один и тот же адрес всегда рисует одну и ту же картинку (состояние в самом URL),
    // поэтому его можно кешировать надолго и не пересчитывать на каждый запрос Google.
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.status(200).send(png);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
