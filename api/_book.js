// 2.20: онлайн-запись. Страница /b/<slug>: гость выбирает услугу, мастера, день и время.
// Настройки (услуги, мастера, часы работы) программа Loya публикует вместе с профилем бизнеса.
// Время везде — местное время бизнеса ('YYYY-MM-DD' + минуты от полуночи), часовой пояс — в настройках.
// Записи, сделанные в самой программе, приходят сюда как «занятое время» (booking_busy), чтобы
// гость онлайн не попал на уже занятое место.
const crypto = require('crypto');
const { supabase, licenseActive, sendMail, EMAIL_RE } = require('./_mail');
const RL = require('./_ratelimit');
const SITE_URL = process.env.PUBLIC_URL || 'https://loya-loyalty.com';

function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function clamp(v, a, b, def) { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, Math.round(n))) : def; }
function idOf(v) { const s = String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12); return s; }
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
function toMin(hm) { const [h, m] = String(hm).split(':').map(Number); return h * 60 + m; }
function hm(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
function validTz(tz) { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch (e) { return false; } }
function digitsKey(phone) { const d = String(phone || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-9) : ''; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function cleanHours(h) {
  const out = {};
  for (let d = 0; d < 7; d++) {
    const arr = Array.isArray(h && h[d]) ? h[d] : [];
    out[d] = arr.slice(0, 3).filter(x => Array.isArray(x) && HM.test(x[0]) && HM.test(x[1]) && toMin(x[1]) > toMin(x[0])).map(x => [x[0], x[1]]);
  }
  return out;
}
function cleanBook(b) {
  b = b && typeof b === 'object' ? b : {};
  const services = (Array.isArray(b.services) ? b.services : []).slice(0, 40).map(x => ({
    id: idOf(x && x.id), n: str(x && x.n, 60), d: clamp(x && x.d, 5, 480, 60),
    p: x && x.p !== '' && x.p != null && Number.isFinite(Number(x.p)) ? Math.max(0, Math.min(100000, Math.round(Number(x.p) * 100) / 100)) : null
  })).filter(x => x.id && x.n);
  const sids = new Set(services.map(x => x.id));
  const staff = (Array.isArray(b.staff) ? b.staff : []).slice(0, 20).map(x => ({
    id: idOf(x && x.id), n: str(x && x.n, 40),
    s: (Array.isArray(x && x.s) ? x.s : []).map(idOf).filter(id => sids.has(id)),
    ...(x && x.h ? { h: cleanHours(x.h) } : {})
  })).filter(x => x.id && x.n);
  return {
    on: !!b.on && services.length > 0,
    services, staff,
    hours: cleanHours(b.hours),
    step: [10, 15, 20, 30, 60].includes(Number(b.step)) ? Number(b.step) : 30,
    lead: clamp(b.lead, 0, 2880, 60),
    days: clamp(b.days, 1, 90, 30),
    tz: validTz(b.tz) ? String(b.tz) : 'Europe/Bratislava',
    note: str(b.note, 300), address: str(b.address, 120), phone: str(b.phone, 30),
    currency: str(b.currency, 6) || 'EUR'
  };
}

// Сейчас в часовом поясе бизнеса: дата и минуты от полуночи.
function nowLocal(tz, at) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at || new Date());
  const g = (t) => (parts.find(p => p.type === t) || {}).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, min: Number(g('hour')) * 60 + Number(g('minute')) };
}
function addDays(date, n) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dow(date) { return new Date(date + 'T12:00:00Z').getUTCDay(); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000); }

async function loadBySlug(slug) {
  if (!/^[a-z0-9-]{3,48}$/.test(String(slug || ''))) return null;
  const { data } = await supabase.from('business_profiles').select('license_key, slug, profile').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const book = cleanBook((data.profile || {}).book);
  const { key, loc } = require('./_online').splitKey(data.license_key);   // 2.23: профиль точки «КЛЮЧ#точка»
  return { ...data, license_key: key, loc, book };
}

