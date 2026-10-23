// Общий код регистрации по ссылке: профиль бизнеса, купон, выдача заявок программе.
const crypto = require('crypto');
const { supabase, licenseActive, sendMail, EMAIL_RE } = (() => { const m = require('./_mail'); return m; })();

const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';

// Защита от накруток: общий счётчик в Supabase (см. _ratelimit.js); общий суточный лимит на бизнес — по базе.
const RL = require('./_ratelimit');

const TRANSLIT = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',і:'i',ї:'yi',є:'ye',ґ:'g' };
function slugify(name) {
  const base = String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split('').map(ch => TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);
  return base || 'shop';
}
function randId(n) { return crypto.randomBytes(8).toString('hex').slice(0, n); }
function digitsKey(phone) { const d = String(phone || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-9) : ''; }
function clamp(v, a, b, def) { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, Math.round(n))) : def; }
function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function dateISO(daysAhead) { const d = new Date(Date.now() + daysAhead * 86400000); return d.toISOString().slice(0, 10); }

const DEFAULT_BONUS = { ru: 'Подарок за регистрацию', uk: 'Подарунок за реєстрацію', sk: 'Darček za registráciu', en: 'Welcome gift' };

function cleanProfile(p, prev) {
  p = p || {};
  const lang = ['ru', 'uk', 'sk', 'en'].includes(p.lang) ? p.lang : (prev && prev.lang) || 'ru';
  return {
    enabled: !!p.enabled,
    // promo — акция по ссылке (/r/…), join — онлайн-саморегистрация (/j/…). Старые профили: promo = enabled.
    promo: p.promo === undefined ? !!p.enabled : !!p.promo,
    join: !!p.join,
    name: str(p.name, 60) || 'Loya',
    emoji: str(p.emoji, 8) || '🎁',
    color: /^#[0-9a-fA-F]{6}$/.test(p.color || '') ? p.color : '#d4af37',
    niche: str(p.niche, 24) || 'other',
    lang,
    bonusTitle: str(p.bonusTitle, 80),
    bonusPercent: clamp(p.bonusPercent, 1, 100, 100),
    bonusDays: clamp(p.bonusDays, 1, 90, 14),
    welcome: str(p.welcome, 160),
    currency: str(p.currency, 6) || 'EUR',
    // 2.20: «Приведи друга» — подарок другу (текст для страницы), ссылка на отзывы Google, онлайн-запись.
    refOn: !!p.refOn,
    refFriend: str(p.refFriend, 60),
    reviewUrl: /^https:\/\/[^\s<>"']{4,300}$/.test(String(p.reviewUrl || '')) ? String(p.reviewUrl) : '',
    book: require('./_book').cleanBook(p.book),
    geo: require('./_wallet').cleanGeo(p.geo),
    // 2.23: какую постоянную карту получит гость при регистрации (чтобы сразу выдать её в Google/Apple Wallet)
    card: cleanCard(p.card),
    // 2.23: оформление страницы регистрации (можно задать и из админки)
    page: cleanPage(p.page)
  };
}
function cleanCard(c) {
  c = c || {};
  const type = ['stamp', 'discount', 'spend', 'combo'].includes(c.type) ? c.type : 'stamp';
  return { type, stampTarget: clamp(c.stampTarget, 2, 50, 10), title: str(c.title, 60), discount: clamp(c.discount, 1, 90, 5), spendTarget: clamp(c.spendTarget, 1, 100000, 100), spendTitle: str(c.spendTitle, 60), spendPoints: clamp(c.spendPoints, 1, 1000, 1), welcomeDouble: !!c.welcomeDouble };
}
function cleanPage(pg) {
  pg = pg || {};
  const hex = (v) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : '');
  return { color2: hex(pg.color2), bg: ['dark', 'light'].includes(pg.bg) ? pg.bg : '', title: str(pg.title, 80), text: str(pg.text, 240), button: str(pg.button, 40),
    logo: /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]{20,}$/.test(String(pg.logo || '')) && String(pg.logo).length < 420000 ? String(pg.logo) : '',
    // 2.25: свой фон страниц (фото) и насколько его затемнить, чтобы текст читался
    bgImg: /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]{20,}$/.test(String(pg.bgImg || '')) && String(pg.bgImg).length < 640000 ? String(pg.bgImg) : '',
    bgDim: clamp(pg.bgDim, 0, 85, 45) };
}
// 2.23: у каждой точки (устройства) своя страница регистрации. Профиль точки хранится под ключом «КЛЮЧ#точка».
const LOC_RE = /^[a-z0-9]{6,32}$/;
const splitKey = (k) => { const s = String(k || ''); const i = s.indexOf('#'); return i < 0 ? { key: s, loc: '' } : { key: s.slice(0, i), loc: s.slice(i + 1) }; };
// Профиль бизнеса по ключу подписки: общий (старые версии программы) или любой из профилей точек.
async function profileByLicense(key, loc) {
  key = String(key || '').trim(); if (!key) return null;
  if (loc && LOC_RE.test(loc)) { const { data } = await supabase.from('business_profiles').select('license_key, slug, profile').eq('license_key', `${key}#${loc}`).maybeSingle(); if (data) return data; }
  const { data } = await supabase.from('business_profiles').select('license_key, slug, profile').eq('license_key', key).maybeSingle();
  if (data) return data;
  const { data: list } = await supabase.from('business_profiles').select('license_key, slug, profile').ilike('license_key', `${key}#%`).limit(1);
  return (list && list[0]) || null;
}

