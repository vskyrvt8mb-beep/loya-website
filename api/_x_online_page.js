// GET /r/<slug> → /api/online?action=page&slug=<slug> — страница регистрации клиента по ссылке.
// Оформление — в цветах бизнеса: значок вида бизнеса, название, крупная карточка с подарком.
const { loadProfileBySlug, esc, DEFAULT_BONUS } = require('./_online');
const { dictJs } = require('./_dict');

const TX = {
  ru: { gift: 'Подарок за регистрацию', free: 'Бесплатно', valid: (d) => `Действует ${d} дн. после регистрации`, how: 'Заполните форму — QR-купон появится сразу. Покажите его в заведении и получите подарок и постоянную карту лояльности.',
    lName: 'Ваше имя', pName: 'Например, Анна', lPhone: 'Телефон', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'Пришлём копию купона', opt: 'необязательно', lBday: 'День рождения', bdayHint: 'Иногда дарим подарки ко дню рождения',
    consent: 'Хочу получать новости и акции', btn: 'Получить подарок', wait: 'Секунду…', agree: 'Нажимая кнопку, вы соглашаетесь с', privacy: 'политикой конфиденциальности',
    errName: 'Введите имя', errPhone: 'Введите номер телефона', errEmail: 'Проверьте email', errGen: 'Не получилось. Попробуйте ещё раз.', errMany: 'Слишком много попыток — попробуйте позже.', closed: 'Регистрация сейчас закрыта.',
    okTitle: 'Готово! Ваш подарок', again: 'Вы уже регистрировались — вот ваш подарок', until: 'Действует до', show: 'Покажите этот QR-код в заведении — там вы получите подарок и постоянную карту лояльности.', shot: 'Совет: сделайте скриншот, чтобы купон был под рукой.', mailed: 'Копия отправлена на ваш email.' },
  uk: { gift: 'Подарунок за реєстрацію', free: 'Безкоштовно', valid: (d) => `Діє ${d} дн. після реєстрації`, how: 'Заповніть форму — QR-купон з’явиться одразу. Покажіть його в закладі й отримайте подарунок і постійну картку лояльності.',
    lName: 'Ваше ім’я', pName: 'Наприклад, Анна', lPhone: 'Телефон', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'Надішлемо копію купона', opt: 'необов’язково', lBday: 'День народження', bdayHint: 'Іноді даруємо подарунки до дня народження',
    consent: 'Хочу отримувати новини й акції', btn: 'Отримати подарунок', wait: 'Секунду…', agree: 'Натискаючи кнопку, ви погоджуєтеся з', privacy: 'політикою конфіденційності',
    errName: 'Введіть ім’я', errPhone: 'Введіть номер телефону', errEmail: 'Перевірте email', errGen: 'Не вийшло. Спробуйте ще раз.', errMany: 'Забагато спроб — спробуйте пізніше.', closed: 'Реєстрація зараз закрита.',
    okTitle: 'Готово! Ваш подарунок', again: 'Ви вже реєструвалися — ось ваш подарунок', until: 'Діє до', show: 'Покажіть цей QR-код у закладі — там ви отримаєте подарунок і постійну картку лояльності.', shot: 'Порада: зробіть скриншот, щоб купон був під рукою.', mailed: 'Копію надіслано на ваш email.' },
  sk: { gift: 'Darček za registráciu', free: 'Zadarmo', valid: (d) => `Platí ${d} dní od registrácie`, how: 'Vyplňte formulár — QR kupón sa zobrazí hneď. Ukážte ho v prevádzke a získate darček aj stálu vernostnú kartu.',
    lName: 'Vaše meno', pName: 'Napríklad Anna', lPhone: 'Telefón', pPhone: '+421 900 000 000', lEmail: 'E-mail', pEmail: 'Pošleme kópiu kupónu', opt: 'nepovinné', lBday: 'Dátum narodenia', bdayHint: 'Občas dávame darčeky k narodeninám',
    consent: 'Chcem dostávať novinky a akcie', btn: 'Získať darček', wait: 'Moment…', agree: 'Kliknutím súhlasíte so', privacy: 'zásadami ochrany osobných údajov',
    errName: 'Zadajte meno', errPhone: 'Zadajte telefónne číslo', errEmail: 'Skontrolujte e-mail', errGen: 'Nepodarilo sa. Skúste znova.', errMany: 'Príliš veľa pokusov — skúste neskôr.', closed: 'Registrácia je momentálne zatvorená.',
    okTitle: 'Hotovo! Váš darček', again: 'Už ste sa registrovali — tu je váš darček', until: 'Platí do', show: 'Ukážte tento QR kód v prevádzke — dostanete darček aj stálu vernostnú kartu.', shot: 'Tip: urobte si snímku obrazovky, aby ste mali kupón po ruke.', mailed: 'Kópia bola odoslaná na váš e-mail.' },
  en: { gift: 'Sign-up gift', free: 'Free', valid: (d) => `Valid for ${d} days after sign-up`, how: 'Fill in the form — your QR coupon appears right away. Show it at the venue to get your gift and a permanent loyalty card.',
    lName: 'Your name', pName: 'e.g. Anna', lPhone: 'Phone', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'We’ll send a copy of the coupon', opt: 'optional', lBday: 'Birthday', bdayHint: 'We sometimes give birthday treats',
    consent: 'I’d like news and offers', btn: 'Get my gift', wait: 'One moment…', agree: 'By tapping the button you agree to the', privacy: 'privacy policy',
    errName: 'Enter your name', errPhone: 'Enter your phone number', errEmail: 'Check the email', errGen: 'Something went wrong. Please try again.', errMany: 'Too many attempts — please try later.', closed: 'Registration is closed right now.',
    okTitle: 'Done! Your gift', again: 'You’ve already signed up — here’s your gift', until: 'Valid until', show: 'Show this QR code at the venue — you’ll get your gift and a permanent loyalty card.', shot: 'Tip: take a screenshot so the coupon is always at hand.', mailed: 'A copy was sent to your email.' }
};
function safeJson(v) { return JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function hexRgb(h) { const n = parseInt(String(h).slice(1), 16) || 0xd4af37; return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }

function html(slug, p) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(p.color || '') ? p.color : '#d4af37';
  const ctx = { slug, name: p.name || 'Loya', lang: p.lang || 'ru', days: p.bonusDays || 14, percent: p.bonusPercent || 100, title: p.bonusTitle || '', defaults: DEFAULT_BONUS, enabled: !!p.enabled };
  return `<!DOCTYPE html><html lang="${esc(ctx.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0d0f14"><title>${esc(ctx.name)}</title>
<style>
:root{--a:${accent};--ar:${hexRgb(accent)};--bg:#0c0e13;--card:#151922;--line:rgba(255,255,255,.1);--mut:rgba(243,239,230,.62)}
*{box-sizing:border-box;margin:0}
body{font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;color:#f3efe6;min-height:100vh;padding:max(18px,env(safe-area-inset-top)) 16px 36px;
 background:radial-gradient(620px 380px at 100% 0%,rgba(var(--ar),.22),transparent 70%),radial-gradient(520px 340px at 0% 100%,rgba(var(--ar),.08),transparent 70%),var(--bg)}
.wrap{max-width:460px;margin:0 auto}
.top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.logo{width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:25px;background:rgba(var(--ar),.16);border:1px solid rgba(var(--ar),.38)}
.brand{font-size:19px;font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lang{display:flex;gap:4px}.lang button{border:1px solid var(--line);background:transparent;color:var(--mut);border-radius:8px;padding:5px 8px;font-weight:700;font-size:11.5px;cursor:pointer}
.lang button.on{background:var(--a);border-color:var(--a);color:#15110a}
.offer{position:relative;overflow:hidden;border-radius:24px;padding:22px 22px 20px;margin-bottom:16px;
 background:linear-gradient(135deg,rgba(var(--ar),.95),rgba(var(--ar),.55) 55%,rgba(var(--ar),.25));color:#15110a;box-shadow:0 20px 50px rgba(var(--ar),.25)}
.offer:after{content:"";position:absolute;right:-40px;top:-40px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.18)}
.offer .k{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;opacity:.75}
.offer .t{font-size:25px;font-weight:900;line-height:1.15;margin:6px 0 12px;position:relative;z-index:1}
.offer .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:relative;z-index:1}
.badge{background:#15110a;color:#fff;border-radius:999px;padding:6px 12px;font-weight:800;font-size:14px}
.offer .v{font-size:13px;font-weight:700;opacity:.8}
.how{color:var(--mut);font-size:14px;line-height:1.55;margin:0 4px 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:18px}
form{display:flex;flex-direction:column;gap:14px}
label.f{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700}
label.f small{font-weight:600;color:var(--mut);margin-left:4px}
input[type=text],input[type=tel],input[type=email],input[type=date]{height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;padding:0 14px;font-size:16px;font-family:inherit;width:100%;color-scheme:dark}
input::placeholder{color:rgba(243,239,230,.35)}
input:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 3px rgba(var(--ar),.22)}
.hintf{font-size:12px;color:var(--mut);font-weight:500}
.chk{display:flex;gap:12px;align-items:flex-start;font-size:14px;color:rgba(243,239,230,.85);cursor:pointer;line-height:1.4}
.chk input{width:22px;height:22px;margin:0;accent-color:var(--a);flex-shrink:0}
button.go{height:58px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#15110a;background:var(--a);cursor:pointer;box-shadow:0 14px 34px rgba(var(--ar),.35);display:flex;align-items:center;justify-content:center;gap:10px}
button.go[disabled]{opacity:.6}
.agree{font-size:12px;color:var(--mut);text-align:center;line-height:1.5}.agree a{color:var(--mut)}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.err{color:#fca5a5;font-size:14px;min-height:0}.err:not(:empty){padding:10px 12px;border-radius:12px;background:rgba(239,68,68,.12)}
.closed{padding:16px;border-radius:16px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4);text-align:center}
.ticket{position:relative;border-radius:24px;background:#fbf8f1;color:#1b1813;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.45)}
.ticket .h{padding:20px 22px 16px;background:linear-gradient(135deg,rgba(var(--ar),1),rgba(var(--ar),.7));color:#15110a}
.ticket .h b{display:block;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.75}
.ticket .h div{font-size:24px;font-weight:900;margin-top:4px;line-height:1.15}
.ticket .h span{display:inline-block;margin-top:10px}
.cut{position:relative;height:0;border-top:2px dashed rgba(0,0,0,.15);margin:0 18px}
.cut:before,.cut:after{content:"";position:absolute;top:-13px;width:24px;height:24px;border-radius:50%;background:var(--bg)}
.cut:before{left:-31px}.cut:after{right:-31px}
.ticket .b{padding:18px 22px 22px;text-align:center}
.ticket img{width:220px;height:220px;display:block;margin:2px auto 8px;image-rendering:pixelated}
.code{font-family:Consolas,Menlo,monospace;letter-spacing:2px;font-weight:800;font-size:16px}
.until{margin:12px 0 6px;font-weight:800}
.small{font-size:13.5px;line-height:1.5;color:#55503f}
.tip{margin-top:14px;font-size:13px;color:var(--mut);text-align:center;line-height:1.5}
</style></head><body><div class="wrap">
<div class="top"><div class="logo">${esc(p.emoji || '🎁')}</div><div class="brand">${esc(ctx.name)}</div><div class="lang" id="lang"></div></div>
<div id="form-box">
  <div class="offer"><div class="k" id="o-k"></div><div class="t" id="o-t"></div><div class="row"><span class="badge" id="o-b"></span><span class="v" id="o-v"></span></div></div>
  <p class="how" id="how"></p>
  <div class="card">
    <div class="closed" id="closed" style="display:none"></div>
    <form id="f" novalidate autocomplete="on">
      <label class="f"><span id="l-n"></span><input type="text" id="n" autocomplete="name" maxlength="100"></label>
      <label class="f"><span id="l-p"></span><input type="tel" id="p" autocomplete="tel" inputmode="tel" maxlength="30"></label>
      <label class="f"><span><span id="l-e"></span> <small id="o-e"></small></span><input type="email" id="e" autocomplete="email" inputmode="email" maxlength="120"></label>
      <label class="f"><span><span id="l-b"></span> <small id="o-b2"></small></span><input type="date" id="b" autocomplete="bday"><span class="hintf" id="h-b"></span></label>
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
$('o-k').textContent='🎁 '+T.gift;$('o-t').textContent=title;$('o-b').textContent=pct(CTX.percent);$('o-v').textContent=T.valid(CTX.days);
$('how').textContent=T.how;
$('l-n').textContent=T.lName;$('n').placeholder=T.pName;$('l-p').textContent=T.lPhone;$('p').placeholder=T.pPhone;
$('l-e').textContent=T.lEmail;$('o-e').textContent='· '+T.opt;$('e').placeholder=T.pEmail;$('l-b').textContent=T.lBday;$('o-b2').textContent='· '+T.opt;$('h-b').textContent=T.bdayHint;
$('cl').textContent=T.consent;$('go-t').textContent=T.btn;$('ag').textContent=T.agree;$('pv').textContent=T.privacy;
if(!CTX.enabled){$('f').style.display='none';$('closed').style.display='block';$('closed').textContent=T.closed}
if(coupon){$('form-box').style.display='none';const d=$('done');d.style.display='block';
d.innerHTML='<div class="ticket"><div class="h"><b>🎁 '+esc(repeat?T.again:T.okTitle)+'</b><div>'+esc(coupon.title||CTX.defaults[lang])+'</div><span class="badge">'+esc(pct(coupon.percent))+'</span></div>'+
'<div class="cut"></div><div class="b"><img alt="QR" src="'+esc(coupon.qr)+'"><div class="code">'+esc(coupon.code)+'</div><div class="until">'+esc(T.until)+' '+esc(fmt(coupon.expires))+'</div><div class="small">'+esc(T.show)+(mailed?'<br>'+esc(T.mailed):'')+'</div></div></div><p class="tip">'+esc(T.shot)+'</p>'}}
$('f').addEventListener('submit',async ev=>{ev.preventDefault();const T=TX[lang];$('err').textContent='';
const name=$('n').value.trim(),phone=$('p').value.trim(),email=$('e').value.trim();
if(!name){$('err').textContent=T.errName;$('n').focus();return}if(phone.replace(/\\D/g,'').length<7){$('err').textContent=T.errPhone;$('p').focus();return}
if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)){$('err').textContent=T.errEmail;$('e').focus();return}
$('go').disabled=true;$('go-t').textContent=T.wait;
try{const r=await fetch('/api/online-register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:CTX.slug,name,phone,email,birthday:$('b').value,lang,consent:$('c').checked,hp:$('hp').value})});
const j=await r.json();if(j.ok&&j.code){coupon=j;repeat=!!j.repeat;mailed=!!j.emailSent;render();window.scrollTo(0,0);return}
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
    res.status(200).send(html(row.slug, row.profile || {}));
  } catch (e) { res.status(500).send('Error'); }
};
module.exports.html = html;
