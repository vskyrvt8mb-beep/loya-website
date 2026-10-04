// /api/owner-code, /api/owner-code-login, /api/owner-logout-all — вход без ссылки и выход со всех устройств.
const O = require('./_owner');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const meta = { ip: String(((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0] || '').trim(), ua: String((req.headers && req.headers['user-agent']) || '') };
  const op = String((req.query && req.query.op) || '');
  const fn = { code: O.codeRequest, 'code-login': O.codeLogin, 'logout-all': O.logoutAll }[op];
  if (!fn) { res.status(404).json({ error: 'not_found' }); return; }
  try { const r = await fn(req.body || {}, meta); const { status, ...rest } = r; res.status(status).json(rest); }
  catch (e) { res.status(500).json({ error: 'server_error' }); }
};
