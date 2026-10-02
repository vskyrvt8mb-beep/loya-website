// GET /r/<slug> (через rewrite → /api/reg-page?slug=<slug>) — страница регистрации клиента по ссылке.
// Внешний вид — в стиле бизнеса: название, цвет, значок вида бизнеса; тексты на 4 языках.
const { loadProfileBySlug, esc, DEFAULT_BONUS } = require('./_online');

const TX = {
  ru: { h: (b) => `Подарок от «${b}»`, sub: (t, d) => `Зарегистрируйтесь и получите: <b>${t}</b>. Бонус действует ${d} дн. — покажите QR-код в заведении.`, name: 'Ваше имя', phone: 'Телефон', email: 'Email (необязательно)', bday: 'День рождения (необязательно)', consent: 'Хочу получать новости и акции', btn: 'Получить подарок', wait: 'Секунду…', errName: 'Введите имя', errPhone: 'Введите телефон', errEmail: 'Проверьте email', errGen: 'Не получилось. Попробуйте ещё раз.', errMany: 'Слишком много попыток — попробуйте позже.', closed: 'Регистрация сейчас закрыта.', okTitle: 'Готово! Ваш подарок', until: 'Действует до', show: 'Покажите этот QR-код в заведении — там вы получите постоянную карту лояльности.', mailed: 'Копия отправлена на ваш email.', again: 'Вы уже регистрировались — вот ваш подарок.', priv: 'Политика конфиденциальности' },
  uk: { h: (b) => `Подарунок від «${b}»`, sub: (t, d) => `Зареєструйтесь і отримайте: <b>${t}</b>. Бонус діє ${d} дн. — покажіть QR-код у закладі.`, name: 'Ваше ім’я', phone: 'Телефон', email: 'Email (необов’язково)', bday: 'День народження (необов’язково)', consent: 'Хочу отримувати новини й акції', btn: 'Отримати подарунок', wait: 'Секунду…', errName: 'Введіть ім’я', errPhone: 'Введіть телефон', errEmail: 'Перевірте email', errGen: 'Не вийшло. Спробуйте ще раз.', errMany: 'Забагато спроб — спробуйте пізніше.', closed: 'Реєстрація зараз закрита.', okTitle: 'Готово! Ваш подарунок', until: 'Діє до', show: 'Покажіть цей QR-код у закладі — там ви отримаєте постійну картку лояльності.', mailed: 'Копію надіслано на ваш email.', again: 'Ви вже реєструвалися — ось ваш подарунок.', priv: 'Політика конфіденційності' },
  sk: { h: (b) => `Darček od „${b}“`, sub: (t, d) => `Zaregistrujte sa a získate: <b>${t}</b>. Bonus platí ${d} dní — ukážte QR kód v prevádzke.`, name: 'Vaše meno', phone: 'Telefón', email: 'E-mail (nepovinné)', bday: 'Dátum narodenia (nepovinné)', consent: 'Chcem dostávať novinky a akcie', btn: 'Získať darček', wait: 'Moment…', errName: 'Zadajte meno', errPhone: 'Zadajte telefón', errEmail: 'Skontrolujte e-mail', errGen: 'Nepodarilo sa. Skúste znova.', errMany: 'Príliš veľa pokusov — skúste neskôr.', closed: 'Registrácia je momentálne zatvorená.', okTitle: 'Hotovo! Váš darček', until: 'Platí do', show: 'Ukážte tento QR kód v prevádzke — dostanete tam stálu vernostnú kartu.', mailed: 'Kópia bola odoslaná na váš e-mail.', again: 'Už ste sa registrovali — tu je váš darček.', priv: 'Ochrana osobných údajov' },
  en: { h: (b) => `A gift from ${b}`, sub: (t, d) => `Sign up and get: <b>${t}</b>. The bonus is valid for ${d} days — show the QR code at the venue.`, name: 'Your name', phone: 'Phone', email: 'Email (optional)', bday: 'Birthday (optional)', consent: 'I’d like news and offers', btn: 'Get my gift', wait: 'One moment…', errName: 'Enter your name', errPhone: 'Enter your phone', errEmail: 'Check the email', errGen: 'Something went wrong. Please try again.', errMany: 'Too many attempts — please try later.', closed: 'Registration is closed right now.', okTitle: 'Done! Your gift', until: 'Valid until', show: 'Show this QR code at the venue — you’ll get a permanent loyalty card there.', mailed: 'A copy was sent to your email.', again: 'You’ve already signed up — here’s your gift.', priv: 'Privacy policy' }
};
function safeJson(v) { return JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }

