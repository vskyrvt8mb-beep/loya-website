// GET /f/<token> → /api/online?action=fb-page&token=<token> — «Как вам у нас?»: оценка визита гостем.
// 4–5 звёзд → просьба оставить отзыв в Google (если владелец указал ссылку), 1–3 → личное сообщение владельцу.
const { esc } = require('./_online');
const { dictJs } = require('./_dict');
const { palette, hexRgb, safeJson } = require('./_x_online_page');
const F = require('./_feedback');

const TX = {
  ru: { q: (n) => n ? `${n}, как вам у нас?` : 'Как вам у нас?', sub: 'Оцените визит — это займёт секунду.', stars: ['Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично!'], thx: 'Спасибо! 💛', good: 'Рады, что вам понравилось! Расскажите о нас в Google — это очень помогает небольшому заведению.', google: 'Оставить отзыв в Google', no: 'Нет, спасибо', bad: 'Нам жаль 😔 Что нам улучшить? Это увидит только владелец.', ph: 'Напишите пару слов…', send: 'Отправить', sent: 'Спасибо! Владелец получит ваше сообщение.', more: 'Хотите что-то добавить? (необязательно)', err: 'Не получилось. Попробуйте ещё раз.', gone: 'Ссылка устарела.', nf: 'Ссылка не найдена.' },
  uk: { q: (n) => n ? `${n}, як вам у нас?` : 'Як вам у нас?', sub: 'Оцініть візит — це займе секунду.', stars: ['Погано', 'Так собі', 'Нормально', 'Добре', 'Чудово!'], thx: 'Дякуємо! 💛', good: 'Раді, що вам сподобалося! Розкажіть про нас у Google — це дуже допомагає невеликому закладу.', google: 'Залишити відгук у Google', no: 'Ні, дякую', bad: 'Нам шкода 😔 Що нам покращити? Це побачить лише власник.', ph: 'Напишіть кілька слів…', send: 'Надіслати', sent: 'Дякуємо! Власник отримає ваше повідомлення.', more: 'Хочете щось додати? (необов’язково)', err: 'Не вийшло. Спробуйте ще раз.', gone: 'Посилання застаріло.', nf: 'Посилання не знайдено.' },
  sk: { q: (n) => n ? `${n}, ako sa vám u nás páčilo?` : 'Ako sa vám u nás páčilo?', sub: 'Ohodnoťte návštevu — zaberie to sekundu.', stars: ['Zle', 'Nič moc', 'V poriadku', 'Dobre', 'Výborne!'], thx: 'Ďakujeme! 💛', good: 'Teší nás, že sa vám páčilo! Napíšte o nás na Google — malej prevádzke to veľmi pomáha.', google: 'Napísať recenziu na Google', no: 'Nie, ďakujem', bad: 'To nás mrzí 😔 Čo máme zlepšiť? Uvidí to len majiteľ.', ph: 'Napíšte pár slov…', send: 'Odoslať', sent: 'Ďakujeme! Majiteľ dostane vašu správu.', more: 'Chcete niečo dodať? (nepovinné)', err: 'Nepodarilo sa. Skúste znova.', gone: 'Odkaz už neplatí.', nf: 'Odkaz sa nenašiel.' },
  en: { q: (n) => n ? `${n}, how was your visit?` : 'How was your visit?', sub: 'Rate your visit — it takes a second.', stars: ['Bad', 'So-so', 'Okay', 'Good', 'Excellent!'], thx: 'Thank you! 💛', good: 'So glad you enjoyed it! Tell others on Google — it really helps a small business.', google: 'Leave a Google review', no: 'No, thanks', bad: 'We’re sorry 😔 What should we improve? Only the owner will see this.', ph: 'Write a few words…', send: 'Send', sent: 'Thank you! The owner will get your message.', more: 'Anything to add? (optional)', err: 'Something went wrong. Please try again.', gone: 'This link has expired.', nf: 'Link not found.' }
};

