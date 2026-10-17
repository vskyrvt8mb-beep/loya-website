// Уведомления владельцу сервиса в Telegram: пробные периоды, оплаты, отмены, заявки с сайта, входы в админку.
// Нужен бот (@BotFather → токен в TELEGRAM_BOT_TOKEN). Чат: TELEGRAM_CHAT_ID в Vercel или кнопка
// «Подключить Telegram» в админке (сохраняет чат в admin_settings). Без настроек модуль молча ничего не делает,
// а любая ошибка Telegram никогда не ломает оплату, письмо или вход.
const { supabase } = require('./_license');

const token = () => String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let chatCache = { at: 0, id: '' };
async function chatId() {
  const env = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (env) return env;
  if (Date.now() - chatCache.at < 60e3) return chatCache.id;
  let id = '';
  try {
    const { data, error } = await supabase.from('admin_settings').select('value').eq('key', 'tg_chat').limit(1);
    if (!error && data && data[0]) id = String(data[0].value || '');
  } catch (e) { /* таблицы ещё нет */ }
  chatCache = { at: Date.now(), id };
  return id;
}

async function call(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(4000),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(String(j.description || ('http_' + r.status)).slice(0, 120));
  return j.result;
}

async function send(chat, text) {
  return call('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', disable_web_page_preview: true });
}

// Главная функция: отправить уведомление. Никогда не бросает исключение.
async function notify(text) {
  if (!token()) return false;
  try {
    const chat = await chatId();
    if (!chat) return false;
    await send(chat, text);
    return true;
  } catch (e) { console.error('[tg]', e && e.message); return false; }
}

// Секрет, который Telegram присылает в заголовке каждого запроса к /api/tg-webhook: чужие запросы отбрасываем.
const webhookSecret = () => require('crypto').createHash('sha256').update('loya-tg-webhook:' + token()).digest('hex').slice(0, 48);
const SITE = () => process.env.PUBLIC_URL || 'https://loya-loyalty.com';

// Приём сообщений от людей: Telegram сам присылает их на /api/tg-webhook (см. _x_tg_webhook.js).
async function setWebhook() {
  await call('setWebhook', { url: `${SITE()}/api/tg-webhook`, secret_token: webhookSecret(), allowed_updates: ['message'], drop_pending_updates: false });
  try {
    await call('setMyCommands', { commands: [{ command: 'start', description: 'Написать в поддержку Loya' }] });
    await call('setMyDescription', { description: 'Поддержка Loya — программы лояльности для малого бизнеса. Напишите вопрос, и мы ответим здесь.\n\nLoya support — ask your question and we will reply here.' });
  } catch (e) { /* не важно */ }
}

// «Подключить Telegram»: берём последний личный чат, который написал боту, сохраняем его, шлём проверочное сообщение
// и включаем приём сообщений от людей (webhook). Пока webhook включён, getUpdates не работает — на время выключаем.
async function connect() {
  if (!token()) return { status: 400, error: 'tg_no_token' };
  let updates;
  try {
    const info = await call('getWebhookInfo', {});
    if (info && info.url) await call('deleteWebhook', { drop_pending_updates: false });
    updates = await call('getUpdates', { limit: 100, allowed_updates: ['message'] });
  } catch (e) { return { status: 502, error: 'tg_error', detail: e.message }; }
  const chats = (updates || []).map((u) => u.message && u.message.chat).filter((c) => c && c.type === 'private');
  let chat = chats[chats.length - 1];
  if (!chat) { try { const p = JSON.parse(await getKV('tg_pending') || '{}'); if (p.id && Date.now() - Number(p.at || 0) < 24 * 3600e3) chat = { id: p.id, first_name: p.first_name, last_name: p.last_name, username: p.username }; } catch (e) { /* нет */ } }
  let saved = false;
  if (chat) {
    try {
      const { error } = await supabase.from('admin_settings').upsert({ key: 'tg_chat', value: String(chat.id) });
      saved = !error;
    } catch (e) { saved = false; }
    chatCache = { at: 0, id: '' };
  } else {
    // новых сообщений нет (их уже забрал webhook) — оставляем ранее подключённый чат
    const prev = await chatId();
    if (!prev) { try { await setWebhook(); } catch (e) { /* ниже всё равно ошибка */ } return { status: 404, error: 'tg_no_chat' }; }
    chat = { id: prev, first_name: 'чат ' + prev }; saved = true;
  }
  const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ') + (chat.username ? ` (@${chat.username})` : '');
  let hook = true;
  try { await setWebhook(); } catch (e) { hook = false; }
  try {
    await send(chat.id, '✅ <b>Loya подключена.</b> Сюда будут приходить пробные периоды, оплаты, отмены и заявки с сайта.'
      + (hook ? '\n\n💬 Сообщения, которые люди пишут боту, тоже будут приходить сюда. Чтобы ответить через бота — нажмите «Ответить» (Reply) на сообщение клиента. Или напишите человеку со своего аккаунта по кнопке под сообщением.' : ''));
  } catch (e) { return { status: 502, error: 'tg_error', detail: e.message }; }
  return { status: 200, ok: true, name, chat: String(chat.id), saved, hook };
}

