// Доступ из дома: обмен с кассой, вход, данные, правки, страница владельца.
// Одна серверная функция вместо нескольких: на бесплатном тарифе Vercel их не больше 12 на весь сайт.
// Прежние адреса работают как раньше — их направляет vercel.json (rewrites).
const h_sync = require('./_x_owner_sync');
const h_login = require('./_x_owner_login');
const h_data = require('./_x_owner_data');
const h_command = require('./_x_owner_command');
const h_page = require('./_x_owner_page');
const ACTIONS = { 'sync': h_sync, 'login': h_login, 'data': h_data, 'command': h_command, 'page': h_page };
module.exports = (req, res) => {
  const h = ACTIONS[String((req.query && req.query.action) || '')];
  if (!h) { res.status(404).json({ error: 'not_found' }); return; }
  return h(req, res);
};
