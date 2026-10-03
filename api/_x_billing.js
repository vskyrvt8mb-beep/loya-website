// /manage (переход в кабинет Stripe) и POST /api/resend-key (восстановление ключа).
const B = require('./_billing');
module.exports = async (req, res) => {
  const a = String((req.query && req.query.action) || '');
  if (a === 'manage') return B.manage(req, res);
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const ip = String(((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0] || '').trim();
    const r = await B.resendKeys(req.body || {}, ip);
    const { status, ...rest } = r; res.status(status).json(rest);
  } catch (e) { res.status(500).json({ error: 'server_error' }); }
};
