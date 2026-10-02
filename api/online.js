// Регистрация по ссылке: профиль, регистрация, выдача заявок кассе, страница регистрации.
// Одна серверная функция вместо нескольких: на бесплатном тарифе Vercel их не больше 12 на весь сайт.
// Прежние адреса работают как раньше — их направляет vercel.json (rewrites).
const h_publish = require('./_x_online_publish');
const h_register = require('./_x_online_register');
const h_pull = require('./_x_online_pull');
const h_page = require('./_x_online_page');
const ACTIONS = { 'publish': h_publish, 'register': h_register, 'pull': h_pull, 'page': h_page };
module.exports = (req, res) => {
  const h = ACTIONS[String((req.query && req.query.action) || '')];
  if (!h) { res.status(404).json({ error: 'not_found' }); return; }
  return h(req, res);
};
