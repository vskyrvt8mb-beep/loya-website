// POST /api/profile-publish — программа публикует профиль бизнеса для страницы регистрации по ссылке.
const { publishProfile } = require('./_online');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try { const r = await publishProfile(req.body || {}); res.status(r.status).json(r.ok ? { ok: true, slug: r.slug, url: r.url } : { error: r.error }); }
  catch (e) { res.status(500).json({ error: 'server_error' }); }
};
