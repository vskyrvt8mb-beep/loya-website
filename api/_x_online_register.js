// POST /api/online-register — клиент регистрируется по ссылке (публичный адрес, без ключей).
const { register } = require('./_online');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '').trim();
    const r = await register(req.body || {}, ip);
    const { status, ...rest } = r; res.status(status).json(rest);
  } catch (e) { res.status(500).json({ error: 'server_error' }); }
};
