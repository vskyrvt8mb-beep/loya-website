// GET /b/<slug> → /api/online?action=book-page&slug=<slug> — онлайн-запись: услуга → мастер → день → время → контакты.
// /b/<slug>?c=<token> — просмотр и отмена своей записи (ссылка из письма).
const { esc } = require('./_online');
const { dictJs } = require('./_dict');
const { palette, hexRgb, safeJson } = require('./_x_online_page');
const B = require('./_book');

const TX = {
  ru: { title: 'Онлайн-запись', s1: 'Услуга', s2: 'Мастер', s3: 'День', s4: 'Время', s5: 'Ваши данные', any: 'Любой мастер', min: 'мин', noSlots: 'На этот день свободного времени нет — выберите другой.', noDays: 'Свободного времени пока нет. Позвоните нам!', loading: 'Загружаем…',
    lName: 'Ваше имя', pName: 'Например, Анна', lPhone: 'Телефон', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'Пришлём подтверждение и напоминание', lNote: 'Комментарий', pNote: 'Если хотите что-то уточнить', opt: 'необязательно', consent: 'Хочу получать новости и акции',
    book: (d, t) => `Записаться · ${d}, ${t}`, wait: 'Секунду…', agree: 'Нажимая кнопку, вы соглашаетесь с', privacy: 'политикой конфиденциальности',
    errName: 'Введите имя', errPhone: 'Введите номер телефона', errEmail: 'Проверьте email', errTaken: 'Это время только что заняли — выберите другое.', errMany: 'Слишком много попыток — попробуйте позже.', errMax: 'У вас уже есть несколько записей. Позвоните нам, чтобы записаться ещё.', errGen: 'Не получилось. Попробуйте ещё раз.', closed: 'Онлайн-запись сейчас закрыта.',
    okTitle: 'Вы записаны! 🎉', when: 'Когда', what: 'Услуга', who: 'Мастер', where: 'Адрес', mailed: 'Подтверждение отправлено на ваш email. Накануне пришлём напоминание.', ics: 'Добавить в календарь', saveLink: 'Сохраните эту страницу — по ссылке можно отменить запись.',
    yours: 'Ваша запись', cancel: 'Отменить запись', cancelQ: 'Точно отменить запись?', cancelled: 'Запись отменена.', again: 'Записаться снова', past: 'Эта запись уже прошла.', nf: 'Запись не найдена.', st: { booked: 'Активна', cancelled: 'Отменена', done: 'Состоялась', noshow: 'Не состоялась' } },
  uk: { title: 'Онлайн-запис', s1: 'Послуга', s2: 'Майстер', s3: 'День', s4: 'Час', s5: 'Ваші дані', any: 'Будь-який майстер', min: 'хв', noSlots: 'На цей день вільного часу немає — оберіть інший.', noDays: 'Вільного часу поки немає. Зателефонуйте нам!', loading: 'Завантажуємо…',
    lName: 'Ваше ім’я', pName: 'Наприклад, Анна', lPhone: 'Телефон', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'Надішлемо підтвердження й нагадування', lNote: 'Коментар', pNote: 'Якщо хочете щось уточнити', opt: 'необов’язково', consent: 'Хочу отримувати новини й акції',
    book: (d, t) => `Записатися · ${d}, ${t}`, wait: 'Секунду…', agree: 'Натискаючи кнопку, ви погоджуєтеся з', privacy: 'політикою конфіденційності',
    errName: 'Введіть ім’я', errPhone: 'Введіть номер телефону', errEmail: 'Перевірте email', errTaken: 'Цей час щойно зайняли — оберіть інший.', errMany: 'Забагато спроб — спробуйте пізніше.', errMax: 'У вас уже є кілька записів. Зателефонуйте нам, щоб записатися ще.', errGen: 'Не вийшло. Спробуйте ще раз.', closed: 'Онлайн-запис зараз закритий.',
    okTitle: 'Ви записані! 🎉', when: 'Коли', what: 'Послуга', who: 'Майстер', where: 'Адреса', mailed: 'Підтвердження надіслано на ваш email. Напередодні надішлемо нагадування.', ics: 'Додати в календар', saveLink: 'Збережіть цю сторінку — за посиланням можна скасувати запис.',
    yours: 'Ваш запис', cancel: 'Скасувати запис', cancelQ: 'Точно скасувати запис?', cancelled: 'Запис скасовано.', again: 'Записатися знову', past: 'Цей запис уже минув.', nf: 'Запис не знайдено.', st: { booked: 'Активний', cancelled: 'Скасований', done: 'Відбувся', noshow: 'Не відбувся' } },
  sk: { title: 'Online rezervácia', s1: 'Služba', s2: 'Pracovník', s3: 'Deň', s4: 'Čas', s5: 'Vaše údaje', any: 'Ktokoľvek', min: 'min', noSlots: 'V tento deň nie je voľný čas — vyberte iný.', noDays: 'Momentálne nie je voľný termín. Zavolajte nám!', loading: 'Načítavam…',
    lName: 'Vaše meno', pName: 'Napríklad Anna', lPhone: 'Telefón', pPhone: '+421 900 000 000', lEmail: 'E-mail', pEmail: 'Pošleme potvrdenie a pripomienku', lNote: 'Poznámka', pNote: 'Ak chcete niečo upresniť', opt: 'nepovinné', consent: 'Chcem dostávať novinky a akcie',
    book: (d, t) => `Rezervovať · ${d}, ${t}`, wait: 'Moment…', agree: 'Kliknutím súhlasíte so', privacy: 'zásadami ochrany osobných údajov',
    errName: 'Zadajte meno', errPhone: 'Zadajte telefónne číslo', errEmail: 'Skontrolujte e-mail', errTaken: 'Tento čas práve niekto obsadil — vyberte iný.', errMany: 'Príliš veľa pokusov — skúste neskôr.', errMax: 'Už máte niekoľko rezervácií. Ak chcete ďalšiu, zavolajte nám.', errGen: 'Nepodarilo sa. Skúste znova.', closed: 'Online rezervácia je momentálne zatvorená.',
    okTitle: 'Ste objednaný! 🎉', when: 'Kedy', what: 'Služba', who: 'Pracovník', where: 'Adresa', mailed: 'Potvrdenie sme poslali na váš e-mail. Deň vopred pošleme pripomienku.', ics: 'Pridať do kalendára', saveLink: 'Uložte si túto stránku — cez odkaz môžete rezerváciu zrušiť.',
    yours: 'Vaša rezervácia', cancel: 'Zrušiť rezerváciu', cancelQ: 'Naozaj zrušiť rezerváciu?', cancelled: 'Rezervácia je zrušená.', again: 'Rezervovať znova', past: 'Táto rezervácia už prebehla.', nf: 'Rezervácia sa nenašla.', st: { booked: 'Aktívna', cancelled: 'Zrušená', done: 'Uskutočnená', noshow: 'Neuskutočnená' } },
  en: { title: 'Book online', s1: 'Service', s2: 'Specialist', s3: 'Day', s4: 'Time', s5: 'Your details', any: 'Anyone', min: 'min', noSlots: 'No free time on this day — please pick another.', noDays: 'No free times right now. Give us a call!', loading: 'Loading…',
    lName: 'Your name', pName: 'e.g. Anna', lPhone: 'Phone', pPhone: '+421 900 000 000', lEmail: 'Email', pEmail: 'We’ll send a confirmation and a reminder', lNote: 'Note', pNote: 'Anything we should know', opt: 'optional', consent: 'I’d like news and offers',
    book: (d, t) => `Book · ${d}, ${t}`, wait: 'One moment…', agree: 'By tapping the button you agree to the', privacy: 'privacy policy',
    errName: 'Enter your name', errPhone: 'Enter your phone number', errEmail: 'Check the email', errTaken: 'Someone just took this time — please pick another.', errMany: 'Too many attempts — please try later.', errMax: 'You already have several bookings. Please call us to book more.', errGen: 'Something went wrong. Please try again.', closed: 'Online booking is closed right now.',
    okTitle: 'You’re booked! 🎉', when: 'When', what: 'Service', who: 'With', where: 'Address', mailed: 'We sent a confirmation to your email, and we’ll remind you the day before.', ics: 'Add to calendar', saveLink: 'Keep this page — you can cancel the booking from this link.',
    yours: 'Your booking', cancel: 'Cancel booking', cancelQ: 'Cancel this booking?', cancelled: 'Booking cancelled.', again: 'Book again', past: 'This booking is in the past.', nf: 'Booking not found.', st: { booked: 'Active', cancelled: 'Cancelled', done: 'Completed', noshow: 'Missed' } }
};

