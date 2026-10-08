// POST /api/tg-webhook — сообщения, которые люди пишут боту поддержки (например, @loya_admin_bot).
// Человек пишет боту → бот присылает владельцу (чат из «Подключить Telegram») копию с именем, @username и кнопкой
// «Написать с моего аккаунта». Владелец может ответить и через бота: «Ответить» (Reply) на это сообщение —
// бот перешлёт ответ человеку (текст, фото, голосовое — что угодно). Номер чата клиента хранится в самом
// сообщении («#u123»), отдельная таблица не нужна.
// Запросы принимаются только с секретом, который бот получил при подключении (заголовок от Telegram).
const crypto = require('crypto');
const TG = require('./_tg');
const RL = require('./_ratelimit');

const HELLO = {
  ru: 'Здравствуйте! Это поддержка <b>Loya</b>. Напишите ваш вопрос одним сообщением — мы ответим здесь, обычно в течение дня.',
  uk: 'Вітаємо! Це підтримка <b>Loya</b>. Напишіть ваше питання одним повідомленням — ми відповімо тут, зазвичай протягом дня.',
  sk: 'Dobrý deň! Tu je podpora <b>Loya</b>. Napíšte nám otázku jednou správou — odpovieme tu, zvyčajne do jedného dňa.',
  en: 'Hello! This is <b>Loya</b> support. Send us your question in one message — we’ll reply right here, usually within a day.',
};
const GOT = {
  ru: '✓ Сообщение получено, скоро ответим.', uk: '✓ Повідомлення отримано, скоро відповімо.',
  sk: '✓ Správu sme dostali, čoskoro odpovieme.', en: '✓ Message received, we’ll reply soon.',
};
const langOf = (u) => { const l = String((u && u.language_code) || '').slice(0, 2); return l === 'cs' ? 'sk' : HELLO[l] ? l : 'en'; };
const TAG_RE = /#u(-?\d{1,20})\b/;

function okSecret(req) {
  const got = String((req.headers && req.headers['x-telegram-bot-api-secret-token']) || '');
  const want = TG.webhookSecret();
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

function header(m) {
  const u = m.from || {};
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Без имени';
  return `💬 <b>${TG.esc(name)}</b>${u.username ? ` · @${TG.esc(u.username)}` : ''} · ${TG.lang(langOf(u))}  #u${m.chat.id}`;
}

async function fromClient(m, owner) {
  const chat = m.chat.id;
  const lg = langOf(m.from);
  const text = String(m.text || '');
  if (/^\/start\b/.test(text)) {
    await TG.call('sendMessage', { chat_id: chat, text: HELLO[lg], parse_mode: 'HTML' });
    await TG.notify(`${header(m)}\n<i>открыл бота</i>`);
    return;
  }
  if (await RL.limited('tg-in:' + chat, 30, 3600e3)) return;   // защита от флуда: не больше 30 сообщений в час от одного человека
  const u = m.from || {};
  const kb = u.username ? { inline_keyboard: [[{ text: '✍️ Написать с моего аккаунта', url: `https://t.me/${u.username}` }]] } : undefined;
  const tail = u.username ? '' : '\n<i>нет @username — ответьте на это сообщение (Reply), бот передаст</i>';
  if (m.text) {
    await TG.call('sendMessage', { chat_id: owner, text: `${header(m)}${tail}\n\n${TG.esc(m.text).slice(0, 3500)}`, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb });
  } else {
    // фото, голосовое, файл и т. п.: копия с подписью-заголовком (номер чата клиента — в подписи)
    const cap = `${header(m)}${tail}${m.caption ? '\n\n' + TG.esc(m.caption).slice(0, 700) : ''}`;
    try { await TG.call('copyMessage', { chat_id: owner, from_chat_id: chat, message_id: m.message_id, caption: cap, parse_mode: 'HTML', reply_markup: kb }); }
    catch (e) {
      // у стикеров и кружков подписи нет — сначала заголовок, потом сама копия
      await TG.call('sendMessage', { chat_id: owner, text: cap, parse_mode: 'HTML', reply_markup: kb });
      await TG.call('copyMessage', { chat_id: owner, from_chat_id: chat, message_id: m.message_id });
    }
  }
  // «получили» — не чаще раза в 6 часов, чтобы не отвечать на каждое сообщение
  if (!(await RL.limited('tg-ack:' + chat, 1, 6 * 3600e3))) await TG.call('sendMessage', { chat_id: chat, text: GOT[lg] });
}

async function fromOwner(m, owner) {
  const r = m.reply_to_message;
  const tag = r && String(r.text || r.caption || '').match(TAG_RE);
  if (!tag) {
    if (/^\/start\b/.test(String(m.text || ''))) return;
    await TG.call('sendMessage', { chat_id: owner, text: 'Чтобы ответить клиенту через бота, нажмите «Ответить» (Reply) на его сообщение и напишите ответ. Или напишите ему напрямую со своего аккаунта по кнопке под сообщением.' });
    return;
  }
  try {
    await TG.call('copyMessage', { chat_id: tag[1], from_chat_id: owner, message_id: m.message_id });
    await TG.call('sendMessage', { chat_id: owner, text: '✓ Отправлено', reply_to_message_id: m.message_id, disable_notification: true });
  } catch (e) {
    await TG.call('sendMessage', { chat_id: owner, text: `Не удалось отправить: ${TG.esc(e.message)}. Возможно, человек остановил бота.`, reply_to_message_id: m.message_id });
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!TG.token() || !okSecret(req)) { res.status(403).json({ error: 'forbidden' }); return; }
  const m = req.body && req.body.message;
  // Telegram повторяет запрос, если не получил 200, — поэтому отвечаем 200 всегда, ошибки только в лог
  try {
    if (m && m.chat && m.chat.type === 'private') {
      const owner = String(await TG.chatId());
      if (owner && String(m.chat.id) === owner) await fromOwner(m, owner);
      else if (owner) await fromClient(m, owner);
    }
  } catch (e) { console.error('[tg-webhook]', e && e.message); }
  res.status(200).json({ ok: true });
};
