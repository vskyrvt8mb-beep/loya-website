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

// «Подключить Telegram»: берём последний личный чат, который написал боту, сохраняем его и шлём проверочное сообщение.
async function connect() {
  if (!token()) return { status: 400, error: 'tg_no_token' };
  let updates;
  try { updates = await call('getUpdates', { limit: 100, allowed_updates: ['message'] }); }
  catch (e) { return { status: 502, error: 'tg_error', detail: e.message }; }
  const chats = (updates || []).map((u) => u.message && u.message.chat).filter((c) => c && c.type === 'private');
  const chat = chats[chats.length - 1];
  if (!chat) return { status: 404, error: 'tg_no_chat' };
  const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ') + (chat.username ? ` (@${chat.username})` : '');
  let saved = false;
  try {
    const { error } = await supabase.from('admin_settings').upsert({ key: 'tg_chat', value: String(chat.id) });
    saved = !error;
  } catch (e) { saved = false; }
  chatCache = { at: 0, id: '' };
  try { await send(chat.id, '✅ <b>Loya подключена.</b> Сюда будут приходить пробные периоды, оплаты, отмены и заявки с сайта.'); }
  catch (e) { return { status: 502, error: 'tg_error', detail: e.message }; }
  return { status: 200, ok: true, name, chat: String(chat.id), saved };
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
  return (await chatId()) ? 'ok' : 'nochat';
}

const money = (amount, currency) => (amount == null ? '' : `${(Number(amount) / 100).toFixed(2)} ${String(currency || 'eur').toUpperCase()}`);
const LANG_FLAG = { ru: '🇷🇺', uk: '🇺🇦', sk: '🇸🇰', en: '🇬🇧' };
const lang = (l) => LANG_FLAG[l] ? `${LANG_FLAG[l]} ${l}` : esc(l || '');

module.exports = { notify, connect, test, state, esc, money, lang };