function staffFor(book, serviceId) {
  if (!book.staff.length) return [{ id: '', n: '' }];
  return book.staff.filter(x => !x.s.length || x.s.includes(serviceId));
}

// Свободное время на день: [{ t:'HH:MM', staff:[id,…] }]
async function freeSlots(row, date, serviceId, staffId) {
  const book = row.book;
  const svc = book.services.find(x => x.id === serviceId);
  if (!svc) return { error: 'service' };
  const now = nowLocal(book.tz);
  const ahead = daysBetween(now.date, date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || ahead < 0 || ahead > book.days) return { slots: [] };
  let list = staffFor(book, serviceId);
  if (staffId) list = list.filter(x => x.id === staffId);
  if (!list.length) return { slots: [] };
  const [{ data: bk }, { data: busy }] = await Promise.all([
    supabase.from('bookings').select('staff_id, start_min, dur').eq('license_key', row.license_key).eq('date', date).eq('status', 'booked'),
    supabase.from('booking_busy').select('staff_id, start_min, end_min').eq('license_key', row.license_key).eq('date', date)
  ]);
  const taken = (sid) => [
    ...(bk || []).filter(b => !sid || !b.staff_id || b.staff_id === sid).map(b => [b.start_min, b.start_min + b.dur]),
    ...(busy || []).filter(b => !sid || !b.staff_id || b.staff_id === sid).map(b => [b.start_min, b.end_min])
  ];
  const map = new Map();
  const minStart = now.min + book.lead - ahead * 1440;   // раньше этого (в минутах дня) записаться нельзя
  for (const st of list) {
    const hours = (st.h || book.hours)[dow(date)] || [];
    const tk = taken(st.id);
    for (const [from, to] of hours) {
      for (let t = toMin(from); t + svc.d <= toMin(to); t += book.step) {
        if (t < minStart) continue;
        if (tk.some(([a, b]) => t < b && t + svc.d > a)) continue;
        const k = hm(t);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(st.id);
      }
    }
  }
  return { slots: [...map.keys()].sort().map(t => ({ t, staff: map.get(t) })), dur: svc.d };
}

async function slots(q) {
  const row = await loadBySlug(q.slug);
  if (!row || !row.book.on) return { status: 404, error: 'not_found' };
  const date = String(q.date || '');
  // Без даты — ближайшие дни со свободным временем (для подсветки в календаре).
  if (!date) {
    const now = nowLocal(row.book.tz), out = [];
    for (let i = 0; i <= Math.min(row.book.days, 31); i++) {
      const d = addDays(now.date, i);
      const r = await freeSlots(row, d, String(q.service || ''), idOf(q.staff));
      if (r.error) return { status: 400, error: r.error };
      if (r.slots.length) out.push(d);
    }
    return { status: 200, ok: true, days: out };
  }
  const r = await freeSlots(row, date, String(q.service || ''), idOf(q.staff));
  if (r.error) return { status: 400, error: r.error };
  return { status: 200, ok: true, slots: r.slots.map(x => x.t) };
}

