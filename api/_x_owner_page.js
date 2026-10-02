// GET /owner/<token> (через rewrite → /api/owner-page?token=<token>) — личная страница владельца:
// показатели и клиенты из дома, с телефона или компьютера. Вход по паролю.
const TX = {
  ru: { giveCard: '+ Карта', giveTitle: 'Выдать карту', cType: 'Вид карты', cStamp: 'Штампы', cDiscount: 'Скидка', cSpend: 'Накопительная', vStamp: 'Сколько штампов до подарка', vDiscount: 'Скидка, %', vSpend: 'Сумма до бонуса', cTitle: 'Название карты (необязательно)', cSend: 'Отправить клиенту на email или в Telegram', cmdCard: 'Карта', r_bad_card: 'неверные параметры карты', badValue: 'Проверьте число', title: 'Мой бизнес', pass: 'Пароль', login: 'Войти', wrong: 'Неверный пароль', locked: 'Слишком много попыток — подождите 15 минут', lapsed: 'Подписка не активна', notFound: 'Доступ не включён или ссылка устарела', err: 'Не получилось. Попробуйте ещё раз.', logout: 'Выйти', refresh: 'Обновить',
    updated: 'Данные от', stale: 'Касса давно не выходила на связь — данные могут быть неактуальны. Программа должна быть запущена на кассе, с интернетом.',
    tabOverview: 'Обзор', tabClients: 'Клиенты', clients: 'Клиентов', scansToday: 'Визитов сегодня', newMonth: 'Новых за месяц', active: 'Активных', revMonth: 'Выручка за месяц', avgCheck: 'Средний чек', rewards: 'Выдано наград', returning: 'Вернулись',
    funnelT: 'Воронка лояльности', fTotal: 'Всего клиентов', fFirst: 'Пришли хотя бы раз', fRet: 'Вернулись', fReg: 'Постоянные', fRew: 'Получили награду',
    visits14: 'Визиты за 14 дней', heat: 'Когда приходят клиенты', top: 'Лучшие клиенты', recent: 'Последние действия', online: 'Бонусы из интернета', oAct: 'Ждут визита', oUsed: 'Использовано', oExp: 'Сгорело', revM: 'Выручка по месяцам',
    visitsWord: 'Визитов', search: 'Поиск по имени, телефону, email', add: '+ Добавить клиента', edit: 'Изменить', name: 'Имя', phone: 'Телефон', email: 'Email', notes: 'Заметка', save: 'Сохранить', cancel: 'Отмена', last: 'Был', never: 'ещё не был',
    queued: 'Отправлено на кассу. Изменение появится в течение пары минут, когда касса его применит.', pendingN: (n) => `Ждут кассы: ${n}`, qFull: 'Слишком много ждущих правок — подождите, пока касса их применит.',
    needName: 'Введите имя', badEmail: 'Проверьте email', noClients: 'Ничего не найдено', shown: (a, b) => `Показано ${a} из ${b}`,
    cmdAdd: 'Добавление', cmdEdit: 'Изменение', stP: 'ждёт кассу', stD: 'применено', stF: 'не применено', r_duplicate: 'такой клиент уже есть', r_not_found: 'клиент не найден', r_bad_email: 'неверный email',
    days: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], vip: 'VIP', risk: 'давно не был', near: 'близко к награде', bonusWord: 'бонус', sub: 'Вход только для владельца', priv: 'Политика конфиденциальности' },
  uk: { giveCard: '+ Картка', giveTitle: 'Видати картку', cType: 'Вид картки', cStamp: 'Штампи', cDiscount: 'Знижка', cSpend: 'Накопичувальна', vStamp: 'Скільки штампів до подарунка', vDiscount: 'Знижка, %', vSpend: 'Сума до бонусу', cTitle: 'Назва картки (необов’язково)', cSend: 'Надіслати клієнту на email або в Telegram', cmdCard: 'Картка', r_bad_card: 'невірні параметри картки', badValue: 'Перевірте число', title: 'Мій бізнес', pass: 'Пароль', login: 'Увійти', wrong: 'Невірний пароль', locked: 'Забагато спроб — зачекайте 15 хвилин', lapsed: 'Підписка не активна', notFound: 'Доступ не ввімкнено або посилання застаріло', err: 'Не вийшло. Спробуйте ще раз.', logout: 'Вийти', refresh: 'Оновити',
    updated: 'Дані від', stale: 'Каса давно не виходила на зв’язок — дані можуть бути неактуальні. Програма має бути запущена на касі, з інтернетом.',
    tabOverview: 'Огляд', tabClients: 'Клієнти', clients: 'Клієнтів', scansToday: 'Візитів сьогодні', newMonth: 'Нових за місяць', active: 'Активних', revMonth: 'Виручка за місяць', avgCheck: 'Середній чек', rewards: 'Видано нагород', returning: 'Повернулися',
    funnelT: 'Воронка лояльності', fTotal: 'Усього клієнтів', fFirst: 'Прийшли хоча б раз', fRet: 'Повернулися', fReg: 'Постійні', fRew: 'Отримали нагороду',
    visits14: 'Візити за 14 днів', heat: 'Коли приходять клієнти', top: 'Найкращі клієнти', recent: 'Останні дії', online: 'Бонуси з інтернету', oAct: 'Чекають візиту', oUsed: 'Використано', oExp: 'Згоріло', revM: 'Виручка за місяцями',
    visitsWord: 'Візитів', search: 'Пошук за іменем, телефоном, email', add: '+ Додати клієнта', edit: 'Змінити', name: 'Ім’я', phone: 'Телефон', email: 'Email', notes: 'Нотатка', save: 'Зберегти', cancel: 'Скасувати', last: 'Був', never: 'ще не був',
    queued: 'Надіслано на касу. Зміна з’явиться за кілька хвилин, коли каса її застосує.', pendingN: (n) => `Чекають каси: ${n}`, qFull: 'Забагато правок у черзі — зачекайте, поки каса їх застосує.',
    needName: 'Введіть ім’я', badEmail: 'Перевірте email', noClients: 'Нічого не знайдено', shown: (a, b) => `Показано ${a} з ${b}`,
    cmdAdd: 'Додавання', cmdEdit: 'Зміна', stP: 'чекає касу', stD: 'застосовано', stF: 'не застосовано', r_duplicate: 'такий клієнт уже є', r_not_found: 'клієнта не знайдено', r_bad_email: 'невірний email',
    days: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], vip: 'VIP', risk: 'давно не був', near: 'близько до нагороди', bonusWord: 'бонус', sub: 'Вхід лише для власника', priv: 'Політика конфіденційності' },
  sk: { giveCard: '+ Karta', giveTitle: 'Vydať kartu', cType: 'Typ karty', cStamp: 'Pečiatky', cDiscount: 'Zľava', cSpend: 'Na nákupy', vStamp: 'Koľko pečiatok do darčeka', vDiscount: 'Zľava, %', vSpend: 'Suma do bonusu', cTitle: 'Názov karty (nepovinné)', cSend: 'Poslať klientovi e-mailom alebo cez Telegram', cmdCard: 'Karta', r_bad_card: 'nesprávne parametre karty', badValue: 'Skontrolujte číslo', title: 'Môj podnik', pass: 'Heslo', login: 'Prihlásiť', wrong: 'Nesprávne heslo', locked: 'Príliš veľa pokusov — počkajte 15 minút', lapsed: 'Predplatné nie je aktívne', notFound: 'Prístup nie je zapnutý alebo odkaz je zastaraný', err: 'Nepodarilo sa. Skúste znova.', logout: 'Odhlásiť', refresh: 'Obnoviť',
    updated: 'Údaje z', stale: 'Pokladňa sa dlho neozvala — údaje nemusia byť aktuálne. Program musí bežať na pokladni s internetom.',
    tabOverview: 'Prehľad', tabClients: 'Klienti', clients: 'Klientov', scansToday: 'Návštev dnes', newMonth: 'Nových za mesiac', active: 'Aktívnych', revMonth: 'Tržby za mesiac', avgCheck: 'Priemerný nákup', rewards: 'Vydaných odmien', returning: 'Vrátili sa',
    funnelT: 'Lievik vernosti', fTotal: 'Spolu klientov', fFirst: 'Prišli aspoň raz', fRet: 'Vrátili sa', fReg: 'Stáli', fRew: 'Získali odmenu',
    visits14: 'Návštevy za 14 dní', heat: 'Kedy chodia klienti', top: 'Najlepší klienti', recent: 'Posledné akcie', online: 'Bonusy z internetu', oAct: 'Čakajú na návštevu', oUsed: 'Využité', oExp: 'Prepadli', revM: 'Tržby po mesiacoch',
    visitsWord: 'Návštev', search: 'Hľadať podľa mena, telefónu, e-mailu', add: '+ Pridať klienta', edit: 'Upraviť', name: 'Meno', phone: 'Telefón', email: 'E-mail', notes: 'Poznámka', save: 'Uložiť', cancel: 'Zrušiť', last: 'Bol', never: 'ešte nebol',
    queued: 'Odoslané na pokladňu. Zmena sa objaví do pár minút, keď ju pokladňa použije.', pendingN: (n) => `Čaká na pokladňu: ${n}`, qFull: 'Príliš veľa čakajúcich úprav — počkajte, kým ich pokladňa použije.',
    needName: 'Zadajte meno', badEmail: 'Skontrolujte e-mail', noClients: 'Nič sa nenašlo', shown: (a, b) => `Zobrazených ${a} z ${b}`,
    cmdAdd: 'Pridanie', cmdEdit: 'Úprava', stP: 'čaká na pokladňu', stD: 'použité', stF: 'nepoužité', r_duplicate: 'taký klient už existuje', r_not_found: 'klient sa nenašiel', r_bad_email: 'neplatný e-mail',
    days: ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'], vip: 'VIP', risk: 'dlho nebol', near: 'blízko k odmene', bonusWord: 'bonus', sub: 'Vstup len pre majiteľa', priv: 'Ochrana osobných údajov' },
  en: { giveCard: '+ Card', giveTitle: 'Give a card', cType: 'Card type', cStamp: 'Stamps', cDiscount: 'Discount', cSpend: 'Spend', vStamp: 'Stamps until the gift', vDiscount: 'Discount, %', vSpend: 'Amount until the bonus', cTitle: 'Card name (optional)', cSend: 'Send it to the client by email or Telegram', cmdCard: 'Card', r_bad_card: 'invalid card settings', badValue: 'Check the number', title: 'My business', pass: 'Password', login: 'Sign in', wrong: 'Wrong password', locked: 'Too many attempts — wait 15 minutes', lapsed: 'Subscription is not active', notFound: 'Access is off or the link is outdated', err: 'Something went wrong. Please try again.', logout: 'Sign out', refresh: 'Refresh',
    updated: 'Data from', stale: 'The till hasn’t checked in for a while — data may be out of date. The app must be running at the till with internet.',
    tabOverview: 'Overview', tabClients: 'Clients', clients: 'Clients', scansToday: 'Visits today', newMonth: 'New this month', active: 'Active', revMonth: 'Revenue this month', avgCheck: 'Average check', rewards: 'Rewards given', returning: 'Came back',
    funnelT: 'Loyalty funnel', fTotal: 'Total clients', fFirst: 'Visited at least once', fRet: 'Came back', fReg: 'Regulars', fRew: 'Got a reward',
    visits14: 'Visits, last 14 days', heat: 'When clients visit', top: 'Top clients', recent: 'Recent activity', online: 'Online bonuses', oAct: 'Waiting for a visit', oUsed: 'Used', oExp: 'Expired', revM: 'Revenue by month',
    visitsWord: 'Visits', search: 'Search by name, phone, email', add: '+ Add client', edit: 'Edit', name: 'Name', phone: 'Phone', email: 'Email', notes: 'Note', save: 'Save', cancel: 'Cancel', last: 'Last visit', never: 'no visits yet',
    queued: 'Sent to the till. The change will appear within a couple of minutes, once the till applies it.', pendingN: (n) => `Waiting for the till: ${n}`, qFull: 'Too many pending edits — wait for the till to apply them.',
    needName: 'Enter a name', badEmail: 'Check the email', noClients: 'Nothing found', shown: (a, b) => `Showing ${a} of ${b}`,
    cmdAdd: 'Add', cmdEdit: 'Edit', stP: 'waiting for the till', stD: 'applied', stF: 'not applied', r_duplicate: 'this client already exists', r_not_found: 'client not found', r_bad_email: 'invalid email',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], vip: 'VIP', risk: 'away for a while', near: 'close to a reward', bonusWord: 'bonus', sub: 'Owner access only', priv: 'Privacy policy' }
};
const { dictJs: dictJsShared } = require('./_dict');
function dictJs() { return dictJsShared(TX); }

