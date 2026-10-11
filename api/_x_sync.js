// /api/sync/<действие> — общая база точек (см. _sync.js) и сеть точек: сводки и общие настройки (см. _org.js).
const S = require('./_sync');
const O = require('./_org');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const a = String((req.query && req.query.op) || '');
  const fn = { register: S.register, push: S.push, pull: S.pull, devices: S.devices, revoke: S.revoke, point: O.pushPoint, points: O.points, 'shared-get': O.sharedGet, 'shared-put': O.sharedPut }[a];
  if (!fn) { res.status(404).json({ error: 'not_found' }); return; }
  try {
    const ip = String(((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0] || '').trim();
    const r = await fn(req.body || {}, ip);
    const { status, ...rest } = r; res.status(status || 200).json(rest);
  } catch (e) { res.status(500).json({ error: 'server_error' }); }
};
