// Регистрация по ссылке: профиль, регистрация, выдача заявок кассе, страница регистрации.
// Одна серверная функция вместо нескольких: на бесплатном тарифе Vercel их не больше 12 на весь сайт.
// Прежние адреса работают как раньше — их направляет vercel.json (rewrites).
const h_publish = require('./_x_online_publish');
const h_register = require('./_x_online_register');
const h_pull = require('./_x_online_pull');
const h_page = require('./_x_online_page');
const h_pos = require('./_x_pos');
const h_book = require('./_x_book');
const h_book_page = require('./_x_book_page');
const h_fb_page = require('./_x_fb_page');
const ACTIONS = { 'pos-in': h_pos, 'pos-key': h_pos, 'pos-pull': h_pos, 'dk-start': h_pos, 'dk-status': h_pos, 'dk-disconnect': h_pos, 'dk-page': h_pos, 'dk-callback': h_pos,
  'book-slots': h_book, 'book-info': h_book, 'book-create': h_book, 'book-cancel': h_book, 'book-pull': h_book, 'book-update': h_book, 'book-busy': h_book, 'book-remind': h_book,
  'fb-new': h_book, 'fb-rate': h_book, 'fb-pull': h_book, 'book-page': h_book_page, 'fb-page': h_fb_page,
  'publish': h_publish, 'register': h_register, 'pull': h_pull, 'page': h_page };
module.exports = (req, res) => {
  const h = ACTIONS[String((req.query && req.query.action) || '')];
  if (!h) { res.status(404).json({ error: 'not_found' }); return; }
  return h(req, res);
};