function page(row, mode) {
  const prof = row.profile || {};
  const pal = palette(prof.color, prof.niche);
  const bk = row.book;
  const ctx = {
    slug: row.slug, brand: prof.name || 'Loya', lang: prof.lang || 'en', enabled: !!prof.enabled && bk.on,
    services: bk.services, staff: bk.staff.map(x => ({ id: x.id, n: x.n, s: x.s })), note: bk.note, address: bk.address, phone: bk.phone, currency: bk.currency || prof.currency || 'EUR', days: bk.days, tz: bk.tz, today: B.nowLocal(bk.tz).date
  };
  return `<!DOCTYPE html><html lang="${esc(ctx.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0d0f14"><title>${esc(ctx.brand)}</title>
<style>
:root{--a:${pal.a};--b:${pal.b};--ar:${hexRgb(pal.a)};--br:${hexRgb(pal.b)};--on:${pal.on};--bg:#0c0e13;--line:rgba(255,255,255,.12);--mut:rgba(243,239,230,.7)}
*{box-sizing:border-box;margin:0}
body{font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;color:#f6f2ea;min-height:100vh;padding:max(18px,env(safe-area-inset-top)) 16px 120px;overflow-x:hidden;
 background:radial-gradient(640px 420px at 100% -4%,rgba(var(--ar),.3),transparent 70%),radial-gradient(560px 420px at -6% 40%,rgba(var(--br),.18),transparent 70%),var(--bg)}
.wrap{max-width:560px;margin:0 auto}
.top{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.logo{width:52px;height:52px;border-radius:17px;display:flex;align-items:center;justify-content:center;font-size:27px;background:linear-gradient(135deg,rgba(var(--ar),.35),rgba(var(--br),.28));border:1px solid rgba(var(--ar),.55)}
.brand{flex:1;min-width:0}.brand b{font-size:20px;font-weight:800;overflow:hidden;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}@media(max-width:560px){.top{flex-wrap:wrap;row-gap:12px}.lang{order:-1;flex-basis:100%;justify-content:flex-end}}.brand span{font-size:13px;color:var(--mut);font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.lang{display:flex;gap:4px}.lang button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.06);color:#f6f2ea;border-radius:9px;padding:6px 9px;font-weight:800;font-size:11.5px;cursor:pointer;min-height:32px}
.lang button.on{background:linear-gradient(135deg,var(--a),var(--b));border-color:transparent;color:var(--on)}
.info{color:var(--mut);font-size:14px;line-height:1.5;margin:12px 2px 4px}
.sec{margin-top:22px}
.sec h2{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:800;margin-bottom:10px}
.sec h2 i{font-style:normal;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:13px;background:linear-gradient(135deg,var(--a),var(--b));color:var(--on)}
.svc{display:flex;flex-direction:column;gap:8px}
.opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;border-radius:16px;border:1.5px solid var(--line);background:rgba(255,255,255,.04);color:inherit;font:inherit;cursor:pointer;transition:border-color .12s,background .12s}
.opt b{flex:1;font-size:15.5px}.opt small{color:var(--mut);font-size:13px;white-space:nowrap}.opt .pr{font-weight:800;white-space:nowrap}
.opt.on{border-color:var(--a);background:rgba(var(--ar),.14)}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{padding:10px 15px;border-radius:999px;border:1.5px solid var(--line);background:rgba(255,255,255,.04);color:inherit;font:inherit;font-weight:700;cursor:pointer;font-size:14.5px}
.chip.on{border-color:transparent;background:linear-gradient(135deg,var(--a),var(--b));color:var(--on)}
.days{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.day{flex:0 0 64px;height:76px;border-radius:16px;border:1.5px solid var(--line);background:rgba(255,255,255,.04);color:inherit;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.day small{font-size:11.5px;color:var(--mut);text-transform:uppercase;font-weight:700}.day b{font-size:21px}.day span{font-size:11.5px;color:var(--mut)}
.day.on{border-color:transparent;background:linear-gradient(135deg,var(--a),var(--b));color:var(--on)}.day.on small,.day.on span{color:var(--on);opacity:.85}
.day[disabled]{opacity:.32;cursor:default}
.times{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px}
.time{height:46px;border-radius:13px;border:1.5px solid var(--line);background:rgba(255,255,255,.04);color:inherit;font:inherit;font-weight:800;cursor:pointer;font-size:15.5px}
.time.on{border-color:transparent;background:linear-gradient(135deg,var(--a),var(--b));color:var(--on)}
.empty{color:var(--mut);font-size:14.5px;padding:12px 2px}
.card{background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.03));border:1px solid var(--line);border-radius:22px;padding:18px}
form{display:flex;flex-direction:column;gap:13px}
label.f{display:flex;flex-direction:column;gap:6px;font-size:13.5px;font-weight:700}
label.f small{font-weight:600;color:var(--mut)}
input[type=text],input[type=tel],input[type=email],textarea{height:52px;border-radius:14px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:inherit;padding:0 14px;font-size:16px;font-family:inherit;width:100%}
textarea{height:auto;min-height:70px;padding:12px 14px;resize:vertical}
input:focus,textarea:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 4px rgba(var(--ar),.25)}
.chk{display:flex;gap:12px;align-items:flex-start;font-size:14.5px;cursor:pointer;line-height:1.4}
.chk input{width:22px;height:22px;margin:0;accent-color:var(--a);flex-shrink:0}
.go{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:58px;padding:0 16px;border:0;border-radius:18px;font-size:16.5px;font-weight:900;color:var(--on);background:linear-gradient(135deg,var(--a),var(--b));cursor:pointer;box-shadow:0 14px 34px rgba(var(--ar),.38);text-decoration:none;text-align:center}
.go[disabled]{opacity:.55;box-shadow:none}
.ghost{display:flex;align-items:center;justify-content:center;width:100%;min-height:50px;border-radius:16px;border:1.5px solid var(--line);background:none;color:inherit;font:inherit;font-weight:800;cursor:pointer;margin-top:10px;text-decoration:none}
.agree{font-size:12.5px;color:var(--mut);text-align:center;line-height:1.5}.agree a{color:#fff}
.err{color:#ffd0d0;font-size:14.5px}.err:not(:empty){padding:11px 13px;border-radius:13px;background:rgba(239,68,68,.22);border:1px solid rgba(248,113,113,.55)}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.closed{padding:16px;border-radius:16px;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.55);text-align:center;margin-top:20px}
.ticket{border-radius:24px;background:#fffaf0;color:#1b1813;overflow:hidden;margin-top:18px;box-shadow:0 26px 64px rgba(0,0,0,.5)}
.ticket .h{padding:20px 22px;background:linear-gradient(135deg,var(--a),var(--b));color:var(--on)}
.ticket .h b{font-size:22px;font-weight:900}
.ticket table{width:100%;border-collapse:collapse}.ticket td{padding:11px 22px;border-bottom:1px solid #eee3cf;font-size:15px}.ticket td:first-child{color:#7a705c;width:34%}.ticket td:last-child{font-weight:800}
.ticket .f{padding:14px 22px 18px;font-size:14px;line-height:1.5;color:#4a4536}
.st{display:inline-block;padding:4px 10px;border-radius:999px;background:#efe5d2;font-size:13px;font-weight:800}
</style></head><body><div class="wrap">
<div class="top"><div class="logo">${esc(prof.emoji || '📅')}</div><div class="brand"><b>${esc(ctx.brand)}</b><span id="ttl"></span></div><div class="lang" id="lang"></div></div>
<div id="app"></div>
</div>
<script>
const TX=${dictJs(TX)};const CTX=${safeJson(ctx)};const MODE=${safeJson(mode || {})};
let lang=(function(){const q=new URLSearchParams(location.search).get('lang');if(TX[q])return q;try{const s=localStorage.getItem('loya_reg_lang');if(TX[s])return s}catch(e){}
for(const l of (navigator.languages||[navigator.language||''])){const k=String(l).slice(0,2).toLowerCase();if(k==='cs')return'sk';if(TX[k])return k}return TX[CTX.lang]?CTX.lang:'en'})();
const LOC={ru:'ru-RU',uk:'uk-UA',sk:'sk-SK',en:'en-GB'};
const $=id=>document.getElementById(id);
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function addDays(d,n){const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
function fmtDay(d,o){return new Date(d+'T12:00:00Z').toLocaleDateString(LOC[lang],Object.assign({timeZone:'UTC'},o))}
function money(p){if(p==null)return'';try{return new Intl.NumberFormat(LOC[lang],{style:'currency',currency:CTX.currency,currencyDisplay:'narrowSymbol'}).format(p)}catch(e){try{return new Intl.NumberFormat(LOC[lang],{style:'currency',currency:CTX.currency}).format(p)}catch(e2){}return p+' '+CTX.currency}}
const S={svc:null,staff:'',date:null,time:null,days:null,slots:null,done:null,view:MODE.token?'mine':'book',mine:null,busy:false};
function staffFor(id){return CTX.staff.filter(x=>!x.s.length||x.s.includes(id))}
async function api(path,opts){const r=await fetch(path,opts);return r.json()}
async function loadDays(){S.days=null;S.slots=null;S.date=null;S.time=null;render();
 const j=await api('/api/book-slots?slug='+encodeURIComponent(CTX.slug)+'&service='+encodeURIComponent(S.svc)+'&staff='+encodeURIComponent(S.staff));
 S.days=j.ok?j.days:[];if(S.days.length){S.date=S.days[0];await loadSlots();}else render()}
async function loadSlots(){S.slots=null;S.time=null;render();
 const j=await api('/api/book-slots?slug='+encodeURIComponent(CTX.slug)+'&service='+encodeURIComponent(S.svc)+'&staff='+encodeURIComponent(S.staff)+'&date='+S.date);
 S.slots=j.ok?j.slots:[];render()}
function langBar(){$('lang').innerHTML=Object.keys(TX).map(k=>'<button type="button" data-l="'+k+'" class="'+(k===lang?'on':'')+'">'+k.toUpperCase()+'</button>').join('');
 $('lang').querySelectorAll('button').forEach(b=>b.onclick=()=>{lang=b.dataset.l;try{localStorage.setItem('loya_reg_lang',lang)}catch(e){}keepForm();render()})}
let form={n:'',p:'',e:'',note:'',c:false};
function keepForm(){if($('n')){form={n:$('n').value,p:$('p').value,e:$('e').value,note:$('note').value,c:$('c').checked}}}
function render(){const T=TX[lang];document.documentElement.lang=lang;$('ttl').textContent=T.title;langBar();const a=$('app');
if(S.view==='mine'){renderMine();return}
if(S.done){const d=S.done;a.innerHTML='<div class="ticket"><div class="h"><b>'+esc(T.okTitle)+'</b></div><table>'+
 '<tr><td>'+esc(T.when)+'</td><td>'+esc(fmtDay(d.date,{weekday:'long',day:'numeric',month:'long'}))+', '+esc(d.time)+'</td></tr>'+
 '<tr><td>'+esc(T.what)+'</td><td>'+esc(d.service)+'</td></tr>'+(d.staff?'<tr><td>'+esc(T.who)+'</td><td>'+esc(d.staff)+'</td></tr>':'')+(CTX.address?'<tr><td>'+esc(T.where)+'</td><td>'+esc(CTX.address)+'</td></tr>':'')+
 '</table><div class="f">'+(d.emailSent?esc(T.mailed)+'<br>':'')+esc(T.saveLink)+'</div></div><a class="ghost" id="ics" download="booking.ics">📅 '+esc(T.ics)+'</a>';
 $('ics').href=icsHref(d);return}
if(!CTX.enabled){a.innerHTML='<div class="closed">'+esc(T.closed)+(CTX.phone?'<br><a href="tel:'+esc(CTX.phone)+'" style="color:#fff">'+esc(CTX.phone)+'</a>':'')+'</div>';return}
let h=(CTX.note?'<p class="info">'+esc(CTX.note)+'</p>':'')+(CTX.address?'<p class="info">📍 '+esc(CTX.address)+'</p>':'');
h+='<div class="sec"><h2><i>1</i>'+esc(T.s1)+'</h2><div class="svc">'+CTX.services.map(s=>'<button type="button" class="opt'+(S.svc===s.id?' on':'')+'" data-svc="'+esc(s.id)+'"><b>'+esc(s.n)+'</b><small>'+s.d+' '+esc(T.min)+'</small>'+(s.p!=null?'<span class="pr">'+esc(money(s.p))+'</span>':'')+'</button>').join('')+'</div></div>';
let n=2;
if(S.svc){const st=staffFor(S.svc);
 if(CTX.staff.length&&st.length){h+='<div class="sec"><h2><i>'+(n++)+'</i>'+esc(T.s2)+'</h2><div class="chips">'+(st.length>1?'<button type="button" class="chip'+(!S.staff?' on':'')+'" data-st="">'+esc(T.any)+'</button>':'')+st.map(x=>'<button type="button" class="chip'+(S.staff===x.id||(st.length===1)?' on':'')+'" data-st="'+esc(x.id)+'">'+esc(x.n)+'</button>').join('')+'</div></div>'}
 h+='<div class="sec"><h2><i>'+(n++)+'</i>'+esc(T.s3)+'</h2>';
 if(S.days===null)h+='<p class="empty">'+esc(T.loading)+'</p>';
 else if(!S.days.length)h+='<p class="empty">'+esc(T.noDays)+(CTX.phone?' <a href="tel:'+esc(CTX.phone)+'" style="color:#fff">'+esc(CTX.phone)+'</a>':'')+'</p>';
 else{const last=S.days[S.days.length-1];let ds=[];for(let d=CTX.today;d<=last;d=addDays(d,1))ds.push(d);
  h+='<div class="days" id="days">'+ds.map(d=>{const ok=S.days.includes(d);return'<button type="button" class="day'+(S.date===d?' on':'')+'" data-d="'+d+'"'+(ok?'':' disabled')+'><small>'+esc(fmtDay(d,{weekday:'short'}))+'</small><b>'+esc(fmtDay(d,{day:'numeric'}).replace(/[.]$/,''))+'</b><span>'+esc(fmtDay(d,{month:'short'}).replace(/[.]$/,''))+'</span></button>'}).join('')+'</div>'}
 h+='</div>';
 if(S.date){h+='<div class="sec"><h2><i>'+(n++)+'</i>'+esc(T.s4)+' · '+esc(fmtDay(S.date,{weekday:'long',day:'numeric',month:'long'}))+'</h2>';
  if(S.slots===null)h+='<p class="empty">'+esc(T.loading)+'</p>';else if(!S.slots.length)h+='<p class="empty">'+esc(T.noSlots)+'</p>';
  else h+='<div class="times">'+S.slots.map(t=>'<button type="button" class="time'+(S.time===t?' on':'')+'" data-t="'+t+'">'+t+'</button>').join('')+'</div>';h+='</div>'}
 if(S.time){h+='<div class="sec"><h2><i>'+(n++)+'</i>'+esc(T.s5)+'</h2><div class="card"><form id="f" novalidate>'+
  '<label class="f">'+esc(T.lName)+'<input type="text" id="n" autocomplete="name" maxlength="100" placeholder="'+esc(T.pName)+'"></label>'+
  '<label class="f">'+esc(T.lPhone)+'<input type="tel" id="p" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="'+esc(T.pPhone)+'"></label>'+
  '<label class="f"><span>'+esc(T.lEmail)+' <small>· '+esc(T.opt)+'</small></span><input type="email" id="e" autocomplete="email" maxlength="120" placeholder="'+esc(T.pEmail)+'"></label>'+
  '<label class="f"><span>'+esc(T.lNote)+' <small>· '+esc(T.opt)+'</small></span><textarea id="note" maxlength="300" placeholder="'+esc(T.pNote)+'"></textarea></label>'+
  '<input type="text" id="hp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">'+
  '<label class="chk"><input type="checkbox" id="c"><span>'+esc(T.consent)+'</span></label><div class="err" id="err"></div>'+
  '<button class="go" id="go" type="submit">'+esc(T.book(fmtDay(S.date,{day:'numeric',month:'short'}),S.time))+'</button>'+
  '<p class="agree">'+esc(T.agree)+' <a href="/privacy.html" target="_blank" rel="noopener">'+esc(T.privacy)+'</a></p></form></div></div>'}
}
a.innerHTML=h;
if($('n')){$('n').value=form.n;$('p').value=form.p;$('e').value=form.e;$('note').value=form.note;$('c').checked=form.c;$('f').onsubmit=submit}
a.querySelectorAll('[data-svc]').forEach(b=>b.onclick=()=>{S.svc=b.dataset.svc;const st=staffFor(S.svc);S.staff=st.length===1&&CTX.staff.length?st[0].id:'';loadDays()});
a.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{S.staff=b.dataset.st;loadDays()});
a.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{if(b.disabled)return;S.date=b.dataset.d;loadSlots()});
a.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{keepForm();S.time=b.dataset.t;render();setTimeout(()=>{const f=$('n');if(f){f.scrollIntoView({behavior:'smooth',block:'center'})}},60)});
const sel=a.querySelector('.day.on');if(sel)sel.scrollIntoView({inline:'center',block:'nearest'})}
function icsHref(d){const dt=d.date.replace(/-/g,'')+'T'+d.time.replace(':','')+'00';const svc=CTX.services.find(s=>s.n===d.service);const dur=svc?svc.d:60;
 const end=new Date(Date.UTC(+d.date.slice(0,4),+d.date.slice(5,7)-1,+d.date.slice(8,10),+d.time.slice(0,2),+d.time.slice(3,5)+dur));const pad=x=>String(x).padStart(2,'0');
 const de=end.getUTCFullYear()+pad(end.getUTCMonth()+1)+pad(end.getUTCDate())+'T'+pad(end.getUTCHours())+pad(end.getUTCMinutes())+'00';
 const clean=s=>String(s||'').replace(/[\\r\\n,;]/g,' ');
 const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Loya//Booking//EN','BEGIN:VEVENT','UID:'+d.token+'@loya-loyalty.com','DTSTART;TZID='+CTX.tz+':'+dt,'DTEND;TZID='+CTX.tz+':'+de,'SUMMARY:'+clean(d.service+' — '+CTX.brand),(CTX.address?'LOCATION:'+clean(CTX.address):''),'END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\\r\\n');
 return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(ics)}
async function submit(ev){ev.preventDefault();const T=TX[lang];if(S.busy)return;$('err').textContent='';keepForm();
 const name=form.n.trim(),phone=form.p.trim(),email=form.e.trim();
 if(!name){$('err').textContent=T.errName;$('n').focus();return}if(phone.replace(/\\D/g,'').length<7){$('err').textContent=T.errPhone;$('p').focus();return}
 if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)){$('err').textContent=T.errEmail;$('e').focus();return}
 S.busy=true;$('go').disabled=true;$('go').textContent=T.wait;
 try{const j=await api('/api/book-create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:CTX.slug,service:S.svc,staff:S.staff,date:S.date,time:S.time,name,phone,email,note:form.note.trim(),lang,consent:form.c,hp:$('hp').value})});
  if(j.ok){S.done=j;history.replaceState(null,'','?c='+j.token);render();window.scrollTo(0,0);S.busy=false;return}
  if(j.error==='slot_taken'){S.busy=false;await loadSlots();$('err')&&($('err').textContent=T.errTaken);return}
  $('err').textContent=j.error==='too_many'||j.error==='daily_limit'?T.errMany:j.error==='too_many_bookings'?T.errMax:j.error==='closed'?T.closed:j.error==='email'?T.errEmail:j.error==='phone'?T.errPhone:j.error==='name'?T.errName:T.errGen}
 catch(e){$('err').textContent=T.errGen}
 S.busy=false;$('go').disabled=false;$('go').textContent=T.book(fmtDay(S.date,{day:'numeric',month:'short'}),S.time)}
async function renderMine(){const T=TX[lang];const a=$('app');
 if(!S.mine){a.innerHTML='<p class="empty">'+esc(T.loading)+'</p>';try{S.mine=await api('/api/book-info?token='+encodeURIComponent(MODE.token))}catch(e){S.mine={error:'x'}}}
 const m=S.mine;if(!m.ok){a.innerHTML='<div class="closed">'+esc(T.nf)+'</div><a class="go" style="margin-top:14px" href="?">'+esc(T.again)+'</a>';return}
 const past=m.date<CTX.today;
 a.innerHTML='<div class="ticket"><div class="h"><b>'+esc(T.yours)+'</b></div><table><tr><td>'+esc(T.when)+'</td><td>'+esc(fmtDay(m.date,{weekday:'long',day:'numeric',month:'long'}))+', '+esc(m.time)+'</td></tr><tr><td>'+esc(T.what)+'</td><td>'+esc(m.service)+'</td></tr>'+(m.staff?'<tr><td>'+esc(T.who)+'</td><td>'+esc(m.staff)+'</td></tr>':'')+(CTX.address?'<tr><td>'+esc(T.where)+'</td><td>'+esc(CTX.address)+'</td></tr>':'')+'<tr><td></td><td><span class="st">'+esc(T.st[m.state]||m.state)+'</span></td></tr></table></div><div class="err" id="err" style="margin-top:12px"></div>'+
 (m.state==='booked'&&!past?'<button class="ghost" id="cx">✕ '+esc(T.cancel)+'</button>':'')+'<a class="go" style="margin-top:12px" href="?">'+esc(T.again)+'</a>';
 if($('cx'))$('cx').onclick=async()=>{if(!confirm(T.cancelQ))return;$('cx').disabled=true;try{const j=await api('/api/book-cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:MODE.token})});if(j.ok){S.mine.state='cancelled';renderMine();$('err').textContent='';return}$('err').textContent=j.error==='past'?T.past:T.errGen}catch(e){$('err').textContent=T.errGen}$('cx').disabled=false}}
render();
</script></body></html>`;
}

module.exports = async (req, res) => {
  try {
    const row = await B.loadBySlug(String((req.query && req.query.slug) || ''));
    if (!row) { res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8'); res.send('Not found'); return; }
    const c = String((req.query && req.query.c) || '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(page(row, /^[a-f0-9]{24}$/.test(c) ? { token: c } : {}));
  } catch (e) { res.status(500).send('Error'); }
};