const MAIL = {
  ru: { subj: (b) => `Вы записаны — ${b}`, hi: (n) => `Здравствуйте, ${n}!`, ok: 'Ваша запись подтверждена:', when: 'Когда', what: 'Услуга', who: 'Мастер', where: 'Адрес', cancel: 'Отменить или перенести запись', rem: (b) => `Напоминание: завтра вы записаны — ${b}`, remBody: 'Напоминаем о вашей записи завтра:' },
  uk: { subj: (b) => `Ви записані — ${b}`, hi: (n) => `Вітаємо, ${n}!`, ok: 'Ваш запис підтверджено:', when: 'Коли', what: 'Послуга', who: 'Майстер', where: 'Адреса', cancel: 'Скасувати чи перенести запис', rem: (b) => `Нагадування: завтра ви записані — ${b}`, remBody: 'Нагадуємо про ваш запис завтра:' },
  sk: { subj: (b) => `Ste objednaný — ${b}`, hi: (n) => `Dobrý deň, ${n}!`, ok: 'Vaša rezervácia je potvrdená:', when: 'Kedy', what: 'Služba', who: 'Pracovník', where: 'Adresa', cancel: 'Zrušiť alebo presunúť rezerváciu', rem: (b) => `Pripomienka: zajtra máte rezerváciu — ${b}`, remBody: 'Pripomíname vašu rezerváciu na zajtra:' },
  en: { subj: (b) => `You’re booked — ${b}`, hi: (n) => `Hello ${n}!`, ok: 'Your booking is confirmed:', when: 'When', what: 'Service', who: 'With', where: 'Address', cancel: 'Cancel or reschedule', rem: (b) => `Reminder: you’re booked tomorrow — ${b}`, remBody: 'A reminder about your booking tomorrow:' }
};
function fmtDate(date, lang) {
  const loc = { ru: 'ru-RU', uk: 'uk-UA', sk: 'sk-SK', en: 'en-GB' }[lang] || 'en-GB';
  return new Date(date + 'T12:00:00Z').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
function bookingMailHtml(b, prof, lang, remind) {
  const T = MAIL[lang] || MAIL.en;
  const rows = [[T.when, `${fmtDate(b.date, lang)}, ${hm(b.start_min)}`], [T.what, b.service_name], ...(b.staff_name ? [[T.who, b.staff_name]] : []), ...(prof.book && prof.book.address ? [[T.where, prof.book.address]] : [])];
  const link = `${SITE_URL}/b/${prof.slug}?c=${b.token}&lang=${lang}`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#222"><p>${esc(T.hi(b.name))}</p><p>${esc(remind ? T.remBody : T.ok)}</p>`
    + `<table style="border-collapse:collapse;width:100%;margin:10px 0 18px">${rows.map(([k, v]) => `<tr><td style="padding:8px 10px;color:#777;border-bottom:1px solid #eee;width:34%">${esc(k)}</td><td style="padding:8px 10px;font-weight:bold;border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join('')}</table>`
    + `<p><a href="${esc(link)}" style="color:#9a6b12">${esc(T.cancel)}</a></p></div>`;
}

async function create(body, ip) {
  if (str(body.hp, 50)) return { status: 200, ok: true, fake: true };
  if (await RL.limited('book-ip:' + ip, 10, 3600 * 1000)) return { status: 429, error: 'too_many' };
  const row = await loadBySlug(body.slug);
  if (!row || !row.book.on || !(row.profile || {}).enabled) return { status: 404, error: 'closed' };
  if (!(await licenseActive(row.license_key))) return { status: 403, error: 'closed' };
  const lang = ['ru', 'uk', 'sk', 'en'].includes(body.lang) ? body.lang : ((row.profile || {}).lang || 'en');
  const name = str(body.name, 100), phone = str(body.phone, 30), email = str(body.email, 120).toLowerCase(), note = str(body.note, 300);
  if (!name) return { status: 400, error: 'name' };
  const phoneKey = digitsKey(phone);
  if (!phoneKey) return { status: 400, error: 'phone' };
  if (email && !EMAIL_RE.test(email)) return { status: 400, error: 'email' };
  const date = String(body.date || ''), time = String(body.time || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !HM.test(time)) return { status: 400, error: 'slot' };
  const svc = row.book.services.find(x => x.id === String(body.service || ''));
  if (!svc) return { status: 400, error: 'service' };
  const wantStaff = idOf(body.staff);
  const fr = await freeSlots(row, date, svc.id, wantStaff);
  const slot = (fr.slots || []).find(x => x.t === time);
  if (!slot) return { status: 409, error: 'slot_taken' };
  // Один телефон — не больше 3 будущих записей в этом заведении.
  const today = nowLocal(row.book.tz).date;
  const { count: mine } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('license_key', row.license_key).eq('phone_key', phoneKey).eq('status', 'booked').gte('date', today);
  if ((mine || 0) >= 3) return { status: 429, error: 'too_many_bookings' };
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count: day } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('license_key', row.license_key).gte('created_at', since);
  if ((day || 0) >= (Number(process.env.BOOK_DAILY_PER_BUSINESS) || 200)) return { status: 429, error: 'daily_limit' };
  // «Любой мастер»: тот, у кого в этот день меньше записей.
  let staffId = slot.staff[0];
  if (!wantStaff && slot.staff.length > 1) {
    const { data: dayList } = await supabase.from('bookings').select('staff_id').eq('license_key', row.license_key).eq('date', date).eq('status', 'booked');
    const cnt = (id) => (dayList || []).filter(b => b.staff_id === id).length;
    staffId = slot.staff.slice().sort((a, b) => cnt(a) - cnt(b))[0];
  }
  const st = row.book.staff.find(x => x.id === staffId);
  const rec = {
    license_key: row.license_key, token: crypto.randomBytes(12).toString('hex'), service_id: svc.id, service_name: svc.n, price: svc.p,
    staff_id: staffId || '', staff_name: st ? st.n : '', date, start_min: toMin(time), dur: svc.d,
    name, phone, phone_key: phoneKey, email: email || null, lang, consent: !!body.consent, note: note || null,
    status: 'booked', source: 'online', synced: false, reminded: false
  };
  const { data: saved, error } = await supabase.from('bookings').insert(rec).select().single();
  if (error || !saved) return { status: /duplicate|unique/i.test(String(error && error.message)) ? 409 : 500, error: /duplicate|unique/i.test(String(error && error.message)) ? 'slot_taken' : 'save_failed' };
  let emailSent = false;
  if (email) {
    try {
      const prof = { ...(row.profile || {}), slug: row.slug, book: row.book };
      const r = await sendMail({ licenseKey: row.license_key, fromName: prof.name, to: email, subject: (MAIL[lang] || MAIL.en).subj(prof.name || 'Loya'), html: bookingMailHtml(saved, prof, lang, false) });
      emailSent = !!r.ok;
    } catch (e) { /* письмо не ушло — запись всё равно есть */ }
  }
  return { status: 200, ok: true, token: saved.token, date, time, service: svc.n, staff: rec.staff_name, emailSent };
}