function html(slug, p) {
  const accent = p.color;
  const ctx = { slug, name: p.name, lang: p.lang, days: p.bonusDays, percent: p.bonusPercent, title: p.bonusTitle, defaults: DEFAULT_BONUS, enabled: p.enabled };
  return `<!DOCTYPE html><html lang="${p.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0d0f14"><title>${esc(p.name)}</title>
<style>
:root{--a:${accent};--ar:${hexRgb(accent)}}*{box-sizing:border-box;margin:0}
body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;background:radial-gradient(700px 420px at 85% -5%,rgba(var(--ar),.28),transparent 70%),#0d0f14;color:#f3efe6;min-height:100vh;padding:max(20px,env(safe-area-inset-top)) 18px 40px}
.wrap{max-width:440px;margin:0 auto}.lang{display:flex;gap:6px;justify-content:flex-end;margin-bottom:12px}
.lang button{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:#f3efe6;border-radius:8px;padding:5px 10px;font-weight:700;font-size:12px;cursor:pointer}.lang button.on{background:var(--a);border-color:var(--a);color:#16110a}
.brand{display:flex;align-items:center;gap:12px;margin:8px 0 14px}.brand i{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:28px;background:rgba(var(--ar),.18);border:1px solid rgba(var(--ar),.4)}
h1{font-size:25px;line-height:1.2}.sub{color:rgba(243,239,230,.72);line-height:1.55;margin:8px 0 18px;font-size:15.5px}.sub b{color:var(--a)}
form{display:flex;flex-direction:column;gap:10px}input[type=text],input[type=tel],input[type=email],input[type=date]{height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;padding:0 15px;font-size:16px;font-family:inherit;width:100%}
input:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 3px rgba(var(--ar),.22)}.chk{display:flex;gap:10px;align-items:center;font-size:14px;color:rgba(243,239,230,.8)}.chk input{width:20px;height:20px;accent-color:var(--a)}
button.go{height:56px;border:0;border-radius:16px;font-size:17px;font-weight:800;color:#16110a;background:var(--a);cursor:pointer;margin-top:4px;box-shadow:0 12px 30px rgba(var(--ar),.35)}button.go[disabled]{opacity:.6}
.hp{position:absolute;left:-9999px;opacity:0}.err{color:#fca5a5;font-size:14px;min-height:20px}.fine{margin-top:18px;font-size:12.5px;text-align:center}.fine a{color:rgba(243,239,230,.55)}
.coupon{text-align:center;padding:22px;border-radius:22px;background:rgba(255,255,255,.06);border:1px solid rgba(var(--ar),.45)}.coupon img{width:230px;height:230px;border-radius:16px;background:#fff;padding:8px;margin:12px auto}.code{font-family:Consolas,monospace;letter-spacing:2px;font-weight:700}
.pct{font-size:42px;font-weight:800;color:var(--a);line-height:1}.small{font-size:13.5px;color:rgba(243,239,230,.7);margin-top:10px;line-height:1.5}
</style></head><body><div class="wrap">
<div class="lang" id="lang"></div>
<div class="brand"><i>${esc(p.emoji)}</i><b style="font-size:19px">${esc(p.name)}</b></div>
<div id="form-box"><h1 id="h"></h1><p class="sub" id="sub"></p>
<form id="f" novalidate autocomplete="on"><input type="text" id="n" autocomplete="name" maxlength="100"><input type="tel" id="p" autocomplete="tel" inputmode="tel" maxlength="30"><input type="email" id="e" autocomplete="email" inputmode="email" maxlength="120"><input type="date" id="b" autocomplete="bday">
<input type="text" id="hp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true"><label class="chk"><input type="checkbox" id="c"><span id="cl"></span></label><div class="err" id="err"></div><button class="go" id="go" type="submit"></button></form></div>
<div id="done" style="display:none"></div>
<p class="fine"><a href="/privacy.html" id="priv" target="_blank" rel="noopener"></a></p></div>
<script>
const TX=${safeJson(TX)};const CTX=${safeJson(ctx)};
let lang=(function(){const q=new URLSearchParams(location.search).get('lang');if(TX[q])return q;try{const s=localStorage.getItem('loya_reg_lang');if(TX[s])return s}catch(e){}
for(const l of (navigator.languages||[navigator.language||''])){const k=String(l).slice(0,2).toLowerCase();if(k==='cs')return'sk';if(TX[k])return k}return TX[CTX.lang]?CTX.lang:'en'})();
const $=id=>document.getElementById(id);let coupon=null,repeat=false,mailed=false;
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function fmt(iso){const[y,m,d]=iso.split('-');return lang==='en'?m+'/'+d+'/'+y:d+'.'+m+'.'+y}
function render(){const T=TX[lang];document.documentElement.lang=lang;
$('lang').innerHTML=Object.keys(TX).map(k=>'<button type="button" data-l="'+k+'" class="'+(k===lang?'on':'')+'">'+k.toUpperCase()+'</button>').join('');
$('lang').querySelectorAll('button').forEach(b=>b.onclick=()=>{lang=b.dataset.l;try{localStorage.setItem('loya_reg_lang',lang)}catch(e){}render()});
const title=CTX.title||CTX.defaults[lang];
$('h').textContent=T.h(CTX.name);$('sub').innerHTML=CTX.enabled?T.sub(esc(title),CTX.days):esc(T.closed);
$('n').placeholder=T.name;$('p').placeholder=T.phone;$('e').placeholder=T.email;$('cl').textContent=T.consent;$('go').textContent=T.btn;$('priv').textContent=T.priv;
$('b').title=T.bday;$('b').setAttribute('aria-label',T.bday);if(!CTX.enabled)$('f').style.display='none';
if(coupon){$('form-box').style.display='none';const d=$('done');d.style.display='block';
d.innerHTML='<div class="coupon"><b>'+esc(repeat?T.again:T.okTitle)+'</b><div style="margin-top:10px" class="pct">−'+coupon.percent+'%</div><div style="margin-top:6px">'+esc(coupon.title||CTX.defaults[lang])+'</div><img alt="QR" src="'+coupon.qr+'"><div class="code">'+esc(coupon.code)+'</div><div class="small"><b>'+esc(T.until)+' '+fmt(coupon.expires)+'</b><br>'+esc(T.show)+(mailed?'<br>'+esc(T.mailed):'')+'</div></div>'}}
$('f').addEventListener('submit',async ev=>{ev.preventDefault();const T=TX[lang];$('err').textContent='';
const name=$('n').value.trim(),phone=$('p').value.trim(),email=$('e').value.trim();
if(!name){$('err').textContent=T.errName;return}if(phone.replace(/\\D/g,'').length<7){$('err').textContent=T.errPhone;return}
if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)){$('err').textContent=T.errEmail;return}
$('go').disabled=true;$('go').textContent=T.wait;
try{const r=await fetch('/api/online-register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:CTX.slug,name,phone,email,birthday:$('b').value,lang,consent:$('c').checked,hp:$('hp').value})});
const j=await r.json();if(j.ok&&j.code){coupon=j;repeat=!!j.repeat;mailed=!!j.emailSent;render();return}
$('err').textContent=j.error==='too_many'||j.error==='daily_limit'?T.errMany:j.error==='closed'?T.closed:j.error==='email'?T.errEmail:j.error==='phone'?T.errPhone:j.error==='name'?T.errName:T.errGen}catch(e){$('err').textContent=T.errGen}
$('go').disabled=false;$('go').textContent=T.btn});
render();
</script></body></html>`;
}

module.exports = async (req, res) => {
  try {
    const row = await loadProfileBySlug(String(req.query.slug || ''));
    if (!row) { res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8'); res.send('Not found'); return; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html(row.slug, row.profile || {}));
  } catch (e) { res.status(500).send('Error'); }
};
