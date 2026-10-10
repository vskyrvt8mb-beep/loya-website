'use strict';

const $ = (id) => document.getElementById(id);
const show = (id) => document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));

let music;           // MusicKit instance
let sf = 'us';       // storefront
let store = { banned: {}, bannedArtists: {}, skips: {}, loved: {}, prefs: {} };
let game = '';
let moodChoice = 'auto';  // выбор пользователя: 'auto' или ключ из MOODS
let activeMood = '';      // фактическое настроение очереди
let upcoming = [];        // наш запас треков, MusicKit держит в очереди только несколько
let building = false;
let lastNextAt = 0;

// ---------- сервер ----------

const post = (body) => fetch('/api/act', { method: 'POST', body: JSON.stringify(body) }).catch(() => {});

async function loadState() {
  const r = await fetch('/api/state').then((r) => r.json());
  store = r.data;
  game = r.game || '';
  moodChoice = store.prefs.mood || 'auto';
}

function savePrefs(p) {
  Object.assign(store.prefs, p);
  post({ op: 'prefs', prefs: p });
}

// ---------- Apple Music API ----------

async function api(path, params) {
  const r = await music.api.music(path.replace('{sf}', sf), params);
  return r.data;
}

function rate(id, value) {
  // Оценка в самом Apple Music — влияет и на рекомендации Apple.
  music.api.music(`/v1/me/ratings/songs/${id}`, undefined, {
    fetchOptions: { method: 'PUT', body: JSON.stringify({ type: 'rating', attributes: { value } }) },
  }).catch(() => {});
}

function norm(item, src) {
  const a = item.attributes || {};
  const id = (a.playParams && a.playParams.catalogId) || (item.type === 'songs' ? item.id : null);
  if (!id || !a.name) return null;
  return { id: String(id), n: a.name, a: a.artistName || '', g: (a.genreNames || []).map((g) => g.toLowerCase()), src };
}

async function tracksOf(c, src, limit = 100) {
  const paths = {
    albums: `/v1/catalog/{sf}/albums/${c.id}/tracks`,
    playlists: `/v1/catalog/{sf}/playlists/${c.id}/tracks`,
    'library-albums': `/v1/me/library/albums/${c.id}/tracks`,
    'library-playlists': `/v1/me/library/playlists/${c.id}/tracks`,
  };
  if (!paths[c.type]) return [];
  try {
    const d = await api(paths[c.type], { limit });
    return (d.data || []).map((t) => norm(t, src)).filter(Boolean);
  } catch { return []; }
}

const pickN = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n);

// Библиотека меняется редко — кэшируем на сутки, чтобы не дёргать API на каждом запуске.
async function library() {
  try {
    const c = JSON.parse(localStorage.getItem('lib') || 'null');
    if (c && Date.now() - c.at < 864e5) return c.songs;
  } catch {}
  const songs = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    let d;
    try { d = await api('/v1/me/library/songs', { limit: 100, offset }); } catch { break; }
    (d.data || []).forEach((t) => { const n = norm(t, 'lib'); if (n) songs.push(n); });
    if (!d.next) break;
  }
  try { localStorage.setItem('lib', JSON.stringify({ at: Date.now(), songs })); } catch {}
  return songs;
}

async function recent() {
  const out = [];
  for (let offset = 0; offset < 90; offset += 30) {
    try {
      const d = await api('/v1/me/recent/played/tracks', { limit: 30, offset });
      (d.data || []).forEach((t) => { const n = norm(t, 'recent'); if (n) out.push(n); });
      if (!d.next) break;
    } catch { break; }
  }
  return out;
}

async function heavy() {
  try {
    const d = await api('/v1/me/history/heavy-rotation', { limit: 10 });
    const lists = await Promise.all(pickN(d.data || [], 3).map((c) => tracksOf(c, 'heavy', 50)));
    return lists.flat();
  } catch { return []; }
}

async function recommended() {
  try {
    const d = await api('/v1/me/recommendations', { limit: 8 });
    const contents = (d.data || []).flatMap((r) => (r.relationships && r.relationships.contents && r.relationships.contents.data) || []);
    const lists = await Promise.all(pickN(contents, 3).map((c) => tracksOf(c, 'rec', 40)));
    return lists.flat();
  } catch { return []; }
}

