// Оплата в боевом режиме: письмо с ключом после оплаты, «потеряли ключ?», переход в кабинет управления подпиской.
const { sendSystemMail, supabase, EMAIL_RE } = require('./_mail');
const RL = require('./_ratelimit');
const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LANGS = ['ru', 'uk', 'sk', 'en'];
const L = {
  ru: { s: 'Ваш ключ Loya', hi: 'Спасибо за подписку на Loya!', key: 'Ваш лицензионный ключ', steps: ['Скачайте программу на сайте loya-loyalty.com и установите её.', 'Откройте «Настройки → Подписка» и вставьте ключ.', 'Программа покажет короткую презентацию и поможет всё настроить.'], manage: 'Управление подпиской и отмена', help: 'Вопросы? Просто ответьте на это письмо.', multi: 'Ваши активные ключи', rs: 'Ваш ключ Loya — восстановление' },
  uk: { s: 'Ваш ключ Loya', hi: 'Дякуємо за підписку на Loya!', key: 'Ваш ліцензійний ключ', steps: ['Завантажте програму на сайті loya-loyalty.com і встановіть її.', 'Відкрийте «Налаштування → Підписка» та вставте ключ.', 'Програма покаже коротку презентацію й допоможе все налаштувати.'], manage: 'Керування підпискою та скасування', help: 'Питання? Просто дайте відповідь на цей лист.', multi: 'Ваші активні ключі', rs: 'Ваш ключ Loya — відновлення' },
  sk: { s: 'Váš kľúč Loya', hi: 'Ďakujeme za predplatné Loya!', key: 'Váš licenčný kľúč', steps: ['Stiahnite si program na loya-loyalty.com a nainštalujte ho.', 'Otvorte „Nastavenia → Predplatné“ a vložte kľúč.', 'Program ukáže krátku prezentáciu a pomôže so všetkým nastavením.'], manage: 'Správa predplatného a zrušenie', help: 'Otázky? Stačí odpovedať na tento e-mail.', multi: 'Vaše aktívne kľúče', rs: 'Váš kľúč Loya — obnovenie' },
  en: { s: 'Your Loya key', hi: 'Thanks for subscribing to Loya!', key: 'Your licence key', steps: ['Download the app at loya-loyalty.com and install it.', 'Open “Settings → Subscription” and paste the key.', 'The app shows a short intro and helps you set everything up.'], manage: 'Manage or cancel your subscription', help: 'Questions? Just reply to this email.', multi: 'Your active keys', rs: 'Your Loya key — recovery' }
};
function wrap(inner) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:540px;margin:0 auto;color:#1b1813;line-height:1.55">${inner}<p style="color:#8a8576;font-size:12px;margin-top:26px">Loya · loya-loyalty.com</p></div>`;
}
const keyBox = (k) => `<div style="margin:10px 0;padding:14px 16px;border-radius:12px;background:#f6f1e3;border:1px solid #e3d9b8;font-family:Consolas,Menlo,monospace;font-size:20px;letter-spacing:1.5px;font-weight:700;text-align:center">${esc(k)}</div>`;
const manageLink = (l) => `<p><a href="${SITE_URL}/manage" style="color:#7a5d00">${esc(l.manage)}</a></p>`;

