// Служебное: отправка писем через рабочую почту, проверка сервера.
// Одна серверная функция вместо нескольких: на бесплатном тарифе Vercel их не больше 12 на весь сайт.
// Прежние адреса работают как раньше — их направляет vercel.json (rewrites).
const h_send_mail = require('./_x_send_mail');
const h_health = require('./_x_health');
const h_admin_login = require('./_x_admin_login');
const h_admin_data = require('./_x_admin_data');
const h_admin_action = require('./_x_admin_action');
const h_admin_page = require('./_x_admin_page');
const h_billing = require('./_x_billing');
const h_sync = require('./_x_sync');
const ACTIONS = { 'send-mail': h_send_mail, 'health': h_health, 'admin-login': h_admin_login, 'admin-data': h_admin_data, 'admin-action': h_admin_action, 'admin-page': h_admin_page, 'manage': h_billing, 'resend-key': h_billing, 'trial-start': h_billing, 'sync': h_sync };
module.exports = (req, res) => {
  const h = ACTIONS[String((req.query && req.query.action) || '')];
  if (!h) { res.status(404).json({ error: 'not_found' }); return; }
  return h(req, res);
};