async function moodPlaylists(mood) {
  const terms = pickN(MOODS[mood].terms, 2);
  const found = [];
  await Promise.all(terms.map(async (term) => {
    try {
      const d = await api('/v1/catalog/{sf}/search', { term, types: 'playlists', limit: 10 });
      const pl = (d.results && d.results.playlists && d.results.playlists.data) || [];
      // Плейлисты от редакции Apple Music обычно точнее попадают в настроение.
      pl.sort((x, y) => (y.attributes.curatorName === 'Apple Music') - (x.attributes.curatorName === 'Apple Music'));
      found.push(...pl.slice(0, 2));
    } catch {}
  }));
  const lists = await Promise.all(found.map((p) => tracksOf(p, 'mood', 100)));
  return lists.flat();
}

// ---------- подбор ----------

function history() {
  try { return JSON.parse(localStorage.getItem('hist') || '[]'); } catch { return []; }
}
function remember(id) {
  const h = history().filter((x) => x !== id);
  h.unshift(id);
  try { localStorage.setItem('hist', JSON.stringify(h.slice(0, 300))); } catch {}
}

const isBanned = (t) => store.banned[t.id] || store.bannedArtists[t.a.toLowerCase()] || (store.skips[t.id] || 0) >= 3;

async function buildPool(mood) {
  status('Подбираю под настроение…');
  const [lib, rec, hv, recs, md] = await Promise.all([library(), recent(), heavy(), recommended(), moodPlaylists(mood)]);
  const genres = MOODS[mood].genres;
  const fits = (t) => t.g.some((g) => genres.some((m) => g.includes(m)));
  const taste = new Set([...lib, ...rec, ...hv].map((t) => t.a.toLowerCase()));
  const known = new Set([...lib, ...rec].map((t) => t.id));
  const recentIds = new Set(history().slice(0, 150));

  const pool = new Map();
  const add = (t, w) => {
    if (isBanned(t) || recentIds.has(t.id)) return;
    if (store.loved[t.id]) w *= 2.5;
    w *= Math.pow(0.5, store.skips[t.id] || 0);
    const cur = pool.get(t.id);
    if (cur) { cur.w += w; return; }
    pool.set(t.id, { ...t, w, familiar: known.has(t.id) });
  };
  [...lib, ...rec, ...hv].forEach((t) => add(t, fits(t) ? 1 : 0.12));
  recs.forEach((t) => add(t, fits(t) ? 1.2 : 0.4));
  md.forEach((t) => add(t, taste.has(t.a.toLowerCase()) ? 1.8 : 1));
  return [...pool.values()];
}

function weightedPick(list) {
  const sum = list.reduce((s, t) => s + t.w, 0);
  let r = Math.random() * sum;
  for (const t of list) { r -= t.w; if (r <= 0) return t; }
  return list[list.length - 1];
}

// Раскладываем пул в очередь: доля знакомого по ползунку, без одного исполнителя подряд.
function arrange(pool) {
  const novelty = (store.prefs.novelty ?? 40) / 100;
  let fam = pool.filter((t) => t.familiar), fresh = pool.filter((t) => !t.familiar);
  const out = [];
  let prevArtist = '';
  while (fam.length || fresh.length) {
    let bucket = Math.random() < novelty ? fresh : fam;
    if (!bucket.length) bucket = bucket === fam ? fresh : fam;
    let cand = bucket.filter((t) => t.a !== prevArtist);
    if (!cand.length) cand = bucket;
    const t = weightedPick(cand);
    out.push(t);
    prevArtist = t.a;
    if (bucket === fam) fam = fam.filter((x) => x !== t); else fresh = fresh.filter((x) => x !== t);
    if (out.length >= 150) break;
  }
  return out;
}

async function startMood(force) {
  const mood = moodChoice === 'auto' ? autoMood(game) : moodChoice;
  renderMoods(mood);
  if (!force && mood === activeMood) return;
  if (building) return;
  building = true;
  activeMood = mood;
  try {
    const pool = await buildPool(mood);
    upcoming = arrange(pool);
    if (!upcoming.length) { status('Ничего не нашлось — проверь подписку Apple Music.'); return; }
    const first = upcoming.splice(0, 5).map((t) => t.id);
    await music.setQueue({ songs: first, startPlaying: true });
    status(`${MOODS[mood].label} · треков в запасе: ${upcoming.length}`);
  } catch (e) {
    status('Ошибка: ' + (e.message || e));
  } finally {
    building = false;
  }
}

