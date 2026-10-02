// GET /admin → /api/core?action=admin-page — админка владельца сервиса Loya.
const { dictJs } = require('./_dict');
const TX = {
  ru: { del: 'Удалить', delSel: (n) => `Удалить выбранные (${n})`, selectAll: 'Выбрать все', delConfirm: (n) => `Удалить ${n} ключ(ей) навсегда? Вместе с ними удалятся их данные на сервере (доступ из дома, регистрация по ссылке, чеки, Apple Wallet). Отменить нельзя.`, delStripe: 'Внимание: у части ключей есть подписка Stripe. Удаление её НЕ отменяет — отмените подписку в кабинете Stripe, иначе клиенту продолжат списывать оплату.', deleted: (n) => `Удалено: ${n}`, title: 'Loya — админка', pass: 'Пароль администратора', login: 'Войти', wrong: 'Неверный пароль', locked: 'Слишком много попыток — подождите 15 минут', off: 'Админка выключена: задайте ADMIN_PASSWORD (от 12 символов) в переменных Vercel.', err: 'Ошибка. Попробуйте ещё раз.', logout: 'Выйти', refresh: 'Обновить',
    sTotal: 'Всего ключей', sActive: 'Активных', sPaying: 'Платят', sFree: 'Бесплатно', sBanned: 'Заблокировано', sOnline: 'Заходили за 7 дней', sPast: 'Проблема с оплатой', sCanceled: 'Отменено / истекло',
    fAll: 'Все', fActive: 'Активные', fFree: 'Бесплатные', fBanned: 'Заблокированные', fInactive: 'Неактивные', search: 'Поиск по email, ключу, заметке',
    newFree: '+ Бесплатный доступ', email: 'Email', note: 'Заметка (видна только вам)', until: 'Бесплатно до (необязательно)', create: 'Создать ключ', created: 'Готово! Ключ для клиента:', copy: 'Копировать', copied: 'Скопировано', cancel: 'Отмена',
    ban: 'Заблокировать', unban: 'Разблокировать', makeFree: 'Сделать бесплатным', makePaid: 'Вернуть платный', editNote: 'Заметка', confirmBan: 'Заблокировать этот ключ? Программа у клиента перестанет работать при следующей проверке.',
    st_active: 'активна', st_past_due: 'проблема с оплатой', st_canceled: 'отменена', st_banned: 'заблокирован', st_free_expired: 'бесплатный истёк', st_unknown: '?', planFree: 'бесплатно', planPaid: 'Stripe',
    lastSeen: 'Был на связи', never: 'ещё не выходил на связь', ver: 'версия', createdAt: 'создан', shown: (a, b) => `Показано ${a} из ${b}`, needEmail: 'Введите email', dbErr: (d) => 'Ошибка базы: ' + d + ' — выполните schema.sql в Supabase.' },
  uk: { del: 'Видалити', delSel: (n) => `Видалити вибрані (${n})`, selectAll: 'Вибрати всі', delConfirm: (n) => `Видалити ${n} ключ(ів) назавжди? Разом із ними видаляться їхні дані на сервері (доступ з дому, реєстрація за посиланням, чеки, Apple Wallet). Скасувати не можна.`, delStripe: 'Увага: у частини ключів є підписка Stripe. Видалення її НЕ скасовує — скасуйте підписку в кабінеті Stripe, інакше клієнту продовжать списувати оплату.', deleted: (n) => `Видалено: ${n}`, title: 'Loya — адмінка', pass: 'Пароль адміністратора', login: 'Увійти', wrong: 'Невірний пароль', locked: 'Забагато спроб — зачекайте 15 хвилин', off: 'Адмінку вимкнено: задайте ADMIN_PASSWORD (від 12 символів) у змінних Vercel.', err: 'Помилка. Спробуйте ще раз.', logout: 'Вийти', refresh: 'Оновити',
    sTotal: 'Усього ключів', sActive: 'Активних', sPaying: 'Платять', sFree: 'Безкоштовно', sBanned: 'Заблоковано', sOnline: 'Заходили за 7 днів', sPast: 'Проблема з оплатою', sCanceled: 'Скасовано / минуло',
    fAll: 'Усі', fActive: 'Активні', fFree: 'Безкоштовні', fBanned: 'Заблоковані', fInactive: 'Неактивні', search: 'Пошук за email, ключем, нотаткою',
    newFree: '+ Безкоштовний доступ', email: 'Email', note: 'Нотатка (бачите лише ви)', until: 'Безкоштовно до (необов’язково)', create: 'Створити ключ', created: 'Готово! Ключ для клієнта:', copy: 'Копіювати', copied: 'Скопійовано', cancel: 'Скасувати',
    ban: 'Заблокувати', unban: 'Розблокувати', makeFree: 'Зробити безкоштовним', makePaid: 'Повернути платний', editNote: 'Нотатка', confirmBan: 'Заблокувати цей ключ? Програма в клієнта перестане працювати під час наступної перевірки.',
    st_active: 'активна', st_past_due: 'проблема з оплатою', st_canceled: 'скасована', st_banned: 'заблоковано', st_free_expired: 'безкоштовний минув', st_unknown: '?', planFree: 'безкоштовно', planPaid: 'Stripe',
    lastSeen: 'Був на зв’язку', never: 'ще не виходив на зв’язок', ver: 'версія', createdAt: 'створено', shown: (a, b) => `Показано ${a} з ${b}`, needEmail: 'Введіть email', dbErr: (d) => 'Помилка бази: ' + d + ' — виконайте schema.sql у Supabase.' },
  sk: { del: 'Vymazať', delSel: (n) => `Vymazať vybrané (${n})`, selectAll: 'Vybrať všetky', delConfirm: (n) => `Natrvalo vymazať ${n} kľúč(ov)? Spolu s nimi sa vymažú ich údaje na serveri (prístup z domu, registrácia cez odkaz, doklady, Apple Wallet). Nedá sa to vrátiť.`, delStripe: 'Pozor: niektoré kľúče majú predplatné Stripe. Vymazanie ho NEZRUŠÍ — zrušte predplatné v Stripe, inak sa klientovi bude ďalej strhávať platba.', deleted: (n) => `Vymazané: ${n}`, title: 'Loya — administrácia', pass: 'Heslo administrátora', login: 'Prihlásiť', wrong: 'Nesprávne heslo', locked: 'Príliš veľa pokusov — počkajte 15 minút', off: 'Administrácia je vypnutá: nastavte ADMIN_PASSWORD (aspoň 12 znakov) v premenných Vercel.', err: 'Chyba. Skúste znova.', logout: 'Odhlásiť', refresh: 'Obnoviť',
    sTotal: 'Spolu kľúčov', sActive: 'Aktívnych', sPaying: 'Platia', sFree: 'Zadarmo', sBanned: 'Zablokovaných', sOnline: 'Online za 7 dní', sPast: 'Problém s platbou', sCanceled: 'Zrušené / vypršané',
    fAll: 'Všetky', fActive: 'Aktívne', fFree: 'Zadarmo', fBanned: 'Zablokované', fInactive: 'Neaktívne', search: 'Hľadať podľa e-mailu, kľúča, poznámky',
    newFree: '+ Prístup zadarmo', email: 'E-mail', note: 'Poznámka (vidíte len vy)', until: 'Zadarmo do (nepovinné)', create: 'Vytvoriť kľúč', created: 'Hotovo! Kľúč pre klienta:', copy: 'Kopírovať', copied: 'Skopírované', cancel: 'Zrušiť',
    ban: 'Zablokovať', unban: 'Odblokovať', makeFree: 'Nastaviť zadarmo', makePaid: 'Vrátiť platený', editNote: 'Poznámka', confirmBan: 'Zablokovať tento kľúč? Program u klienta prestane fungovať pri ďalšej kontrole.',
    st_active: 'aktívne', st_past_due: 'problém s platbou', st_canceled: 'zrušené', st_banned: 'zablokovaný', st_free_expired: 'zadarmo vypršalo', st_unknown: '?', planFree: 'zadarmo', planPaid: 'Stripe',
    lastSeen: 'Naposledy online', never: 'ešte sa neozval', ver: 'verzia', createdAt: 'vytvorený', shown: (a, b) => `Zobrazených ${a} z ${b}`, needEmail: 'Zadajte e-mail', dbErr: (d) => 'Chyba databázy: ' + d + ' — spustite schema.sql v Supabase.' },
  en: { del: 'Delete', delSel: (n) => `Delete selected (${n})`, selectAll: 'Select all', delConfirm: (n) => `Delete ${n} key(s) for good? Their server data goes too (access from home, sign-up by link, receipts, Apple Wallet). This can’t be undone.`, delStripe: 'Note: some of these keys have a Stripe subscription. Deleting does NOT cancel it — cancel it in the Stripe dashboard, or the client keeps being charged.', deleted: (n) => `Deleted: ${n}`, title: 'Loya — admin', pass: 'Admin password', login: 'Sign in', wrong: 'Wrong password', locked: 'Too many attempts — wait 15 minutes', off: 'Admin is off: set ADMIN_PASSWORD (12+ characters) in Vercel variables.', err: 'Error. Please try again.', logout: 'Sign out', refresh: 'Refresh',
    sTotal: 'Total keys', sActive: 'Active', sPaying: 'Paying', sFree: 'Free', sBanned: 'Banned', sOnline: 'Online in 7 days', sPast: 'Payment issue', sCanceled: 'Canceled / expired',
    fAll: 'All', fActive: 'Active', fFree: 'Free', fBanned: 'Banned', fInactive: 'Inactive', search: 'Search by email, key, note',
    newFree: '+ Free access', email: 'Email', note: 'Note (only you see it)', until: 'Free until (optional)', create: 'Create key', created: 'Done! Key for the client:', copy: 'Copy', copied: 'Copied', cancel: 'Cancel',
    ban: 'Ban', unban: 'Unban', makeFree: 'Make free', makePaid: 'Back to paid', editNote: 'Note', confirmBan: 'Ban this key? The client’s app stops working at its next check.',
    st_active: 'active', st_past_due: 'payment issue', st_canceled: 'canceled', st_banned: 'banned', st_free_expired: 'free expired', st_unknown: '?', planFree: 'free', planPaid: 'Stripe',
    lastSeen: 'Last online', never: 'never checked in', ver: 'version', createdAt: 'created', shown: (a, b) => `Showing ${a} of ${b}`, needEmail: 'Enter an email', dbErr: (d) => 'Database error: ' + d + ' — run schema.sql in Supabase.' }
};
const PAGE = () => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Loya admin</title>
<style>
:root{--a:#d4af37;--bg:#0d0f14;--card:#151922;--line:rgba(255,255,255,.09);--mut:rgba(243,239,230,.6)}*{box-sizing:border-box;margin:0}
body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;background:var(--bg);color:#f3efe6;padding:16px 16px 40px}
.wrap{max-width:1100px;margin:0 auto}.top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.top h1{flex:1;font-size:20px;min-width:160px}
.pill{border:1px solid var(--line);background:rgba(255,255,255,.05);color:inherit;border-radius:10px;padding:7px 11px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.pill.on{background:var(--a);border-color:var(--a);color:#16110a}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px;margin-bottom:14px}.stat{background:var(--card);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px}.stat b{display:block;font-size:24px}.stat span{font-size:12px;color:var(--mut)}
.bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
input{height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:inherit;padding:0 12px;font:inherit;font-size:15px}input:focus{outline:none;border-color:var(--a)}
.btn{height:44px;border:0;border-radius:10px;font:inherit;font-weight:800;color:#16110a;background:var(--a);cursor:pointer;padding:0 16px}.btn.sec{background:rgba(255,255,255,.08);color:inherit}
.row{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:12px 14px;border-top:1px solid var(--line);flex-wrap:wrap}.row:first-child{border-top:0}
.list{background:var(--card);border:1px solid var(--line);border-radius:16px}.who b{font-size:14.5px}.who small{display:block;color:var(--mut);font-size:12px;margin-top:2px}
.key{font-family:Consolas,monospace;font-size:12.5px;color:var(--a)}.acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.act{min-height:34px;padding:0 12px;border-radius:10px;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer;border:1.5px solid;background:transparent;transition:background .15s,color .15s}
.a-ban{color:#fca5a5;border-color:rgba(248,113,113,.7);background:rgba(239,68,68,.1)}.a-ban:hover{background:rgba(239,68,68,.25)}
.a-unban{color:#86efac;border-color:rgba(74,222,128,.7);background:rgba(34,197,94,.1)}.a-unban:hover{background:rgba(34,197,94,.25)}
.a-free{color:#93c5fd;border-color:rgba(96,165,250,.7);background:rgba(59,130,246,.1)}.a-free:hover{background:rgba(59,130,246,.25)}
.a-paid{color:#e9d5ff;border-color:rgba(192,132,252,.7);background:rgba(168,85,247,.1)}.a-paid:hover{background:rgba(168,85,247,.25)}
.a-note{color:#fde68a;border-color:rgba(251,191,36,.7);background:rgba(245,158,11,.1)}.a-note:hover{background:rgba(245,158,11,.25)}
.a-copy{color:#f3efe6;border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.06)}.a-copy:hover{background:rgba(255,255,255,.14)}
.a-del{color:#fff;border-color:#dc2626;background:#b91c1c}.a-del:hover{background:#dc2626}
.sel{width:20px;height:20px;accent-color:var(--a);margin:2px 12px 0 0;flex-shrink:0;cursor:pointer}
.who{display:flex;align-items:flex-start}
.bulk{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 10px;padding:10px 14px;border-radius:14px;background:rgba(239,68,68,.1);border:1px solid rgba(248,113,113,.5)}
.selall{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--mut);cursor:pointer}
.stat{border-left:4px solid var(--c,#d4af37)}.stat b{color:var(--c,#f3efe6)}
.pill{border-color:rgba(255,255,255,.3)!important}
.chip{display:inline-block;font-size:11px;font-weight:800;border-radius:7px;padding:2px 7px;margin-left:6px;vertical-align:middle;border:1px solid currentColor}.c-ok{background:rgba(34,197,94,.16);color:#86efac}.c-bad{background:rgba(239,68,68,.16);color:#fca5a5}.c-warn{background:rgba(245,158,11,.16);color:#fcd34d}.c-free{background:rgba(96,165,250,.16);color:#93c5fd}
.login{max-width:340px;margin:14vh auto 0;display:flex;flex-direction:column;gap:10px;text-align:center}.err{color:#fca5a5;font-size:14px;min-height:18px}.ok{color:#86efac}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px}.modal .in{background:#151922;border:1px solid var(--line);border-radius:18px;padding:18px;width:100%;max-width:420px;display:flex;flex-direction:column;gap:10px}
.hide{display:none!important}
</style></head><body><div class="wrap">
<div id="lg" class="login hide"><h1>🔐 Loya</h1><input type="password" id="pw" autocomplete="current-password"><div class="err" id="lerr"></div><button class="btn" id="lb"></button><div class="top" style="justify-content:center" id="lang0"></div></div>
<div id="app" class="hide"><div class="top"><h1 id="ttl"></h1><span id="lang1" style="display:flex;gap:6px"></span><button class="pill" id="rf"></button><button class="pill" id="lo"></button></div>
<div class="grid" id="stats"></div>
<div class="bar"><span id="filters" style="display:flex;gap:6px;flex-wrap:wrap"></span><input id="q" style="flex:1;min-width:200px"><button class="btn" id="nf"></button></div>
<div class="err" id="aerr"></div><div class="bulk hide" id="bulk"><label class="selall"><input type="checkbox" id="selall" class="sel" style="margin:0"><span id="selall-t"></span></label><button class="act a-del" id="bulkdel"></button><span id="bulkmsg" style="font-size:13px"></span></div><div class="list" id="list"></div><p id="shown" style="text-align:center;color:var(--mut);font-size:12.5px;margin-top:8px"></p></div>
</div><div id="modal" class="modal hide"><div class="in" id="mb"></div></div>
<script>
const TXT=${dictJs(TX)};
let lang=(function(){try{const s=localStorage.getItem('loya_admin_lang');if(TXT[s])return s}catch(e){}const k=String(navigator.language||'').slice(0,2);return TXT[k]?k:(k==='cs'?'sk':'ru')})();
let session=null,D=null,filter='all',q='';const selected=new Set();try{session=sessionStorage.getItem('loya_admin_s')}catch(e){}
const $=id=>document.getElementById(id),E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),T=()=>TXT[lang];
async function api(p,b){const r=await fetch('/api/'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({session},b||{}))});let j={};try{j=await r.json()}catch(e){}j._s=r.status;return j}
function langs(id){$(id).innerHTML=Object.keys(TXT).map(k=>'<button class="pill '+(k===lang?'on':'')+'" data-l="'+k+'">'+k.toUpperCase()+'</button>').join('');$(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{lang=b.dataset.l;try{localStorage.setItem('loya_admin_lang',lang)}catch(e){}paint()})}
const dt=s=>s?new Date(s).toLocaleString(lang==='en'?'en-GB':lang,{dateStyle:'short',timeStyle:'short'}):'';
function paint(){const t=T();document.title=t.title;$('pw').placeholder=t.pass;$('lb').textContent=t.login;langs('lang0');
if(!session||!D){$('lg').classList.remove('hide');$('app').classList.add('hide');return}
$('lg').classList.add('hide');$('app').classList.remove('hide');langs('lang1');$('ttl').textContent=t.title;$('rf').textContent='↻ '+t.refresh;$('lo').textContent=t.logout;$('nf').textContent=t.newFree;$('q').placeholder=t.search;
const s=D.stats;$('stats').innerHTML=[[s.total,t.sTotal,'#e5e7eb'],[s.active,t.sActive,'#4ade80'],[s.paying,t.sPaying,'#fbbf24'],[s.free,t.sFree,'#60a5fa'],[s.online7,t.sOnline,'#2dd4bf'],[s.banned,t.sBanned,'#f87171'],[s.pastDue,t.sPast,'#fb923c'],[s.canceled,t.sCanceled,'#a1a1aa']].map(x=>'<div class="stat" style="--c:'+x[2]+'"><b>'+x[0]+'</b><span>'+E(x[1])+'</span></div>').join('');
$('filters').innerHTML=[['all',t.fAll],['active',t.fActive],['free',t.fFree],['banned',t.fBanned],['inactive',t.fInactive]].map(f=>'<button class="pill '+(filter===f[0]?'on':'')+'" data-f="'+f[0]+'">'+E(f[1])+'</button>').join('');
$('filters').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;paint()});
const qq=q.trim().toLowerCase();let L=D.list.filter(x=>filter==='all'||(filter==='active'&&x.state==='active')||(filter==='free'&&x.plan==='free')||(filter==='banned'&&x.banned)||(filter==='inactive'&&x.state!=='active'));
if(qq)L=L.filter(x=>(x.email+' '+x.key+' '+x.note).toLowerCase().includes(qq));const total=L.length;L=L.slice(0,300);
const chip=x=>x.banned?'<span class="chip c-bad">'+E(t.st_banned)+'</span>':x.state==='active'?'<span class="chip c-ok">'+E(t.st_active)+'</span>':x.state==='past_due'?'<span class="chip c-warn">'+E(t.st_past_due)+'</span>':'<span class="chip c-bad">'+E(t['st_'+x.state]||x.state)+'</span>';
$('list').innerHTML=L.map(x=>'<div class="row"><div class="who"><input type="checkbox" class="sel" data-sel="'+E(x.key)+'"'+(selected.has(x.key)?' checked':'')+'><div><b>'+E(x.email||'—')+'</b>'+chip(x)+(x.plan==='free'?'<span class="chip c-free">'+E(t.planFree)+(x.freeUntil?' → '+E(x.freeUntil):'')+'</span>':'')+
'<small><span class="key">'+E(x.key)+'</span> · '+E(t.createdAt)+' '+E(dt(x.created))+'</small><small>'+E(t.lastSeen)+': '+E(x.lastSeen?dt(x.lastSeen):t.never)+(x.version?' · '+E(t.ver)+' '+E(x.version):'')+'</small>'+(x.note?'<small>📝 '+E(x.note)+'</small>':'')+'</div></div>'+
'<div class="acts">'+(x.banned?'<button class="act a-unban" data-op="unban" data-k="'+E(x.key)+'">'+E(t.unban)+'</button>':'<button class="act a-ban" data-op="ban" data-k="'+E(x.key)+'">'+E(t.ban)+'</button>')+
(x.plan==='free'?'<button class="act a-paid" data-op="make_paid" data-k="'+E(x.key)+'">'+E(t.makePaid)+'</button>':'<button class="act a-free" data-op="make_free" data-k="'+E(x.key)+'">'+E(t.makeFree)+'</button>')+
'<button class="act a-note" data-op="note" data-k="'+E(x.key)+'">'+E(t.editNote)+'</button><button class="act a-copy" data-copy="'+E(x.key)+'">'+E(t.copy)+'</button><button class="act a-del" data-del="'+E(x.key)+'">🗑 '+E(t.del)+'</button></div></div>').join('')||'<div class="row" style="color:var(--mut)">—</div>';
$('shown').textContent=t.shown(L.length,total);
$('list').querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>act(b.dataset.op,b.dataset.k));
$('list').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delKeys([b.dataset.del]));
$('list').querySelectorAll('[data-sel]').forEach(c=>c.onchange=()=>{c.checked?selected.add(c.dataset.sel):selected.delete(c.dataset.sel);bulkBar(L)});
$('selall').onchange=()=>{L.forEach(x=>$('selall').checked?selected.add(x.key):selected.delete(x.key));paint()};
bulkBar(L);
$('list').querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent=T().copied}catch(e){}})}
async function load(){const r=await api('admin-data');if(r._s===401){session=null;D=null;try{sessionStorage.removeItem('loya_admin_s')}catch(e){}paint();return}
if(!r.ok){$('aerr').textContent=r.error==='db_error'?T().dbErr(r.detail||''):T().err;return}$('aerr').textContent='';D=r;paint()}
function bulkBar(L){const t=T();[...selected].forEach(k=>{if(!D.list.some(x=>x.key===k))selected.delete(k)});const n=selected.size;$('bulk').classList.toggle('hide',!D.list.length);
$('selall-t').textContent=t.selectAll;$('selall').checked=L.length>0&&L.every(x=>selected.has(x.key));$('bulkdel').textContent='🗑 '+t.delSel(n);$('bulkdel').disabled=!n;$('bulkdel').style.opacity=n?1:.5;
$('bulkdel').onclick=()=>{if(n)delKeys([...selected])}}
async function delKeys(keys){const t=T();const stripe=D.list.some(x=>keys.includes(x.key)&&x.hasStripe);
if(!confirm(t.delConfirm(keys.length)+(stripe?'\\n\\n'+t.delStripe:'')))return;
const r=await api('admin-action',{op:'delete',keys});if(!r.ok){$('aerr').textContent=r.error==='db_error'?t.dbErr(r.detail||''):t.err;return}
keys.forEach(k=>selected.delete(k));await load();$('bulkmsg').textContent=t.deleted(r.deleted)}
async function act(op,key){const t=T();let note,freeUntil;
if(op==='ban'&&!confirm(t.confirmBan))return;
if(op==='note'){const cur=(D.list.find(x=>x.key===key)||{}).note||'';note=prompt(t.note,cur);if(note===null)return}
if(op==='make_free'){freeUntil=prompt(t.until+' (YYYY-MM-DD)','');if(freeUntil===null)return}
const r=await api('admin-action',{op,key,note,freeUntil});if(!r.ok){$('aerr').textContent=r.error==='db_error'?t.dbErr(r.detail||''):t.err;return}load()}
$('nf').onclick=()=>{const t=T();$('mb').innerHTML='<b>'+E(t.newFree)+'</b><input id="m-e" type="email" placeholder="'+E(t.email)+'"><input id="m-n" placeholder="'+E(t.note)+'"><label style="font-size:13px;color:var(--mut)">'+E(t.until)+'<input id="m-u" type="date" style="width:100%;margin-top:4px;color-scheme:dark"></label><div class="err" id="m-err"></div><div style="display:flex;gap:8px"><button class="btn" id="m-ok" style="flex:1">'+E(t.create)+'</button><button class="btn sec" id="m-no">'+E(t.cancel)+'</button></div>';
$('modal').classList.remove('hide');$('m-no').onclick=()=>$('modal').classList.add('hide');
$('m-ok').onclick=async()=>{const email=$('m-e').value.trim();if(!email){$('m-err').textContent=t.needEmail;return}$('m-ok').disabled=true;
const r=await api('admin-action',{op:'create_free',email,note:$('m-n').value,freeUntil:$('m-u').value});
if(!r.ok){$('m-ok').disabled=false;$('m-err').textContent=r.error==='db_error'?t.dbErr(r.detail||''):t.err;return}
$('mb').innerHTML='<div class="ok">'+E(t.created)+'</div><div class="key" style="font-size:20px;text-align:center;padding:8px">'+E(r.key)+'</div><div style="display:flex;gap:8px"><button class="btn" id="m-c" style="flex:1">'+E(t.copy)+'</button><button class="btn sec" id="m-x">OK</button></div>';
$('m-c').onclick=async()=>{try{await navigator.clipboard.writeText(r.key);$('m-c').textContent=t.copied}catch(e){}};$('m-x').onclick=()=>{$('modal').classList.add('hide');load()}}};
$('q').oninput=()=>{q=$('q').value;paint()};$('rf').onclick=load;$('lo').onclick=()=>{session=null;D=null;try{sessionStorage.removeItem('loya_admin_s')}catch(e){}paint()};
async function doLogin(){const t=T();$('lerr').textContent='';const r=await api('admin-login',{password:$('pw').value});
if(r.ok){session=r.session;try{sessionStorage.setItem('loya_admin_s',session)}catch(e){}$('pw').value='';await load();return}
$('lerr').textContent=r.error==='admin_disabled'?t.off:r.error==='locked'?t.locked:r.error==='wrong'?t.wrong:t.err}
$('lb').onclick=doLogin;$('pw').onkeydown=e=>{if(e.key==='Enter')doLogin()};
paint();if(session)load();
</script></body></html>`;
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(PAGE());
};