async function publishProfile({ licenseKey, profile, loc }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const base = licenseKey.trim();
  const useLoc = LOC_RE.test(String(loc || '')) ? String(loc) : '';
  const key = useLoc ? `${base}#${useLoc}` : base;
  const { data: row0, error: selErr } = await supabase.from('business_profiles').select('slug, profile').eq('license_key', key).maybeSingle();
  if (selErr) return { status: 500, error: 'db_error', detail: String(selErr.message || '').slice(0, 140) };
  let row = row0;
  const clean = cleanProfile(profile, row && row.profile);
  // Точка публикуется впервые, а у подписки уже есть общая страница (её ссылка могла быть напечатана на афише):
  // её забирает та точка, чьё название совпадает со ссылкой (или кто публиковал её последним), остальные получают свою.
  if (!row && useLoc) {
    const { data: legacy } = await supabase.from('business_profiles').select('slug, profile').eq('license_key', base).maybeSingle();
    if (legacy && legacy.slug) {
      const mine = legacy.slug.startsWith(slugify(clean.name) + '-') || legacy.slug === slugify(clean.name) || ((legacy.profile || {}).name === clean.name);
      if (mine) {
        const { error: mvErr } = await supabase.from('business_profiles').update({ license_key: key }).eq('license_key', base);
        if (!mvErr) row = legacy;
      }
    }
  }
  let slug = row && row.slug;
  if (!slug) {
    const base2 = slugify(clean.name);
    for (let i = 0; i < 5 && !slug; i++) {
      const cand = `${base2}-${randId(4)}`;
      const { data: taken } = await supabase.from('business_profiles').select('slug').eq('slug', cand).maybeSingle();
      if (!taken) slug = cand;
    }
    if (!slug) return { status: 500, error: 'slug_failed' };
  }
  const { error } = await supabase.from('business_profiles').upsert({ license_key: key, slug, profile: clean, updated_at: new Date().toISOString() });
  if (error) return { status: 500, error: 'db_error', detail: String(error.message || '').slice(0, 140) };
  return { status: 200, ok: true, slug, url: `${SITE_URL}/r/${slug}` };
}

async function loadProfileBySlug(slug) {
  if (!/^[a-z0-9-]{3,48}$/.test(String(slug || ''))) return null;
  const { data } = await supabase.from('business_profiles').select('license_key, slug, profile').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const { key, loc } = splitKey(data.license_key);
  return { ...data, license_key: key, loc };
}