async function refill() {
  const q = music.queue;
  if (!q || q.items.length - q.position > 3) return;
  if (upcoming.length < 3 && !building) {
    // Запас кончился — подбираем ещё, не прерывая текущую песню.
    building = true;
    try { upcoming.push(...arrange(await buildPool(activeMood))); } finally { building = false; }
  }
  const next = upcoming.splice(0, 5).filter((t) => !isBanned(t)).map((t) => t.id);
  if (next.length) await music.playLater({ songs: next }).catch(() => {});
}

// ---------- действия ----------

function current() {
  const it = music && music.nowPlayingItem;
  if (!it) return null;
  const a = it.attributes || {};
  const id = String((a.playParams && a.playParams.catalogId) || it.id);
  return { id, n: it.title || a.name || '', a: it.artistName || a.artistName || '' };
}

function next(userSkip) {
  const c = current();
  if (userSkip && c && music.currentPlaybackTime < 30) {
    store.skips[c.id] = (store.skips[c.id] || 0) + 1;
    post({ op: 'skip', id: c.id });
  }
  lastNextAt = Date.now();
  music.skipToNextItem().catch(() => {});
}

function ban() {
  const c = current();
  if (!c) return;
  store.banned[c.id] = { name: c.n, artist: c.a, at: Date.now() / 1000 };
  post({ op: 'ban', id: c.id, name: c.n, artist: c.a });
  rate(c.id, -1);
  beep(220);
  renderBans();
  next(false);
}

function banArtist() {
  const c = current();
  if (!c || !c.a || !confirm(`Больше никогда не ставить «${c.a}»?`)) return;
  store.bannedArtists[c.a.toLowerCase()] = Date.now() / 1000;
  post({ op: 'banArtist', artist: c.a });
  upcoming = upcoming.filter((t) => !isBanned(t));
  renderBans();
  next(false);
}

function love() {
  const c = current();
  if (!c) return;
  if (store.loved[c.id]) {
    delete store.loved[c.id];
    post({ op: 'unlove', id: c.id });
    rate(c.id, 0);
  } else {
    store.loved[c.id] = Date.now() / 1000;
    post({ op: 'love', id: c.id });
    rate(c.id, 1);
    beep(880);
  }
  renderNow();
}

function togglePlay() {
  if (music.isPlaying) music.pause(); else music.play();
}

function cycleMood() {
  const keys = ['auto', ...Object.keys(MOODS)];
  setMood(keys[(keys.indexOf(moodChoice) + 1) % keys.length]);
  beep(660);
}

function setMood(m) {
  moodChoice = m;
  savePrefs({ mood: m });
  startMood(false);
}

// Короткий тихий сигнал-подтверждение для хоткеев: в игре окна не видно.
function beep(freq) {
  try {
    const ctx = beep.ctx || (beep.ctx = new AudioContext());
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.15);
  } catch {}
}

// ---------- интерфейс ----------

function status(t) { $('status').textContent = t; }

function renderMoods(active) {
  const box = $('moods');
  if (!box.childElementCount) {
    for (const [k, label] of [['auto', '✨ Авто'], ...Object.entries(MOODS).map(([k, m]) => [k, m.label])]) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.mood = k;
      b.onclick = () => setMood(k);
      box.append(b);
    }
  }
  box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.mood === moodChoice));
  $('autoInfo').textContent = moodChoice === 'auto'
    ? `→ ${MOODS[active].label}${game ? ' (' + game.replace('.exe', '') + ' запущена)' : ''}` : '';
}

function renderNow() {
  const it = music.nowPlayingItem;
  const c = current();
  $('title').textContent = c ? c.n : '—';
  $('artist').textContent = c ? c.a : '';
  document.title = c ? `${c.n} — ${c.a}` : 'Mood Player';
  const art = it && (it.artwork || (it.attributes && it.attributes.artwork));
  if (art) $('art').src = MusicKit.formatArtworkURL(art, 192, 192); else $('art').removeAttribute('src');
  $('loveBtn').classList.toggle('on', !!(c && store.loved[c.id]));
  $('playBtn').textContent = music.isPlaying ? '⏸' : '▶';
}

function renderBans() {
  const ul = $('banList');
  ul.textContent = '';
  const artists = Object.keys(store.bannedArtists);
  const songs = Object.entries(store.banned).sort((x, y) => y[1].at - x[1].at);
  $('banCount').textContent = songs.length + artists.length;
  const row = (text, onRestore) => {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.textContent = text;
    const b = document.createElement('button');
    b.textContent = 'вернуть';
    b.onclick = () => { onRestore(); renderBans(); };
    li.append(s, b);
    ul.append(li);
  };
  artists.forEach((a) => row(`👤 ${a} (исполнитель)`, () => {
    delete store.bannedArtists[a];
    post({ op: 'unbanArtist', artist: a });
  }));
  songs.forEach(([id, s]) => row(`${s.name} — ${s.artist}`, () => {
    delete store.banned[id];
    delete store.skips[id];
    post({ op: 'unban', id });
    rate(id, 0);
  }));
}

