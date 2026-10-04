// POST /api/admin-data — админка Loya (см. _admin.js).
const A = require('./_admin');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const ip = String((req.headers && req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim();
    const r = await A.data(req.body || {}, ip); const { status, ...rest } = r; res.status(status).json(rest);
  } catch (e) { res.status(500).json({ error: 'server_error' }); }
};