const MAIL_TXT = {
  ru: { subj: (b) => `Ваш подарок от «${b}» 🎁`, hi: (n) => `Здравствуйте, ${n}!`, body: (b, t, p, d) => `Спасибо за регистрацию в «${b}». Ваш бонус: <b>${t}</b> (−${p}%). Действует до <b>${d}</b> — покажите этот QR-код при визите.`, after: 'В заведении вы получите постоянную карту лояльности. Если не успеть до конца срока, бонус сгорит.' },
  uk: { subj: (b) => `Ваш подарунок від «${b}» 🎁`, hi: (n) => `Вітаємо, ${n}!`, body: (b, t, p, d) => `Дякуємо за реєстрацію в «${b}». Ваш бонус: <b>${t}</b> (−${p}%). Діє до <b>${d}</b> — покажіть цей QR-код під час візиту.`, after: 'У закладі ви отримаєте постійну картку лояльності. Якщо не встигнути до кінця терміну, бонус згорить.' },
  sk: { subj: (b) => `Váš darček od „${b}“ 🎁`, hi: (n) => `Dobrý deň, ${n}!`, body: (b, t, p, d) => `Ďakujeme za registráciu v „${b}“. Váš bonus: <b>${t}</b> (−${p} %). Platí do <b>${d}</b> — ukážte tento QR kód pri návšteve.`, after: 'V prevádzke dostanete stálu vernostnú kartu. Ak to nestihnete do konca platnosti, bonus prepadne.' },
  en: { subj: (b) => `Your gift from ${b} 🎁`, hi: (n) => `Hello ${n}!`, body: (b, t, p, d) => `Thanks for signing up at ${b}. Your bonus: <b>${t}</b> (−${p}%). Valid until <b>${d}</b> — show this QR code when you visit.`, after: 'You’ll get a permanent loyalty card at the venue. If you don’t make it before the deadline, the bonus expires.' }
};
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmtDate(iso, lang) { const [y, m, d] = iso.split('-'); return lang === 'en' ? `${m}/${d}/${y}` : `${d}.${m}.${y}`; }

