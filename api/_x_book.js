// 2.20: онлайн-запись и отзывы после визита — все адреса в одном обработчике (лимит функций Vercel).
const B = require('./_book');
const F = require('./_feedback');
const ipOf = (req) => String((req.headers['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '').trim();
module.exports = async (req, res) => {
  const a = String((req.query && req.query.action) || '');
  try {
    let r;
    if (a === 'book-slots' || a === 'book-info') {
      if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
      r = a === 'book-slots' ? await B.slots(req.query || {}) : await B.info(req.query || {});
      res.setHeader('Cache-Control', 'no-store');
    } else if (a === 'book-remind') {
      r = await B.remind(req);
    } else {
      if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
      const body = req.body || {};
      r = a === 'book-create' ? await B.create(body, ipOf(req))
        : a === 'book-cancel' ? await B.cancel(body)
        : a === 'book-pull' ? await B.pull(body)
        : a === 'book-update' ? await B.update(body)
        : a === 'book-busy' ? await B.busy(body)
        : a === 'fb-new' ? await F.register(body)
        : a === 'fb-rate' ? await F.rate(body, ipOf(req))
        : a === 'fb-pull' ? await F.pull(body)
        : { status: 404, error: 'not_found' };
    }
    const { status, ...rest } = r; res.status(status).json(rest);
  } catch (e) { console.error('[book]', e && e.message); res.status(500).json({ error: 'server_error' }); }
};
