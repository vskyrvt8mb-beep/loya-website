// POST /api/owner-login — доступ из дома (см. _owner.js).
const O = require('./_owner');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try { const meta = { ip: String(((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0] || '').trim(), ua: String((req.headers && req.headers['user-agent']) || '') }; const r = await O.login(req.body || {}, meta); const { status, ...rest } = r; res.status(status).json(rest); }
  catch (e) { res.status(500).json({ error: 'server_error' }); }
};