const KIND = {
  trial: { ru: ['Ваш пробный ключ Loya — 14 дней', 'Пробный период Loya начался!', (d) => `14 дней всех возможностей бесплатно — до ${d}. Карта не нужна. Потом можно выбрать тариф на сайте или остаться на бесплатной версии.`],
           uk: ['Ваш пробний ключ Loya — 14 днів', 'Пробний період Loya розпочався!', (d) => `14 днів усіх можливостей безкоштовно — до ${d}. Картка не потрібна. Потім можна обрати тариф на сайті або лишитися на безкоштовній версії.`],
           sk: ['Váš skúšobný kľúč Loya — 14 dní', 'Skúšobné obdobie Loya sa začalo!', (d) => `14 dní všetkých funkcií zadarmo — do ${d}. Karta nie je potrebná. Potom si môžete vybrať tarif na webe alebo zostať na bezplatnej verzii.`],
           en: ['Your Loya trial key — 14 days', 'Your Loya trial has started!', (d) => `14 days of every feature for free — until ${d}. No card needed. Afterwards pick a plan on the website or stay on the free version.`] },
  upgraded: { ru: ['Подписка Loya активна', 'Спасибо! Подписка оформлена.', () => 'Ваш ключ остаётся прежним — в программе ничего менять не нужно, ограничения пробного периода сняты.'],
              uk: ['Підписка Loya активна', 'Дякуємо! Підписку оформлено.', () => 'Ваш ключ лишається тим самим — у програмі нічого міняти не потрібно.'],
              sk: ['Predplatné Loya je aktívne', 'Ďakujeme! Predplatné je aktívne.', () => 'Váš kľúč zostáva rovnaký — v programe netreba nič meniť.'],
              en: ['Your Loya subscription is active', 'Thank you! Your subscription is active.', () => 'Your key stays the same — nothing to change in the app.'] }
};
async function sendKeyEmail({ email, key, lang, kind, until }) {
  const lg = LANGS.includes(lang) ? lang : 'en';
  const l = L[lg];
  const k = KIND[kind] && KIND[kind][lg];
  const subject = k ? k[0] : l.s, title = k ? k[1] : l.hi;
  const extra = k ? `<p>${esc(k[2](until ? new Date(until).toLocaleDateString(lg === 'en' ? 'en-GB' : lg) : ''))}</p>` : '';
  await sendSystemMail({ to: email, subject, html: wrap(`<h2 style="margin:0 0 8px">${esc(title)}</h2>${extra}<p>${esc(l.key)}:</p>${keyBox(key)}${kind === 'upgraded' ? '' : `<ol style="padding-left:20px">${l.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`}${manageLink(l)}<p style="color:#5f5a4a">${esc(l.help)}</p>`) });
}

// ---------- 14 дней пробного периода без карты ----------
// Выдаётся один раз: на один email и на один компьютер (отпечаток компьютера считает программа, сервер
// хранит только его хеш). Срок считает сервер — смена часов на компьютере его не продлевает.
const TRIAL_DAYS = 14;
async function startTrial({ email, machineHash, lang }, ip) {
  const addr = String(email || '').trim().toLowerCase();
  const mh = String(machineHash || '');
  if (!EMAIL_RE.test(addr) || addr.length > 160) return { status: 400, error: 'email' };
  if (!/^[a-f0-9]{64}$/.test(mh)) return { status: 400, error: 'machine' };
  if (await RL.limited('trial-ip:' + ip, 5, 3600e3)) return { status: 429, error: 'too_many' };
  const pattern = addr.replace(/[\\%_]/g, '\\$&');
  const { data: byEmail, error: e1 } = await supabase.from('licenses').select('license_key').ilike('email', pattern).limit(1);
  if (e1) return { status: 500, error: 'db_error' };
  if (byEmail && byEmail.length) return { status: 409, error: 'trial_used' };
  const { data: byMachine, error: e2 } = await supabase.from('licenses').select('license_key').eq('machine_hash', mh).limit(1);
  if (e2) return { status: 500, error: 'db_error' };
  if (byMachine && byMachine.length) return { status: 409, error: 'trial_used' };
  const crypto = require('crypto');
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  const key = `LOYA-${seg()}-${seg()}-${seg()}`;
  const until = new Date(Date.now() + TRIAL_DAYS * 86400e3).toISOString();
  const { error: e3 } = await supabase.from('licenses').insert({ license_key: key, email: addr, plan: 'trial', tier: 'pro', status: 'active', trial_until: until, machine_hash: mh });
  if (e3) return { status: 500, error: 'db_error', detail: String(e3.message || '').slice(0, 140) };
  try { await sendKeyEmail({ email: addr, key, lang, kind: 'trial', until }); } catch (e) { /* ключ всё равно вернём в программу */ }
  const TG = require('./_tg');
  await TG.notify(`🆕 <b>Пробный период</b> · 14 дней\n${TG.esc(addr)} · ${TG.lang(lang)}\nдо ${new Date(until).toLocaleDateString('ru-RU')}`);
  return { status: 200, ok: true, key, trialUntil: until };
}

// «Потеряли ключ?» — всегда отвечаем одинаково (чтобы нельзя было проверять, какие адреса есть в базе),
// письмо уходит только на адрес из базы, и не чаще нескольких раз в час.
async function resendKeys({ email, lang }, ip) {
  const addr = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(addr) || addr.length > 160) return { status: 400, error: 'email' };
  if (await RL.limited('resend-ip:' + ip, 10, 3600e3)) return { status: 429, error: 'too_many' };
  if (await RL.limited('resend-em:' + addr, 3, 3600e3)) return { status: 200, ok: true };   // тихо: письмо уже недавно отправляли
  // ilike — без учёта регистра, но % и _ в SQL означают «любые символы»: экранируем, иначе адрес «j_hn@…»
  // совпал бы с «john@…», и чужой ключ ушёл бы не тому человеку.
  const pattern = addr.replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabase.from('licenses').select('license_key, status, plan, banned, free_until').ilike('email', pattern).limit(10);
  if (error) return { status: 500, error: 'db_error' };
  const L2 = require('./_license');
  const keys = (data || []).filter(r => L2.isActive(r)).map(r => r.license_key);
  if (keys.length) {
    const l = L[LANGS.includes(lang) ? lang : 'en'];
    try { await sendSystemMail({ to: addr, subject: l.rs, html: wrap(`<p>${esc(keys.length > 1 ? l.multi : l.key)}:</p>${keys.map(keyBox).join('')}${manageLink(l)}`) }); } catch (e) { /* ответ всё равно одинаковый */ }
  }
  return { status: 200, ok: true };
}

