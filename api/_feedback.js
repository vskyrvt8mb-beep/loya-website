// 2.20: отзыв после визита. Программа Loya через пару часов после покупки пишет гостю «Как вам у нас?»
// со ссылкой /f/<token>. Довольных (4–5 звёзд) страница просит оставить отзыв в Google, недовольные
// пишут, что улучшить, — это видит только владелец (в программе), а не весь интернет.
const { supabase, licenseActive } = require('./_mail');
const RL = require('./_ratelimit');

function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, max); }
const TOKEN = /^[a-f0-9]{24}$/;
const LIFE_DAYS = 30;

// Программа регистрирует ссылки, которые сейчас отправит гостям.
async function register({ licenseKey, items }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = String(licenseKey).trim();
  const list = (Array.isArray(items) ? items : []).slice(0, 200).filter(x => x && TOKEN.test(String(x.t)))
    .map(x => ({ token: String(x.t), license_key: key, name: str(x.n, 60), lang: ['ru', 'uk', 'sk', 'en'].includes(x.l) ? x.l : 'en', delivered: true }));
  if (!list.length) return { status: 200, ok: true, count: 0 };
  const { error } = await supabase.from('feedback').upsert(list, { onConflict: 'token', ignoreDuplicates: true });
  if (error) return { status: 500, error: 'db_error' };
  // Старые ссылки без оценки удаляем.
  await supabase.from('feedback').delete().eq('license_key', key).is('rating', null).lt('created_at', new Date(Date.now() - LIFE_DAYS * 86400e3).toISOString());
  return { status: 200, ok: true, count: list.length };
}

async function load(token) {
  if (!TOKEN.test(String(token || ''))) return null;
  const { data } = await supabase.from('feedback').select('*').eq('token', token).maybeSingle();
  if (!data) return null;
  const prof = await require('./_online').profileByLicense(data.license_key);
  return { fb: data, profile: (prof && prof.profile) || {} };
}

// Гость ставит оценку (один раз) и при желании пишет комментарий.
async function rate(body, ip) {
  if (await RL.limited('fb-ip:' + ip, 30, 3600 * 1000)) return { status: 429, error: 'too_many' };
  const r = await load(body.t);
  if (!r) return { status: 404, error: 'not_found' };
  const { fb, profile } = r;
  if (Date.now() - new Date(fb.created_at).getTime() > LIFE_DAYS * 86400e3 && fb.rating == null) return { status: 410, error: 'expired' };
  const patch = { delivered: false };
  const s = Number(body.s);
  if (fb.rating == null) {
    if (!(Number.isInteger(s) && s >= 1 && s <= 5)) return { status: 400, error: 'rating' };
    patch.rating = s; patch.rated_at = new Date().toISOString();
  }
  const comment = str(body.c, 1000);
  if (comment) {
    if (fb.comment && fb.comment.length >= 1000) return { status: 400, error: 'too_long' };
    patch.comment = comment;
  }
  if (Object.keys(patch).length === 1 && fb.rating != null) return { status: 200, ok: true, rating: fb.rating, reviewUrl: fb.rating >= 4 ? profile.reviewUrl || '' : '' };
  const { error } = await supabase.from('feedback').update(patch).eq('token', fb.token);
  if (error) return { status: 500, error: 'db_error' };
  const rating = patch.rating || fb.rating;
  return { status: 200, ok: true, rating, reviewUrl: rating >= 4 ? (profile.reviewUrl || '') : '' };
}

async function pull({ licenseKey, ack }) {
  if (!(await licenseActive(licenseKey))) return { status: 403, error: 'license_inactive' };
  const key = String(licenseKey).trim();
  const tokens = Array.isArray(ack) ? ack.map(String).filter(t => TOKEN.test(t)).slice(0, 300) : [];
  if (tokens.length) await supabase.from('feedback').update({ delivered: true }).eq('license_key', key).in('token', tokens);
  const { data, error } = await supabase.from('feedback').select('token, name, lang, rating, comment, rated_at').eq('license_key', key).eq('delivered', false).not('rating', 'is', null).limit(200);
  if (error) return { status: 500, error: 'db_error' };
  return { status: 200, ok: true, items: (data || []).map(f => ({ token: f.token, name: f.name, lang: f.lang, rating: f.rating, comment: f.comment || '', ratedAt: f.rated_at })) };
}

module.exports = { register, load, rate, pull };