function page(token, fb, prof) {
  const pal = palette(prof.color, prof.niche);
  const ctx = { t: token, name: String(fb.name || '').split(/\s+/)[0] || '', brand: prof.name || 'Loya', lang: fb.lang || prof.lang || 'en', rating: fb.rating || null, reviewUrl: fb.rating >= 4 ? (prof.reviewUrl || '') : '', expired: fb.rating == null && Date.now() - new Date(fb.created_at).getTime() > 30 * 86400e3 };
  return `<!DOCTYPE html><html lang="${esc(ctx.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0d0f14"><title>${esc(ctx.brand)}</title>
<style>
:root{--a:${pal.a};--b:${pal.b};--ar:${hexRgb(pal.a)};--br:${hexRgb(pal.b)};--on:${pal.on};--bg:#0c0e13;--line:rgba(255,255,255,.12);--mut:rgba(243,239,230,.72)}
*{box-sizing:border-box;margin:0}
body{font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;color:#f6f2ea;min-height:100vh;padding:max(18px,env(safe-area-inset-top)) 16px 40px;
 background:radial-gradient(640px 420px at 100% -4%,rgba(var(--ar),.32),transparent 70%),radial-gradient(560px 420px at -6% 60%,rgba(var(--br),.2),transparent 70%),var(--bg)}
.wrap{max-width:460px;margin:0 auto}
.top{display:flex;align-items:center;gap:12px;margin-bottom:26px}
.logo.img{background:#fff;padding:4px;overflow:hidden}.logo.img img{width:100%;height:100%;object-fit:contain;border-radius:12px}
.logo{width:52px;height:52px;border-radius:17px;display:flex;align-items:center;justify-content:center;font-size:27px;background:linear-gradient(135deg,rgba(var(--ar),.35),rgba(var(--br),.28));border:1px solid rgba(var(--ar),.55)}
.brand{font-size:20px;font-weight:800;flex:1;min-width:0;overflow:hidden;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.card{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border:1px solid var(--line);border-radius:26px;padding:26px 20px;text-align:center}
h1{font-size:25px;line-height:1.25;font-weight:900;margin-bottom:8px}
.sub{color:var(--mut);font-size:15px;margin-bottom:22px}
.stars{display:flex;justify-content:center;gap:6px}
.stars button{width:56px;height:56px;border:0;background:none;cursor:pointer;font-size:42px;line-height:1;color:rgba(255,255,255,.22);transition:transform .12s,color .12s;padding:0}
.stars button.on{color:#fbbf24;text-shadow:0 4px 16px rgba(251,191,36,.45)}
.stars button:active{transform:scale(.9)}
.lbl{min-height:22px;margin-top:10px;font-weight:800;color:#fbbf24}
.msg{font-size:16px;line-height:1.5;margin:18px 4px 18px}
textarea{width:100%;min-height:110px;border-radius:16px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:inherit;padding:13px 14px;font-size:16px;font-family:inherit;resize:vertical}
textarea:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 4px rgba(var(--ar),.25)}
.go{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:58px;border:0;border-radius:18px;font-size:17px;font-weight:900;color:var(--on);background:linear-gradient(135deg,var(--a),var(--b));cursor:pointer;margin-top:14px;text-decoration:none;box-shadow:0 14px 34px rgba(var(--ar),.38)}
.go[disabled]{opacity:.6}
.ghost{background:none;border:0;color:var(--mut);font-size:14.5px;margin-top:14px;cursor:pointer;text-decoration:underline}
.err{color:#ffd0d0;font-size:14px;margin-top:12px;min-height:18px}
.g{display:inline-flex;width:24px;height:24px;border-radius:50%;background:#fff;color:#4285f4;font-weight:900;align-items:center;justify-content:center;font-size:16px}
</style></head><body><div class="wrap">
<div class="top"><div class="logo${prof.page && prof.page.logo ? ' img' : ''}">${prof.page && prof.page.logo ? `<img src="${esc(prof.page.logo)}" alt="">` : esc(prof.emoji || '⭐')}</div><div class="brand">${esc(ctx.brand)}</div></div>
<div class="card" id="box"></div>
</div>
<script>
const TX=${dictJs(TX)};const CTX=${safeJson(ctx)};
const lang=TX[CTX.lang]?CTX.lang:'en';const T=TX[lang];document.documentElement.lang=lang;
const $=id=>document.getElementById(id);
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let rating=CTX.rating,reviewUrl=CTX.reviewUrl,stage=rating?'after':'ask',busy=false;
function starsHtml(sel){return '<div class="stars" role="radiogroup">'+[1,2,3,4,5].map(i=>'<button type="button" role="radio" aria-label="'+i+' – '+esc(T.stars[i-1])+'" aria-checked="'+(sel===i)+'" data-s="'+i+'" class="'+(sel&&i<=sel?'on':'')+'">★</button>').join('')+'</div><div class="lbl" id="lbl">'+(sel?esc(T.stars[sel-1]):'')+'</div>'}
async function send(body){const r=await fetch('/api/fb-rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({t:CTX.t},body))});return r.json()}
function render(){const b=$('box');
if(CTX.expired){b.innerHTML='<h1>'+esc(T.gone)+'</h1>';return}
if(stage==='ask'){b.innerHTML='<h1>'+esc(T.q(CTX.name))+'</h1><p class="sub">'+esc(T.sub)+'</p>'+starsHtml(0)+'<div class="err" id="err"></div>';
 b.querySelectorAll('.stars button').forEach(x=>{x.onmouseenter=()=>hover(+x.dataset.s);x.onclick=()=>pick(+x.dataset.s)});return}
if(stage==='after'){
 if(rating>=4){b.innerHTML='<h1>'+esc(T.thx)+'</h1>'+starsHtml(rating)+'<p class="msg">'+esc(T.good)+'</p>'+(reviewUrl?'<a class="go" id="gg" href="'+esc(reviewUrl)+'" target="_blank" rel="noopener"><span class="g">G</span>'+esc(T.google)+'</a><button class="ghost" id="nothx">'+esc(T.no)+'</button>':'<p class="sub">'+esc(T.more)+'</p><textarea id="c" maxlength="1000" placeholder="'+esc(T.ph)+'"></textarea><button class="go" id="snd">'+esc(T.send)+'</button><div class="err" id="err"></div>');
  if($('nothx'))$('nothx').onclick=()=>{stage='more';render()};}
 else{b.innerHTML='<h1>'+esc(T.thx)+'</h1>'+starsHtml(rating)+'<p class="msg">'+esc(T.bad)+'</p><textarea id="c" maxlength="1000" placeholder="'+esc(T.ph)+'"></textarea><button class="go" id="snd">'+esc(T.send)+'</button><div class="err" id="err"></div>'}
 if($('snd'))$('snd').onclick=comment;return}
if(stage==='more'){b.innerHTML='<h1>'+esc(T.thx)+'</h1><p class="sub">'+esc(T.more)+'</p><textarea id="c" maxlength="1000" placeholder="'+esc(T.ph)+'"></textarea><button class="go" id="snd">'+esc(T.send)+'</button><div class="err" id="err"></div>';$('snd').onclick=comment;return}
if(stage==='sent'){b.innerHTML='<h1>'+esc(T.thx)+'</h1><p class="msg">'+esc(T.sent)+'</p>'}}
function hover(n){document.querySelectorAll('.stars button').forEach(x=>x.classList.toggle('on',+x.dataset.s<=n));const l=$('lbl');if(l)l.textContent=T.stars[n-1]||''}
async function pick(n){if(busy)return;busy=true;hover(n);try{const j=await send({s:n});if(j.ok){rating=j.rating;reviewUrl=j.reviewUrl||'';stage='after';render()}else{$('err').textContent=j.error==='expired'?T.gone:T.err}}catch(e){$('err').textContent=T.err}busy=false}
async function comment(){const c=$('c').value.trim();if(!c){$('c').focus();return}$('snd').disabled=true;try{const j=await send({c});if(j.ok){stage='sent';render();return}$('err').textContent=T.err}catch(e){$('err').textContent=T.err}$('snd').disabled=false}
render();
const pre=Number(new URLSearchParams(location.search).get('s'));if(stage==='ask'&&pre>=1&&pre<=5)pick(pre);
</script></body></html>`;
}

module.exports = async (req, res) => {
  try {
    const token = String((req.query && req.query.token) || '');
    const r = await F.load(token);
    res.setHeader('Cache-Control', 'no-store');
    if (!r) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.send('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#0c0e13;color:#f6f2ea;text-align:center;padding:60px 20px">Link not found · Odkaz sa nenašiel · Ссылка не найдена</body>'); return; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(page(token, r.fb, r.profile));
  } catch (e) { res.status(500).send('Error'); }
};
