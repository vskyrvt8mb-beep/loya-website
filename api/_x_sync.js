// /api/sync/<действие> — синхронизация Pro (см. _sync.js).
const S = require('./_sync');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const a = String((req.query && req.query.op) || '');
  const fn = { register: S.register, push: S.push, pull: S.pull, devices: S.devices, revoke: S.revoke }[a];
  if (!fn) { res.status(404).json({ error: 'not_found' }); return; }
  try {
    const ip = String(((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0] || '').trim();
    const r = await fn(req.body || {}, ip);
    const { status, ...rest } = r; res.status(status || 200).json(rest);
  } catch (e) { res.status(500).json({ error: 'server_error' }); }
};
