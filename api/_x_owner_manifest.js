// GET /api/owner?action=manifest&t=<токен> — манифест, чтобы «Доступ из дома» ставился на телефон как приложение
// (Android: «Установить приложение»; iPhone пользуется meta-тегами страницы). Открывается сразу на кабинете владельца.
module.exports = (req, res) => {
  const t = String((req.query && req.query.t) || '');
  const start = /^[a-f0-9]{48}$/.test(t) ? `/owner/${t}` : '/owner';
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(200).send(JSON.stringify({
    name: 'Loya — кабинет владельца', short_name: 'Loya', id: start, start_url: start, scope: '/owner',
    display: 'standalone', orientation: 'portrait', background_color: '#07080b', theme_color: '#07080b',
    icons: [
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }));
};