function bindUI() {
  $('playBtn').onclick = togglePlay;
  $('nextBtn').onclick = () => next(true);
  $('banBtn').onclick = ban;
  $('banArtistBtn').onclick = banArtist;
  $('loveBtn').onclick = love;

  $('volume').value = Math.round((store.prefs.volume ?? 0.6) * 100);
  music.volume = $('volume').value / 100;
  $('volume').oninput = (e) => { music.volume = e.target.value / 100; };
  $('volume').onchange = (e) => savePrefs({ volume: e.target.value / 100 });

  $('novelty').value = store.prefs.novelty ?? 40;
  $('novelty').onchange = (e) => {
    savePrefs({ novelty: +e.target.value });
    upcoming = arrange(upcoming); // пересортировать запас без новых запросов
  };

  music.addEventListener('nowPlayingItemDidChange', () => {
    const c = current();
    if (c && (store.banned[c.id] || store.bannedArtists[c.a.toLowerCase()])) {
      return music.skipToNextItem().catch(() => {});
    }
    if (c) remember(c.id);
    renderNow();
    refill();
  });
  music.addEventListener('playbackStateDidChange', () => {
    renderNow();
    // Очередь доиграла до конца — подгружаем ещё.
    if (music.playbackState === MusicKit.PlaybackStates.ended || music.playbackState === MusicKit.PlaybackStates.completed) refill();
  });
  music.addEventListener('playbackProgressDidChange', (e) => {
    if (!document.hidden) $('progress').style.width = (e.progress * 100).toFixed(1) + '%';
  });
  music.addEventListener('mediaPlaybackError', () => {
    // Трек недоступен в регионе и т.п. — молча дальше.
    if (Date.now() - lastNextAt > 1500) next(false);
  });

  // Раз в 10 минут проверяем, не сменилось ли «авто»-настроение по времени суток.
  setInterval(() => { if (moodChoice === 'auto') startMood(false); }, 600000);
}

function connectEvents() {
  const es = new EventSource('/api/events');
  es.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === 'game') {
      game = m.game;
      if (music && music.isAuthorized && moodChoice === 'auto') startMood(false);
    } else if (m.type === 'hotkey' && music && music.isAuthorized) {
      ({ ban, next: () => next(true), playpause: togglePlay, love, mood: cycleMood })[m.action]?.();
    }
  };
}

// ---------- запуск ----------

function waitMusicKit() {
  return new Promise((res, rej) => {
    if (window.MusicKit) return res();
    document.addEventListener('musickitloaded', res, { once: true });
    setTimeout(() => rej(new Error('MusicKit не загрузился — проверь интернет')), 20000);
  });
}

async function runPlayer() {
  show('player');
  sf = music.storefrontId || 'us';
  bindUI();
  renderBans();
  await startMood(true);
}

async function init() {
  await loadState();
  connectEvents();
  const t = await fetch('/api/token').then((r) => r.json());
  if (!t.configured) return showSetup();

  try { await waitMusicKit(); } catch (e) { show('login'); $('loginErr').textContent = e.message; return; }
  music = await MusicKit.configure({ developerToken: t.token, app: { name: 'Mood Player', build: '1.0.0' } });

  if (music.isAuthorized) return runPlayer();
  show('login');
  $('loginBtn').onclick = async () => {
    try { await music.authorize(); runPlayer(); } catch (e) { $('loginErr').textContent = 'Вход не удался: ' + (e.message || e); }
  };
}

function showSetup() {
  show('setup');
  $('saveSetup').onclick = async () => {
    const f = $('keyFile').files[0];
    if (!f) { $('setupErr').textContent = 'Выбери файл .p8'; return; }
    const r = await fetch('/api/setup', {
      method: 'POST',
      body: JSON.stringify({ TeamID: $('teamId').value, KeyID: $('keyId').value, Key: await f.text() }),
    }).then((r) => r.json());
    if (r.error) { $('setupErr').textContent = r.error; return; }
    location.reload();
  };
}

init().catch((e) => { show('login'); $('loginErr').textContent = String(e.message || e); });
