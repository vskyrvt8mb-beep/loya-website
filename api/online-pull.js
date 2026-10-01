// POST /api/online-pull — программа забирает новые заявки и подтверждает полученные (ack).
const { pull } = require('./_online');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try { const r = await pull(req.body || {}); const { status, ...rest } = r; res.status(status).json(rest); }
  catch (e) { res.status(500).json({ error: 'server_error' }); }
};
