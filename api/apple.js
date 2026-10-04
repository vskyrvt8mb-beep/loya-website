// Apple Wallet: ссылка на карту, скачивание .pkpass и веб-сервис для обновлений (см. _apple.js).
// Одна серверная функция на всё — лимит Vercel Hobby 12 функций на сайт.
const h_link = require('./_x_apple_link');
const h_pass = require('./_x_apple_pass');
const h_ws = require('./_x_apple_ws');
const ACTIONS = { link: h_link, pass: h_pass, ws: h_ws };
module.exports = (req, res) => {
  const h = ACTIONS[String((req.query && req.query.action) || '')];
  if (!h) { res.status(404).json({ error: 'not_found' }); return; }
  return h(req, res);
};