async function byToken(token) {
  if (!/^[a-f0-9]{24}$/.test(String(token || ''))) return null;
  const { data } = await supabase.from('bookings').select('*').eq('token', token).maybeSingle();
  return data || null;
}
async function info(q) {
  const b = await byToken(q.token);
  if (!b) return { status: 404, error: 'not_found' };
  return { status: 200, ok: true, date: b.date, time: hm(b.start_min), service: b.service_name, staff: b.staff_name, state: b.status, name: b.name };
}
async function cancel(body) {
  const b = await byToken(body.token);
  if (!b) return { status: 404, error: 'not_found' };
  if (b.status !== 'booked') return { status: 200, ok: true, already: true };
  const prof = await require('./_online').profileByLicense(b.license_key);
  const tz = cleanBook(((prof || {}).profile || {}).book).tz;
  const now = nowLocal(tz);
  if (b.date < now.date || (b.date === now.date && b.start_min <= now.min)) return { status: 400, error: 'past' };
  await supabase.from('bookings').update({ status: 'cancelled', synced: false, updated_at: new Date().toISOString() }).eq('id', b.id);
  return { status: 200, ok: true };
}

// Программа: забрать новые/изменённые записи и подтвердить полученные.
async function pull({ licenseKey, ack }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = String(licenseKey).trim();
  const ids = Array.isArray(ack) ? ack.map(Number).filter(Number.isInteger).slice(0, 300) : [];
  if (ids.length) await supabase.from('bookings').update({ synced: true }).eq('license_key', key).in('id', ids);
  // Старые записи (больше 120 дней назад) удаляем.
  await supabase.from('bookings').delete().eq('license_key', key).lt('date', addDays(new Date().toISOString().slice(0, 10), -120));
  const { data, error } = await supabase.from('bookings').select('*').eq('license_key', key).eq('synced', false).order('id', { ascending: true }).limit(100);
  if (error) return { status: 500, error: 'db_error' };
  return { status: 200, ok: true, items: (data || []).map(b => ({ id: b.id, token: b.token, serviceId: b.service_id, service: b.service_name, price: b.price, staffId: b.staff_id, staff: b.staff_name, date: b.date, time: hm(b.start_min), dur: b.dur, name: b.name, phone: b.phone, email: b.email, lang: b.lang, consent: !!b.consent, note: b.note || '', status: b.status, createdAt: b.created_at })) };
}
// Программа: изменить статус онлайн-записи (отменил администратор, пришёл, не пришёл) или перенести её.
async function update({ licenseKey, id, status, date, time, staffId }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = String(licenseKey).trim();
  const patch = { updated_at: new Date().toISOString() };
  if (['booked', 'cancelled', 'done', 'noshow'].includes(status)) patch.status = status;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) && HM.test(String(time || ''))) { patch.date = date; patch.start_min = toMin(time); patch.reminded = false; }
  if (staffId !== undefined) patch.staff_id = idOf(staffId);
  const { error } = await supabase.from('bookings').update(patch).eq('license_key', key).eq('id', Number(id));
  if (error) return { status: 500, error: 'db_error' };
  return { status: 200, ok: true };
}
// Программа: занятое время из записей, сделанных в самой программе (заменяет всё будущее разом).
async function busy({ licenseKey, items }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = String(licenseKey).trim();
  const list = (Array.isArray(items) ? items : []).slice(0, 2000).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) && Number.isInteger(Number(x.from)) && Number.isInteger(Number(x.to)) && Number(x.to) > Number(x.from))
    .map(x => ({ license_key: key, staff_id: idOf(x.staffId), date: x.date, start_min: Math.max(0, Number(x.from)), end_min: Math.min(1440, Number(x.to)) }));
  const { error: delErr } = await supabase.from('booking_busy').delete().eq('license_key', key);
  if (delErr) return { status: 500, error: 'db_error' };
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await supabase.from('booking_busy').insert(list.slice(i, i + 500));
    if (error) return { status: 500, error: 'db_error' };
  }
  return { status: 200, ok: true, count: list.length };
}

