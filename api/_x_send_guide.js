// POST /api/send-guide — «Пришлите инструкцию на почту»: ссылка на программу и короткий план запуска.
// Защита от рассылки спама через форму: письмо одного и того же содержания, только на указанный адрес,
// не больше 5 писем в час с одного IP и 2 в сутки на один адрес, запрос только с нашего сайта.
const RL = require('./_ratelimit');
const SITE = process.env.PUBLIC_URL || 'https://loya-loyalty.com';

const TXT = {
  ru: { subj: 'Loya — ссылка на программу и запуск за 10 минут', hi: 'Здравствуйте!', intro: 'Вы просили прислать инструкцию. Откройте это письмо на компьютере с Windows 10 или 11:',
    steps: ['Скачайте программу: <a href="{dl}">установщик</a> или <a href="{store}">Microsoft Store</a>.', 'Запустите Loya и нажмите «Попробовать 14 дней бесплатно» — нужен только email, карта не нужна.', 'Настройте свою карту (штампы, скидка или накопительная) и распечатайте QR для стойки.', 'Клиенты сканируют QR и получают карту в телефон. Отмечайте визиты телефоном сотрудника.'],
    more: 'Подробнее и тарифы', q: 'Есть вопросы? Просто ответьте на это письмо.' },
  uk: { subj: 'Loya — посилання на програму й запуск за 10 хвилин', hi: 'Вітаємо!', intro: 'Ви просили надіслати інструкцію. Відкрийте цей лист на комп’ютері з Windows 10 або 11:',
    steps: ['Завантажте програму: <a href="{dl}">інсталятор</a> або <a href="{store}">Microsoft Store</a>.', 'Запустіть Loya й натисніть «Спробувати 14 днів безкоштовно» — потрібен лише email, картка не потрібна.', 'Налаштуйте свою картку (штампи, знижка чи накопичувальна) і роздрукуйте QR для стійки.', 'Клієнти сканують QR і отримують картку в телефон. Позначайте візити телефоном працівника.'],
    more: 'Докладніше й тарифи', q: 'Є питання? Просто дайте відповідь на цей лист.' },
  sk: { subj: 'Loya — odkaz na program a spustenie za 10 minút', hi: 'Dobrý deň!', intro: 'Požiadali ste o návod. Otvorte tento e-mail na počítači s Windows 10 alebo 11:',
    steps: ['Stiahnite si program: <a href="{dl}">inštalátor</a> alebo <a href="{store}">Microsoft Store</a>.', 'Spustite Loya a kliknite na „Vyskúšať 14 dní zadarmo“ — stačí e-mail, karta netreba.', 'Nastavte si kartu (pečiatky, zľava alebo bodová) a vytlačte QR na pult.', 'Zákazníci naskenujú QR a kartu dostanú do telefónu. Návštevy zaznamenávajte telefónom zamestnanca.'],
    more: 'Viac informácií a tarify', q: 'Máte otázky? Stačí odpovedať na tento e-mail.' },
  en: { subj: 'Loya — download link and a 10-minute setup', hi: 'Hello!', intro: 'You asked for the instructions. Open this email on a computer with Windows 10 or 11:',
    steps: ['Download the app: <a href="{dl}">installer</a> or <a href="{store}">Microsoft Store</a>.', 'Launch Loya and click “Try 14 days free” — only an email is needed, no card.', 'Set up your card (stamps, discount or points) and print the QR code for your counter.', 'Customers scan the QR and get the card on their phone. Record visits with a staff member’s phone.'],
    more: 'More info and pricing', q: 'Questions? Just reply to this email.' },
};
const STORE = { ru: 'ru-ru', uk: 'uk-ua', sk: 'sk-sk', en: 'en-us' };

function sameOrigin(req) {
  const origin = String((req.headers && req.headers.origin) || '');
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const ok = new Set([String(req.headers.host || ''), 'loya-loyalty.com', 'www.loya-loyalty.com']);
    if (process.env.PUBLIC_URL) ok.add(new URL(process.env.PUBLIC_URL).host);
    return ok.has(host);
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!sameOrigin(req)) { res.status(403).json({ error: 'forbidden' }); return; }
  const { EMAIL_RE, sendSystemMail } = require('./_mail');
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const lang = ['ru', 'uk', 'sk', 'en'].includes(body.lang) ? body.lang : 'en';
  if (!email || email.length > 160 || !EMAIL_RE.test(email)) { res.status(400).json({ error: 'bad_email' }); return; }
  const ip = RL.clientIp(req);
  if (await RL.limited('guide-ip:' + ip, 5, 3600e3)) { res.status(429).json({ error: 'too_many' }); return; }
  if (await RL.limited('guide-em:' + email, 2, 86400e3)) { res.status(200).json({ ok: true }); return; }   // тихо: уже отправляли
  const t = TXT[lang];
  const home = lang === 'en' ? `${SITE}/` : `${SITE}/${lang}/`;
  const fill = (x) => x.replace('{dl}', `${SITE}/download`).replace('{store}', `https://apps.microsoft.com/detail/9NDD15Q4KTPQ?hl=${STORE[lang]}`);
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:560px">
<p>${t.hi}</p><p>${t.intro}</p><ol>${t.steps.map((x) => `<li style="margin-bottom:6px">${fill(x)}</li>`).join('')}</ol>
<p><a href="${home}" style="color:#b8862d;font-weight:bold">${t.more} →</a></p><p style="color:#555">${t.q}</p><p>— Loya</p></div>`;
  try { await sendSystemMail({ to: email, subject: t.subj, html }); }
  catch (e) { console.error('[send-guide]', e && e.message); res.status(502).json({ error: 'mail_error' }); return; }
  const TG = require('./_tg');
  await TG.notify(`📩 <b>Запросили инструкцию на почту</b>\n${TG.esc(email)} · ${TG.lang(lang)}\nПотенциальный клиент — можно написать через пару дней`);
  res.status(200).json({ ok: true });
};
