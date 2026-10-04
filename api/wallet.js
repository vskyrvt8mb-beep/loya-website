// Google Wallet: ссылка на карту, обновление карты, картинка-баннер.
// Одна серверная функция вместо нескольких: на бесплатном тарифе Vercel их не больше 12 на весь сайт.
// Прежние адреса работают как раньше — их направляет vercel.json (rewrites).
const h_link = require('./_x_wallet_link');
const h_update = require('./_x_wallet_update');
const h_hero = require('./_x_wallet_hero');
const ACTIONS = { 'link': h_link, 'update': h_update, 'hero': h_hero };
module.exports = (req, res) => {
  const h = ACTIONS[String((req.query && req.query.action) || '')];
  if (!h) { res.status(404).json({ error: 'not_found' }); return; }
  return h(req, res);
};
