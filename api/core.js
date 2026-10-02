// Служебное: отправка писем через рабочую почту, проверка сервера.
// Одна серверная функция вместо нескольких: на бесплатном тарифе Vercel их не больше 12 на весь сайт.
// Прежние адреса работают как раньше — их направляет vercel.json (rewrites).
const h_send_mail = require('./_x_send_mail');
const h_health = require('./_x_health');
const ACTIONS = { 'send-mail': h_send_mail, 'health': h_health };
module.exports = (req, res) => {
  const h = ACTIONS[String((req.query && req.query.action) || '')];
  if (!h) { res.status(404).json({ error: 'not_found' }); return; }
  return h(req, res);
};
