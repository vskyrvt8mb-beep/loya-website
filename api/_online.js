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
    currency: str(p.currency, 6) || 'EUR'
  };
}

async function publishProfile({ licenseKey, profile }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = licenseKey.trim();
  const { data: row, error: selErr } = await supabase.from('business_profiles').select('slug, profile').eq('license_key', key).maybeSingle();
  if (selErr) return { status: 500, error: 'db_error', detail: String(selErr.message || '').slice(0, 140) };
  const clean = cleanProfile(profile, row && row.profile);
  let slug = row && row.slug;
  if (!slug) {
    const base = slugify(clean.name);
    for (let i = 0; i < 5 && !slug; i++) {
      const cand = `${base}-${randId(4)}`;
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
  return data || null;
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
  if (!name) return { status: 400, error: 'name' };
  if (!phoneKey) return { status: 400, error: 'phone' };
  if (email && !EMAIL_RE.test(email)) return { status: 400, error: 'email' };
  const birthdayRaw = str(body.birthday, 10);
  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? birthdayRaw : '';

  // join — онлайн-саморегистрация: сразу постоянная карта (без купона). promo — акция по ссылке (купон).
  const join = body.mode === 'join';
  const kindOf = (r) => r.kind || (Number(r.bonus_percent) === 0 ? 'join' : 'promo');
  // Один человек — один бонус (и одна карта): тот же номер уже регистрировался — показываем прежний код.
  const { data: prevList } = await supabase.from('online_registrations').select('*').eq('license_key', row.license_key).eq('phone_key', phoneKey).order('id', { ascending: false }).limit(10);
  const prev = (prevList || []).find(r => kindOf(r) === (join ? 'join' : 'promo'));
  const QR = require('qrcode');
  const asReply = async (r, repeat) => ({ status: 200, ok: true, repeat, kind: kindOf(r), code: r.bonus_code, title: r.bonus_title, percent: r.bonus_percent, expires: String(r.bonus_expires).slice(0, 10), qr: await QR.toDataURL(r.bonus_code, { width: 360, margin: 2 }) });
  if (prev) return asReply(prev, true);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from('online_registrations').select('id', { count: 'exact', head: true }).eq('license_key', row.license_key).gte('created_at', since);
  if ((count || 0) >= (Number(process.env.ONLINE_REG_DAILY_PER_BUSINESS) || 300)) return { status: 429, error: 'daily_limit' };

  const rec = join ? {
    // Постоянная карта: код в том же формате, что и в программе (LC-…); процент 0 — признак онлайн-регистрации.
    license_key: row.license_key, name, phone, phone_key: phoneKey, email: email || null, birthday: birthday || null, lang, consent: !!body.consent,
    bonus_code: 'LC-' + crypto.randomBytes(6).toString('hex').toUpperCase(), bonus_title: '', bonus_percent: 0, bonus_expires: dateISO(3650), kind: 'join'
  } : {
    license_key: row.license_key, name, phone, phone_key: phoneKey, email: email || null, birthday: birthday || null, lang, consent: !!body.consent,
    bonus_code: 'LB-' + crypto.randomBytes(5).toString('hex').toUpperCase(),
    bonus_title: prof.bonusTitle || DEFAULT_BONUS[lang], bonus_percent: clamp(prof.bonusPercent, 1, 100, 100),
    bonus_expires: dateISO(clamp(prof.bonusDays, 1, 90, 14)), kind: 'promo'
  };
  let { data: saved, error } = await supabase.from('online_registrations').insert(rec).select().single();
  if (error && /kind/i.test(String(error.message))) { const { kind, ...noKind } = rec; ({ data: saved, error } = await supabase.from('online_registrations').insert(noKind).select().single()); }   // колонку ещё не добавили
  if (error || !saved) return { status: 500, error: 'save_failed' };
  const reply = await asReply(saved, false);

  // Купон на email — сразу, не дожидаясь программы на кассе. Не получилось — не страшно: купон виден на странице.
  reply.emailSent = false;
  if (email) {
    try {
      const T = MAIL_TXT[lang];
      const png = await QR.toBuffer(saved.bonus_code, { width: 360, margin: 2 });
      const J = JOIN_MAIL[lang];
      const r = await sendMail({
        licenseKey: row.license_key, fromName: prof.name, to: email, subject: join ? J.subj(prof.name) : T.subj(prof.name),
        html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#222"><p>${esc(T.hi(name))}</p><p>${join ? esc(J.body(prof.name)) : T.body(esc(prof.name), esc(rec.bonus_title), rec.bonus_percent, fmtDate(rec.bonus_expires, lang))}</p><p style="text-align:center"><img src="cid:coupon" width="240" height="240" alt="QR"><br><b style="letter-spacing:2px">${esc(rec.bonus_code)}</b></p><p style="color:#666;font-size:13px">${T.after}</p></div>`,
        attachments: [{ filename: 'coupon.png', contentBase64: png.toString('base64'), cid: 'coupon', contentType: 'image/png' }]
      });
      reply.emailSent = !!r.ok;   // для join: карта на email; в программе она появится при следующем обмене (раз в минуту)
    } catch (e) { /* письмо не ушло — купон всё равно выдан */ }
  }
  return reply;
}

async function pull({ licenseKey, ack }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = licenseKey.trim();
  // Храним заявки недолго: после передачи программе — 90 дней (для защиты от повторных бонусов), затем удаляем.
  await supabase.from('online_registrations').delete().eq('license_key', key).lt('delivered_at', new Date(Date.now() - 90 * 86400000).toISOString());
  const ids = Array.isArray(ack) ? ack.map(Number).filter(Number.isInteger).slice(0, 200) : [];
  if (ids.length) await supabase.from('online_registrations').update({ delivered_at: new Date().toISOString() }).eq('license_key', key).in('id', ids);
  const { data, error: pullErr } = await supabase.from('online_registrations').select('*').eq('license_key', key).is('delivered_at', null).order('id', { ascending: true }).limit(50);
  if (pullErr) return { status: 500, error: 'db_error', detail: String(pullErr.message || '').slice(0, 140) };
  return { status: 200, ok: true, items: (data || []).map(r => ({ id: r.id, kind: r.kind || (Number(r.bonus_percent) === 0 ? 'join' : 'promo'), name: r.name, phone: r.phone, email: r.email, birthday: r.birthday, lang: r.lang, consent: !!r.consent, code: r.bonus_code, title: r.bonus_title, percent: r.bonus_percent, expires: String(r.bonus_expires).slice(0, 10), createdAt: r.created_at })) };
}

module.exports = { publishProfile, loadProfileBySlug, register, pull, SITE_URL, esc, cleanProfile, slugify, DEFAULT_BONUS };