// /manage → кабинет Stripe (Customer Portal): клиент сам отменяет подписку и меняет карту.
const MANAGE_OFF = {
  ru: ['Управление подпиской скоро будет доступно', 'Пока напишите нам — поможем отменить подписку или сменить карту.'],
  uk: ['Керування підпискою незабаром буде доступне', 'Поки що напишіть нам — допоможемо скасувати підписку або змінити картку.'],
  sk: ['Správa predplatného bude čoskoro dostupná', 'Zatiaľ nám napíšte — pomôžeme zrušiť predplatné alebo zmeniť kartu.'],
  en: ['Subscription management is coming soon', 'For now, write to us — we’ll help you cancel or change your card.']
};
function langOf(req) {
  const q = String((req && req.query && req.query.lang) || '');
  if (LANGS.includes(q)) return q;
  const h = String((req && req.headers && req.headers['accept-language']) || '').toLowerCase();
  for (const part of h.split(',')) { const l = part.trim().slice(0, 2); if (LANGS.includes(l)) return l; if (l === 'cs') return 'sk'; }
  return 'en';
}
function manage(req, res) {
  const url = String(process.env.STRIPE_PORTAL_URL || '');
  if (/^https:\/\/billing\.stripe\.com\//.test(url)) { res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'no-store'); res.end(); return; }
  const [h, p] = MANAGE_OFF[langOf(req)];
  const mail = EMAIL_RE.test(String(process.env.SUPPORT_EMAIL || '')) ? process.env.SUPPORT_EMAIL : 'loya.loyalty.send@gmail.com';
  res.statusCode = 503; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html><html lang="${langOf(req)}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loya</title><body style="font-family:Arial,sans-serif;background:#0c0e13;color:#f3efe6;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:20px"><div style="max-width:460px;text-align:center"><h2>${esc(h)}</h2><p style="color:#c9c3b6">${esc(p)}</p><p><a style="color:#f5b83d" href="mailto:${esc(mail)}">${esc(mail)}</a></p><p><a style="color:#c9c3b6" href="${SITE_URL}/">loya-loyalty.com</a></p></div></body></html>`);
}

module.exports = { sendKeyEmail, resendKeys, manage, startTrial, TRIAL_DAYS, SITE_URL };