const JOIN_MAIL = {
  ru: { subj: (n) => `Ваша карта лояльности — ${n}`, body: (n) => `Вы зарегистрированы в программе лояльности «${n}». Это ваша карта: покажите QR-код на кассе — штампы и бонусы будут копиться на неё.` },
  uk: { subj: (n) => `Ваша картка лояльності — ${n}`, body: (n) => `Ви зареєстровані в програмі лояльності «${n}». Це ваша картка: покажіть QR-код на касі — штампи й бонуси накопичуватимуться на неї.` },
  sk: { subj: (n) => `Vaša vernostná karta — ${n}`, body: (n) => `Ste zaregistrovaný vo vernostnom programe „${n}“. Toto je vaša karta: ukážte QR kód pri pokladnici — pečiatky a bonusy sa budú zbierať na ňu.` },
  en: { subj: (n) => `Your loyalty card — ${n}`, body: (n) => `You’re registered in the ${n} loyalty programme. This is your card: show the QR code at the till — stamps and bonuses are collected on it.` }
};
const WAL_TXT = { ru: ['Добавить в Apple Wallet', 'Добавить в Google Wallet'], uk: ['Додати в Apple Wallet', 'Додати в Google Wallet'], sk: ['Pridať do Apple Wallet', 'Pridať do Google Wallet'], en: ['Add to Apple Wallet', 'Add to Google Wallet'] };
function walletMailButtons(r, lang) {
  // Официальные значки Apple / Google Wallet (PNG: почтовики не показывают SVG), язык — как у письма.
  const l = WAL_TXT[lang] ? lang : 'en', t = WAL_TXT[l];
  const b = (href, kind, label) => `<a href="${esc(href)}" style="display:inline-block;margin:4px;text-decoration:none"><img src="${SITE_URL}/img/wallet/${kind}-${l}.png" alt="${esc(label)}" height="44" style="height:44px;width:auto;border:0;vertical-align:middle"></a>`;
  const out = [r && r.awallet ? b(r.awallet, 'apple', t[0]) : '', r && r.gwallet ? b(r.gwallet, 'google', t[1]) : ''].filter(Boolean);
  return out.length ? `<p style="text-align:center">${out.join(' ')}</p>` : '';
}
// 2.26: оформленное письмо гостю — шапка в цвете заведения (логотип или значок и название), карта/купон с QR в фирменной рамке.
// Таблицы и инлайн-стили — так письмо одинаково выглядит в Gmail, Outlook и почте на телефоне.
const SHELL_TXT = {
  ru: { card: 'Карта лояльности', coupon: 'Бонус-купон', show: 'Покажите QR-код на кассе', foot: (b) => `Вы получили это письмо, потому что зарегистрировались в «${b}».` },
  uk: { card: 'Картка лояльності', coupon: 'Бонус-купон', show: 'Покажіть QR-код на касі', foot: (b) => `Ви отримали цей лист, бо зареєструвалися в «${b}».` },
  sk: { card: 'Vernostná karta', coupon: 'Bonusový kupón', show: 'Ukážte QR kód pri pokladnici', foot: (b) => `Tento e-mail ste dostali, pretože ste sa zaregistrovali v „${b}“.` },
  en: { card: 'Loyalty card', coupon: 'Bonus coupon', show: 'Show the QR code at the till', foot: (b) => `You received this email because you signed up at ${b}.` }
};
function mailBrand(prof) {
  const color = /^#[0-9a-fA-F]{6}$/.test(prof.color || '') ? prof.color : '#d4af37';
  const n = parseInt(color.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String((prof.page && prof.page.logo) || ''));
  // Логотип — вложением (cid): Gmail не показывает картинки data:. Слишком большой — без него.
  const logo = m && m[2].length < 300000 ? { filename: 'logo.' + (m[1] === 'jpeg' ? 'jpg' : m[1]), contentBase64: m[2], cid: 'brandlogo', contentType: 'image/' + m[1] } : null;
  return { name: prof.name || 'Loya', emoji: prof.emoji || '', color, on: lum > 0.62 ? '#1d1a14' : '#ffffff', logo };
}
function mailCardHtml(brand, lang, code, isCoupon) {
  const T = SHELL_TXT[lang] || SHELL_TXT.en;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="300" style="margin:18px auto;border-collapse:separate;background:${brand.color};border-radius:18px">
<tr><td style="padding:14px 18px 0;color:${brand.on};font:700 15px Arial,Helvetica,sans-serif">${esc(brand.name)}</td><td align="right" style="padding:14px 18px 0;color:${brand.on};font:12px Arial,Helvetica,sans-serif;opacity:.85">${esc(isCoupon ? T.coupon : T.card)}</td></tr>
<tr><td colspan="2" align="center" style="padding:12px 18px 6px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px"><tr><td style="padding:10px"><img src="cid:coupon" width="210" height="210" style="display:block;border:0" alt="QR"></td></tr></table></td></tr>
<tr><td colspan="2" align="center" style="padding:4px 18px 16px;color:${brand.on};font:700 13px 'Courier New',monospace;letter-spacing:2px">${esc(code)}<div style="font:12px Arial,Helvetica,sans-serif;letter-spacing:0;opacity:.85;margin-top:4px">${esc(T.show)}</div></td></tr></table>`;
}
function mailShell(innerHtml, brand, lang) {
  const T = SHELL_TXT[lang] || SHELL_TXT.en;
  const mark = brand.logo
    ? `<img src="cid:brandlogo" width="36" height="36" style="display:inline-block;vertical-align:middle;border-radius:9px;border:0;margin-right:10px" alt="">`
    : (brand.emoji ? `<span style="font-size:22px;vertical-align:middle;margin-right:8px">${esc(brand.emoji)}</span>` : '');
  return `<div style="margin:0;padding:24px 12px;background:#f4f2ee">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;border-collapse:separate;overflow:hidden">
<tr><td style="background:${brand.color};padding:18px 24px;color:${brand.on};font:700 19px Arial,Helvetica,sans-serif">${mark}<span style="vertical-align:middle">${esc(brand.name)}</span></td></tr>
<tr><td style="padding:22px 24px 10px;color:#222222;font:15px/1.55 Arial,Helvetica,sans-serif">${innerHtml}</td></tr>
<tr><td style="padding:12px 24px 20px;color:#8a8a8a;font:12px/1.5 Arial,Helvetica,sans-serif;border-top:1px solid #eeeeee">${esc(T.foot(brand.name))}</td></tr>
</table></div>`;
}
// 2.23: ссылки «Добавить в Wallet» для постоянной карты гостя (Google — Android, Apple — iPhone).
async function walletLinksFor(row, rec) {
  try {
    if (!(await licenseActive(row.license_key))) return {};
    const WL = require('./_walletLinks');
    const prof = row.profile || {};
    const card = WL.joinCard(prof, rec.bonus_code, rec.name, rec.lang || prof.lang || 'ru');
    const brand = { name: prof.name, color: prof.color, currency: prof.currency, niche: prof.niche, ...(prof.geo ? { geo: prof.geo } : {}) };
    const [g, a] = await Promise.all([WL.googleLink(row.license_key, card, brand), WL.appleLink(row.license_key, card, brand)]);
    return { gwallet: g || '', awallet: a || '' };
  } catch (e) { return {}; }
}
async function register(body, ip) {
  if (str(body.hp, 50)) return { status: 200, ok: true, fake: true }; // ловушка для ботов: поле не должен заполнять человек
  if (await RL.limited('online-ip:' + ip, 12, 3600 * 1000)) return { status: 429, error: 'too_many' };
  const row = await loadProfileBySlug(body.slug);
  if (!row) return { status: 404, error: 'not_found' };
  const prof = row.profile || {};
  if (!prof.enabled) return { status: 403, error: 'closed' };
  if (body.mode === 'join' ? !prof.join : prof.promo === false) return { status: 403, error: 'closed' };
  const lang = ['ru', 'uk', 'sk', 'en'].includes(body.lang) ? body.lang : (prof.lang || 'ru');
  const name = str(body.name, 100), phone = str(body.phone, 30), email = str(body.email, 120).toLowerCase();
  const phoneKey = digitsKey(phone);
  // 2.23: обязательны только имя и email (телефон — по желанию). Старая страница без поля email — как раньше, по телефону.
  if (!name) return { status: 400, error: 'name' };
  if (!email && !phoneKey) return { status: 400, error: 'email' };
  if (email && !EMAIL_RE.test(email)) return { status: 400, error: 'email' };
  if (phone && !phoneKey) return { status: 400, error: 'phone' };
  // 2.20: код пригласившего друга (из ссылки ?ref=…) — программа на кассе свяжет нового гостя с ним.
  const ref = prof.refOn && /^[A-Z0-9]{4,12}$/.test(String(body.ref || '').toUpperCase()) ? String(body.ref).toUpperCase() : '';
  const birthdayRaw = str(body.birthday, 10);
  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? birthdayRaw : '';

  // join — онлайн-саморегистрация: сразу постоянная карта (без купона). promo — акция по ссылке (купон).
  const join = body.mode === 'join';
  const kindOf = (r) => r.kind || (Number(r.bonus_percent) === 0 ? 'join' : 'promo');
  // Один человек — один бонус (и одна карта): тот же номер уже регистрировался — показываем прежний код.
  const { data: prevList } = phoneKey
    ? await supabase.from('online_registrations').select('*').eq('license_key', row.license_key).eq('phone_key', phoneKey).order('id', { ascending: false }).limit(10)
    : await supabase.from('online_registrations').select('*').eq('license_key', row.license_key).ilike('email', email.replace(/[%_\\]/g, '\\$&')).order('id', { ascending: false }).limit(10);
  const prev = (prevList || []).find(r => kindOf(r) === (join ? 'join' : 'promo'));
  const QR = require('qrcode');
  const asReply = async (r, repeat) => ({ status: 200, ok: true, repeat, kind: kindOf(r), code: r.bonus_code, title: r.bonus_title, percent: r.bonus_percent, expires: String(r.bonus_expires).slice(0, 10), qr: await QR.toDataURL(r.bonus_code, { width: 360, margin: 2 }) });
  if (prev) { const rr = await asReply(prev, true); if (kindOf(prev) === 'join') Object.assign(rr, await walletLinksFor(row, prev)); return rr; }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from('online_registrations').select('id', { count: 'exact', head: true }).eq('license_key', row.license_key).gte('created_at', since);
  if ((count || 0) >= (Number(process.env.ONLINE_REG_DAILY_PER_BUSINESS) || 300)) return { status: 429, error: 'daily_limit' };

  const rec = join ? {
    // Постоянная карта: код в том же формате, что и в программе (LC-…); процент 0 — признак онлайн-регистрации.
    license_key: row.license_key, name, phone: phone || null, phone_key: phoneKey || null, email: email || null, birthday: birthday || null, lang, consent: !!body.consent, ...(ref ? { ref } : {}),
    bonus_code: 'LC-' + crypto.randomBytes(6).toString('hex').toUpperCase(), bonus_title: '', bonus_percent: 0, bonus_expires: dateISO(3650), kind: 'join'
  } : {
    license_key: row.license_key, name, phone: phone || null, phone_key: phoneKey || null, email: email || null, birthday: birthday || null, lang, consent: !!body.consent, ...(ref ? { ref } : {}),
    bonus_code: 'LB-' + crypto.randomBytes(5).toString('hex').toUpperCase(),
    bonus_title: prof.bonusTitle || DEFAULT_BONUS[lang], bonus_percent: clamp(prof.bonusPercent, 1, 100, 100),
    bonus_expires: dateISO(clamp(prof.bonusDays, 1, 90, 14)), kind: 'promo'
  };
  if (row.loc) rec.loc = row.loc;   // 2.23: заявка уходит той точке, чья это страница
  let { data: saved, error } = await supabase.from('online_registrations').insert(rec).select().single();
  if (error && /\bloc\b/i.test(String(error.message))) { const { loc: _l, ...noLoc } = rec; ({ data: saved, error } = await supabase.from('online_registrations').insert(noLoc).select().single()); }   // schema_2_23.sql ещё не выполнен
  if (error && /kind/i.test(String(error.message))) { const { kind, ...noKind } = rec; ({ data: saved, error } = await supabase.from('online_registrations').insert(noKind).select().single()); }   // колонку ещё не добавили
  if (error && /\bref\b/i.test(String(error.message))) { const { ref: _r, ...noRef } = rec; ({ data: saved, error } = await supabase.from('online_registrations').insert(noRef).select().single()); }   // schema_2_20.sql ещё не выполнен
  if (error || !saved) return { status: 500, error: 'save_failed' };
  const reply = await asReply(saved, false);
  if (join) Object.assign(reply, await walletLinksFor(row, saved));

  // Купон на email — сразу, не дожидаясь программы на кассе. Не получилось — не страшно: купон виден на странице.
  reply.emailSent = false;
  if (email) {
    try {
      const T = MAIL_TXT[lang];
      const png = await QR.toBuffer(saved.bonus_code, { width: 360, margin: 2 });
      const J = JOIN_MAIL[lang];
      const mBrand = mailBrand(prof);
      const r = await sendMail({
        licenseKey: row.license_key, fromName: prof.name, to: email, subject: join ? J.subj(prof.name) : T.subj(prof.name),
        html: mailShell(`<p>${esc(T.hi(name))}</p><p>${join ? esc(J.body(prof.name)) : T.body(esc(prof.name), esc(rec.bonus_title), rec.bonus_percent, fmtDate(rec.bonus_expires, lang))}</p>${mailCardHtml(mBrand, lang, rec.bonus_code, !join)}${walletMailButtons(reply, lang)}${join || !T.after ? '' : `<p style="color:#666;font-size:13px">${T.after}</p>`}`, mBrand, lang),
        attachments: [{ filename: 'coupon.png', contentBase64: png.toString('base64'), cid: 'coupon', contentType: 'image/png' }, ...(mBrand.logo ? [mBrand.logo] : [])]
      });
      reply.emailSent = !!r.ok;   // для join: карта на email; в программе она появится при следующем обмене (раз в минуту)
    } catch (e) { /* письмо не ушло — купон всё равно выдан */ }
  }
  return reply;
}

async function pull({ licenseKey, ack, loc }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = licenseKey.trim();
  // Храним заявки недолго: после передачи программе — 90 дней (для защиты от повторных бонусов), затем удаляем.
  await supabase.from('online_registrations').delete().eq('license_key', key).lt('delivered_at', new Date(Date.now() - 90 * 86400000).toISOString());
  const ids = Array.isArray(ack) ? ack.map(Number).filter(Number.isInteger).slice(0, 200) : [];
  if (ids.length) await supabase.from('online_registrations').update({ delivered_at: new Date().toISOString() }).eq('license_key', key).in('id', ids);
  let { data, error: pullErr } = await supabase.from('online_registrations').select('*').eq('license_key', key).is('delivered_at', null).order('id', { ascending: true }).limit(50);
  // 2.23: точка забирает свои заявки и общие (без точки); если колонки loc ещё нет — всё, как раньше
  const myLoc = LOC_RE.test(String(loc || '')) ? String(loc) : '';
  if (!pullErr && myLoc) data = (data || []).filter(r => !r.loc || r.loc === myLoc);
  if (pullErr) return { status: 500, error: 'db_error', detail: String(pullErr.message || '').slice(0, 140) };
  return { status: 200, ok: true, items: (data || []).map(r => ({ id: r.id, kind: r.kind || (Number(r.bonus_percent) === 0 ? 'join' : 'promo'), name: r.name, phone: r.phone, email: r.email, birthday: r.birthday, lang: r.lang, consent: !!r.consent, ref: r.ref || '', code: r.bonus_code, title: r.bonus_title, percent: r.bonus_percent, expires: String(r.bonus_expires).slice(0, 10), createdAt: r.created_at })) };
}

module.exports = { publishProfile, loadProfileBySlug, profileByLicense, splitKey, register, pull, SITE_URL, esc, cleanProfile, slugify, DEFAULT_BONUS };
