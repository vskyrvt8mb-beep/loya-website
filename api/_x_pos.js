// POST /api/pos/<ключ> (чек из облачной кассы), /api/pos-key и /api/pos-pull (программа Loya).
const P = require('./_pos');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const a = String((req.query && req.query.action) || '');
    const r = a === 'pos-in' ? await P.incoming(String((req.query && req.query.key) || ''), req.body)
      : a === 'pos-key' ? await P.key(req.body || {})
      : a === 'pos-pull' ? await P.pull(req.body || {})
      : { status: 404, error: 'not_found' };
    const { status, ...rest } = r; res.status(status).json(rest);
  } catch (e) { res.status(500).json({ error: 'server_error' }); }
};
