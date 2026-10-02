// POST/GET /api/health — «диагностика»: что на этом сервере настроено. Секретов не отдаёт —
// только да/нет. Нужна кнопке «Проверить связь с сервером» в программе (раздел «Подписка»).
const { supabase } = require('./_mail');

module.exports = async (req, res) => {
  const body = req.method === 'POST' ? (req.body || {}) : {};
  const out = {
    ok: true,
    time: new Date().toISOString(),
    publicUrl: process.env.PUBLIC_URL || '',
    wallet: !!(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT),
    walletKeyValid: false,
    mail: !!(process.env.MAIL_USER && process.env.MAIL_PASS),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    db: false
  };
  try { const sa = JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT || ''); out.walletKeyValid = !!(sa && sa.client_email && sa.private_key); } catch (e) { /* не JSON */ }
  try { const { error } = await supabase.from('licenses').select('license_key').limit(1); out.db = !error; } catch (e) { out.db = false; }
  // Баннер карты: пробуем нарисовать тестовую картинку — так видно, что шрифты и рисовалка на месте.
  out.hero = false; out.heroError = '';
  try {
    const { renderHeroPng } = require('./_walletHero');
    const png = renderHeroPng({ card: { type: 'stamp', stamp_count: 3, stamp_target: 8 }, brand: { name: 'Café', color: '#d4af37' }, niche: 'coffee', lang: 'ru' });
    out.hero = !!(png && png.length > 1000);
    if (!out.hero) out.heroError = 'empty';
  } catch (e) { out.heroError = String((e && e.message) || e).slice(0, 120); }
  const key = typeof body.licenseKey === 'string' ? body.licenseKey.trim().slice(0, 100) : '';
  if (key && out.db) {
    try {
      const { data } = await supabase.from('licenses').select('status').eq('license_key', key).maybeSingle();
      out.license = data ? data.status : 'not_found';
    } catch (e) { out.license = 'unknown'; }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
};
