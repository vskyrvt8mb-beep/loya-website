// GET /k/:serial?t=… — карта гостя в браузере (для тех, у кого нет Apple/Google Wallet или кто не хочет его ставить).
// Те же данные, что у карты в Apple Wallet (таблица apple_passes): программа создаёт запись, когда просит ссылку
// на карту (/api/apple-link), и обновляет её после каждого скана (/api/wallet-update). Ссылка подписана (t),
// поэтому чужие карты по номеру не открыть. На странице: баннер со штампами, QR для кассы, кнопки Wallet.
// GET /api/wallet?action=card-google&s=…&t=… — по нажатию «Добавить в Google Wallet» собирает ссылку и переадресует.
const A = require('./_apple');
const W = require('./_wallet');
const CM = require('./_cardModel');
const { supabase } = require('./_license');

const T = {
  ru: { title: 'Ваша карта', show: 'Покажите QR-код на кассе — визит отметят за секунду.', add: 'Сохранить в телефон', apple: 'Добавить в Apple Wallet', google: 'Добавить в Google Wallet', updated: 'Обновлено', code: 'Код карты', bad: 'Карта не найдена', badSub: 'Ссылка устарела или скопирована не полностью. Попросите заведение отправить карту ещё раз.', note: 'Сохраните эту страницу в закладки — здесь всегда актуальные штампы.' },
  uk: { title: 'Ваша картка', show: 'Покажіть QR-код на касі — візит відмітять за секунду.', add: 'Зберегти в телефон', apple: 'Додати в Apple Wallet', google: 'Додати в Google Wallet', updated: 'Оновлено', code: 'Код картки', bad: 'Картку не знайдено', badSub: 'Посилання застаріло або скопійоване не повністю. Попросіть заклад надіслати картку ще раз.', note: 'Збережіть цю сторінку в закладки — тут завжди актуальні штампи.' },
  sk: { title: 'Vaša karta', show: 'Ukážte QR kód pri pokladnici — návštevu zaznamenajú za sekundu.', add: 'Uložiť do telefónu', apple: 'Pridať do Apple Wallet', google: 'Pridať do Google Wallet', updated: 'Aktualizované', code: 'Kód karty', bad: 'Karta sa nenašla', badSub: 'Odkaz je starý alebo neúplný. Požiadajte prevádzku, aby vám kartu poslala znova.', note: 'Uložte si túto stránku medzi záložky — vždy tu nájdete aktuálne pečiatky.' },
  en: { title: 'Your card', show: 'Show the QR code at the till — the visit is recorded in a second.', add: 'Save to your phone', apple: 'Add to Apple Wallet', google: 'Add to Google Wallet', updated: 'Updated', code: 'Card code', bad: 'Card not found', badSub: 'The link is old or incomplete. Ask the venue to send the card again.', note: 'Bookmark this page — your stamps are always up to date here.' }
};
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isLight = (hex) => { const n = parseInt(String(hex || '#20252d').slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 > 0.62; };

async function loadCard(req) {
  const q = req.query || {};
  const serial = String(q.s || '').trim(), tok = String(q.t || '').trim();
  if (!A.validSerial(serial) || !A.safeEq(tok, A.webTokenFor(serial))) return null;
  const { data: row } = await supabase.from('apple_passes').select('serial, license_key, card, brand, updated_at').eq('serial', serial).maybeSingle();
  return row && row.card ? { serial, tok, row } : null;
}

function page(lang, title, body, color) {
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer">
<title>${esc(title)}</title><meta name="theme-color" content="${esc(color)}"><link rel="icon" href="/favicon.ico">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;background:radial-gradient(120% 60% at 50% 0%,${color}33,transparent 60%),#0b0c10;color:#f4efe4;display:flex;justify-content:center;padding:22px 16px 40px}
.w{width:100%;max-width:420px}.pass{border-radius:22px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06)}
.top{display:flex;align-items:center;gap:10px;padding:16px 18px 6px;font-weight:700;font-size:15px}.logo{width:38px;height:38px;border-radius:50%;background:#fff center/contain no-repeat;flex:none}.logo.l{display:grid;place-items:center;font-weight:900}
.sub{padding:6px 18px 0;font-size:12.5px;opacity:.7}.name{padding:2px 18px 0;font-size:24px;font-weight:800}
.mods{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;padding:12px 18px 0}.mod small{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;opacity:.65}.mod b{font-size:16px}
.qr{display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 0 16px}.qr svg{width:170px;height:170px;background:#fff;padding:10px;border-radius:12px}.qr code{font:600 12.5px ui-monospace,Consolas,monospace;opacity:.75;letter-spacing:.06em}
.hero{line-height:0}.hero img{width:100%;height:auto;display:block;aspect-ratio:1032/336}
.show{margin:18px 4px 0;text-align:center;font-size:14.5px;color:rgba(244,239,228,.78);line-height:1.5}
.btns{display:flex;flex-direction:column;gap:10px;margin-top:18px}.btns h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:rgba(244,239,228,.55);text-align:center;margin-bottom:2px}
.b{display:flex;align-items:center;justify-content:center;gap:10px;height:52px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15.5px;background:#000;color:#fff;border:1px solid rgba(255,255,255,.22)}.b:hover{border-color:rgba(255,255,255,.5)}.b svg{width:20px;height:20px}
.note{margin-top:16px;text-align:center;font-size:12.5px;color:rgba(244,239,228,.5);line-height:1.5}.upd{margin-top:6px;text-align:center;font-size:12px;color:rgba(244,239,228,.4)}
.bad{text-align:center;margin-top:18vh}.bad h1{font-size:24px;margin-bottom:10px}.bad p{color:rgba(244,239,228,.7);line-height:1.5}
.by{margin-top:26px;text-align:center;font-size:12px;color:rgba(244,239,228,.35)}.by a{color:inherit}
</style></head><body><main class="w">${body}<p class="by">Loya · <a href="https://loya-loyalty.com" rel="noopener">loya-loyalty.com</a></p></main></body></html>`;
}

async function cardPage(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex'); res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const hit = await loadCard(req).catch(() => null);
  const qLang = String((req.query || {}).lang || '');
  if (!hit) { const l = T[qLang] ? qLang : 'en'; res.status(404).send(page(l, T[l].bad, `<div class="bad"><h1>${esc(T[l].bad)}</h1><p>${esc(T[l].badSub)}</p></div>`, '#d4af37')); return; }
  const { serial, tok, row } = hit;
  const card = row.card, brand = row.brand || {};
  const lang = T[card.lang] ? card.lang : 'en', t = T[lang];
  const design = await require('./_walletDesign').getDesignInfo(row.license_key);
  const bg = design.bg || '#20252d', light = isLight(bg), fg = light ? '#141414' : '#ffffff';
  const color = /^#[0-9a-fA-F]{6}$/.test(brand.color || '') ? brand.color : '#d4af37';
  const M = CM.passModel(card, brand, lang);
  const hero = W.heroImageUrl(card, brand, lang, design);
  const logo = design.hasLogo ? `<span class="logo" style="background-image:url('${esc(require('./_walletDesign').assetUrl(design, 'logo'))}')"></span>` : `<span class="logo l" style="background:${color};color:${isLight(color) ? '#141414' : '#fff'}">${esc(String(M.cardTitle || 'L').trim().charAt(0).toUpperCase())}</span>`;
  let qr = '';
  try { qr = await require('qrcode').toString(String(card.code), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }); } catch (e) { qr = ''; }
  const mods = M.modules.filter(m => m.id !== 'rule').slice(0, 4).map(m => `<span class="mod"><small>${esc(m.header)}</small><b>${esc(m.body)}</b></span>`).join('');
  const appleBtn = A.configured() ? `<a class="b" href="/api/apple-pass?s=${encodeURIComponent(serial)}&t=${A.downloadTokenFor(serial)}"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7a4.5 4.5 0 0 0-3.5-1.9c-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8a4.7 4.7 0 0 0-4 2.4c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.7s-2.4-1-2.4-4zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg>${esc(t.apple)}</a>` : '';
  let googleOk = false; try { W.serviceAccount(); googleOk = true; } catch (e) { googleOk = false; }
  const googleBtn = googleOk ? `<a class="b" href="/api/wallet?action=card-google&s=${encodeURIComponent(serial)}&t=${tok}"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>${esc(t.google)}</a>` : '';
  const upd = row.updated_at ? new Date(row.updated_at).toLocaleString(lang === 'en' ? 'en-GB' : lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' }) : '';
  const body = `<div class="pass" style="background:${bg};color:${fg}">
    <div class="top">${logo}<span>${esc(M.cardTitle)}</span></div>
    <div class="sub">${esc(M.subheader)}</div><div class="name">${esc(M.header)}</div>
    <div class="mods">${mods}</div>
    <div class="qr">${qr}<code>${esc(card.code)}</code></div>
    <div class="hero"><img alt="" src="${esc(hero)}"></div></div>
    <p class="show">📲 ${esc(t.show)}</p>
    ${appleBtn || googleBtn ? `<div class="btns"><h2>${esc(t.add)}</h2>${appleBtn}${googleBtn}</div>` : ''}
    <p class="note">${esc(t.note)}</p>${upd ? `<p class="upd">${esc(t.updated)}: ${esc(upd)}</p>` : ''}`;
  res.status(200).send(page(lang, `${M.cardTitle} — ${t.title}`, body, color));
}

// «Добавить в Google Wallet» со страницы карты: та же сборка, что /api/wallet-link, и переадресация на Google.
async function cardGoogle(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const hit = await loadCard(req).catch(() => null);
  if (!hit) { res.status(404).send('not found'); return; }
  const { row } = hit;
  try {
    const sa = W.serviceAccount();
    const design = await require('./_walletDesign').getDesignInfo(row.license_key);
    const { classId, object } = W.buildObject(row.license_key, row.card, row.brand || {}, design);
    let payload = null;
    try {
      const token = await W.accessToken(sa);
      const c = await W.putClass(token, classId);
      if (c.ok) { const o = await W.putObject(token, object); if (o.ok) payload = { genericObjects: [{ id: object.id, classId }] }; }
    } catch (e) { /* ниже — карта целиком в ссылке */ }
    if (!payload) payload = { genericClasses: [{ id: classId }], genericObjects: [object] };
    const jwt = W.signJwt(sa, { iss: sa.client_email, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000), origins: [], payload });
    res.statusCode = 302; res.setHeader('Location', `https://pay.google.com/gp/v/save/${jwt}`); res.end();
  } catch (e) { res.status(503).send('wallet unavailable'); }
}

module.exports = { cardPage, cardGoogle };
