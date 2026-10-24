// 2.24: настройка клиента в админке — все те же настройки, что у владельца в программе, с живым предпросмотром.
// Код ниже выполняется в браузере (страница /admin). Функция не вызывается на сервере: берём её текст.
// Использует общие функции страницы: $, E, T, api, lang, session, paint, dt, NICHES, THEMES, renderInfo.
/* eslint-disable no-undef */
function adminEditorClient() {
  let ED = null;
  // Страница админки защищена CSP с nonce — предпросмотр (srcdoc) наследует её, поэтому скриптам страницы-превью ставим тот же nonce.
  const PV_NONCE = (document.currentScript && document.currentScript.nonce) || ((document.querySelector('script[nonce]') || {}).nonce) || '';
  const PV_KIND = { reg: 'join', promo: 'promo', book: 'book' };
  // 2.27: превью страницы гостя — настоящий экран телефона 390×844, уменьшенный целиком (раньше страница
  // сжималась до ~300 px по ширине: всё выглядело крупным и приходилось крутить внутри маленького окна).
  function pvFit(phone) {
    const fr = phone && phone.querySelector('iframe'); if (!fr) return;
    const cs = getComputedStyle(phone), pad = parseFloat(cs.paddingLeft) || 0;
    const avail = Math.max(200, (phone.parentElement ? phone.parentElement.clientWidth : 360) - 2);
    const h = phone.clientHeight - pad * 2;
    const s = Math.min(h / 844, (avail - pad * 2) / 390);
    phone.style.width = Math.round(390 * s + pad * 2) + 'px';
    fr.style.cssText = 'width:390px;height:' + Math.round(h / s) + 'px;transform:scale(' + s.toFixed(4) + ');transform-origin:0 0;border-radius:' + Math.round(24 / s) + 'px';
  }
  window.addEventListener('resize', () => { const ph = document.querySelector('#pv-box .pv-phone'); if (ph) pvFit(ph); });
  const nicheName = (id) => { const n = NICHES[id]; return n ? n[0] + ' ' + (n[{ ru: 1, uk: 2, sk: 3, en: 4 }[lang]] || n[1]) : id; };
  const pj = (s, d) => { try { const x = JSON.parse(s); return x == null ? d : x; } catch (e) { return d; } };

  window.openClient = async function openClient(key, tab) {
    const t = T(); $('mb').classList.add('wide'); $('mb').innerHTML = '<div class="cc">…</div>'; $('modal').classList.remove('hide');
    const [r, g] = await Promise.all([api('admin-action', { op: 'client', key }), api('admin-action', { op: 'client_cfg_get', key })]);
    if (r._s === 401 || g._s === 401) { session = null; paint(); $('modal').classList.add('hide'); return; }
    if (!r.ok) { $('mb').innerHTML = '<div class="err">' + E(t.err) + '</div><button class="btn sec" id="cc-x">' + E(t.close) + '</button>'; $('cc-x').onclick = () => $('modal').classList.add('hide'); return; }
    const snap = (g.ok && g.snap) || {};
    const base = Object.assign({}, snap, (g.ok && g.cfg) || {}); delete base.brand_logo; delete base.all; delete base.logo_rev;
    ED = { key, r, g: g.ok ? g : { cfg: {}, snap: null, wallet: null, ver: 0 }, init: Object.assign({}, base), cur: Object.assign({}, base), logo: undefined, wal: {}, tab: tab || (ED && ED.key === key ? ED.tab : 'info'), pvTimer: null, pvSeq: 0, geoTab: 'ios', allQ: '' };
    paintEditor();
  };

  function v(k) { return ED.cur[k] == null ? '' : String(ED.cur[k]); }
  function set(k, val, repaint) { ED.cur[k] = val; if (repaint) paintEditor(); else schedulePreview(); }

  // ---------- поля ----------
  const F = {
    txt: (k, l, max, ph) => '<label class="fld"><span>' + E(l) + '</span><input data-k="' + k + '" maxlength="' + max + '" value="' + E(v(k)) + '" placeholder="' + E(ph || '') + '"></label>',
    area: (k, l, max, ph) => '<label class="fld"><span>' + E(l) + '</span><textarea data-k="' + k + '" maxlength="' + max + '" rows="2" placeholder="' + E(ph || '') + '">' + E(v(k)) + '</textarea></label>',
    num: (k, l, a, b) => '<label class="fld sm"><span>' + E(l) + '</span><input type="number" data-k="' + k + '" min="' + a + '" max="' + b + '" value="' + E(v(k)) + '"></label>',
    sel: (k, l, opts, rp) => '<label class="fld"><span>' + E(l) + '</span><select data-k="' + k + '"' + (rp ? ' data-rp="1"' : '') + '>' + opts.map(o => '<option value="' + E(o[0]) + '"' + (v(k) === String(o[0]) ? ' selected' : '') + '>' + E(o[1]) + '</option>').join('') + '</select></label>',
    chk: (k, l, sub, rp) => '<label class="chk2"><input type="checkbox" data-k="' + k + '" data-b="1"' + (rp ? ' data-rp="1"' : '') + (v(k) === '1' ? ' checked' : '') + '><span>' + E(l) + (sub ? '<small>' + E(sub) + '</small>' : '') + '</span></label>',
    col: (k, l, def) => '<label class="fld col"><span>' + E(l) + '</span><input type="color" data-k="' + k + '" value="' + E(/^#[0-9a-fA-F]{6}$/.test(v(k)) ? v(k) : (def || '#d4af37')) + '"></label>',
    sec: (title, body, hint, wide) => '<section class="es' + (wide ? ' es-wide' : '') + '"><h4>' + E(title) + '</h4>' + (hint ? '<p class="es-h">' + E(hint) + '</p>' : '') + body + '</section>'
  };

  // ---------- редактор ----------
  window.paintEditor = paintEditor;
  function paintEditor() {
    const t = T(); const c = ED.r.client;
    const tabs = [['info', t.etInfo], ['venue', t.etVenue], ['reg', t.etReg2 || t.etReg], ['wallet', t.etWallet], ['promo', t.etPromo], ['book', t.etBook], ['geo', t.etGeo], ['all', t.etAll]];
    const pvTabs = { venue: 1, reg: 1, wallet: 1, promo: 1, book: 1, geo: 1 };
    $('mb').innerHTML = '<div class="ed"><div class="ed-h"><div><b>' + E((ED.cur.brand_name || '') + (ED.cur.brand_name ? ' · ' : '') + (c.email || '—')) + '</b><small class="key">' + E(c.key) + '</small><div class="ed-chips">' + [c.plan + (c.tier ? ' · ' + c.tier : ''), c.version ? 'v' + c.version : '', c.lastSeen ? '● ' + dt(c.lastSeen) : ''].filter(Boolean).map(x => '<span>' + E(x) + '</span>').join('') + '</div></div><button class="btn sec ed-x" id="ed-x">✕</button></div>' +
      '<div class="ed-tabs">' + tabs.map(x => '<button class="tab' + (ED.tab === x[0] ? ' on' : '') + '" data-et="' + x[0] + '">' + E(x[1]) + '</button>').join('') + '</div>' +
      '<div class="ed-main' + (pvTabs[ED.tab] ? ' has-pv' : '') + '"><div class="ed-body" id="ed-body"></div>' + (pvTabs[ED.tab] ? '<aside class="ed-pv" id="ed-pv"><div class="pv-h" id="pv-h"></div><div class="pv-box" id="pv-box"></div><p class="pv-note" id="pv-note"></p></aside>' : '') + '</div>' +
      (ED.tab === 'info' || ED.tab === 'all' ? '' : '<div class="ed-f"><span id="ed-msg"></span><span class="ed-dirty" id="ed-dirty"></span><button class="btn" id="ed-save">' + E(t.edSave) + '</button></div>') + '</div>';
    $('ed-x').onclick = () => { if (dirtyCount() && !confirm(t.edLeave)) return; $('modal').classList.add('hide'); };
    $('mb').querySelectorAll('[data-et]').forEach(b => b.onclick = () => { ED.tab = b.dataset.et; paintEditor(); });
    if (ED.tab === 'info') { renderInfo(ED.key, ED.r); return; }
    const snap = ED.g.snap;
    let h = ED.tab === 'all' ? '' : '<div class="ed-note">' + (snap ? E(t.snapNow(dt(ED.g.snapAt), snap.version || '')) : E(t.snapNone)) + (ED.g.ver ? '<br>' + E(t.cfgVer(ED.g.ver, dt(ED.g.at))) : '') + '</div>';
    h += ({ venue: tabVenue, reg: tabReg, wallet: tabWallet, promo: tabPromo, book: tabBook, geo: tabGeo, all: tabAll })[ED.tab](t);
    $('ed-body').innerHTML = h;
    $('ed-body').classList.toggle('cols', ['venue', 'promo', 'book', 'reg', 'wallet', 'geo'].includes(ED.tab));
    bindCommon();
    ({ venue: bindVenue, reg: bindReg, wallet: bindWallet, promo: () => {}, book: bindBook, geo: bindGeo, all: bindAll })[ED.tab]();
    if ($('ed-save')) $('ed-save').onclick = saveEditor;
    markDirty(); renderPreview(true);
  }

  function bindCommon() {
    const body = $('ed-body');
    body.querySelectorAll('[data-k]').forEach(el => {
      const ev = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' ? 'change' : 'input';
      el.addEventListener(ev, () => { const val = el.dataset.b ? (el.checked ? '1' : '0') : el.value; ED.cur[el.dataset.k] = val; markDirty(); if (el.dataset.rp) paintEditor(); else schedulePreview(); });
    });
    body.querySelectorAll('[data-day]').forEach(el => el.onchange = () => { ED.cur.bonus_stamps_days = [...body.querySelectorAll('[data-day]:checked')].map(i => i.dataset.day).join(','); markDirty(); });
    body.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { const id = b.dataset.th; ED.cur.theme_name = id; if (THEMES[id]) { const c = THEMES[id]; ED.cur.theme_primary = c[0]; ED.cur.theme_sidebar = c[1]; ED.cur.theme_screen = c[2]; ED.cur.theme_text = c[3]; } paintEditor(); });
    body.querySelectorAll('[data-logo-pick]').forEach(b => b.onclick = () => $('lg-file').click());
    body.querySelectorAll('[data-logo-rm]').forEach(b => b.onclick = () => { ED.logo = null; paintEditor(); });
    if ($('lg-file')) $('lg-file').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; ED.logo = await fitImage(f, 512, 512, 'contain', 'image/png'); paintEditor(); };
  }
  function changed() {
    const cfg = {};
    for (const k of Object.keys(ED.cur)) if (String(ED.cur[k] ?? '') !== String(ED.init[k] ?? '')) cfg[k] = ED.cur[k];
    return cfg;
  }
  function dirtyCount() { return ED ? Object.keys(changed()).length + (ED.logo !== undefined ? 1 : 0) + (ED.pageBg !== undefined ? 1 : 0) + Object.keys(ED.wal).length : 0; }
  // Ctrl+S / Cmd+S — сохранить настройки клиента
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && $('ed-save') && !$('modal').classList.contains('hide')) { e.preventDefault(); saveEditor(); } });
  function markDirty() {
    const el = $('ed-dirty'); if (!el) return;
    const n = dirtyCount();
    el.textContent = n ? T().edDirty(n) : '';
  }
  function logoBlock(t) {
    const src = ED.logo === undefined ? (ED.g.logoUrl || '') : ED.logo;
    const has = ED.logo === undefined ? (ED.g.snap && ED.g.snap.has_logo === '1') : !!ED.logo;
    return '<div class="fld"><span>' + E(t.fLogo) + '</span><div class="logo-row"><div class="logo-prev">' + (src ? '<img src="' + E(src) + '" alt="">' : (has ? '✓' : '—')) + '</div><div><button class="act a-paid" data-logo-pick="1">' + E(t.fPick) + '</button> <button class="act a-copy" data-logo-rm="1">' + E(t.fRemove) + '</button><input type="file" id="lg-file" accept="image/png,image/jpeg,image/webp" hidden><small>' + E(t.fLogoHint2 || t.fLogoHint) + '</small></div></div></div>';
  }

  // 2.25: фон страниц для гостей (фото) + затемнение
  function bgBlock(t) {
    const has = ED.pageBg === undefined ? (ED.g.snap && ED.g.snap.has_page_bg === '1') : !!ED.pageBg;
    const src = ED.pageBg || '';
    return '<div class="fld"><span>' + E(t.fPageBg) + '</span><div class="logo-row"><div class="logo-prev bg-prev"' + (src ? ' style="background-image:url(&quot;' + src + '&quot;)"' : '') + '>' + (src ? '' : (has ? '✓' : '—')) + '</div><div><button class="act a-paid" id="bg-pick">' + E(t.fPick) + '</button> <button class="act a-copy" id="bg-rm">' + E(t.fRemove) + '</button><input type="file" id="bg-file" accept="image/png,image/jpeg,image/webp" hidden><small>' + E(t.fPageBgHint) + '</small></div></div></div>' +
      '<label class="fld"><span>' + E(t.fPageBgDim) + ' — <b id="bg-dim-v">' + E(v('reg_page_bg_dim') || '45') + '%</b></span><input type="range" min="0" max="85" step="5" data-k="reg_page_bg_dim" value="' + E(v('reg_page_bg_dim') || '45') + '"></label>';
  }
  // ---------- вкладки ----------
  function tabVenue(t) {
    let h = F.sec(t.sVenue, '<div class="g2">' + F.txt('brand_name', t.fBrand, 60) + F.sel('business_niche', t.fNiche, [['', '—']].concat(Object.keys(NICHES).map(id => [id, nicheName(id)])), true) +
      F.sel('app_language', t.fLang, [['', ' —'], ['ru', 'Русский'], ['uk', 'Українська'], ['sk', 'Slovenčina'], ['en', 'English']]) +
      F.sel('spend_currency', t.fCur, [['', '—'], ['EUR', '€ EUR'], ['CZK', 'Kč CZK'], ['UAH', '₴ UAH'], ['PLN', 'zł PLN'], ['HUF', 'Ft HUF'], ['USD', '$ USD'], ['GBP', '£ GBP'], ['CHF', 'CHF']]) + '</div>' + logoBlock(t));
    h += F.sec(t.fTheme, '<div class="themes">' + Object.keys(THEMES).map(id => { const c = THEMES[id]; return '<button class="th' + (v('theme_name') === id ? ' on' : '') + '" data-th="' + id + '" title="' + id + '"><i style="background:' + c[1] + '"></i><i style="background:' + c[2] + '"></i><b style="background:' + c[0] + '"></b></button>'; }).join('') + '<button class="th th-c' + (v('theme_name') === 'custom' ? ' on' : '') + '" data-th="custom">🎨</button></div>' +
      (v('theme_name') === 'custom' ? '<div class="g4">' + F.col('theme_primary', t.cPrimary) + F.col('theme_sidebar', t.cSidebar, '#0d0f14') + F.col('theme_screen', t.cScreen, '#0b0d12') + F.col('theme_text', t.cText, '#f0ece0') + '</div>' : ''));
    h += F.sec(t.sFeatures, '<div class="g2">' + F.chk('feature_inventory', t.ftInventory) + F.chk('feature_network', t.ftNetwork) + F.chk('feature_staff', t.ftStaff) + F.chk('feature_weather', t.ftWeather) + '</div>', t.sFeaturesH);
    return h;
  }
  function bindVenue() { ['brand_name', 'theme_primary', 'theme_sidebar', 'theme_screen', 'theme_text'].forEach(k => { const el = document.querySelector('[data-k="' + k + '"]'); if (el) el.addEventListener('input', () => renderPreview()); }); }

  function tabReg(t) {
    const ct = v('selfreg_card_type') || 'stamp';
    let rule = '<div class="g2">' + F.sel('selfreg_card_type', t.fCardType, [['stamp', t.ctStamp], ['combo', t.ctCombo], ['discount', t.ctDiscount], ['spend', t.ctSpend]], true) + F.sel('selfreg_mode', t.fRegMode, [['', '—'], ['wifi', t.rmWifi], ['online', t.rmOnline]]) + '</div><div class="g2">';
    if (ct === 'stamp' || ct === 'combo') rule += F.num('selfreg_stamp_target', t.fStampTarget, 2, 50) + F.txt('selfreg_stamp_title', t.fStampTitle, 60, t.phStampTitle);
    if (ct === 'combo') rule += F.num('selfreg_discount_percent', t.fDiscount, 1, 90) + '<div></div>';
    if (ct === 'discount') rule += F.num('selfreg_discount_percent', t.fDiscount, 1, 90) + '<div></div>';
    if (ct === 'spend') rule += F.num('selfreg_spend_target', t.fSpendTarget, 1, 100000) + F.txt('selfreg_spend_title', t.fSpendTitle, 60) + F.num('selfreg_spend_points', t.fSpendPoints, 1, 1000);
    rule += '</div>';
    let h = F.sec(t.sCardRule, rule, t.regHint);
    h += F.sec(t.sRegPage, logoBlock(t) + bgBlock(t) + '<div class="g1">' + F.txt('registration_heading', t.fRegHead, 80) + F.area('registration_subtitle', t.fRegText, 240) + F.txt('registration_button_text', t.fRegBtn, 40) + '</div><div class="g2">' + F.sel('reg_page_bg', t.fRegBg, [['', t.bgAuto], ['dark', t.bgDark], ['light', t.bgLight]]) + F.col('reg_page_color2', t.fColor2) + '</div>');
    const pr = (ED.r.client.profiles || []).filter(Boolean);
    if (pr.length) h += F.sec(t.fPages, pr.map(p => '<div class="pg"><b>' + E(p.name || p.slug) + '</b> <a href="/j/' + E(p.slug) + '" target="_blank" rel="noopener">/j/' + E(p.slug) + ' ↗</a> <a href="/r/' + E(p.slug) + '" target="_blank" rel="noopener">/r/' + E(p.slug) + ' ↗</a></div>').join(''));
    return h;
  }
  function bindReg() {
    if (!$('bg-pick')) return;
    $('bg-pick').onclick = () => $('bg-file').click();
    $('bg-rm').onclick = () => { ED.pageBg = null; paintEditor(); };
    $('bg-file').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; let u = await fitImage(f, 1280, 860, 'cover', 'image/jpeg'); if (u && u.length > 600000) u = await fitImage(f, 1024, 688, 'cover', 'image/jpeg'); ED.pageBg = u; paintEditor(); };
    const r = document.querySelector('[data-k="reg_page_bg_dim"]'); if (r) r.addEventListener('input', () => { $('bg-dim-v').textContent = r.value + '%'; });
  }

  function tabWallet(t) {
    const w = ED.g.wallet || {}; const bg = ED.wal.bgColor !== undefined ? ED.wal.bgColor : (w.bg || '#20252d');
    return F.sec(t.etWallet, '<div class="fld"><span>' + E(t.fWLogo) + '</span><div class="logo-row"><div class="logo-prev round" id="wl-prev"></div><div><button class="act a-paid" id="wl-pick">' + E(t.fPick) + '</button> <button class="act a-copy" id="wl-rm">' + E(t.fRemove) + '</button><input type="file" id="wl-file" accept="image/png,image/jpeg,image/webp" hidden></div></div></div>' +
      '<div class="fld"><span>' + E(t.fWHero) + '</span><div class="hero-prev" id="wh-prev"></div><div style="margin-top:6px"><button class="act a-paid" id="wh-pick">' + E(t.fPick) + '</button> <button class="act a-copy" id="wh-rm">' + E(t.fRemove) + '</button><input type="file" id="wh-file" accept="image/png,image/jpeg,image/webp" hidden></div></div>' +
      '<div class="g2"><label class="fld col"><span>' + E(t.fWBg) + '</span><input type="color" id="wb" value="' + E(/^#[0-9a-fA-F]{6}$/.test(bg) ? bg : '#20252d') + '"></label><div class="wcols">' + ['#20252d', '#000000', '#1f2a44', '#2b1d15', '#163126', '#4a1730', '#7a5a2e', '#f4efe4', '#ffffff'].map(c => '<button type="button" class="wcol" data-wc="' + c + '" style="background:' + c + '"></button>').join('') + '</div></div>' +
      '<label class="chk2"><input type="checkbox" id="ws"' + ((ED.wal.heroStamps !== undefined ? ED.wal.heroStamps : w.heroStamps !== false) ? ' checked' : '') + '><span>' + E(t.fWStamps) + '</span></label>', t.wHint) +
      F.sec(t.wShowTitle, '<div class="g2">' + F.chk('wallet_show_tier', t.wShowTier) + F.chk('wallet_show_next', t.wShowNext) + '</div>', t.wShowHint) + lookSections(t);
  }
  // 2.28: вид карты — как в программе (готовые стили, значки, цвет штампов, подпись, расположение, праздники, логотип)
  const LK_REWARD = ['gift', 'coffee', 'takeaway', 'tea', 'wine', 'bottle', 'cocktail', 'beer', 'cupcake', 'icecream', 'donut', 'bakery', 'pizza', 'burger', 'sushi', 'star', 'crown', 'heart', 'diamond', 'scissors', 'polish', 'bone'];
  const LK_COLORS = ['#ffffff', '#f6d77a', '#ff8a3d', '#d24b2f', '#ff4f86', '#9b6bff', '#4fc3f7', '#2f8f5b', '#1b1813'];
  function lkIco(id) { return '<svg viewBox="0 0 40 40" aria-hidden="true">' + LoyaCard.glyph(id, 20, 20, 30, 'currentColor', 'none') + '</svg>'; }
  function lookSections(t) {
    if (!window.LoyaCard) return '';
    const L = lang in { ru: 1, uk: 1, sk: 1, en: 1 } ? lang : 'en';
    const grid = (k, ids, def) => '<div class="lk-icons">' + ids.map(id => '<button type="button" class="lk-ico' + ((v(k) || def) === id ? ' on' : '') + '" data-lk="' + k + '" data-v="' + id + '" title="' + E(id) + '">' + lkIco(id) + '</button>').join('') + '</div>';
    const sc = v('wallet_stamp_color');
    const colors = '<div class="lk-cols"><button type="button" class="lk-col auto' + (sc ? '' : ' on') + '" data-lk="wallet_stamp_color" data-v="" title="' + E(t.lkColorAuto) + '">A</button>' + LK_COLORS.map(c => '<button type="button" class="lk-col' + (sc === c ? ' on' : '') + '" data-lk="wallet_stamp_color" data-v="' + c + '" style="background:' + c + '"></button>').join('') + '<input type="color" id="lk-sc" value="' + E(sc || '#ffffff') + '"><input class="lk-hex" id="lk-sc-hex" maxlength="7" placeholder="#RRGGBB" value="' + E(sc) + '"></div>';
    const styles = '<div class="lk-styles">' + LoyaCard.PRESETS.map(p => '<button type="button" class="lk-style" data-ps="' + p.id + '"><i style="background:' + p.bg + '"></i>' + E(p.name[L] || p.name.en) + '</button>').join('') + '</div>';
    const lm = v('wallet_logo_mode');
    return F.sec(t.lkPresets, styles, t.lkPresetsH, true) +
      F.sec(t.lkStamps, '<div class="fld"><span>' + E(t.lkStamp) + '</span>' + grid('wallet_stamp_icon', LoyaCard.STAMP_IDS, 'check') + '</div><div class="fld"><span>' + E(t.lkReward) + '</span>' + grid('wallet_reward_icon', LK_REWARD, 'gift') + '</div>' +
        '<div class="fld"><span>' + E(t.lkColor) + '</span>' + colors + '</div><div class="g2">' + F.txt('wallet_stamp_label', t.lkLabel, 18, t.lkLabelPh) + '</div>', t.lkStampsH, true) +
      F.sec(t.lkPlace, '<div class="g2">' + F.sel('wallet_layout', t.lkLayout, [['', t.lkLayoutC], ['photo', t.lkLayoutP]]) +
        F.sel('wallet_arrange', t.lkArr, [['', t.lkArrAuto]].concat(LoyaCard.ARRANGES.map(a => [a, t['lkArr_' + a]]))) + F.sel('wallet_season', t.lkSeason, [['', t.lkSe_none]].concat(LoyaCard.SEASONS.filter(x => x !== 'none').map(x => [x, t['lkSe_' + x]]))) + '</div>') +
      F.sec(t.lkLogo, '<div class="g2">' + F.sel('wallet_logo_mode', t.lkLm, [['', t.lkLm_name], ['both', t.lkLm_both], ['logo', t.lkLm_logo]], true) + '</div>' +
        (lm ? '<div class="g4">' + F.num('wallet_logo_size', t.lkSize, 24, 260) + F.num('wallet_logo_rot', t.lkRot, -180, 180) + F.num('wallet_logo_x', 'X', 0, 1032) + F.num('wallet_logo_y', 'Y', 0, 336) + '</div>' + F.chk('wallet_logo_flip', t.lkFlip) : ''), lm ? t.lkLogoH : t.lkLogoH0);
  }
  function bindLook() {
    document.querySelectorAll('[data-lk]').forEach(b => b.onclick = () => { ED.cur[b.dataset.lk] = b.dataset.v; markDirty(); paintEditor(); });
    const sc = $('lk-sc'), hx = $('lk-sc-hex');
    if (sc) sc.onchange = () => { ED.cur.wallet_stamp_color = sc.value; markDirty(); paintEditor(); };
    if (hx) hx.onchange = () => { let x = hx.value.trim(); if (!x.startsWith('#')) x = '#' + x; if (/^#[0-9a-fA-F]{3}$/.test(x)) x = '#' + x.slice(1).split('').map(c => c + c).join(''); if (/^#[0-9a-fA-F]{6}$/.test(x)) { ED.cur.wallet_stamp_color = x.toLowerCase(); markDirty(); paintEditor(); } else hx.classList.add('bad'); };
    document.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => {
      const cur = { logoMode: v('wallet_logo_mode') }; const pl = LoyaCard.presetLook(b.dataset.ps, lang, cur); if (!pl) return;
      const m = { stamp: 'wallet_stamp_icon', reward: 'wallet_reward_icon', stampColor: 'wallet_stamp_color', layout: 'wallet_layout', season: 'wallet_season', arrange: 'wallet_arrange', label: 'wallet_stamp_label' };
      for (const [k, key] of Object.entries(m)) ED.cur[key] = pl.look[k] || '';
      ED.wal.bgColor = pl.bg; markDirty(); paintEditor();
    });
  }
  function walSrc(k) { const w = ED.g.wallet || {}; return ED.wal[k] !== undefined ? ED.wal[k] : (k === 'logo' ? w.logoUrl : w.heroUrl) || ''; }
  function bindWallet() {
    const draw = () => { $('wl-prev').innerHTML = walSrc('logo') ? '<img src="' + walSrc('logo') + '" alt="">' : 'L'; $('wh-prev').style.backgroundImage = walSrc('hero') ? 'url("' + walSrc('hero') + '")' : ''; markDirty(); renderPreview(); };
    draw();
    $('wb').oninput = () => { ED.wal.bgColor = $('wb').value; const h = $('wb-hex'); if (h) h.value = $('wb').value; draw(); };
    if (!$('wb-hex')) { const h = document.createElement('input'); h.id = 'wb-hex'; h.className = 'lk-hex'; h.maxLength = 7; h.placeholder = '#RRGGBB'; h.value = $('wb').value; $('wb').after(h);
      h.onchange = () => { let x = h.value.trim(); if (!x.startsWith('#')) x = '#' + x; if (/^#[0-9a-fA-F]{3}$/.test(x)) x = '#' + x.slice(1).split('').map(c => c + c).join(''); if (/^#[0-9a-fA-F]{6}$/.test(x)) { h.classList.remove('bad'); $('wb').value = x.toLowerCase(); ED.wal.bgColor = x.toLowerCase(); draw(); } else h.classList.add('bad'); }; }
    document.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => { ED.wal.bgColor = b.dataset.wc; $('wb').value = b.dataset.wc; draw(); });
    $('ws').onchange = () => { ED.wal.heroStamps = $('ws').checked; draw(); };
    $('wl-pick').onclick = () => $('wl-file').click(); $('wh-pick').onclick = () => $('wh-file').click();
    $('wl-rm').onclick = () => { ED.wal.logo = null; draw(); }; $('wh-rm').onclick = () => { ED.wal.hero = null; draw(); };
    $('wl-file').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; ED.wal.logo = await fitImage(f, 480, 480, 'contain', 'image/png'); draw(); };
    $('wh-file').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; ED.wal.hero = await fitImage(f, 1032, 336, 'cover', 'image/jpeg'); draw(); };
    bindLook();
  }

  function tabPromo(t) {
    let h = F.sec(t.sWelcome, F.chk('welcome_double', t.fWelcome, t.fWelcomeS));
    h += F.sec(t.sHappy, F.chk('bonus_stamps_enabled', t.fBonus) + '<div class="g4">' + F.sel('bonus_stamps_mult', t.fMult, [['2', '×2'], ['3', '×3']]) + '<label class="fld sm"><span>' + E(t.fFrom) + '</span><input type="time" data-k="bonus_stamps_from" value="' + E(v('bonus_stamps_from') || '14:00') + '"></label><label class="fld sm"><span>' + E(t.fTo) + '</span><input type="time" data-k="bonus_stamps_to" value="' + E(v('bonus_stamps_to') || '16:00') + '"></label></div>' +
      '<div class="fld"><span>' + E(t.fDays) + '</span><div class="days">' + [1, 2, 3, 4, 5, 6, 0].map(d => { const on = v('bonus_stamps_days').split(',').includes(String(d)); return '<label class="day"><input type="checkbox" data-day="' + d + '"' + (on ? ' checked' : '') + '><span>' + E(new Date(2024, 0, 7 + d).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { weekday: 'short' })) + '</span></label>'; }).join('') + '</div></div>');
    h += F.sec(t.sLinkPromo, F.chk('online_reg_enabled', t.fLinkOn, t.fLinkOnS) + '<div class="g1">' + F.txt('online_bonus_title', t.fLinkTitle, 80, t.phLinkTitle) + '</div><div class="g2">' + F.num('online_bonus_percent', t.fLinkPct, 1, 100) + F.num('online_bonus_days', t.fLinkDays, 1, 90) + '</div>', t.sLinkPromoH);
    h += F.sec(t.sRef, F.chk('referral_enabled', t.fRef) + '<div class="g2">' + F.sel('referral_bonus_stamps', t.fRefBonus, [0, 1, 2, 3, 4, 5].map(n => [String(n), String(n)])) + F.sel('referral_friend_stamps', t.fRefFriend, [0, 1, 2, 3, 4, 5].map(n => [String(n), String(n)])) + '</div>');
    h += F.sec(t.sAuto, '<div class="g2">' + F.chk('auto_welcome_enabled', t.auWelcome) + F.chk('auto_birthday_enabled', t.auBirthday) + F.chk('auto_near_enabled', t.auNear) + F.chk('auto_winback_enabled', t.auWinback) + F.chk('tier_perks_on', t.auTiers) + '</div>', t.sAutoH);
    h += F.sec(t.sOther, '<div class="g2">' + F.sel('scan_cooldown_min', t.fCooldown, [['0', '0'], ['5', '5'], ['15', '15'], ['30', '30'], ['60', '60'], ['180', '180'], ['720', '720']]) + F.txt('review_url', t.fReview, 300, 'https://g.page/r/…/review') + '</div>');
    return h;
  }

  // ---------- онлайн-запись ----------
  function bookData() { return { services: pj(v('book_services'), []), staff: pj(v('book_staff'), []), hours: pj(v('book_hours'), null) || { 0: [], 1: [['09:00', '18:00']], 2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '18:00']], 5: [['09:00', '18:00']], 6: [['10:00', '14:00']] } }; }
  function putBook(d) { ED.cur.book_services = JSON.stringify(d.services); ED.cur.book_staff = JSON.stringify(d.staff); ED.cur.book_hours = JSON.stringify(d.hours); markDirty(); schedulePreview(); }
  function tabBook(t) {
    const d = bookData();
    let h = F.sec(t.etBook, F.chk('book_on', t.bkOn, t.bkOnS), t.bkHint);
    h += F.sec(t.bkServices, '<div class="bk-list" id="bk-svc">' + d.services.map((s, i) => '<div class="bk-row"><input data-sv="n" data-i="' + i + '" value="' + E(s.n) + '" placeholder="' + E(t.bkSvcName) + '" maxlength="60"><input type="number" data-sv="d" data-i="' + i + '" value="' + E(s.d || 60) + '" min="5" max="480" title="' + E(t.bkMin) + '"><span class="bk-u">' + E(t.bkMin) + '</span><input type="number" data-sv="p" data-i="' + i + '" value="' + E(s.p == null ? '' : s.p) + '" min="0" step="0.5" placeholder="' + E(t.bkPrice) + '"><button class="act a-ban" data-svdel="' + i + '">✕</button></div>').join('') + '</div><button class="act a-paid" id="bk-svc-add">+ ' + E(t.bkAddSvc) + '</button>', '', true);
    h += F.sec(t.bkStaff, '<div class="bk-list">' + d.staff.map((m, i) => '<div class="bk-staff"><div class="bk-row"><input data-st="n" data-i="' + i + '" value="' + E(m.n) + '" placeholder="' + E(t.bkStaffName) + '" maxlength="40"><button class="act a-ban" data-stdel="' + i + '">✕</button></div><div class="days">' + d.services.map(s => '<label class="day"><input type="checkbox" data-stsv="' + i + '" data-sid="' + E(s.id) + '"' + ((m.s || []).includes(s.id) ? ' checked' : '') + '><span>' + E(s.n || '—') + '</span></label>').join('') + '</div></div>').join('') + '</div><button class="act a-paid" id="bk-st-add">+ ' + E(t.bkAddStaff) + '</button>', t.bkStaffH);
    const dn = (n) => new Date(2024, 0, 7 + n).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { weekday: 'short' });
    h += F.sec(t.bkHours, '<div class="bk-hours">' + [1, 2, 3, 4, 5, 6, 0].map(n => { const r = (d.hours[n] || [])[0]; return '<div class="bk-h"><label class="day"><input type="checkbox" data-hon="' + n + '"' + (r ? ' checked' : '') + '><span>' + E(dn(n)) + '</span></label><input type="time" data-hf="' + n + '" value="' + E(r ? r[0] : '09:00') + '"' + (r ? '' : ' disabled') + '><span>—</span><input type="time" data-ht="' + n + '" value="' + E(r ? r[1] : '18:00') + '"' + (r ? '' : ' disabled') + '></div>'; }).join('') + '</div>', '', true);
    h += F.sec(t.bkMore, '<div class="g4">' + F.sel('book_step', t.bkStep, [['10', '10'], ['15', '15'], ['20', '20'], ['30', '30'], ['60', '60']]) + F.num('book_lead', t.bkLead, 0, 2880) + F.num('book_days', t.bkDays, 1, 90) + '<div></div></div><div class="g2">' + F.txt('book_address', t.bkAddr, 120) + F.txt('book_phone', t.bkPhone, 30) + '</div>' + F.area('book_note', t.bkNote, 300));
    return h;
  }
  function bindBook() {
    const body = $('ed-body');
    const upd = (fn, repaint) => { const d = bookData(); fn(d); putBook(d); if (repaint) paintEditor(); };
    body.querySelectorAll('[data-sv]').forEach(el => el.oninput = () => upd(d => { const s = d.services[Number(el.dataset.i)]; if (!s) return; const k = el.dataset.sv; s[k] = k === 'n' ? el.value : (el.value === '' ? (k === 'p' ? null : 60) : Number(el.value)); }));
    body.querySelectorAll('[data-svdel]').forEach(b => b.onclick = () => upd(d => { const s = d.services.splice(Number(b.dataset.svdel), 1)[0]; if (s) d.staff.forEach(m => { m.s = (m.s || []).filter(x => x !== s.id); }); }, true));
    $('bk-svc-add').onclick = () => upd(d => { let n = d.services.length + 1; while (d.services.some(s => s.id === 's' + n)) n++; d.services.push({ id: 's' + n, n: '', d: 60, p: null }); }, true);
    body.querySelectorAll('[data-st]').forEach(el => el.oninput = () => upd(d => { const m = d.staff[Number(el.dataset.i)]; if (m) m.n = el.value; }));
    body.querySelectorAll('[data-stdel]').forEach(b => b.onclick = () => upd(d => { d.staff.splice(Number(b.dataset.stdel), 1); }, true));
    $('bk-st-add').onclick = () => upd(d => { let n = d.staff.length + 1; while (d.staff.some(s => s.id === 'm' + n)) n++; d.staff.push({ id: 'm' + n, n: '', s: d.services.map(s => s.id) }); }, true);
    body.querySelectorAll('[data-stsv]').forEach(el => el.onchange = () => upd(d => { const m = d.staff[Number(el.dataset.stsv)]; if (!m) return; m.s = (m.s || []).filter(x => x !== el.dataset.sid); if (el.checked) m.s.push(el.dataset.sid); }));
    body.querySelectorAll('[data-hon]').forEach(el => el.onchange = () => upd(d => { const n = el.dataset.hon; d.hours[n] = el.checked ? [[body.querySelector('[data-hf="' + n + '"]').value || '09:00', body.querySelector('[data-ht="' + n + '"]').value || '18:00']] : []; }, true));
    body.querySelectorAll('[data-hf],[data-ht]').forEach(el => el.onchange = () => upd(d => { const n = el.dataset.hf || el.dataset.ht; const f = body.querySelector('[data-hf="' + n + '"]').value, to = body.querySelector('[data-ht="' + n + '"]').value; if (f && to && to > f) d.hours[n] = [[f, to]]; }));
  }

  // ---------- Wallet рядом ----------
  function geoPts() { return pj(v('geo_points'), []); }
  function parseCoords(s) {
    s = String(s || '').trim();
    const m = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) || s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || s.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (!m) return null; const lat = Number(m[1]), lng = Number(m[2]);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  }
  function tabGeo(t) {
    const pts = geoPts();
    return F.sec(t.etGeo, F.chk('geo_on', t.geoOn, t.geoOnS) +
      '<div class="geo-l">' + (pts.length ? pts.map((p, i) => '<div class="bk-row"><span>📍</span><input data-gn="' + i + '" value="' + E(p.name || '') + '" placeholder="' + E(t.geoName) + '" maxlength="60"><small class="geo-c">' + E(Number(p.lat).toFixed(5) + ', ' + Number(p.lng).toFixed(5)) + '</small><a class="act a-copy" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + E(p.lat + ',' + p.lng) + '">↗</a><button class="act a-ban" data-gdel="' + i + '">✕</button></div>').join('') : '<p class="es-h">' + E(t.geoNone) + '</p>') + '</div>' +
      '<div class="bk-row"><input id="geo-in" placeholder="' + E(t.geoAddPh) + '"><input id="geo-nm" placeholder="' + E(t.geoName) + '" maxlength="60"><button class="act a-paid" id="geo-add">+ ' + E(t.geoAdd) + '</button></div><p class="es-h" id="geo-err"></p>' +
      F.txt('geo_text', t.geoText, 120, t.geoTextPh), t.geoHint, true);
  }
  function bindGeo() {
    const body = $('ed-body'); const t = T();
    const put = (pts, rp) => { ED.cur.geo_points = JSON.stringify(pts); markDirty(); if (rp) paintEditor(); else schedulePreview(); };
    body.querySelectorAll('[data-gn]').forEach(el => el.oninput = () => { const p = geoPts(); if (p[el.dataset.gn]) { p[el.dataset.gn].name = el.value; put(p); } });
    body.querySelectorAll('[data-gdel]').forEach(b => b.onclick = () => { const p = geoPts(); p.splice(Number(b.dataset.gdel), 1); put(p, true); });
    $('geo-add').onclick = () => { const c = parseCoords($('geo-in').value); const p = geoPts(); if (!c) { $('geo-err').textContent = t.geoBad; return; } if (p.length >= 10) { $('geo-err').textContent = t.geoMax; return; } p.push({ lat: Math.round(c.lat * 1e6) / 1e6, lng: Math.round(c.lng * 1e6) / 1e6, name: $('geo-nm').value.trim() }); put(p, true); };
  }

  // ---------- все настройки (только просмотр) ----------
  const GROUPS = [['brand_|business_|app_language|spend_currency|country', 'gBrand'], ['theme_|ui_|font', 'gLook'], ['selfreg_|registration_|reg_page_|online_|wifi_', 'gReg'], ['wallet_|google_wallet|apple_|geo_', 'gWallet'], ['bonus_|welcome_|referral_|promo|tier_|scan_', 'gPromo'],
    ['auto_|birthday|nameday|winback|report_|campaign', 'gAuto'], ['book_|appt', 'gBook'], ['mail_|smtp|reply_to|from_name|email|telegram|tg_', 'gMsg'], ['feature_|inventory|pos_|sync|staff|point', 'gFeat']];
  function groupOf(k) { for (const [re, g] of GROUPS) if (new RegExp('^(' + re + ')').test(k)) return g; return 'gOther'; }
  function tabAll(t) {
    const all = (ED.g.snap && ED.g.snap.all) || null;
    if (!all) return '<div class="ed-note">' + E(t.allNone) + '</div>';
    return '<div class="all-top"><input id="all-q" placeholder="' + E(t.allSearch) + '" value="' + E(ED.allQ) + '"><span class="es-h">' + E(t.allHint(Object.keys(all).length, dt(ED.g.snapAt))) + '</span></div><div id="all-list"></div>';
  }
  function bindAll() {
    const all = (ED.g.snap && ED.g.snap.all) || null; if (!all) return; const t = T();
    const draw = () => {
      const q = ED.allQ.trim().toLowerCase(); const by = {};
      Object.keys(all).sort().forEach(k => { const val = all[k]; if (q && !k.toLowerCase().includes(q) && !String(val).toLowerCase().includes(q)) return; (by[groupOf(k)] = by[groupOf(k)] || []).push([k, val]); });
      const order = GROUPS.map(g => g[1]).concat('gOther');
      $('all-list').innerHTML = order.filter(g => by[g]).map(g => '<section class="es"><h4>' + E(t[g] || g) + ' <small>' + by[g].length + '</small></h4><div class="all-t">' + by[g].map(([k, val]) => '<div class="all-r"><code>' + E(k) + '</code><span>' + E(String(val).length > 220 ? String(val).slice(0, 220) + '…' : val) + '</span></div>').join('') + '</div></section>').join('') || '<p class="es-h">' + E(t.allEmpty) + '</p>';
    };
    $('all-q').oninput = () => { ED.allQ = $('all-q').value; draw(); };
    draw();
  }

  // ---------- предпросмотр ----------
  function schedulePreview() { clearTimeout(ED.pvTimer); ED.pvTimer = setTimeout(() => renderPreview(), 450); }
  function nicheEmoji() { const n = NICHES[v('business_niche')]; return n ? n[0] : ''; }
  async function renderPreview(first) {
    const box = $('pv-box'); if (!box) return; const t = T();
    const kind = PV_KIND[ED.tab];
    if (kind === 'book' && !pj(v('book_services'), []).length) { $('pv-h').innerHTML = '<b>' + E(t.pvTitle) + '</b><span>' + E(t.pvK_book) + '</span>'; $('pv-note').textContent = ''; box.innerHTML = '<div class="pv-empty">' + E(t.bkNoSvc) + '</div>'; return; }
    if (kind) {
      $('pv-h').innerHTML = '<b>' + E(t.pvTitle) + '</b><span>' + E(t['pvK_' + kind]) + '</span>';
      $('pv-note').textContent = t.pvNote;
      if (first || !box.querySelector('iframe')) box.innerHTML = '<div class="pv-phone"><div class="pv-load">…</div></div>';
      const seq = ++ED.pvSeq;
      const cfg = Object.assign({}, ED.cur); if (ED.logo !== undefined) cfg.brand_logo = ED.logo; if (ED.pageBg !== undefined) cfg.page_bg = ED.pageBg;
      const r = await api('admin-action', { op: 'client_preview', key: ED.key, kind, cfg, emoji: nicheEmoji() });
      if (seq !== ED.pvSeq || !$('pv-box')) return;
      if (!r.ok) { box.innerHTML = '<div class="err">' + E(t.pvErr) + '</div>'; return; }
      box.innerHTML = '<div class="pv-phone"><iframe sandbox="allow-scripts" title="preview"></iframe></div>';
      box.querySelector('iframe').srcdoc = PV_NONCE ? String(r.html).replace(/<script>/g, '<script nonce="' + PV_NONCE + '">') : r.html;
      pvFit(box.querySelector('.pv-phone'));
      return;
    }
    if (ED.tab === 'wallet') {
      $('pv-h').innerHTML = '<b>' + E(t.pvTitle) + '</b><span class="pv-seg">' + ['google', 'apple'].map(k => '<button type="button" data-pw="' + k + '" class="' + ((ED.pvWallet || 'google') === k ? 'on' : '') + '">' + (k === 'google' ? 'Google' : 'Apple') + '</button>').join('') + '</span>';
      $('pv-h').querySelectorAll('[data-pw]').forEach(b => b.onclick = () => { ED.pvWallet = b.dataset.pw; renderPreview(); });
      $('pv-note').textContent = t.pvWalletNote; box.innerHTML = '<div class="wd-phone">' + passHtml() + '</div>'; return;
    }
    if (ED.tab === 'venue') { $('pv-h').innerHTML = '<b>' + E(t.pvTitle) + '</b><span>' + E(t.pvApp) + '</span>'; $('pv-note').textContent = t.pvAppNote; box.innerHTML = appMock(); return; }
    if (ED.tab === 'geo') { $('pv-h').innerHTML = '<b>' + E(t.pvTitle) + '</b><span>iPhone</span>'; $('pv-note').textContent = t.pvGeoNote; box.innerHTML = lockMock(); return; }
  }
  // Карта — по тому же модулю, что и настоящая карта (api/_cardModel.js → window.LoyaCard): один в один.
  function showsTier() { return v('wallet_show_tier') === '1' || (v('wallet_show_tier') !== '0' && v('tier_perks_on') === '1'); }
  function sampleCard() {
    const ct = v('selfreg_card_type') || 'stamp'; const lg = ['ru', 'uk', 'sk', 'en'].includes(v('app_language')) ? v('app_language') : 'ru';
    const c = { code: 'LC-PREVIEW', client_name: 'Anna K.', title: '', lang: lg };
    if (ct === 'discount') Object.assign(c, { type: 'discount', discount_percent: Number(v('selfreg_discount_percent')) || 5 });
    else if (ct === 'spend') { const tg = Number(v('selfreg_spend_target')) || 500; Object.assign(c, { type: 'spend', spend_target: tg, spend_accumulated: Math.round(tg * 0.4), bonus_balance: 0, spend_bonus_points: Number(v('selfreg_spend_points')) || 1, title: v('selfreg_spend_title') }); }
    else { const tg = Math.max(2, Math.min(30, Number(v('selfreg_stamp_target')) || 10)); Object.assign(c, { type: 'stamp', stamp_target: tg, stamp_count: Math.min(3, tg - 1), title: v('selfreg_stamp_title'), discount_percent: ct === 'combo' ? (Number(v('selfreg_discount_percent')) || 5) : 0 }); }
    if (showsTier()) c.tier = 'silver';
    if (v('wallet_show_next') === '1') { c.tier_next = 'gold'; c.tier_next_left = 12; }
    return c;
  }
  // Свою картинку-полосу переводим в data: (внутри SVG-картинки внешние ссылки не грузятся).
  const HERO_DATA = {};
  function heroData(url) {
    if (!url || /^data:/.test(url)) return url || null;
    if (HERO_DATA[url]) return HERO_DATA[url];
    HERO_DATA[url] = null;
    fetch(url).then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); })).then(d => { HERO_DATA[url] = d; if (ED && ED.tab === 'wallet') renderPreview(); }).catch(() => {});
    return null;
  }
  function passHtml() {
    if (!window.LoyaCard) return '';
    const w = ED.g.wallet || {}; const t = T();
    const bg = (ED.wal.bgColor !== undefined ? ED.wal.bgColor : w.bg) || '#20252d';
    const n = parseInt(bg.slice(1), 16); const light = (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255 > 0.62;
    const fg = light ? '#141414' : '#fff', sub = light ? 'rgba(20,20,20,.62)' : 'rgba(255,255,255,.66)';
    const name = ED.cur.brand_name || (ED.r.client.profile && ED.r.client.profile.name) || 'Loya';
    const accent = /^#[0-9a-fA-F]{6}$/.test(v('theme_primary')) ? v('theme_primary') : '#d4af37';
    const card = sampleCard();
    const look = LoyaCard.cleanLook({ stamp: v('wallet_stamp_icon'), reward: v('wallet_reward_icon'), stampColor: v('wallet_stamp_color'), layout: v('wallet_layout'), season: v('wallet_season'), label: v('wallet_stamp_label'), arrange: v('wallet_arrange'),
      logoMode: v('wallet_logo_mode'), logoSize: v('wallet_logo_size'), logoRot: v('wallet_logo_rot'), logoX: v('wallet_logo_x'), logoY: v('wallet_logo_y'), logoFlip: v('wallet_logo_flip') });
    const lg0 = walSrc('logo'); const brand = { name, color: accent, currency: v('spend_currency') || 'EUR', ...look, logoImage: lg0 ? (/^data:/.test(lg0) ? lg0 : heroData(lg0) || '') : '' };
    const M = LoyaCard.passModel(card, brand, card.lang);
    const logo = walSrc('logo'), hero = walSrc('hero'); const hs = ED.wal.heroStamps !== undefined ? ED.wal.heroStamps : w.heroStamps !== false;
    let svg = LoyaCard.buildHeroSvg({ card, brand, niche: v('business_niche') || 'other', lang: M.lang, bgImage: heroData(hero), showProgress: hs });
    svg = svg.replace(/font-family="Carlito"/g, 'font-family="Carlito, Calibri, Arial, sans-serif"');
    const heroImg = '<img class="wd-hero-img" alt="" src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '">';
    const logoH = (cls) => logo ? '<span class="wd-logo ' + cls + '" style="background-image:url(&quot;' + E(logo) + '&quot;)"></span>' : '<span class="wd-logo wd-logo-loya ' + cls + '">L</span>';
    const mod = (m, col) => '<span class="wd-mod"><small style="color:' + col + '">' + E(m.header) + '</small><b>' + E(m.body) + '</b></span>';
    if (ED.pvWallet !== 'apple') {
      return '<div class="wd-pass" style="background:' + bg + ';color:' + fg + '"><div class="wd-g-top">' + logoH('') + '<span>' + E(M.cardTitle) + '</span></div>' +
        '<div class="wd-g-sub" style="color:' + sub + '">' + E(M.subheader) + '</div><div class="wd-g-name">' + E(M.header) + '</div>' +
        '<div class="wd-mods">' + M.modules.filter(m => m.id !== 'rule').slice(0, 4).map(m => mod(m, sub)).join('') + '</div><div class="wd-qr"><div class="wd-qr-in"></div></div><div class="wd-hero-box">' + heroImg + '</div></div>';
    }
    const lab = light ? '#464646' : accent;
    const heads = M.modules.filter(m => ['progress', 'discount', 'bonus'].includes(m.id)).slice(0, 2);
    const sec = [{ header: t.pvClient || 'Client', body: M.header }].concat(M.tier ? [{ header: LoyaCard.TEXT[M.lang].hTier, body: M.tier }] : [], [{ header: M.typeName, body: card.title || '—' }]);
    return '<div class="wd-pass wd-apple" style="background:' + bg + ';color:' + fg + '"><div class="wd-a-top">' + logoH('sq') + '<span class="wd-a-name">' + E(M.cardTitle) + '</span><span class="wd-a-heads">' + heads.map(m => mod(m, lab)).join('') + '</span></div>' +
      '<div class="wd-hero-box">' + heroImg + '</div><div class="wd-a-fields">' + sec.map(m => mod(m, lab)).join('') + '</div>' + (M.next ? '<div class="wd-a-fields">' + mod(M.next, lab) + '</div>' : '') + '<div class="wd-qr"><div class="wd-qr-in"></div></div></div>';
  }
  function appMock() {
    const c = THEMES[v('theme_name')] || [v('theme_primary') || '#d4af37', v('theme_sidebar') || '#0d0f14', v('theme_screen') || '#0b0d12', v('theme_text') || '#f0ece0'];
    const prim = v('theme_primary') || c[0], side = v('theme_sidebar') || c[1], scr = v('theme_screen') || c[2], txt = v('theme_text') || c[3];
    const logo = ED.logo || ''; const em = nicheEmoji() || '✨'; const name = E(v('brand_name') || 'Loya');
    const nav = ['🏠', '👥', '💳', '📷', '📣', '📊', '⚙️'];
    return '<div class="am" style="--p:' + prim + ';--s:' + side + ';--b:' + scr + ';--t:' + txt + '"><div class="am-side"><div class="am-brand">' + (logo ? '<img src="' + E(logo) + '" alt="">' : '<span>' + em + '</span>') + '<b>' + name + '</b></div>' + nav.map((n, i) => '<div class="am-nav' + (i === 0 ? ' on' : '') + '">' + n + '<i></i></div>').join('') + '</div><div class="am-main"><div class="am-h">' + E(T().pvHello) + '</div><div class="am-k">' + [1, 2, 3, 4].map(() => '<div><i></i><b></b></div>').join('') + '</div><div class="am-card"></div><div class="am-btn">' + E(T().pvScan) + '</div></div></div>';
  }
  function lockMock() {
    const t = T(); const on = v('geo_on') === '1' && geoPts().length; const name = E(v('brand_name') || 'Loya'); const logo = ED.logo || '';
    return '<div class="lk"><div class="lk-t">9:41</div>' + (on ? '<div class="lk-n"><div class="lk-i">' + (logo ? '<img src="' + E(logo) + '" alt="">' : nicheEmoji() || '✨') + '</div><div><div class="lk-r"><b>' + name + '</b><small>' + E(t.geoNow) + '</small></div><div>' + E(v('geo_text') || t.geoAuto) + '</div></div></div>' : '<div class="lk-off">' + E(t.geoOff) + '</div>') + '</div>';
  }

  // ---------- сохранение ----------
  async function saveEditor() {
    const t = T(); const cfg = changed();
    if (ED.logo !== undefined) cfg.brand_logo = ED.logo; if (ED.pageBg !== undefined) cfg.page_bg = ED.pageBg; const wal = Object.assign({}, ED.wal);
    if (!Object.keys(cfg).length && !Object.keys(wal).length) { $('ed-msg').textContent = t.edNoChanges; return; }
    $('ed-save').disabled = true; $('ed-msg').textContent = t.edSaving;
    const r = await api('admin-action', { op: 'client_cfg_save', key: ED.key, cfg, wallet: Object.keys(wal).length ? wal : undefined }); $('ed-save').disabled = false;
    if (r.ok && (!r.wallet || r.wallet.ok)) { const tab = ED.tab; await window.openClient(ED.key, tab); $('ed-msg').textContent = t.edSaved(r.ver); $('ed-msg').className = 'ok'; }
    else { $('ed-msg').textContent = (r.error === 'db_error' ? t.edNeedSchema : t.edErr) + (r.wallet && r.wallet.error ? ' (Wallet: ' + r.wallet.error + ')' : ''); $('ed-msg').className = 'err'; }
  }
}