// 2.23: надёжное подключение: админка даёт ссылку t.me/<бот>?start=<код>. Человек нажимает «Запустить» —
// Telegram присылает «/start <код>» на webhook, и именно этот чат становится чатом владельца.
// (Раньше /start забирал webhook, а кнопка «Подключить» потом ничего не находила через getUpdates.)
async function setKV(key, value) { try { const { error } = await supabase.from('admin_settings').upsert({ key, value: String(value) }); return !error; } catch (e) { return false; } }
async function getKV(key) { try { const { data } = await supabase.from('admin_settings').select('value').eq('key', key).limit(1); return data && data[0] ? String(data[0].value || '') : ''; } catch (e) { return ''; } }
async function linkStart() {
  if (!token()) return { status: 400, error: 'tg_no_token' };
  let me;
  try { me = await call('getMe', {}); await setWebhook(); } catch (e) { return { status: 502, error: 'tg_error', detail: e.message }; }
  const code = require('crypto').randomBytes(6).toString('hex');
  if (!(await setKV('tg_link', JSON.stringify({ code, exp: Date.now() + 20 * 60e3 })))) return { status: 500, error: 'db_error', detail: 'admin_settings' };
  return { status: 200, ok: true, link: `https://t.me/${me.username}?start=${code}`, bot: me.username };
}
// Вызывается из webhook: «/start <код>» из ссылки админки → этот чат становится чатом владельца.
async function linkFinish(m) {
  const code = (String(m.text || '').match(/^\/start\s+([a-f0-9]{12})\b/) || [])[1];
  if (!code) return false;
  let pend = {}; try { pend = JSON.parse(await getKV('tg_link') || '{}'); } catch (e) { pend = {}; }
  if (!pend.code || pend.code !== code || Date.now() > Number(pend.exp || 0)) {
    await call('sendMessage', { chat_id: m.chat.id, text: 'Ссылка для подключения устарела. Откройте админку Loya и нажмите «Подключить Telegram» ещё раз.' }).catch(() => {});
    return true;
  }
  await setKV('tg_chat', String(m.chat.id));
  await setKV('tg_link', '{}');
  chatCache = { at: 0, id: '' };
  await send(m.chat.id, '✅ <b>Loya подключена.</b> Сюда будут приходить: новые подписки и оплаты, пробные периоды, отмены, продления, неудачные оплаты, заявки с сайта и входы в админку.\n\n💬 Сообщения, которые люди пишут боту, тоже будут приходить сюда. Чтобы ответить — нажмите «Ответить» (Reply) на сообщение клиента.').catch(() => {});
  return true;
}
// Чат владельца ещё не подключён, а кто-то нажал /start без кода — запомним: старая кнопка «Подключить» его найдёт.
async function rememberCandidate(m) {
  const u = m.from || {};
  await setKV('tg_pending', JSON.stringify({ id: m.chat.id, first_name: u.first_name || '', last_name: u.last_name || '', username: u.username || '', at: Date.now() }));
}

async function test() {
  if (!token()) return { status: 400, error: 'tg_no_token' };
  const chat = await chatId();
  if (!chat) return { status: 404, error: 'tg_no_chat' };
  try { await send(chat, '🔔 Проверка: уведомления Loya работают.'); } catch (e) { return { status: 502, error: 'tg_error', detail: e.message }; }
  return { status: 200, ok: true };
}

// Для панели «Готовность к запуску».
async function state() {
  if (!token()) return 'off';
  if (!(await chatId())) return 'nochat';
  try { const info = await call('getWebhookInfo', {}); if (!info || info.url !== `${SITE()}/api/tg-webhook`) return 'nohook'; } catch (e) { /* сеть — не пугаем */ }
  return 'ok';
}

const money = (amount, currency) => (amount == null ? '' : `${(Number(amount) / 100).toFixed(2)} ${String(currency || 'eur').toUpperCase()}`);
const LANG_FLAG = { ru: '🇷🇺', uk: '🇺🇦', sk: '🇸🇰', en: '🇬🇧' };
const lang = (l) => LANG_FLAG[l] ? `${LANG_FLAG[l]} ${l}` : esc(l || '');

module.exports = { notify, connect, linkStart, linkFinish, rememberCandidate, test, state, esc, money, lang, call, chatId, token, webhookSecret, setWebhook };
