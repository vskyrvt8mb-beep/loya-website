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
// 2.26: подтверждение почты пробного ключа. Ключ работает сразу, а письма клиентам через почту Loya
// включаются после клика по ссылке — так пробный ключ на чужой адрес нельзя использовать для спама.
const crypto = require('crypto');
const verifySecret = () => process.env.OWNER_SECRET || crypto.createHash('sha256').update('loya-verify:' + (process.env.SUPABASE_SERVICE_KEY || 'dev')).digest('hex');
const verifySig = (key) => crypto.createHmac('sha256', verifySecret()).update('trial-verify:' + key).digest('hex').slice(0, 32);
const verifyUrl = (key, lang) => `${SITE_URL}/api/trial-confirm?k=${encodeURIComponent(key)}&s=${verifySig(key)}&lang=${LANGS.includes(lang) ? lang : 'en'}`;
const VERIFY_TXT = {
  ru: { t: 'Подтвердите почту', d: 'Одно нажатие — и программа сможет отправлять письма вашим клиентам (карты, поздравления, рассылки).', b: 'Подтвердить почту',
    okT: 'Почта подтверждена', okD: 'Готово! Теперь программа Loya может отправлять письма вашим клиентам. Это окно можно закрыть.', badT: 'Ссылка не подходит', badD: 'Откройте самое свежее письмо с ключом или нажмите в программе «Отправить письмо ещё раз».' },
  uk: { t: 'Підтвердьте пошту', d: 'Одне натискання — і програма зможе надсилати листи вашим клієнтам (картки, привітання, розсилки).', b: 'Підтвердити пошту',
    okT: 'Пошту підтверджено', okD: 'Готово! Тепер програма Loya може надсилати листи вашим клієнтам. Це вікно можна закрити.', badT: 'Посилання не підходить', badD: 'Відкрийте найсвіжіший лист із ключем або натисніть у програмі «Надіслати лист ще раз».' },
  sk: { t: 'Potvrďte e-mail', d: 'Jedno kliknutie — a program bude môcť posielať e-maily vašim zákazníkom (karty, blahoželania, kampane).', b: 'Potvrdiť e-mail',
    okT: 'E-mail je potvrdený', okD: 'Hotovo! Program Loya teraz môže posielať e-maily vašim zákazníkom. Toto okno môžete zavrieť.', badT: 'Odkaz nie je platný', badD: 'Otvorte najnovší e-mail s kľúčom alebo v programe kliknite na „Poslať e-mail znova“.' },
  en: { t: 'Confirm your email', d: 'One click — and the app can send emails to your customers (cards, greetings, campaigns).', b: 'Confirm email',
    okT: 'Email confirmed', okD: 'Done! The Loya app can now send emails to your customers. You can close this window.', badT: 'This link doesn’t work', badD: 'Open the latest email with your key, or click “Send the email again” in the app.' }
};
const verifyBlock = (key, lang) => {
  const v = VERIFY_TXT[LANGS.includes(lang) ? lang : 'en'];
  return `<div style="margin:18px 0;padding:16px 18px;border-radius:14px;background:#fff8e6;border:1px solid #f0dca6"><b style="font-size:16px">${esc(v.t)}</b><p style="margin:6px 0 12px;color:#5c4a17">${esc(v.d)}</p>`
    + `<a href="${verifyUrl(key, lang)}" style="display:inline-block;padding:12px 22px;border-radius:12px;background:#d4af37;color:#1b1813;font-weight:bold;text-decoration:none">${esc(v.b)}</a></div>`;
};
async function sendKeyEmail({ email, key, lang, kind, until }) {
  const lg = LANGS.includes(lang) ? lang : 'en';
  const l = L[lg];
  const k = KIND[kind] && KIND[kind][lg];
  const subject = k ? k[0] : l.s, title = k ? k[1] : l.hi;
  const extra = k ? `<p>${esc(k[2](until ? new Date(until).toLocaleDateString(lg === 'en' ? 'en-GB' : lg) : ''))}</p>` : '';
  await sendSystemMail({ to: email, subject, html: wrap(`<h2 style="margin:0 0 8px">${esc(title)}</h2>${extra}${kind === 'trial' ? verifyBlock(key, lg) : ''}<p>${esc(l.key)}:</p>${keyBox(key)}${kind === 'upgraded' ? '' : `<ol style="padding-left:20px">${l.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`}${manageLink(l)}<p style="color:#5f5a4a">${esc(l.help)}</p>`) });
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

// Программа: «Отправить письмо ещё раз» — ссылка подтверждения уходит только на адрес, на который выдан пробный ключ.
async function resendVerify({ licenseKey, lang }, ip) {
  const key = String(licenseKey || '').trim();
  if (!/^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(key)) return { status: 400, error: 'bad_key' };
  if (await RL.limited('verify-ip:' + ip, 10, 3600e3) || await RL.limited('verify-key:' + key, 3, 3600e3)) return { status: 429, error: 'too_many' };
  const { data, error } = await supabase.from('licenses').select('*').eq('license_key', key).maybeSingle();
  if (error || !data) return { status: 404, error: 'not_found' };
  if (data.plan !== 'trial' || data.email_verified_at || !EMAIL_RE.test(String(data.email || ''))) return { status: 200, ok: true, already: true };
  const v = VERIFY_TXT[LANGS.includes(lang) ? lang : 'en'];
  await sendSystemMail({ to: data.email, subject: `Loya — ${v.t}`, html: wrap(verifyBlock(key, lang)) });
  return { status: 200, ok: true, sentTo: String(data.email).replace(/^(.).*?(@.*)$/, '$1•••$2') };
}
// GET /api/trial-confirm?k=…&s=… — переход по ссылке из письма.
async function confirmTrial(req, res) {
  const lg = langOf(req), v = VERIFY_TXT[lg];
  const key = String((req.query && req.query.k) || ''), sig = String((req.query && req.query.s) || '');
  const good = verifySig(key);
  let ok = /^LOYA-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(key) && sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
  if (ok) {
    const { error } = await supabase.from('licenses').update({ email_verified_at: new Date().toISOString() }).eq('license_key', key).is('email_verified_at', null);
    if (error) { console.error('[trial-confirm]', error.message); ok = !/email_verified_at/.test(String(error.message)); }
  }
  res.statusCode = ok ? 200 : 400; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex');
  res.end(`<!doctype html><html lang="${lg}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loya — ${esc(ok ? v.okT : v.badT)}</title>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 80% at 50% 0%,#2a2210,#0b0d12 60%);font-family:Arial,Helvetica,sans-serif;color:#f0ece0;padding:20px;box-sizing:border-box">
<div style="max-width:440px;width:100%;text-align:center;background:#14161d;border:1px solid rgba(226,181,74,.3);border-radius:22px;padding:34px 26px;box-shadow:0 30px 80px rgba(0,0,0,.5)">
<div style="width:72px;height:72px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;${ok ? 'background:linear-gradient(135deg,#f4d47c,#d4af37);color:#1b1813' : 'background:#3a1d1d;color:#f87171'}">${ok ? '✓' : '!'}</div>
<h1 style="margin:0 0 10px;font-size:22px">${esc(ok ? v.okT : v.badT)}</h1><p style="margin:0 0 22px;line-height:1.55;color:#c9c3b3">${esc(ok ? v.okD : v.badD)}</p>
<a href="${SITE_URL}/${lg === 'en' ? '' : lg + '/'}" style="color:#e2b54a;font-weight:bold;text-decoration:none">loya-loyalty.com</a></div></body></html>`);
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

// ---------- «Нужна помощь?» (из админки, клиентам на пробном, которые почти не пользуются программой) ----------
const NUDGE = {
  ru: { s: 'Как у вас дела с Loya? Поможем за 5 минут', h: 'Loya уже почти готова работать на вас', p: 'Похоже, вы ещё не успели попробовать Loya в деле. Это нормально — вот три шага, которые занимают 5 минут:', steps: ['Выдайте первую карту — хотя бы себе, чтобы увидеть, как это выглядит у гостя.', 'Поставьте афишу с QR у кассы: гости регистрируются сами и сразу получают карту.', 'Отметьте первый визит — сканером, камерой или телефоном.'], ext: (d) => `Мы продлили ваш пробный период до ${d} — без оплаты и без карты.`, b1: 'Собрать карту в конструкторе', b2: 'Посмотреть программу в браузере', help: 'Нет времени разбираться? Просто ответьте на это письмо — пришлите логотип, и мы бесплатно настроим карту, афишу и страницу регистрации за вас.', bye: 'Команда Loya' },
  uk: { s: 'Як у вас справи з Loya? Допоможемо за 5 хвилин', h: 'Loya вже майже готова працювати на вас', p: 'Схоже, ви ще не встигли спробувати Loya в ділі. Це нормально — ось три кроки, які займають 5 хвилин:', steps: ['Видайте першу картку — хоча б собі, щоб побачити, як це виглядає в гостя.', 'Поставте афішу з QR біля каси: гості реєструються самі й одразу отримують картку.', 'Відмітьте перший візит — сканером, камерою або телефоном.'], ext: (d) => `Ми продовжили ваш пробний період до ${d} — без оплати й без картки.`, b1: 'Зібрати картку в конструкторі', b2: 'Подивитися програму в браузері', help: 'Немає часу розбиратися? Просто дайте відповідь на цей лист — надішліть логотип, і ми безкоштовно налаштуємо картку, афішу та сторінку реєстрації за вас.', bye: 'Команда Loya' },
  sk: { s: 'Ako vám ide Loya? Pomôžeme za 5 minút', h: 'Loya je takmer pripravená pracovať pre vás', p: 'Zdá sa, že ste ešte nestihli vyskúšať Loya v praxi. To je v poriadku — tu sú tri kroky na 5 minút:', steps: ['Vydajte prvú kartu — aspoň sebe, aby ste videli, ako ju vidí hosť.', 'Dajte plagát s QR k pokladnici: hostia sa zaregistrujú sami a hneď dostanú kartu.', 'Zaznamenajte prvú návštevu — skenerom, kamerou alebo telefónom.'], ext: (d) => `Predĺžili sme vaše skúšobné obdobie do ${d} — bez platby a bez karty.`, b1: 'Zostaviť kartu v konštruktore', b2: 'Pozrieť program v prehliadači', help: 'Nemáte čas? Stačí odpovedať na tento e-mail — pošlite logo a kartu, plagát aj registračnú stránku vám nastavíme zadarmo.', bye: 'Tím Loya' },
  en: { s: 'How is Loya going? We can help in 5 minutes', h: 'Loya is almost ready to work for you', p: 'It looks like you have not had a chance to try Loya for real yet. That is fine — here are three steps that take 5 minutes:', steps: ['Issue your first card — even to yourself, to see what guests see.', 'Put the QR poster by the till: guests sign up on their own and get a card right away.', 'Record the first visit — with a scanner, a camera or a phone.'], ext: (d) => `We have extended your trial until ${d} — no payment, no card.`, b1: 'Design a card in the builder', b2: 'Try the app in your browser', help: 'No time to figure it out? Just reply to this email — send your logo and we will set up the card, the poster and the sign-up page for you for free.', bye: 'The Loya team' }
};
async function sendNudgeEmail({ email, lang, until }) {
  const lg = LANGS.includes(lang) ? lang : 'en'; const n = NUDGE[lg];
  const home = SITE_URL + (lg === 'en' ? '/' : '/' + lg + '/');
  const btn = (href, text, gold) => `<a href="${href}" style="display:inline-block;margin:4px 6px 4px 0;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;${gold ? 'background:#d4a24a;color:#1b1204' : 'background:#f6f1e3;color:#1b1813;border:1px solid #e3d9b8'}">${esc(text)}</a>`;
  const date = until ? new Date(until).toLocaleDateString(lg === 'en' ? 'en-GB' : lg, { day: 'numeric', month: 'long' }) : '';
  await sendSystemMail({ to: email, subject: n.s, html: wrap(`<h2 style="margin:0 0 10px">${esc(n.h)}</h2><p>${esc(n.p)}</p><ol style="padding-left:20px;margin:10px 0 14px">${n.steps.map(s => `<li style="margin-bottom:6px">${esc(s)}</li>`).join('')}</ol>` +
    (date ? `<p style="padding:10px 14px;border-radius:10px;background:#eef8ee;border:1px solid #cfe8cf">⏳ ${esc(n.ext(date))}</p>` : '') +
    `<p style="margin:16px 0">${btn(home + '#builder', n.b1, true)}${btn(SITE_URL + '/demo/?lang=' + lg, n.b2, false)}</p><p>${esc(n.help)}</p><p style="margin-top:18px">${esc(n.bye)}</p>`) });
}

module.exports = { sendNudgeEmail, sendKeyEmail, resendKeys, manage, startTrial, resendVerify, confirmTrial, TRIAL_DAYS, SITE_URL };