const CSS = `
.wide{max-width:1240px!important;width:min(1240px,97vw)}
.ed-main{display:grid;grid-template-columns:minmax(0,1fr);flex:1;min-height:0;overflow:hidden}
.ed-main.has-pv{grid-template-columns:minmax(0,1fr) 400px}
.ed-main .ed-body{overflow:auto;max-height:calc(92vh - 170px)}
.ed-pv{border-left:1px solid var(--line);padding:14px 16px;overflow:auto;max-height:calc(92vh - 170px);background:rgba(0,0,0,.18)}
.pv-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.pv-h b{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}.pv-h span{font-size:12px;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.07)}
.pv-phone{width:360px;max-width:100%;height:640px;margin:0 auto;border-radius:34px;padding:10px;background:#050507;box-shadow:inset 0 0 0 2px #2b2f38,0 20px 44px rgba(0,0,0,.45);overflow:hidden;box-sizing:border-box}
.pv-phone iframe{width:100%;height:100%;border:0;border-radius:26px;background:#0c0e13}.pv-load{display:grid;place-items:center;height:100%;color:var(--mut)}
.pv-note{font-size:12px;color:var(--mut);line-height:1.45;margin:10px 2px 0;text-align:center}
.es{padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.025);margin-bottom:14px}.es h4{margin:0 0 10px;font-size:14px;display:flex;align-items:center;gap:8px}.es h4 small{color:var(--mut);font-weight:700}
.es-h{font-size:12.5px;color:var(--mut);margin:-4px 0 10px;line-height:1.45}
.chk2 small{display:block;font-weight:600;color:var(--mut);font-size:12px;margin-top:2px}
.fld textarea{width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#151922;color:inherit;padding:9px 10px;font:inherit;font-size:14px;resize:vertical}
.ed-dirty{font-size:12px;color:var(--a);font-weight:800}
.bk-list{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.bk-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.bk-row input{height:38px;flex:1;min-width:90px}.bk-row input[type=number]{flex:0 0 92px;min-width:0}.bk-u{font-size:12px;color:var(--mut)}
.bk-staff{padding:10px;border-radius:12px;border:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.bk-hours{display:flex;flex-direction:column;gap:6px}.bk-h{display:flex;align-items:center;gap:8px}.bk-h .day{min-width:84px}.bk-h input[type=time]{height:36px;width:120px}.bk-h input[disabled]{opacity:.35}
.geo-l{display:flex;flex-direction:column;gap:6px;margin:4px 0 10px}.geo-c{font-size:11.5px;color:var(--mut);font-variant-numeric:tabular-nums}
.wcols{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;padding-bottom:12px}.wcol{width:30px;height:30px;border-radius:9px;border:2px solid rgba(255,255,255,.2);cursor:pointer}
.all-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.all-top input{height:40px;flex:1;min-width:220px}.all-top .es-h{margin:0}
.all-t{display:flex;flex-direction:column}.all-r{display:grid;grid-template-columns:minmax(150px,240px) 1fr;gap:10px;padding:6px 0;border-top:1px solid var(--line);font-size:12.5px}.all-r:first-child{border-top:0}.all-r code{color:var(--a2);font-size:12px;word-break:break-all}.all-r span{word-break:break-word;color:#e9e2d0}
.wd-phone{padding:12px;border-radius:30px;background:#0b0d12;box-shadow:inset 0 0 0 2px #2b2f38,0 18px 40px rgba(0,0,0,.35);max-width:340px;margin:0 auto}
.wd-pass{border-radius:18px;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.35)}
.wd-g-top{display:flex;align-items:center;gap:10px;padding:14px 16px 6px;font-size:13.5px;font-weight:600}
.wd-logo{width:32px;height:32px;border-radius:50%;background:#fff center/cover no-repeat;flex:0 0 auto;display:grid;place-items:center}.wd-logo-loya{background:linear-gradient(135deg,#f4d47c,#b8862d);color:#1a1206;font-weight:900}
.wd-g-sub{padding:6px 16px 0;font-size:12px}.wd-g-name{padding:2px 16px 0;font-size:20px;font-weight:700}.wd-g-field{padding:10px 16px 0;display:flex;flex-direction:column;gap:2px}.wd-g-field small{font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;font-weight:700}.wd-g-field b{font-size:15px}
.wd-qr{display:flex;justify-content:center;padding:14px 0}.wd-qr-in{width:124px;height:124px;border-radius:10px;background:#fff repeating-linear-gradient(45deg,#111 0 5px,#fff 5px 10px);box-shadow:0 0 0 8px #fff}
.wd-hero{position:relative;aspect-ratio:1032/336;background:#181c23 center/cover no-repeat;overflow:hidden}.wd-hero-default{background:linear-gradient(135deg,#383e47,#232830 55%,#181c23)}
.wd-hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,14,19,.86),rgba(11,14,19,.55) 55%,rgba(11,14,19,.1))}
.wd-hero-over{position:absolute;inset:0;padding:9% 5%;display:flex;flex-direction:column;justify-content:space-between;color:#fff}.wd-hero-over b{font-size:12px}
.wd-stamps{display:flex;gap:4px;flex-wrap:wrap}.wd-stamps i{width:15px;height:15px;border-radius:50%;border:1.5px dashed rgba(255,255,255,.55);display:grid;place-items:center;font-size:8px;font-style:normal;color:#1a1206}.wd-stamps i.on{border:0}
.am{display:flex;height:300px;border-radius:14px;overflow:hidden;box-shadow:0 14px 34px rgba(0,0,0,.4);font-size:11px;color:var(--t);background:var(--b)}
.am-side{width:96px;background:var(--s);padding:8px 6px;display:flex;flex-direction:column;gap:5px}.am-brand{display:flex;align-items:center;gap:5px;padding:5px;border-radius:8px;border:1px solid rgba(255,255,255,.12);margin-bottom:4px;color:#fff}.am-brand img{width:18px;height:18px;border-radius:5px;background:#fff;object-fit:contain}.am-brand b{font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.am-nav{display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:7px;color:rgba(255,255,255,.75)}.am-nav i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.18)}.am-nav.on{background:var(--p);color:#111}.am-nav.on i{background:rgba(0,0,0,.25)}
.am-main{flex:1;padding:12px;display:flex;flex-direction:column;gap:9px}.am-h{font-size:15px;font-weight:800}.am-k{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.am-k div{height:44px;border-radius:9px;background:color-mix(in srgb,var(--t) 7%,transparent);padding:6px;display:flex;flex-direction:column;gap:5px}.am-k i{width:14px;height:14px;border-radius:5px;background:color-mix(in srgb,var(--p) 30%,transparent)}.am-k b{width:60%;height:7px;border-radius:4px;background:color-mix(in srgb,var(--t) 25%,transparent)}
.am-card{flex:1;border-radius:9px;background:color-mix(in srgb,var(--t) 5%,transparent)}.am-btn{align-self:flex-end;padding:6px 12px;border-radius:8px;background:var(--p);color:#111;font-weight:800}
.lk{height:520px;max-width:300px;margin:0 auto;border-radius:36px;position:relative;overflow:hidden;color:#fff;box-shadow:inset 0 0 0 7px #0b0b0d,0 18px 40px rgba(0,0,0,.4);background:radial-gradient(120% 70% at 20% 0%,#5b6cff 0%,transparent 60%),radial-gradient(90% 60% at 100% 100%,#ff7a59 0%,transparent 55%),linear-gradient(160deg,#1f2550,#0f1020)}
.lk-t{text-align:center;font-size:60px;font-weight:700;padding-top:54px}.lk-n{position:absolute;left:12px;right:12px;bottom:30px;border-radius:18px;padding:10px 12px;color:#111;background:rgba(245,245,247,.9);display:flex;gap:10px;align-items:center;font-size:13px}
.lk-i{width:38px;height:38px;border-radius:10px;background:#fff;display:grid;place-items:center;font-size:20px;overflow:hidden;flex:0 0 auto}.lk-i img{width:100%;height:100%;object-fit:contain}.lk-r{display:flex;justify-content:space-between;gap:8px}.lk-r small{opacity:.55}
.lk-off{position:absolute;left:24px;right:24px;bottom:44px;text-align:center;font-size:12.5px;opacity:.75}
/* 2.25: компактнее — меньше листать */
:root{color-scheme:dark}
*{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.22) transparent}
.ed-h{padding:10px 16px 6px}.ed-h b{font-size:15.5px}.ed-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.ed-chips span{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--mut)}
.ed-tabs{gap:2px;padding:0 12px 8px}.ed-tabs .tab{font-size:12.5px;padding:6px 10px}
.ed-main.has-pv{grid-template-columns:minmax(0,1fr) 360px}
.ed-main .ed-body,.ed-pv{max-height:calc(92vh - 150px)}
.ed-body{padding:12px 14px}
.ed-body.cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;align-content:start;align-items:start}
.ed-body.cols>.es{margin:0}.ed-body.cols>.es-wide{grid-column:1/-1}.ed-body.cols>.ed-note{grid-column:1/-1;margin:0}
.ed-body.cols .es .g2{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}.ed-body.cols .es .g4{grid-template-columns:repeat(auto-fit,minmax(110px,1fr))}
.ed-note{font-size:12px;padding:7px 10px;margin-bottom:10px}
.es{padding:10px 12px;margin-bottom:10px;border-radius:12px}.es h4{margin:0 0 8px;font-size:13.5px}.es-h{font-size:12px;margin:-2px 0 8px}
.fld{margin-bottom:8px;font-size:12px;gap:4px}.fld input,.fld select{height:36px;font-size:13.5px}.fld textarea{font-size:13.5px;padding:7px 9px}
.fld.col input{height:34px;width:60px}
.chk2{padding:7px 10px;margin-bottom:8px;font-size:13px;gap:8px}.chk2 input{width:18px;height:18px}
.g2{gap:0 10px}.g4{gap:0 8px}
.logo-prev{width:56px;height:56px;flex-basis:56px;border-radius:12px}.logo-row{gap:10px}.logo-row small{margin-top:4px}
.hero-prev{height:64px}.logo-prev.bg-prev{width:96px;flex-basis:96px;background:#20252d center/cover no-repeat;color:#888}input[type=range]{accent-color:var(--a);height:auto!important}
.themes{gap:6px}.th{width:54px;height:38px}
.days{gap:4px}.day{padding:4px 8px;font-size:12px}
.act{min-height:30px;font-size:12px;padding:0 10px}
.bk-list{gap:6px}.bk-row{gap:6px}.bk-row input{height:34px}.bk-staff{padding:8px;gap:6px}
.bk-hours{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:4px 14px}.bk-h{gap:6px}.bk-h .day{min-width:64px}.bk-h input[type=time]{height:32px;width:118px}
.pv-phone{width:320px;height:560px;border-radius:30px;padding:8px}.pv-phone iframe{border-radius:23px}
.pv-seg{display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:rgba(255,255,255,.07)}.pv-seg button{border:0;background:transparent;color:inherit;font:inherit;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:7px;cursor:pointer}.pv-seg button.on{background:var(--a);color:#16110a}
.pv-empty{padding:28px 18px;text-align:center;border-radius:16px;border:1px dashed var(--line);color:var(--mut);font-size:13px;line-height:1.5}
.ed-f{padding:8px 14px}
.wd-mods{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;padding:10px 16px 0}.wd-mod{display:flex;flex-direction:column;gap:2px;min-width:0}.wd-mod small{font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wd-mod b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wd-hero-box{line-height:0}.wd-hero-img{width:100%;display:block;aspect-ratio:1032/336}
.wd-apple .wd-a-top{display:flex;align-items:center;gap:8px;padding:12px 14px}.wd-a-name{font-size:14px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-a-heads{display:flex;gap:12px;text-align:right}.wd-a-heads .wd-mod{align-items:flex-end}
.wd-a-fields{display:flex;justify-content:space-between;gap:10px;padding:10px 14px 0;flex-wrap:wrap}.wd-logo.sq{border-radius:7px;width:30px;height:30px}

@media(max-width:980px){.ed-main.has-pv{grid-template-columns:1fr}.ed-pv{border-left:0;border-top:1px solid var(--line);max-height:none}.ed-main .ed-body{max-height:none}.ed-main{overflow:auto;max-height:calc(92vh - 170px)}}
.lk-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(36px,1fr));gap:5px}.lk-ico{height:36px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:inherit;cursor:pointer;display:grid;place-items:center;padding:0}.lk-ico svg{width:26px;height:26px}.lk-ico.on{background:var(--a);color:#16110a;border-color:var(--a)}
.lk-cols{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.lk-col{width:30px;height:30px;border-radius:50%;border:2px solid transparent;box-shadow:inset 0 0 0 1px rgba(128,128,128,.5);cursor:pointer;padding:0}.lk-col.on{border-color:var(--a);box-shadow:0 0 0 3px rgba(212,175,55,.3)}.lk-col.auto{background:var(--a);color:#16110a;font-weight:800;font-size:11px}
.lk-cols input[type=color]{width:34px;height:30px;padding:0;border:0;background:none}.lk-hex{width:92px!important;height:30px!important;font:600 12.5px ui-monospace,Consolas,monospace!important;text-transform:uppercase}.lk-hex.bad{border-color:#ef4444!important}
.lk-styles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}.lk-style{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:inherit;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;text-align:left}.lk-style:hover{border-color:var(--a)}.lk-style i{flex:none;width:18px;height:18px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
`;

const src = adminEditorClient.toString();
// 2.25: модуль карты (тот же, что рисует настоящую карту) — для превью Wallet «один в один»
module.exports = { JS: require('./_cardModel').CLIENT_JS + '\n' + src.slice(src.indexOf('{') + 1, src.lastIndexOf('}')), CSS };
