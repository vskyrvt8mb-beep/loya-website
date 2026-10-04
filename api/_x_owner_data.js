// POST /api/owner-data — доступ из дома (см. _owner.js).
const O = require('./_owner');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try { const r = await O.data(req.body || {}); const { status, ...rest } = r; res.status(status).json(rest); }
  catch (e) { res.status(500).json({ error: 'server_error' }); }
};
