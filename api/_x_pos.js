// POST /api/pos/<ключ> (чек из облачной кассы), /api/pos-key и /api/pos-pull (программа Loya).
// 2.20: Dotykačka — /api/dk-start, /api/dk-status, /api/dk-disconnect (программа), /dk/<state> и /api/dk-callback (браузер).
const P = require('./_pos');
module.exports = async (req, res) => {
  const a = String((req.query && req.query.action) || '');
  try {
    if (a === 'dk-page' || a === 'dk-callback') {
      if (req.method !== 'GET') { res.status(405).send('Method not allowed'); return; }
      const r = a === 'dk-page' ? await P.dkPage(req) : await P.dkCallback(req);
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
      res.status(r.status).send(r.html); return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    const r = a === 'pos-in' ? await P.incoming(String((req.query && req.query.key) || ''), req.body)
      : a === 'pos-key' ? await P.key(req.body || {})
      : a === 'pos-pull' ? await P.pull(req.body || {})
      : a === 'dk-start' ? await P.dkStart(req.body || {})
      : a === 'dk-status' ? await P.dkStatus(req.body || {})
      : a === 'dk-disconnect' ? await P.dkDisconnect(req.body || {})
      : { status: 404, error: 'not_found' };
    const { status, ...rest } = r; res.status(status).json(rest);
  } catch (e) { console.error('[pos]', e && e.message); res.status(500).json({ error: 'server_error' }); }
};
