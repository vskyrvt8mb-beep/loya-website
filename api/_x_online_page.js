// GET /r/<slug> → /api/online?action=page&slug=<slug> — страница регистрации клиента по ссылке.
// Оформление — в цветах бизнеса: значок вида бизнеса, название, крупная карточка с подарком.
const { loadProfileBySlug, esc, DEFAULT_BONUS } = require('./_online');
const { dictJs } = require('./_dict');

const TX = {
  ru: { jHow: 'Заполните форму — карта лояльности появится сразу. Покажите её QR-код на кассе.', jBtn: 'Получить карту', jOk: 'Готово! Это ваша карта', jShow: 'Покажите этот QR-код на кассе — на карту копятся штампы и бонусы.', jTitle: 'Карта лояльности', gift: 'Подарок за регистрацию', free: 'Бесплатно', valid: (d) => `Действует ${d} дн. после регистрации`, how: 'Заполните форму — QR-купон появится сразу. Покажите его в заведении и получите подарок и постоянную карту лояльности.',
    lName: 'Ваше имя', pName: 'Например, Анна', lPhone: 'Телефон', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'Пришлём копию купона', opt: 'необязательно', lBday: 'День рождения', bdayHint: 'Иногда дарим подарки ко дню рождения',
    consent: 'Хочу получать новости и акции', btn: 'Получить подарок', wait: 'Секунду…', agree: 'Нажимая кнопку, вы соглашаетесь с', privacy: 'политикой конфиденциальности',
    errName: 'Введите имя', errPhone: 'Введите номер телефона', errEmail: 'Проверьте email', errGen: 'Не получилось. Попробуйте ещё раз.', errMany: 'Слишком много попыток — попробуйте позже.', closed: 'Регистрация сейчас закрыта.',
    okTitle: 'Готово! Ваш подарок', again: 'Вы уже регистрировались — вот ваш подарок', until: 'Действует до', show: 'Покажите этот QR-код в заведении — там вы получите подарок и постоянную карту лояльности.', shot: 'Совет: сделайте скриншот, чтобы купон был под рукой.', mailed: 'Копия отправлена на ваш email.' },
  uk: { jHow: 'Заповніть форму — картка лояльності з’явиться одразу. Покажіть її QR-код на касі.', jBtn: 'Отримати картку', jOk: 'Готово! Це ваша картка', jShow: 'Покажіть цей QR-код на касі — на картку накопичуються штампи й бонуси.', jTitle: 'Картка лояльності', gift: 'Подарунок за реєстрацію', free: 'Безкоштовно', valid: (d) => `Діє ${d} дн. після реєстрації`, how: 'Заповніть форму — QR-купон з’явиться одразу. Покажіть його в закладі й отримайте подарунок і постійну картку лояльності.',
    lName: 'Ваше ім’я', pName: 'Наприклад, Анна', lPhone: 'Телефон', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'Надішлемо копію купона', opt: 'необов’язково', lBday: 'День народження', bdayHint: 'Іноді даруємо подарунки до дня народження',
    consent: 'Хочу отримувати новини й акції', btn: 'Отримати подарунок', wait: 'Секунду…', agree: 'Натискаючи кнопку, ви погоджуєтеся з', privacy: 'політикою конфіденційності',
    errName: 'Введіть ім’я', errPhone: 'Введіть номер телефону', errEmail: 'Перевірте email', errGen: 'Не вийшло. Спробуйте ще раз.', errMany: 'Забагато спроб — спробуйте пізніше.', closed: 'Реєстрація зараз закрита.',
    okTitle: 'Готово! Ваш подарунок', again: 'Ви вже реєструвалися — ось ваш подарунок', until: 'Діє до', show: 'Покажіть цей QR-код у закладі — там ви отримаєте подарунок і постійну картку лояльності.', shot: 'Порада: зробіть скриншот, щоб купон був під рукою.', mailed: 'Копію надіслано на ваш email.' },
  sk: { jHow: 'Vyplňte formulár — vernostná karta sa zobrazí hneď. QR kód ukážte pri pokladnici.', jBtn: 'Získať kartu', jOk: 'Hotovo! Toto je vaša karta', jShow: 'Ukážte tento QR kód pri pokladnici — na kartu sa zbierajú pečiatky a bonusy.', jTitle: 'Vernostná karta', gift: 'Darček za registráciu', free: 'Zadarmo', valid: (d) => `Platí ${d} dní od registrácie`, how: 'Vyplňte formulár — QR kupón sa zobrazí hneď. Ukážte ho v prevádzke a získate darček aj stálu vernostnú kartu.',
    lName: 'Vaše meno', pName: 'Napríklad Anna', lPhone: 'Telefón', pPhone: '+421 900 000 000', lEmail: 'E-mail', pEmail: 'Pošleme kópiu kupónu', opt: 'nepovinné', lBday: 'Dátum narodenia', bdayHint: 'Občas dávame darčeky k narodeninám',
    consent: 'Chcem dostávať novinky a akcie', btn: 'Získať darček', wait: 'Moment…', agree: 'Kliknutím súhlasíte so', privacy: 'zásadami ochrany osobných údajov',
    errName: 'Zadajte meno', errPhone: 'Zadajte telefónne číslo', errEmail: 'Skontrolujte e-mail', errGen: 'Nepodarilo sa. Skúste znova.', errMany: 'Príliš veľa pokusov — skúste neskôr.', closed: 'Registrácia je momentálne zatvorená.',
    okTitle: 'Hotovo! Váš darček', again: 'Už ste sa registrovali — tu je váš darček', until: 'Platí do', show: 'Ukážte tento QR kód v prevádzke — dostanete darček aj stálu vernostnú kartu.', shot: 'Tip: urobte si snímku obrazovky, aby ste mali kupón po ruke.', mailed: 'Kópia bola odoslaná na váš e-mail.' },
  en: { jHow: 'Fill in the form — your loyalty card appears right away. Show its QR code at the till.', jBtn: 'Get my card', jOk: 'Done! This is your card', jShow: 'Show this QR code at the till — stamps and bonuses are collected on the card.', jTitle: 'Loyalty card', gift: 'Sign-up gift', free: 'Free', valid: (d) => `Valid for ${d} days after sign-up`, how: 'Fill in the form — your QR coupon appears right away. Show it at the venue to get your gift and a permanent loyalty card.',
    lName: 'Your name', pName: 'e.g. Anna', lPhone: 'Phone', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'We’ll send a copy of the coupon', opt: 'optional', lBday: 'Birthday', bdayHint: 'We sometimes give birthday treats',
    consent: 'I’d like news and offers', btn: 'Get my gift', wait: 'One moment…', agree: 'By tapping the button you agree to the', privacy: 'privacy policy',
    errName: 'Enter your name', errPhone: 'Enter your phone number', errEmail: 'Check the email', errGen: 'Something went wrong. Please try again.', errMany: 'Too many attempts — please try later.', closed: 'Registration is closed right now.',
    okTitle: 'Done! Your gift', again: 'You’ve already signed up — here’s your gift', until: 'Valid until', show: 'Show this QR code at the venue — you’ll get your gift and a permanent loyalty card.', shot: 'Tip: take a screenshot so the coupon is always at hand.', mailed: 'A copy was sent to your email.' }
};
function safeJson(v) { return JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function hexRgb(h) { const n = parseInt(String(h).slice(1), 16) || 0xd4af37; return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
function hexToHsl(hex) {
  const n = parseInt(String(hex).slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
function relLum(hex) { const n = parseInt(String(hex).slice(1), 16); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); }
function contrast(a, b) { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// Цвета бизнеса бывают скучными (серый, почти чёрный) — тогда страница берёт яркую пару под вид бизнеса.
const NICHE_PALETTE = {
  coffee: ['#e07a2f', '#f5b84a'], bakery: ['#e8a33d', '#f27c5a'], barber: ['#2563eb', '#7c3aed'], nails: ['#ec4899', '#a855f7'],
  spa: ['#14b8a6', '#38bdf8'], sushi: ['#ef4444', '#f97316'], pizza: ['#f97316', '#ef4444'], grocery: ['#22c55e', '#84cc16'],
  travel: ['#0ea5e9', '#6366f1'], tattoo: ['#a855f7', '#ec4899'], fitness: ['#10b981', '#3b82f6'], petgroom: ['#f59e0b', '#ec4899'],
  photo: ['#6366f1', '#ec4899'], clothing: ['#d946ef', '#f43f5e'], other: ['#f5b83d', '#f97316']
};
function palette(color, niche) {
  const base = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : null;
  let a, b;
  const hsl = base ? hexToHsl(base) : null;
  if (hsl && hsl[1] >= 0.35 && hsl[2] >= 0.28 && hsl[2] <= 0.68) { a = base; b = hslToHex(hsl[0] + 38, Math.max(0.6, hsl[1]), Math.min(0.62, Math.max(0.46, hsl[2] + 0.04))); }
  else { const pair = NICHE_PALETTE[niche] || NICHE_PALETTE.other; a = pair[0]; b = pair[1]; }
  // цвет текста на градиенте a→b: белый или тёмный — какой читается на обоих концах и посередине
  const ra = parseInt(a.slice(1), 16), rb = parseInt(b.slice(1), 16);
  const mid = '#' + [16, 8, 0].map(sh => Math.round((((ra >> sh) & 255) + ((rb >> sh) & 255)) / 2).toString(16).padStart(2, '0')).join('');   // середина градиента (смешение RGB)
  const score = (c) => Math.min(contrast(c, a), contrast(c, b), contrast(c, mid));
  const on = score('#ffffff') >= score('#15110a') ? '#ffffff' : '#15110a';
  return { a, b, on, onbg: on === '#ffffff' ? 'rgba(10,8,20,.34)' : 'rgba(255,255,255,.62)' };
}

function html(slug, p, mode) {
  const pal = palette(p.color, p.niche);
  const ctx = { slug, name: p.name || 'Loya', lang: p.lang || 'ru', days: p.bonusDays || 14, percent: p.bonusPercent || 100, title: p.bonusTitle || '', defaults: DEFAULT_BONUS, enabled: !!p.enabled && (mode === 'join' ? !!p.join : p.promo !== false), mode: mode === 'join' ? 'join' : 'promo' };
  return `<!DOCTYPE html><html lang="${esc(ctx.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0d0f14"><title>${esc(ctx.name)}</title>
<style>
:root{--a:${pal.a};--b:${pal.b};--ar:${hexRgb(pal.a)};--br:${hexRgb(pal.b)};--on:${pal.on};--onbg:${pal.onbg};--bg:#0c0e13;--card:#151922;--line:rgba(255,255,255,.12);--mut:rgba(243,239,230,.7)}
*{box-sizing:border-box;margin:0}
body{font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;color:#f6f2ea;min-height:100vh;padding:max(18px,env(safe-area-inset-top)) 16px 40px;overflow-x:hidden;
 background:radial-gradient(640px 420px at 100% -4%,rgba(var(--ar),.34),transparent 70%),radial-gradient(560px 420px at -6% 38%,rgba(var(--br),.22),transparent 70%),radial-gradient(520px 360px at 90% 104%,rgba(var(--ar),.16),transparent 70%),var(--bg)}
.wrap{max-width:460px;margin:0 auto;position:relative}
.top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.logo{width:52px;height:52px;border-radius:17px;display:flex;align-items:center;justify-content:center;font-size:27px;background:linear-gradient(135deg,rgba(var(--ar),.35),rgba(var(--br),.28));border:1px solid rgba(var(--ar),.55);box-shadow:0 8px 22px rgba(var(--ar),.25)}
.brand{font-size:20px;font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lang{display:flex;gap:4px}.lang button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.06);color:#f6f2ea;border-radius:9px;padding:6px 9px;font-weight:800;font-size:11.5px;cursor:pointer;min-height:32px}
.lang button.on{background:linear-gradient(135deg,var(--a),var(--b));border-color:transparent;color:var(--on)}
.offer{position:relative;overflow:hidden;border-radius:26px;padding:24px 22px 20px;margin-bottom:16px;color:var(--on);
 background:linear-gradient(135deg,var(--a) 0%,var(--b) 100%);box-shadow:0 22px 54px rgba(var(--ar),.34),0 8px 22px rgba(var(--br),.22)}
.offer:before{content:"";position:absolute;right:-46px;top:-46px;width:190px;height:190px;border-radius:50%;background:rgba(255,255,255,.2)}
.offer:after{content:"";position:absolute;left:-30px;bottom:-60px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.12)}
.offer .gift{position:absolute;right:18px;top:14px;font-size:44px;z-index:1;filter:drop-shadow(0 6px 10px rgba(0,0,0,.25));animation:bob 3.2s ease-in-out infinite}
.offer .k{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;opacity:.9;position:relative;z-index:1;padding-right:56px}
.offer .t{font-size:26px;font-weight:900;line-height:1.15;margin:8px 0 14px;position:relative;z-index:1;padding-right:30px;word-break:break-word}
.offer .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:relative;z-index:1}
.badge{background:var(--onbg);color:var(--on);border-radius:999px;padding:7px 14px;font-weight:900;font-size:14px;backdrop-filter:blur(4px)}
.offer .v{font-size:13px;font-weight:700}
.how{color:var(--mut);font-size:14.5px;line-height:1.55;margin:0 4px 16px}
.card{background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.03));border:1px solid var(--line);border-radius:24px;padding:20px;position:relative}
.card:before{content:"";position:absolute;left:24px;right:24px;top:-1px;height:3px;border-radius:0 0 6px 6px;background:linear-gradient(90deg,var(--a),var(--b))}
form{display:flex;flex-direction:column;gap:15px}
label.f{display:flex;flex-direction:column;gap:7px;font-size:13.5px;font-weight:700}
label.f .lt{display:flex;align-items:center;gap:8px}
label.f .ic{width:26px;height:26px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:14px;background:linear-gradient(135deg,rgba(var(--ar),.34),rgba(var(--br),.26))}
label.f small{font-weight:600;color:var(--mut);margin-left:2px}
input[type=text],input[type=tel],input[type=email],input[type=date]{height:54px;border-radius:15px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:inherit;padding:0 15px;font-size:16px;font-family:inherit;width:100%;color-scheme:dark;transition:border-color .15s,box-shadow .15s,background .15s}
input::placeholder{color:rgba(246,242,234,.5)}
input:focus{outline:none;border-color:var(--a);background:rgba(var(--ar),.1);box-shadow:0 0 0 4px rgba(var(--ar),.25)}
.hintf{font-size:12.5px;color:var(--mut);font-weight:500}
.chk{display:flex;gap:12px;align-items:flex-start;font-size:14.5px;color:rgba(246,242,234,.92);cursor:pointer;line-height:1.4;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid var(--line)}
.chk input{width:22px;height:22px;margin:0;accent-color:var(--a);flex-shrink:0}
button.go{height:60px;border:0;border-radius:18px;font-size:17.5px;font-weight:900;color:var(--on);background:linear-gradient(135deg,var(--a),var(--b));cursor:pointer;box-shadow:0 16px 36px rgba(var(--ar),.4);display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .15s,box-shadow .15s,filter .15s}
button.go:hover{transform:translateY(-2px);filter:brightness(1.05);box-shadow:0 20px 42px rgba(var(--ar),.5)}
button.go:active{transform:translateY(0)}
button.go[disabled]{opacity:.65;transform:none}
.agree{font-size:12.5px;color:var(--mut);text-align:center;line-height:1.5}.agree a{color:#fff}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.err{color:#ffd0d0;font-size:14.5px;min-height:0}.err:not(:empty){padding:11px 13px;border-radius:13px;background:rgba(239,68,68,.22);border:1px solid rgba(248,113,113,.55)}
.closed{padding:16px;border-radius:16px;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.55);text-align:center}
.ticket{position:relative;border-radius:26px;background:#fffaf0;color:#1b1813;overflow:hidden;box-shadow:0 26px 64px rgba(0,0,0,.5),0 10px 30px rgba(var(--ar),.25)}
.ticket .h{padding:22px 22px 18px;background:linear-gradient(135deg,var(--a),var(--b));color:var(--on);position:relative;overflow:hidden}
.ticket .h:after{content:"";position:absolute;right:-30px;top:-34px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.22)}
.ticket .h b{display:block;font-size:13px;letter-spacing:.06em;text-transform:uppercase;position:relative;z-index:1}
.ticket .h div{font-size:25px;font-weight:900;margin-top:5px;line-height:1.15;position:relative;z-index:1}
.ticket .h .badge{display:inline-block;margin-top:12px;position:relative;z-index:1}
.cut{position:relative;height:0;border-top:2px dashed rgba(0,0,0,.18);margin:0 18px}
.cut:before,.cut:after{content:"";position:absolute;top:-13px;width:24px;height:24px;border-radius:50%;background:var(--bg)}
.cut:before{left:-31px}.cut:after{right:-31px}
.ticket .b{padding:18px 22px 24px;text-align:center}
.ticket img{width:224px;height:224px;display:block;margin:2px auto 10px;image-rendering:pixelated;border-radius:12px;box-shadow:0 0 0 6px #fff,0 0 0 8px rgba(var(--ar),.5)}
.code{font-family:Consolas,Menlo,monospace;letter-spacing:2px;font-weight:800;font-size:16.5px;color:#15110a}
.until{margin:12px 0 6px;font-weight:800;color:#15110a}
.small{font-size:14px;line-height:1.5;color:#4a4536}
.tip{margin-top:14px;font-size:13.5px;color:var(--mut);text-align:center;line-height:1.5}
.confetti{position:fixed;left:0;top:0;width:100%;height:0;pointer-events:none;z-index:50}
.confetti i{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;opacity:.95;animation:fall 2.6s cubic-bezier(.2,.6,.4,1) forwards}
@keyframes fall{to{transform:translate3d(var(--dx),105vh,0) rotate(var(--rot));opacity:.9}}
@keyframes bob{50%{transform:translateY(-6px) rotate(6deg)}}
@media (prefers-reduced-motion:reduce){.offer .gift{animation:none}.confetti{display:none}button.go{transition:none}}
</style></head><body><div class="wrap">
<div class="top"><div class="logo">${esc(p.emoji || '🎁')}</div><div class="brand">${esc(ctx.name)}</div><div class="lang" id="lang"></div></div>
<div id="form-box">
  <div class="offer"><span class="gift" aria-hidden="true">🎁</span><div class="k" id="o-k"></div><div class="t" id="o-t"></div><div class="row"><span class="badge" id="o-b"></span><span class="v" id="o-v"></span></div></div>
  <p class="how" id="how"></p>
  <div class="card">
    <div class="closed" id="closed" style="display:none"></div>
    <form id="f" novalidate autocomplete="on">
      <label class="f"><span class="lt"><i class="ic">👤</i><span id="l-n"></span></span><input type="text" id="n" autocomplete="name" maxlength="100"></label>
      <label class="f"><span class="lt"><i class="ic">📱</i><span id="l-p"></span></span><input type="tel" id="p" autocomplete="tel" inputmode="tel" maxlength="30"></label>
      <label class="f"><span class="lt"><i class="ic">✉️</i><span><span id="l-e"></span> <small id="o-e"></small></span></span><input type="email" id="e" autocomplete="email" inputmode="email" maxlength="120"></label>
      <label class="f"><span class="lt"><i class="ic">🎂</i><span><span id="l-b"></span> <small id="o-b2"></small></span></span><input type="date" id="b" autocomplete="bday"><span class="hintf" id="h-b"></span></label>
      <input type="text" id="hp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="chk"><input type="checkbox" id="c"><span id="cl"></span></label>
      <div class="err" id="err"></div>
      <button class="go" id="go" type="submit"><span id="go-t"></span><span aria-hidden="true">→</span></button>
      <p class="agree"><span id="ag"></span> <a href="/privacy.html" target="_blank" rel="noopener" id="pv"></a></p>
    </form>
  </div>
</div>
<div id="done" style="display:none"></div>
</div>
<script>
const TX=${dictJs(TX)};const CTX=${safeJson(ctx)};
let lang=(function(){const q=new URLSearchParams(location.search).get('lang');if(TX[q])return q;try{const s=localStorage.getItem('loya_reg_lang');if(TX[s])return s}catch(e){}
for(const l of (navigator.languages||[navigator.language||''])){const k=String(l).slice(0,2).toLowerCase();if(k==='cs')return'sk';if(TX[k])return k}return TX[CTX.lang]?CTX.lang:'en'})();
const $=id=>document.getElementById(id);let coupon=null,repeat=false,mailed=false;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(iso){const p=String(iso).split('-');return lang==='en'?p[1]+'/'+p[2]+'/'+p[0]:p[2]+'.'+p[1]+'.'+p[0]}
function pct(n){return Number(n)>=100?TX[lang].free:'−'+n+'%'}
function render(){const T=TX[lang];document.documentElement.lang=lang;
$('lang').innerHTML=Object.keys(TX).map(k=>'<button type="button" data-l="'+k+'" class="'+(k===lang?'on':'')+'">'+k.toUpperCase()+'</button>').join('');
$('lang').querySelectorAll('button').forEach(b=>b.onclick=()=>{lang=b.dataset.l;try{localStorage.setItem('loya_reg_lang',lang)}catch(e){}render()});
const title=CTX.title||CTX.defaults[lang];
const J=CTX.mode==='join';
if(J){$('o-k').closest('.offer').style.display='none'}else{$('o-k').textContent='🎁 '+T.gift;$('o-t').textContent=title;$('o-b').textContent=pct(CTX.percent);$('o-v').textContent=T.valid(CTX.days)}
$('how').textContent=J?T.jHow:T.how;
$('l-n').textContent=T.lName;$('n').placeholder=T.pName;$('l-p').textContent=T.lPhone;$('p').placeholder=T.pPhone;
$('l-e').textContent=T.lEmail;$('o-e').textContent='· '+T.opt;$('e').placeholder=T.pEmail;$('l-b').textContent=T.lBday;$('o-b2').textContent='· '+T.opt;$('h-b').textContent=T.bdayHint;
$('cl').textContent=T.consent;$('go-t').textContent=J?T.jBtn:T.btn;$('ag').textContent=T.agree;$('pv').textContent=T.privacy;
if(!CTX.enabled){$('f').style.display='none';$('closed').style.display='block';$('closed').textContent=T.closed}
if(coupon){$('form-box').style.display='none';const d=$('done');d.style.display='block';
d.innerHTML=J?'<div class="ticket"><div class="h"><b>💳 '+esc(T.jOk)+'</b><div>'+esc(CTX.name)+' · '+esc(T.jTitle)+'</div></div>'+
'<div class="cut"></div><div class="b"><img alt="QR" src="'+esc(coupon.qr)+'"><div class="code">'+esc(coupon.code)+'</div><div class="small">'+esc(T.jShow)+(mailed?'<br>'+esc(T.mailed):'')+'</div></div></div><p class="tip">'+esc(T.shot)+'</p>'
:'<div class="ticket"><div class="h"><b>🎁 '+esc(repeat?T.again:T.okTitle)+'</b><div>'+esc(coupon.title||CTX.defaults[lang])+'</div><span class="badge">'+esc(pct(coupon.percent))+'</span></div>'+
'<div class="cut"></div><div class="b"><img alt="QR" src="'+esc(coupon.qr)+'"><div class="code">'+esc(coupon.code)+'</div><div class="until">'+esc(T.until)+' '+esc(fmt(coupon.expires))+'</div><div class="small">'+esc(T.show)+(mailed?'<br>'+esc(T.mailed):'')+'</div></div></div><p class="tip">'+esc(T.shot)+'</p>'}}
function burst(){try{if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;const cols=[getComputedStyle(document.documentElement).getPropertyValue('--a').trim(),getComputedStyle(document.documentElement).getPropertyValue('--b').trim(),'#fbbf24','#34d399','#60a5fa','#f472b6'];
const box=document.createElement('div');box.className='confetti';for(let i=0;i<46;i++){const e=document.createElement('i');e.style.left=(Math.random()*100)+'%';e.style.background=cols[i%cols.length];e.style.setProperty('--dx',((Math.random()-.5)*160)+'px');e.style.setProperty('--rot',(Math.random()*720-360)+'deg');e.style.animationDelay=(Math.random()*.5)+'s';e.style.animationDuration=(2+Math.random()*1.6)+'s';box.appendChild(e)}document.body.appendChild(box);setTimeout(()=>box.remove(),4600)}catch(e){}}
$('f').addEventListener('submit',async ev=>{ev.preventDefault();const T=TX[lang];$('err').textContent='';
const name=$('n').value.trim(),phone=$('p').value.trim(),email=$('e').value.trim();
if(!name){$('err').textContent=T.errName;$('n').focus();return}if(phone.replace(/\\D/g,'').length<7){$('err').textContent=T.errPhone;$('p').focus();return}
if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)){$('err').textContent=T.errEmail;$('e').focus();return}
$('go').disabled=true;$('go-t').textContent=T.wait;
try{const r=await fetch('/api/online-register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:CTX.slug,mode:CTX.mode,name,phone,email,birthday:$('b').value,lang,consent:$('c').checked,hp:$('hp').value})});
const j=await r.json();if(j.ok&&j.code){coupon=j;repeat=!!j.repeat;mailed=!!j.emailSent;render();window.scrollTo(0,0);if(!repeat)burst();return}
$('err').textContent=j.error==='too_many'||j.error==='daily_limit'?T.errMany:j.error==='closed'?T.closed:j.error==='email'?T.errEmail:j.error==='phone'?T.errPhone:j.error==='name'?T.errName:T.errGen}catch(e){$('err').textContent=T.errGen}
$('go').disabled=false;$('go-t').textContent=T.btn});
render();
</script></body></html>`;
}

module.exports = async (req, res) => {
  try {
    const row = await loadProfileBySlug(String((req.query && req.query.slug) || ''));
    if (!row) { res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8'); res.send('Not found'); return; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html(row.slug, row.profile || {}, req.query && req.query.mode));
  } catch (e) { res.status(500).send('Error'); }
};
module.exports.html = html;
