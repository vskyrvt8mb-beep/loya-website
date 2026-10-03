// Оплата в боевом режиме: письмо с ключом после оплаты, «потеряли ключ?», переход в кабинет управления подпиской.
const { sendSystemMail, supabase, EMAIL_RE } = require('./_mail');
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

async function sendKeyEmail({ email, key, lang }) {
  const l = L[LANGS.includes(lang) ? lang : 'en'];
  await sendSystemMail({ to: email, subject: l.s, html: wrap(`<h2 style="margin:0 0 8px">${esc(l.hi)}</h2><p>${esc(l.key)}:</p>${keyBox(key)}<ol style="padding-left:20px">${l.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${manageLink(l)}<p style="color:#5f5a4a">${esc(l.help)}</p>`) });
}

// «Потеряли ключ?» — всегда отвечаем одинаково (чтобы нельзя было проверять, какие адреса есть в базе),
// письмо уходит только на адрес из базы, и не чаще нескольких раз в час.
const hits = new Map();
function limited(key, max, ms) { const now = Date.now(); const a = (hits.get(key) || []).filter(t => now - t < ms); if (a.length >= max) { hits.set(key, a); return true; } a.push(now); hits.set(key, a); if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > ms) hits.delete(k); return false; }
async function resendKeys({ email, lang }, ip) {
  const addr = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(addr) || addr.length > 160) return { status: 400, error: 'email' };
  if (limited('ip:' + ip, 10, 3600e3)) return { status: 429, error: 'too_many' };
  if (limited('em:' + addr, 3, 3600e3)) return { status: 200, ok: true };   // тихо: письмо уже недавно отправляли
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
function manage(req, res) {
  const url = String(process.env.STRIPE_PORTAL_URL || '');
  if (/^https:\/\/billing\.stripe\.com\//.test(url)) { res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'no-store'); res.end(); return; }
  res.statusCode = 503; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Subscription management is not available yet. Please contact support.');
}

module.exports = { sendKeyEmail, resendKeys, manage, SITE_URL };