// Напоминания накануне (раз в день по расписанию Vercel Cron).
async function remind(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && String((req.headers || {}).authorization || '') !== `Bearer ${secret}`) return { status: 401, error: 'unauthorized' };
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from('bookings').select('*').eq('status', 'booked').eq('reminded', false).gte('date', today).lte('date', addDays(today, 2)).limit(400);
  const profiles = new Map();
  let sent = 0;
  for (const b of data || []) {
    if (!b.email) continue;
    if (!profiles.has(b.license_key)) {
      const p = await require('./_online').profileByLicense(b.license_key);
      profiles.set(b.license_key, p ? { ...(p.profile || {}), slug: p.slug, book: cleanBook((p.profile || {}).book) } : null);
    }
    const prof = profiles.get(b.license_key);
    if (!prof) continue;
    if (addDays(nowLocal(prof.book.tz).date, 1) !== b.date) continue;
    const lang = MAIL[b.lang] ? b.lang : 'en';
    try {
      const r = await sendMail({ licenseKey: b.license_key, fromName: prof.name, to: b.email, subject: MAIL[lang].rem(prof.name || 'Loya'), html: bookingMailHtml(b, prof, lang, true) });
      if (r.ok) { sent++; await supabase.from('bookings').update({ reminded: true }).eq('id', b.id); }
    } catch (e) { /* следующий */ }
  }
  return { status: 200, ok: true, sent };
}

module.exports = { cleanBook, loadBySlug, freeSlots, slots, create, info, cancel, pull, update, busy, remind, nowLocal, addDays, hm, toMin };