const PAGE = (token) => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#0d0f14"><title>Loya</title>
<style>
:root{--a:#d4af37;--ar:212,175,55;--bg:#0d0f14;--card:#151922;--line:rgba(255,255,255,.09);--mut:rgba(243,239,230,.62)}*{box-sizing:border-box;margin:0}
body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;background:radial-gradient(800px 420px at 90% -10%,rgba(var(--ar),.16),transparent 70%),var(--bg);color:#f3efe6;min-height:100vh;padding:max(14px,env(safe-area-inset-top)) 14px 40px}
.wrap{max-width:980px;margin:0 auto}.top{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}.top h1{font-size:20px;flex:1;min-width:140px}
.pill{border:1px solid var(--line);background:rgba(255,255,255,.05);color:inherit;border-radius:10px;padding:7px 11px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.pill.on{background:var(--a);border-color:var(--a);color:#16110a}
.tabs{display:flex;gap:8px;margin:6px 0 16px}.tabs .pill{padding:9px 16px;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}.stat{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px}.stat b{display:block;font-size:26px;line-height:1.1}.stat span{font-size:12.5px;color:var(--mut)}
.box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;margin-bottom:14px}.box h3{font-size:15px;margin-bottom:12px}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:760px){.two{grid-template-columns:1fr}}
.bar{display:flex;align-items:center;gap:10px;margin:7px 0;font-size:13.5px}.bar i{display:block;height:10px;border-radius:6px;background:linear-gradient(90deg,var(--a),rgba(var(--ar),.5));min-width:3px}.bar .l{flex:0 0 46%;color:var(--mut)}.bar .v{margin-left:auto;font-weight:700}
.cols{display:flex;align-items:flex-end;gap:5px;height:110px}.cols div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-size:10px;color:var(--mut)}.cols i{display:block;width:100%;border-radius:5px 5px 0 0;background:var(--a);min-height:2px}
.heat{display:grid;grid-template-columns:34px repeat(24,minmax(0,1fr));grid-auto-rows:15px;gap:2px;font-size:9.5px;color:var(--mut)}.heat div{border-radius:3px;min-width:0}.heat .h{text-align:center;overflow:visible;white-space:nowrap}.heat .d{display:flex;align-items:center}
.row{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:14px}.row:first-child{border-top:0}.row small{color:var(--mut);display:block;font-size:12px}
input,textarea{width:100%;height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;padding:0 14px;font:inherit;font-size:16px}textarea{height:80px;padding:12px;resize:vertical}input:focus,textarea:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 3px rgba(var(--ar),.2)}
.btn{height:48px;border:0;border-radius:12px;font:inherit;font-weight:800;font-size:15px;color:#16110a;background:var(--a);cursor:pointer;padding:0 18px}.btn.sec{background:rgba(255,255,255,.08);color:inherit}
.login{max-width:360px;margin:12vh auto 0;text-align:center}.login h1{margin-bottom:6px}.login p{color:var(--mut);margin-bottom:18px;font-size:14px}.login form{display:flex;flex-direction:column;gap:10px}
.err{color:#fca5a5;font-size:14px;min-height:20px}.ok{color:#86efac;font-size:14px}.warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.4);border-radius:12px;padding:10px 14px;font-size:13px;margin-bottom:12px}
.chip{display:inline-block;font-size:11px;font-weight:700;border-radius:8px;padding:2px 7px;margin-left:5px;background:rgba(var(--ar),.18);color:var(--a)}.chip.r{background:rgba(239,68,68,.16);color:#fca5a5}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9}.modal .in{background:#151922;border:1px solid var(--line);border-radius:20px;padding:20px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:10px}
.fine{margin-top:22px;text-align:center;font-size:12.5px}.fine a{color:var(--mut)}.hide{display:none!important}
</style></head><body><div class="wrap">
<div id="login" class="login hide"><h1>🔒 Loya</h1><p id="l-sub"></p><form id="lf"><input type="password" id="pw" autocomplete="current-password"><div class="err" id="lerr"></div><button class="btn" id="lbtn" type="submit"></button></form><div class="top" style="justify-content:center;margin-top:18px" id="lang0"></div></div>
<div id="app" class="hide"><div class="top"><h1 id="ttl"></h1><span id="lang1" style="display:flex;gap:6px"></span><button class="pill" id="rf"></button><button class="pill" id="lo"></button></div>
<div id="stale" class="warn hide"></div><div class="tabs"><button class="pill on" data-t="o" id="tab-o"></button><button class="pill" data-t="c" id="tab-c"></button></div>
<div id="v-o"></div><div id="v-c" class="hide"></div></div>
<p class="fine"><a href="/privacy.html" target="_blank" rel="noopener" id="priv"></a></p></div>
<div id="modal" class="modal hide"><div class="in" id="mbody"></div></div>
<script>
const TXT=${dictJs()};const TKN=${JSON.stringify(token)};
let lang=(function(){try{const s=localStorage.getItem('loya_owner_lang');if(TXT[s])return s}catch(e){}for(const l of (navigator.languages||[navigator.language||''])){const k=String(l).slice(0,2).toLowerCase();if(k==='cs')return'sk';if(TXT[k])return k}return'en'})();
let session=null,snap=null,info=null,view='o',query='',showN=60;
const $=id=>document.getElementById(id);const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const T=()=>TXT[lang];
try{session=sessionStorage.getItem('loya_owner_s_'+TKN.slice(0,8))}catch(e){}
function money(v){const c={EUR:'€',USD:'$',GBP:'£',UAH:'₴'}[(snap&&snap.brand.currency)||'EUR']||'€';const n=Math.round((Number(v)||0)*100)/100;const t=Number.isInteger(n)?String(n):n.toFixed(2);return lang==='en'?c+t:t+' '+c}
function langBtns(id){$(id).innerHTML=Object.keys(TXT).map(k=>'<button type="button" class="pill '+(k===lang?'on':'')+'" data-l="'+k+'">'+k.toUpperCase()+'</button>').join('');$(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{lang=b.dataset.l;try{localStorage.setItem('loya_owner_lang',lang)}catch(e){}paint()})}
async function api(path,body){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({token:TKN,session:session},body||{}))});let j={};try{j=await r.json()}catch(e){}j._s=r.status;return j}
function setAccent(){const c=(snap&&snap.brand&&/^#[0-9a-fA-F]{6}$/.test(snap.brand.color))?snap.brand.color:'#d4af37';const n=parseInt(c.slice(1),16);document.documentElement.style.setProperty('--a',c);document.documentElement.style.setProperty('--ar',((n>>16)&255)+','+((n>>8)&255)+','+(n&255))}
function paint(){const t=T();document.documentElement.lang=lang;$('priv').textContent=t.priv;
$('l-sub').textContent=t.sub;$('pw').placeholder=t.pass;$('lbtn').textContent=t.login;langBtns('lang0');
if(!session||!snap&&!info){ if(!session){$('login').classList.remove('hide');$('app').classList.add('hide');return} }
$('login').classList.add('hide');$('app').classList.remove('hide');setAccent();langBtns('lang1');
$('ttl').textContent=(snap&&snap.brand&&snap.brand.name)||t.title;$('rf').textContent='↻ '+t.refresh;$('lo').textContent=t.logout;$('tab-o').textContent=t.tabOverview;$('tab-c').textContent=t.tabClients;
if(!snap){$('v-o').innerHTML='<div class="box">'+E(t.stale)+'</div>';return}
const at=info&&info.at?new Date(info.at):null;const old=at&&(Date.now()-at.getTime()>20*60000);
$('stale').classList.toggle('hide',!old);$('stale').textContent=old?t.stale:'';
renderOverview();renderClients()}
function renderOverview(){const t=T(),s=snap,st=s.stats||{},ad=s.advanced||{},rv=s.revenue||{},fn=s.funnel||{};
const at=info&&info.at?new Date(info.at).toLocaleString(lang==='en'?'en-GB':lang):'';
let h='<p style="color:var(--mut);font-size:12.5px;margin-bottom:10px">'+E(t.updated)+' '+E(at)+(info&&info.pending?' · '+E(t.pendingN(info.pending)):'')+'</p><div class="grid">';
const stat=(v,l)=>'<div class="stat"><b>'+E(v)+'</b><span>'+E(l)+'</span></div>';
h+=stat(st.totalClients||0,t.clients)+stat(st.scansToday||0,t.scansToday)+stat(ad.newClientsThisMonth||0,t.newMonth)+stat(ad.activeClients||0,t.active);
if(rv.totalChecks>0)h+=stat(money(rv.monthRevenue),t.revMonth)+stat(money(rv.avgCheck),t.avgCheck);
h+=stat(st.totalRewards||0,t.rewards)+stat(ad.returningClients||0,t.returning)+'</div>';
const mx=Math.max(1,fn.total||0);const frow=(l,v)=>'<div class="bar"><span class="l">'+E(l)+'</span><i style="width:'+Math.round((v||0)/mx*42)+'%"></i><span class="v">'+(v||0)+'</span></div>';
h+='<div class="two"><div class="box"><h3>'+E(t.funnelT)+'</h3>'+frow(t.fTotal,fn.total)+frow(t.fFirst,fn.firstVisit)+frow(t.fRet,fn.returned)+frow(t.fReg,fn.regular)+frow(t.fRew,fn.rewarded)+'</div>';
const vd=s.visitsByDay||[];const vmax=Math.max(1,...vd.map(d=>d.n));
h+='<div class="box"><h3>'+E(t.visits14)+'</h3><div class="cols">'+vd.map(d=>'<div title="'+E(d.day)+': '+d.n+'"><i style="height:'+Math.round(d.n/vmax*90)+'px"></i>'+E(String(d.day).slice(8))+'</div>').join('')+'</div></div></div>';
const hm=s.heatmap||{grid:[],max:0};if(hm.total>0){const order=[1,2,3,4,5,6,0];let g='<div class="heat"><div class="h"></div>'+Array.from({length:24},(_,i)=>'<div class="h">'+(i%3===0?i:'')+'</div>').join('');
order.forEach(d=>{g+='<div class="d">'+E(t.days[d])+'</div>';for(let i=0;i<24;i++){const n=(hm.grid[d]||[])[i]||0;g+='<div title="'+n+'" style="background:rgba(var(--ar),'+(n?(0.15+0.85*n/hm.max).toFixed(2):'0.05')+')"></div>'}});h+='<div class="box"><h3>'+E(t.heat)+'</h3>'+g+'</div></div>'}
if((s.revenueByMonth||[]).length){const rm=s.revenueByMonth;const m=Math.max(1,...rm.map(x=>x.n));h+='<div class="box"><h3>'+E(t.revM)+'</h3>'+rm.map(x=>'<div class="bar"><span class="l">'+E(x.ym)+'</span><i style="width:'+Math.round(x.n/m*42)+'%"></i><span class="v">'+E(money(x.n))+'</span></div>').join('')+'</div>'}
h+='<div class="two"><div class="box"><h3>'+E(t.top)+'</h3>'+((s.topClients||[]).map((c,i)=>'<div class="row"><span>'+(i+1)+'. '+E(c.name)+'</span><b>'+E(t.visitsWord)+': '+c.visits+'</b></div>').join('')||'—')+'</div>';
h+='<div class="box"><h3>'+E(t.recent)+'</h3>'+((s.recent||[]).slice(0,8).map(r=>'<div class="row"><span>'+E(r.name)+'<small>'+E(String(r.at).slice(0,16))+'</small></span><span>'+(r.type==='discount'?'−'+r.pct+'%':r.result==='reward'?'🎁':r.type==='stamp'?'✓':'€')+'</span></div>').join('')||'—')+'</div></div>';
const on=s.online||{};if(on.total>0)h+='<div class="box"><h3>'+E(t.online)+'</h3><div class="grid" style="margin:0">'+stat(on.active,t.oAct)+stat(on.used,t.oUsed)+stat(on.expired,t.oExp)+'</div></div>';
$('v-o').innerHTML=h}
function renderClients(){const t=T(),s=snap;const q=query.trim().toLowerCase();const qd=q.replace(/\\D/g,'');
let list=(s.clients||[]).filter(c=>!q||c.name.toLowerCase().includes(q)||(c.email||'').toLowerCase().includes(q)||(qd.length>=3&&(c.phone||'').replace(/\\D/g,'').includes(qd)));
const total=list.length;list=list.slice(0,showN);
let h='<div style="display:flex;gap:8px;margin-bottom:12px"><input id="q" placeholder="'+E(t.search)+'" value="'+E(query)+'"><button class="btn" id="addc" style="white-space:nowrap">'+E(t.add)+'</button></div>';
if(info&&info.recent&&info.recent.length){const stl={pending:t.stP,done:t.stD,failed:t.stF};h+='<div class="box" style="padding:10px 14px">'+info.recent.slice(0,4).map(c=>'<div class="row" style="font-size:13px"><span>'+E((c.cmd.type==='client_add'?t.cmdAdd:c.cmd.type==='card_add'?t.cmdCard:t.cmdEdit)+': '+(c.cmd.name||''))+'</span><span style="color:'+(c.status==='failed'?'#fca5a5':c.status==='done'?'#86efac':'var(--mut)')+'">'+E(stl[c.status]||c.status)+(c.result?' ('+E(t['r_'+c.result]||c.result)+')':'')+'</span></div>').join('')+'</div>'}
h+='<div class="box">'+(list.map(c=>'<div class="row"><span><b>'+E(c.name)+'</b>'+(c.vip?'<span class="chip">'+E(t.vip)+'</span>':'')+(c.risk?'<span class="chip r">'+E(t.risk)+'</span>':'')+'<small>'+E([c.phone,c.email].filter(Boolean).join(' · '))+'</small><small>'+E(t.last)+': '+E(c.last||t.never)+' · '+E(t.visitsWord)+': '+c.visits+'</small>'+cardChips(c)+'</span><span style="display:flex;gap:6px;flex-shrink:0"><button class="pill" data-g="'+c.id+'">'+E(t.giveCard)+'</button><button class="pill" data-e="'+c.id+'">'+E(t.edit)+'</button></span></div>').join('')||'<p style="color:var(--mut)">'+E(t.noClients)+'</p>')+'</div>';
h+='<p style="text-align:center;color:var(--mut);font-size:12.5px">'+E(t.shown(list.length,total))+'</p>'+(total>list.length?'<p style="text-align:center;margin-top:8px"><button class="pill" id="more">+</button></p>':'');
const keep=document.activeElement&&document.activeElement.id==='q';$('v-c').innerHTML=h;
const qi=$('q');qi.oninput=()=>{query=qi.value;showN=60;renderClients()};if(keep){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length)}
$('addc').onclick=()=>openForm(null);const mo=$('more');if(mo)mo.onclick=()=>{showN+=60;renderClients()};$('v-c').querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>openForm((s.clients||[]).find(c=>c.id===Number(b.dataset.e))));$('v-c').querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>openCard((s.clients||[]).find(c=>c.id===Number(b.dataset.g))))}
function cardChips(c){const k=(c.cards||[]);if(!k.length)return'';return '<span style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">'+k.map(x=>'<span class="chip">'+(x.t==='s'?'● '+x.a+'/'+x.b:x.t==='m'?E(money(x.a))+' / '+E(money(x.b)):(x.bonus?'🎁 ':'')+'−'+x.a+'%')+'</span>').join('')+'</span>'}
function openCard(c){if(!c)return;const t=T();const field=(ty)=>ty==='stamp'?['vStamp',10,'1','2','50']:ty==='discount'?['vDiscount',5,'1','1','100']:['vSpend',200,'0.01','1','1000000'];
const draw=(ty)=>{const f=field(ty);$('mbody').innerHTML='<b style="font-size:17px">'+E(t.giveTitle)+': '+E(c.name)+'</b><div style="display:flex;gap:6px;flex-wrap:wrap">'+['stamp','discount','spend'].map(x=>'<button type="button" class="pill '+(x===ty?'on':'')+'" data-ty="'+x+'">'+E(t[x==='stamp'?'cStamp':x==='discount'?'cDiscount':'cSpend'])+'</button>').join('')+'</div>'+
'<label style="font-size:13px;color:var(--mut)">'+E(t[f[0]])+'<input id="g-v" type="number" inputmode="decimal" step="'+f[2]+'" min="'+f[3]+'" max="'+f[4]+'" value="'+f[1]+'" style="margin-top:4px"></label>'+
'<input id="g-t" maxlength="80" placeholder="'+E(t.cTitle)+'"><label style="display:flex;gap:10px;align-items:center;font-size:14px"><input type="checkbox" id="g-s" checked style="width:20px;height:20px;accent-color:var(--a)">'+E(t.cSend)+'</label><div class="err" id="g-err"></div><div style="display:flex;gap:8px"><button class="btn" id="g-ok" style="flex:1">'+E(t.save)+'</button><button class="btn sec" id="g-no">'+E(t.cancel)+'</button></div>';
$('mbody').querySelectorAll('[data-ty]').forEach(b=>b.onclick=()=>draw(b.dataset.ty));$('g-no').onclick=()=>$('modal').classList.add('hide');
$('g-ok').onclick=async()=>{const v=Number($('g-v').value),f2=field(ty);if(!Number.isFinite(v)||v<Number(f2[3])||v>Number(f2[4])||(ty!=='spend'&&!Number.isInteger(v))){$('g-err').textContent=t.badValue;return}
$('g-ok').disabled=true;const r=await api('owner-command',{cmd:{type:'card_add',id:c.id,name:c.name,cardType:ty,value:v,title:$('g-t').value.trim(),send:$('g-s').checked}});
if(r.ok){$('mbody').innerHTML='<div class="ok">'+E(t.queued)+'</div><button class="btn" id="f-done">OK</button>';$('f-done').onclick=()=>{$('modal').classList.add('hide');load()}}
else{$('g-ok').disabled=false;$('g-err').textContent=r.error==='queue_full'?t.qFull:r.error==='bad_value'?t.badValue:t.err}}};
draw('stamp');$('modal').classList.remove('hide')}
function openForm(c){const t=T();$('mbody').innerHTML='<b style="font-size:17px">'+E(c?t.edit:t.add)+'</b><input id="f-n" placeholder="'+E(t.name)+'" maxlength="100" value="'+E(c?c.name:'')+'"><input id="f-p" type="tel" placeholder="'+E(t.phone)+'" maxlength="30" value="'+E(c?c.phone:'')+'"><input id="f-e" type="email" placeholder="'+E(t.email)+'" maxlength="120" value="'+E(c?c.email:'')+'"><textarea id="f-t" placeholder="'+E(t.notes)+'" maxlength="500">'+E(c?c.notes:'')+'</textarea><div class="err" id="f-err"></div><div style="display:flex;gap:8px"><button class="btn" id="f-ok" style="flex:1">'+E(t.save)+'</button><button class="btn sec" id="f-no">'+E(t.cancel)+'</button></div>';
$('modal').classList.remove('hide');$('f-no').onclick=()=>$('modal').classList.add('hide');
$('f-ok').onclick=async()=>{const name=$('f-n').value.trim(),email=$('f-e').value.trim();if(!name){$('f-err').textContent=t.needName;return}if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)){$('f-err').textContent=t.badEmail;return}
$('f-ok').disabled=true;const r=await api('owner-command',{cmd:{type:c?'client_edit':'client_add',id:c?c.id:undefined,name,phone:$('f-p').value.trim(),email,notes:$('f-t').value.trim()}});
if(r.ok){$('mbody').innerHTML='<div class="ok">'+E(t.queued)+'</div><button class="btn" id="f-done">OK</button>';$('f-done').onclick=()=>{$('modal').classList.add('hide');load()}}
else{$('f-ok').disabled=false;$('f-err').textContent=r.error==='queue_full'?t.qFull:r.error==='bad_email'?t.badEmail:r.error==='bad_name'?t.needName:t.err}}}
async function load(){const r=await api('owner-data');if(r._s===401&&r.error==='session'){logout(true);return}
if(!r.ok){$('app').classList.remove('hide');$('login').classList.add('hide');const t=T();$('v-o').innerHTML='<div class="box">'+E(r.error==='license_inactive'?t.lapsed:r.error==='not_enabled'?t.notFound:t.err)+'</div>';return}
snap=r.snapshot;info={at:r.at,pending:r.pending,recent:r.recent};paint()}
function logout(){session=null;snap=null;info=null;try{sessionStorage.removeItem('loya_owner_s_'+TKN.slice(0,8))}catch(e){}paint()}
$('lf').addEventListener('submit',async ev=>{ev.preventDefault();const t=T();$('lerr').textContent='';$('lbtn').disabled=true;
const r=await api('owner-login',{password:$('pw').value});$('lbtn').disabled=false;
if(r.ok){session=r.session;try{sessionStorage.setItem('loya_owner_s_'+TKN.slice(0,8),session)}catch(e){}$('pw').value='';await load();return}
$('lerr').textContent=r.error==='locked'?t.locked:r.error==='license_inactive'?t.lapsed:r.error==='wrong'?t.wrong:t.err});
$('rf').onclick=load;$('lo').onclick=logout;
document.querySelectorAll('.tabs .pill').forEach(b=>b.onclick=()=>{view=b.dataset.t;document.querySelectorAll('.tabs .pill').forEach(x=>x.classList.toggle('on',x===b));$('v-o').classList.toggle('hide',view!=='o');$('v-c').classList.toggle('hide',view!=='c')});
$('modal').addEventListener('mousedown',e=>{if(e.target===$('modal'))$('modal').classList.add('hide')});
paint();if(session)load();
</script></body></html>`;

module.exports = async (req, res) => {
  const token = String(req.query.token || '');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (!/^[a-f0-9]{48}$/.test(token)) { res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8'); res.send('Not found'); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(PAGE(token));
};
