// ---------- эмодзи (Twemoji) ----------
// В приложении используются обычные emoji-символы в тексте — но системные эмодзи-шрифты
// выглядят по-разному (и не очень современно) на разных версиях Windows. Twemoji —
// свободная (CC-BY) библиотека цветных эмодзи-картинок, которая заменяет символы на
// картинки прямо в DOM, поэтому вид одинаковый везде. MutationObserver с debounce ловит
// вообще любое обновление интерфейса, не завязываясь на конкретные функции рендера.
function applyTwemoji() {
  if (window.twemoji) {
    twemoji.parse(document.body, { folder: 'svg', ext: '.svg' });
  }
}
let twemojiDebounceTimer = null;
const twemojiObserver = new MutationObserver(() => {
  clearTimeout(twemojiDebounceTimer);
  twemojiDebounceTimer = setTimeout(applyTwemoji, 60);
});
twemojiObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
document.addEventListener('DOMContentLoaded', applyTwemoji);
// 2.24: линейные иконки вместо эмодзи в меню и плитках настроек
try { if (window.LoyaIcons) LoyaIcons.applyIcons(); } catch (e) { /* без иконок */ }

// 2.27: любой цвет можно задать кодом (#RRGGBB или #RGB) — рядом с каждой палитрой появляется поле для кода.
// Поле и палитра связаны в обе стороны; для окон, которые рисуются позже, поля добавляются сами.
function hexNorm(v) {
  v = String(v || '').trim().replace(/^#?/, '#');
  if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map(c => c + c).join('');
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
}
const HEX_VALUE = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
function attachHex(inp) {
  if (inp.dataset.hex) return; inp.dataset.hex = '1';
  const hx = document.createElement('input');
  Object.assign(hx, { type: 'text', className: 'hex-in', maxLength: 7, spellcheck: false, autocomplete: 'off', placeholder: '#RRGGBB' });
  hx.setAttribute('aria-label', 'HEX'); hx.value = inp.value;
  // 2.30: цвет и код — одна аккуратная «пилюля»: образец слева, #RRGGBB справа
  const wrap = document.createElement('span'); wrap.className = 'hexf';
  const host = inp.closest('.wd-color-custom, .ie-chip-custom, .pz-color-custom');
  let dot = null;
  if (host) {
    // палитра: свой цвет уже есть кнопкой 🎨 — в пилюле только образец текущего цвета
    dot = document.createElement('span'); dot.className = 'hexf-dot'; dot.addEventListener('click', () => inp.click());
    host.insertAdjacentElement('afterend', wrap); wrap.append(dot, hx);
  } else {
    inp.insertAdjacentElement('beforebegin', wrap); wrap.append(inp, hx);
  }
  const paint = () => { if (dot) dot.style.background = HEX_VALUE.get.call(inp); };
  paint();
  // программа ставит цвет кодом (загрузка темы и т. п.) — поле обновляется тоже
  Object.defineProperty(inp, 'value', { configurable: true, get() { return HEX_VALUE.get.call(this); }, set(v) { HEX_VALUE.set.call(this, v); if (document.activeElement !== hx) hx.value = HEX_VALUE.get.call(this); wrap.classList.remove('bad'); paint(); } });
  inp.addEventListener('input', () => { if (document.activeElement !== hx) hx.value = inp.value; paint(); });
  const apply = (final) => {
    const v = hexNorm(hx.value);
    wrap.classList.toggle('bad', !v && hx.value.replace('#', '').length >= 3);
    if (!v) return;
    if (HEX_VALUE.get.call(inp) !== v) { HEX_VALUE.set.call(inp, v); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (final) { hx.value = v; inp.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  hx.addEventListener('input', () => apply(false));
  hx.addEventListener('change', () => apply(true));
  hx.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(true); } });
}
function attachHexAll(root) { (root || document).querySelectorAll('input[type="color"]:not([data-hex])').forEach(attachHex); }
attachHexAll();
let hexScan = 0;
new MutationObserver(() => { if (!hexScan) hexScan = requestAnimationFrame(() => { hexScan = 0; attachHexAll(); }); }).observe(document.body, { childList: true, subtree: true });

// ---------- переводы ----------
let currentBrandName = 'Loya';
let currentNicheId = 'coffee';
let currentSpendCurrency = 'EUR';

const CURRENCY_SYMBOLS = { EUR: '€', CZK: 'Kč', UAH: '₴', PLN: 'zł', HUF: 'Ft', USD: '$', GBP: '£', CHF: 'CHF', RUB: '₽' };
const CURRENCY_LIST = ['EUR', 'CZK', 'UAH', 'PLN', 'HUF', 'USD', 'GBP', 'CHF', 'RUB'];
// v2.16: страна заведения → валюта по умолчанию.
const COUNTRY_LIST = ['SK', 'CZ', 'UA', 'PL', 'HU', 'AT', 'DE', 'OTHER'];
const COUNTRY_CURRENCY = { SK: 'EUR', CZ: 'CZK', UA: 'UAH', PL: 'PLN', HU: 'HUF', AT: 'EUR', DE: 'EUR', OTHER: 'EUR' };
const COUNTRY_NATIVE = { SK: 'Slovensko', CZ: 'Česko', UA: 'Україна', PL: 'Polska', HU: 'Magyarország', AT: 'Österreich', DE: 'Deutschland' };
const COUNTRY_FLAGS = {
  SK: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#ee1c25"/><rect width="30" height="13.33" fill="#0b4ea2"/><rect width="30" height="6.67" fill="#fff"/><path d="M7.2 4.6h7.6v6.2c0 2.6-1.9 4.1-3.8 4.9-1.9-.8-3.8-2.3-3.8-4.9z" fill="#fff"/><path d="M8 5.3h6v5.5c0 2.1-1.5 3.3-3 4-1.5-.7-3-1.9-3-4z" fill="#ee1c25"/><path d="M10.6 6.4h.8v1.5h1.6v.8h-1.6v1.1h2v.8h-2v2.6h-.8v-2.6h-2v-.8h2V8.7H9v-.8h1.6z" fill="#fff"/></svg>',
  CZ: '<svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#d7141a"/><path d="M0 0l15 10L0 20z" fill="#11457e"/></svg>',
  UA: '<svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#0057b7"/><rect y="10" width="30" height="10" fill="#ffd700"/></svg>',
  PL: '<svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#dc143c"/></svg>',
  HU: '<svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#ce2939"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#477050"/></svg>',
  AT: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#ed2939"/><rect y="6.67" width="30" height="6.67" fill="#fff"/></svg>',
  DE: '<svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/></svg>',
  OTHER: '<svg viewBox="0 0 30 20"><rect width="30" height="20" rx="2" fill="#2f6f9f"/><circle cx="15" cy="10" r="6.5" fill="none" stroke="#fff" stroke-width="1.2"/><ellipse cx="15" cy="10" rx="2.8" ry="6.5" fill="none" stroke="#fff" stroke-width="1"/><path d="M8.5 10h13M9.6 6.6h10.8M9.6 13.4h10.8" stroke="#fff" stroke-width="1"/></svg>'
};
function countryName(c) { return c === 'OTHER' ? t('countryOther') : (COUNTRY_NATIVE[c] || c); }
function currencyLabel(c) { return `${CURRENCY_SYMBOLS[c] || c} · ${c}`; }
function fillCurrencySelect(sel, value) {
  if (!sel) return;
  const v = value || sel.value || 'EUR';
  const list = CURRENCY_LIST.includes(v) ? CURRENCY_LIST : CURRENCY_LIST.concat(v);
  sel.innerHTML = list.map(c => `<option value="${c}">${escapeHtml(currencyLabel(c))}</option>`).join('');
  sel.value = v;
}
function fillCountrySelect(sel, value) {
  if (!sel) return;
  sel.innerHTML = COUNTRY_LIST.map(c => `<option value="${c}" data-flag="${c}">${escapeHtml(countryName(c))}</option>`).join('');
  sel.value = COUNTRY_LIST.includes(value) ? value : 'OTHER';
}
function defaultCountryForLang(l) { return l === 'sk' ? 'SK' : l === 'uk' ? 'UA' : 'OTHER'; }
// Плитки стран + валюта. state = { country, currency }; валюта следует за страной, пока её не меняли руками.
function renderRegionPicker(box, state) {
  if (!box) return;
  box.innerHTML = `<div class="region-grid">${COUNTRY_LIST.map(c => `<button type="button" class="region-tile${c === state.country ? ' active' : ''}" data-c="${c}"><span class="region-flag">${COUNTRY_FLAGS[c]}</span><span>${escapeHtml(countryName(c))}</span></button>`).join('')}</div>
    <label class="region-cur"><span>${escapeHtml(t('lblSpendCurrency'))}</span><select class="currency-select"></select></label>`;
  const sel = box.querySelector('select');
  fillCurrencySelect(sel, state.currency);
  box.querySelectorAll('.region-tile').forEach(b => b.addEventListener('click', () => {
    const prevDefault = COUNTRY_CURRENCY[state.country];
    state.country = b.dataset.c;
    if (!state.currencyTouched || state.currency === prevDefault) { state.currency = COUNTRY_CURRENCY[state.country]; sel.value = state.currency; }
    box.querySelectorAll('.region-tile').forEach(x => x.classList.toggle('active', x === b));
  }));
  sel.addEventListener('change', () => { state.currency = sel.value; state.currencyTouched = true; });
}
function currencySymbol() { return CURRENCY_SYMBOLS[currentSpendCurrency] || '€'; }

let currentBrandLogo = null;   // data-URL загруженного логотипа или null
async function loadBrandLogo() {
  try { currentBrandLogo = window.api.brandLogoGet ? await window.api.brandLogoGet() : null; } catch (e) { currentBrandLogo = null; }
  applyBrand();
}
function applyBrand() {
  const niche = NichesModule.getNiche(currentNicheId);
  const mark = document.getElementById('app-logo-mark'), nameEl = document.getElementById('app-logo-name');
  if (mark && nameEl) {
    mark.classList.toggle('has-img', !!currentBrandLogo);
    if (currentBrandLogo) { mark.innerHTML = ''; const im = document.createElement('img'); im.src = currentBrandLogo; im.alt = ''; mark.appendChild(im); }
    else mark.textContent = niche.emoji;
    nameEl.textContent = currentBrandName;
    document.getElementById('app-logo').title = currentBrandName;
  }
  if (typeof syncTopbarBrand === 'function') syncTopbarBrand();
  document.title = currentBrandName;
  if (typeof renderSrLogo === 'function') try { renderSrLogo(); } catch (e) { /* ещё нет */ }
  // Подсказка в поле "Примечание" зависит от ниши бизнеса (Business Theme Context,
  // см. niches.js) — единственное место, где это применяется, чтобы не разводить
  // if (niche === ...) по разным экранам.
  const notesField = document.getElementById('c-notes');
  if (notesField) notesField.placeholder = NichesModule.getClientNoteExample(currentNicheId, getLang());
  // Заголовки разделов Главной, которые пользователь не переименовывал, — на текущем языке.
  document.querySelectorAll('.dash-header-widget[data-default-text="1"]').forEach(el => {
    const text = t(DASHBOARD_HEADER_DEFAULT_TEXT[el.dataset.widget]);
    el.dataset.headerText = text;
    const span = el.querySelector('.dash-header-text');
    if (span) span.textContent = text;
  });
  const fromNameField = document.getElementById('s-fromname');
  if (fromNameField) fromNameField.placeholder = currentBrandName;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  if (typeof syncNavTitles === 'function') try { syncNavTitles(); } catch (e) { /* ещё не объявлена */ }
  if (typeof syncLangFlag === 'function') try { syncLangFlag(); } catch (e) { /* ещё не объявлена */ }
  // v2.16: язык рассылки по умолчанию — язык программы (пока его не выбрали руками).
  { const cl = document.getElementById('campaign-lang-select'); if (cl && !cl.dataset.touched && cl.value !== getLang()) { cl.value = getLang(); try { renderCampaignTpls(); updateCampaignRecipientCount(); } catch (e) { /* ещё не готово */ } } }
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', el.title);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  applyBrand();
  // Заголовки плиток настроек: иконка уже стоит в квадратике слева, эмодзи из перевода убираем.
  document.querySelectorAll('.settings-tile-title').forEach(el => {
    el.textContent = el.textContent.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '');
  });
  if (typeof renderWinTools === 'function') try { renderWinTools(); } catch (e) { /* ещё не готово */ }
}

// Мини-превью тем (сайдбар, карточки, кнопка) — те же, что на шаге выбора темы при первом запуске.
function themePreviewInner(p) {
  const surface = p.surface || (p.dark ? '#171b26' : '#ffffff');
  return `<span class="otc-sidebar" style="background:${p.sidebar}"><i style="background:${p.primary}"></i><i></i><i></i></span>
    <span class="otc-main">
      <span class="otc-card" style="background:${surface}"><b style="background:${p.text}"></b><b style="background:${p.text};opacity:.35"></b></span>
      <span class="otc-card" style="background:${surface}"><b style="background:${p.chartVisits}"></b><b style="background:${p.text};opacity:.35"></b></span>
      <span class="otc-btn" style="background:${p.primary}"></span>
    </span>`;
}
function decorateThemeSwatches() {
  document.querySelectorAll('.otc-preview[data-preview]').forEach(el => {
    const id = el.dataset.preview;
    if (id === 'custom') { el.classList.add('otc-preview-custom'); el.innerHTML = '<span class="otc-custom-icon">🎨</span>'; return; }
    if (id === 'auto') { el.classList.add('otc-preview-auto'); el.style.background = `linear-gradient(135deg, ${THEME_PRESETS.coffee.screen} 50%, ${THEME_PRESETS.gold.screen} 50%)`; el.innerHTML = '<span class="oa-half oa-l">☀</span><span class="oa-half oa-r">☾</span>'; return; }
    const p = THEME_PRESETS[id];
    if (!p) return;
    el.style.background = p.screen;
    el.innerHTML = themePreviewInner(p);
  });
}

const langSelect = document.getElementById('app-lang-select');
langSelect.addEventListener('change', async () => {
  setLang(langSelect.value);
  applyTranslations();
  const s = await window.api.getSettings();
  await window.api.saveSettings({ ...s, app_language: langSelect.value });
  refreshActiveView();
});

// Страна заведения: именины (Meniny) — словацкая традиция, их показываем только для Словакии.
function businessCountry(st) { return st.business_country || (st.app_language === 'sk' ? 'SK' : 'OTHER'); }
function applyCountryUi(st) { document.body.classList.toggle('no-meniny', businessCountry(st) !== 'SK'); }
async function initLanguage() {
  const s = await window.api.getSettings();
  applyCountryUi(s);
  setLang(s.app_language || 'ru');
  langSelect.value = getLang();
  applyTranslations();
  loadBrandLogo();
}

// ---------- поиск в настройках ----------
// Ищет и по названиям разделов, и по всему, что внутри окна раздела (подписи полей, подсказки).
function settingsSearchNorm(v) { return String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ё/g, 'е'); }
// Как люди пишут в поиске → как это называется в программе.
const SETTINGS_ALIASES = { 'телеграм': ['telegram'], 'телеграмм': ['telegram'], 'телеграме': ['telegram'], 'вайфай': ['wifi', 'wi-fi'], 'вай-фай': ['wifi', 'wi-fi'], 'валлет': ['wallet'], 'волет': ['wallet'], 'гугл': ['google'], 'эпл': ['apple'], 'епл': ['apple'], 'пин': ['pin'], 'емейл': ['email', 'e-mail'], 'имейл': ['email', 'e-mail'], 'мейл': ['email', 'e-mail'], 'смтп': ['smtp'], 'кюар': ['qr'], 'куар': ['qr'], 'касса': ['касс', 'pos'], 'каса': ['кас', 'pos'], 'лого': ['логотип', 'logo'], 'pokladna': ['pokladn'], 'logo': ['логотип'] };
function runSettingsSearch() {
  const q = settingsSearchNorm(document.getElementById('settings-search').value.trim());
  const words = q.split(/\s+/).filter(Boolean);
  let shown = 0;
  document.querySelectorAll('#settings-tiles .settings-tile').forEach(tile => {
    let snip = tile.querySelector('.settings-search-snip'); if (snip) snip.remove();
    tile.classList.remove('search-hit');
    if (!words.length) { tile.classList.remove('search-hidden'); return; }
    const own = settingsSearchNorm(tile.textContent);
    const modal = tile.dataset.modal ? document.getElementById(tile.dataset.modal) : null;
    const inner = modal ? settingsSearchNorm(modal.textContent) : '';
    const has = (txt, w) => txt.includes(w) || (SETTINGS_ALIASES[w] || []).some(a => txt.includes(a));
    const ok = words.every(w => has(own, w) || has(inner, w));
    tile.classList.toggle('search-hidden', !ok);
    if (!ok) return;
    shown++; tile.classList.add('search-hit');
    // Совпадение только внутри окна — покажем, что именно нашлось.
    if (!words.every(w => has(own, w)) && modal) {
      const raw = modal.textContent.replace(/\s+/g, ' ');
      const miss = words.find(w => !has(own, w)); const nr = settingsSearchNorm(raw);
      const i = [miss, ...(SETTINGS_ALIASES[miss] || [])].map(x => nr.indexOf(x)).find(x => x >= 0) ?? -1;
      if (i >= 0) {
        const el = document.createElement('span'); el.className = 'settings-search-snip';
        el.textContent = '…' + raw.slice(Math.max(0, i - 24), i + 46).trim() + '…';
        (tile.querySelector('.settings-tile-text') || tile).appendChild(el);
      }
    }
  });
  // 2.22: переключатели раздела «Оформление и функции» (размер текста, весь экран, звук, разделы) тоже ищутся
  const XSEL = '#settings-tiles :is(.feature-toggle, .ui-size-row, .start-view-row)';
  document.querySelectorAll(XSEL).forEach(el => {
    if (!words.length) { el.classList.remove('search-hidden'); return; }
    const txt = settingsSearchNorm(el.textContent);
    const ok = words.every(w => txt.includes(w) || (SETTINGS_ALIASES[w] || []).some(a => txt.includes(a)));
    el.classList.toggle('search-hidden', !ok);
    if (ok && getComputedStyle(el).display !== 'none') shown++;
  });
  document.querySelectorAll('#settings-tiles .settings-group').forEach(g => {
    const any = Array.from(g.querySelectorAll('.settings-tile, .feature-toggle, .ui-size-row, .start-view-row')).some(tl2 => !tl2.classList.contains('search-hidden') && getComputedStyle(tl2).display !== 'none');
    g.classList.toggle('search-hidden', words.length > 0 && !any);
  });
  document.getElementById('settings-search-empty').style.display = words.length && !shown ? '' : 'none';
  document.getElementById('view-settings').classList.toggle('settings-searching', words.length > 0);
  applySettingsCat();
}
document.getElementById('settings-search').addEventListener('input', runSettingsSearch);
document.getElementById('settings-search').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.target.value = ''; runSettingsSearch(); }
  if (e.key === 'Enter') { const first = Array.from(document.querySelectorAll('#settings-tiles .settings-tile.search-hit')).find(x => getComputedStyle(x).display !== 'none'); if (first) first.click(); }
});

// 2.26: открыли раздел из результатов поиска — окно само прокручивается к найденному месту и подсвечивает его.
function settingsSearchLocate(modal, words) {
  const has = (txt, w) => txt.includes(w) || (SETTINGS_ALIASES[w] || []).some(a => txt.includes(a));
  const cand = Array.from(modal.querySelectorAll('label, summary, h3, h4, b, .hint, .settings-subtitle, .cardart-subheading, .feature-toggle, .selfreg-mode-opt, p'))
    .filter(el => el.offsetParent !== null && el.textContent.trim().length < 400);
  const hit = cand.find(el => words.every(w => has(settingsSearchNorm(el.textContent), w))) || cand.find(el => words.some(w => has(settingsSearchNorm(el.textContent), w)));
  if (!hit) return;
  const det = hit.closest('details'); if (det && !det.open) det.open = true;
  // Подсвечиваем весь блок, где нашлось слово (поле, карточку настройки), а не одно слово.
  let box = hit.closest('.settings-row, .selfreg-settings-box, .promo-section, .sr-logo-row, label, details, .feature-toggle') || hit;
  const mw = (modal.querySelector('.modal') || modal).getBoundingClientRect().width;
  while (box.parentElement && !box.parentElement.classList.contains('modal') && box.getBoundingClientRect().width < mw * 0.4) box = box.parentElement;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  box.classList.remove('search-flash'); void box.offsetWidth; box.classList.add('search-flash');
  setTimeout(() => box.classList.remove('search-flash'), 2600);
}
document.getElementById('settings-tiles').addEventListener('click', (e) => {
  const tile = e.target.closest('.settings-tile.search-hit'); if (!tile || !tile.dataset.modal) return;
  const words = settingsSearchNorm(document.getElementById('settings-search').value.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return;
  setTimeout(() => { const m = document.getElementById(tile.dataset.modal); if (m && m.style.display !== 'none') settingsSearchLocate(m, words); }, 380);
});

// ---------- трей: настройка и открытие вкладки из меню значка ----------
async function loadTraySetting() { const st = await window.api.getSettings(); const c = document.getElementById('set-close-to-tray'); if (c) c.checked = st.close_to_tray !== '0'; }
document.getElementById('set-close-to-tray').addEventListener('change', async (e) => {
  const st = await window.api.getSettings();
  await window.api.saveSettings({ ...st, close_to_tray: e.target.checked ? '1' : '0' });
});
if (window.api.onTrayOpenView) window.api.onTrayOpenView((view) => { const b = document.querySelector(`.nav-btn[data-view="${view}"]`); if (b && getComputedStyle(b).display !== 'none') b.click(); });
loadTraySetting();

// ---------- выбор языка флажком (узкое меню) ----------
const LANG_FLAGS = {
  uk: '<svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#0057b7"/><rect y="10" width="30" height="10" fill="#ffd700"/></svg>',
  sk: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#ee1c25"/><rect width="30" height="13.33" fill="#0b4ea2"/><rect width="30" height="6.67" fill="#fff"/><path d="M7.2 4.6h7.6v6.2c0 2.6-1.9 4.1-3.8 4.9-1.9-.8-3.8-2.3-3.8-4.9z" fill="#fff"/><path d="M8 5.3h6v5.5c0 2.1-1.5 3.3-3 4-1.5-.7-3-1.9-3-4z" fill="#ee1c25"/><path d="M10.6 6.4h.8v1.5h1.6v.8h-1.6v1.1h2v.8h-2v2.6h-.8v-2.6h-2v-.8h2V8.7H9v-.8h1.6z" fill="#fff"/><path d="M8.6 12.6c.7-.8 1.5-.8 2.4 0 .9-.8 1.7-.8 2.4 0-.5 1-1.4 1.6-2.4 2.1-1-.5-1.9-1.1-2.4-2.1z" fill="#0b4ea2"/></svg>',
  en: '<svg viewBox="0 0 60 30"><clipPath id="lgb"><path d="M0 0v30h60V0z"/></clipPath><g clip-path="url(#lgb)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" stroke-width="2.4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  ru: '<span class="lang-code">RU</span>'
};
const LANG_NAMES = { ru: 'Русский', uk: 'Українська', sk: 'Slovenčina', en: 'English' };
function syncLangFlag() {
  const b = document.getElementById('lang-flag-btn'); if (!b) return;
  b.innerHTML = `<span class="lang-flag">${LANG_FLAGS[getLang()] || LANG_FLAGS.ru}</span>`;
}
function closeLangPop() { const p = document.getElementById('lang-pop'); if (p) p.remove(); }
document.getElementById('lang-flag-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (document.getElementById('lang-pop')) { closeLangPop(); return; }
  const r = e.currentTarget.getBoundingClientRect();
  const pop = document.createElement('div'); pop.id = 'lang-pop'; pop.className = 'lang-pop';
  pop.innerHTML = ['uk', 'sk', 'en', 'ru'].map(l => `<button type="button" data-l="${l}" class="${l === getLang() ? 'active' : ''}"><span class="lang-flag">${LANG_FLAGS[l]}</span><span>${LANG_NAMES[l]}</span></button>`).join('');
  document.body.appendChild(pop);
  const ph = pop.offsetHeight;
  pop.style.left = (r.right + 10) + 'px';
  pop.style.top = Math.max(8, Math.min(window.innerHeight - ph - 8, r.bottom - ph)) + 'px';
  pop.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    closeLangPop();
    if (btn.dataset.l === getLang()) return;
    langSelect.value = btn.dataset.l; langSelect.dispatchEvent(new Event('change'));
  }));
});
document.addEventListener('click', (e) => { if (!e.target.closest || !e.target.closest('#lang-pop')) closeLangPop(); });
window.addEventListener('resize', closeLangPop);

// ---------- конструктор дизайна ----------
const THEME_PRESETS = {
  glossy: { primary: '#e2b54a', sidebar: '#030303', screen: '#060606', text: '#f6eedb', dark: true, glossy: true, surface: '#0f0e0c',
    chartVisits: '#e2b54a', chartNewClients: '#c9963c', chartCardUsage: '#9c8a5e', chartRewards: '#f4d47c' },
  gold: { primary: '#d4af37', sidebar: '#0d0f14', screen: '#0b0d12', text: '#f0ece0', dark: true,
    chartVisits: '#d4af37', chartNewClients: '#c17f3e', chartCardUsage: '#8a9a6b', chartRewards: '#e6c251' },
  coffee: { primary: '#9c5f2a', sidebar: '#2b1d15', screen: '#f5f4f2', text: '#241c1c',
    chartVisits: '#a9682f', chartNewClients: '#6b8f4e', chartCardUsage: '#4a7fa6', chartRewards: '#c9a227' },
  mint: { primary: '#2f9e6a', sidebar: '#14261f', screen: '#f1f7f3', text: '#1c2b23',
    chartVisits: '#2f9e6a', chartNewClients: '#3f7d94', chartCardUsage: '#a67c3f', chartRewards: '#7f9e2f' },
  ocean: { primary: '#2f6fa9', sidebar: '#14212b', screen: '#f0f5f8', text: '#1c2530',
    chartVisits: '#2f6fa9', chartNewClients: '#2f9ea0', chartCardUsage: '#8f6fa9', chartRewards: '#a98f2f' },
  berry: { primary: '#a9306f', sidebar: '#2b1420', screen: '#f8f0f4', text: '#2b1420',
    chartVisits: '#a9306f', chartNewClients: '#8f4ea9', chartCardUsage: '#a97a4e', chartRewards: '#4ea992' },
  graphite: { primary: '#585858', sidebar: '#1c1c1c', screen: '#f2f2f2', text: '#232323',
    chartVisits: '#6b6b6b', chartNewClients: '#8a6b4e', chartCardUsage: '#4e7a8a', chartRewards: '#8a7a4e' }
};

// «Как в системе»: светлая тема днём, тёмная — когда в Windows/Android включён тёмный режим.
const THEME_AUTO_LIGHT = 'coffee', THEME_AUTO_DARK = 'gold';
const autoThemePreset = () => THEME_PRESETS[window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_AUTO_DARK : THEME_AUTO_LIGHT];
const themePresetByName = (name) => (name === 'auto' ? autoThemePreset() : THEME_PRESETS[name]);

function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return {
    r: parseInt(n.substring(0, 2), 16),
    g: parseInt(n.substring(2, 4), 16),
    b: parseInt(n.substring(4, 6), 16)
  };
}
function toHex(v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }

// Смешивает цвет с чёрным (amount < 0, затемнение) или с белым (amount > 0, осветление).
function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => amount >= 0 ? c + (255 - c) * amount : c * (1 + amount);
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// Контраст по WCAG: цвет текста на кнопках темы выбираем сами — иначе на золотом (светлом) или
// сером фоне белый/тёмный текст становился почти нечитаемым.
function relLum(hex) { const { r, g, b } = hexToRgb(hex); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function contrastRatio(a, b) { const l1 = relLum(a), l2 = relLum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
// Кнопки рисуются градиентом «цвет → оттенок для наведения». Под БЕЛЫЙ текст оттенок темнее, под ТЁМНЫЙ — почти
// тот же, чтобы текст читался на обоих концах. Возвращает цвет текста и подходящий цвет наведения.
function pickOnColor(primary) {
  let best = null;
  for (const [on, amount] of [['#ffffff', -0.15], ['#14110a', -0.05]]) {
    const hover = shade(primary, amount);
    const score = Math.min(contrastRatio(on, primary), contrastRatio(on, hover));
    if (!best || score > best.score) best = { on, hover, score };
  }
  return best;
}

// Цвет темы, когда им написан ТЕКСТ (ссылки, активные вкладки): на тёмном фоне осветляем, на светлом
// затемняем — пока контраст не станет достаточным (на светлых темах текст ещё и на подкрашенном фоне).
function pickTextColor(primary, dark) {
  const surface = dark ? '#171b26' : '#ffffff', target = dark ? 6 : 6.5;
  let c = primary;
  for (let i = 0; i < 14 && contrastRatio(c, surface) < target; i++) c = shade(c, dark ? 0.08 : -0.07);
  return c;
}

// colors: { primary, sidebar, screen, text, chartVisits, chartNewClients, chartCardUsage, chartRewards }
function applyTheme(colors) {
  const root = document.documentElement.style;
  root.setProperty('--color-primary', colors.primary);
  const onPick = pickOnColor(colors.primary);
  root.setProperty('--color-primary-hover', onPick.hover);
  root.setProperty('--color-on-primary', onPick.on);
  root.setProperty('--color-primary-text', pickTextColor(colors.primary, !!colors.dark));
  // Рамки и заливка кнопок-«карточек»: заметно отличаются от фона окна и на тёмных, и на светлых темах.
  root.setProperty('--ctl-ring', colors.dark ? 'rgba(255,255,255,0.24)' : 'rgba(20,14,8,0.26)');
  root.setProperty('--ctl-fill', colors.dark ? 'rgba(255,255,255,0.065)' : 'rgba(20,14,8,0.045)');
  root.setProperty('--ctl-ring-hover', colors.primary);
  root.setProperty('--color-danger', colors.dark ? '#fca5a5' : '#b91c1c');
  const primaryRgb = hexToRgb(colors.primary);
  root.setProperty('--color-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
  root.setProperty('--color-sidebar-bg', colors.sidebar);
  root.setProperty('--color-sidebar-hover', shade(colors.sidebar, 0.15));
  root.setProperty('--color-sidebar-border', shade(colors.sidebar, 0.12));
  root.setProperty('--color-sidebar-input-bg', shade(colors.sidebar, 0.08));
  root.setProperty('--color-sidebar-input-border', shade(colors.sidebar, 0.28));
  root.setProperty('--color-bg-screen', colors.screen);
  root.setProperty('--color-text', colors.text);
  root.setProperty('--chart-color-visits', colors.chartVisits);
  root.setProperty('--chart-color-newclients', colors.chartNewClients);
  root.setProperty('--chart-color-cardusage', colors.chartCardUsage);
  root.setProperty('--chart-color-rewards', colors.chartRewards);
  root.setProperty('--surface-color', colors.surface || (colors.dark ? '#171b26' : '#ffffff'));
  root.setProperty('--surface-border', colors.dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,14,8,0.06)');
  document.body.classList.toggle('theme-dark', !!colors.dark);
  document.body.classList.toggle('theme-glossy', !!colors.glossy);
}

function fillCustomThemeInputs(colors) {
  document.getElementById('theme-primary-color').value = colors.primary;
  document.getElementById('theme-sidebar-color').value = colors.sidebar;
  document.getElementById('theme-screen-color').value = colors.screen;
  document.getElementById('theme-text-color').value = colors.text;
  document.getElementById('theme-chart-visits').value = colors.chartVisits;
  document.getElementById('theme-chart-newclients').value = colors.chartNewClients;
  document.getElementById('theme-chart-cardusage').value = colors.chartCardUsage;
  document.getElementById('theme-chart-rewards').value = colors.chartRewards;
}

function readCustomThemeInputs() {
  return {
    primary: document.getElementById('theme-primary-color').value,
    sidebar: document.getElementById('theme-sidebar-color').value,
    screen: document.getElementById('theme-screen-color').value,
    text: document.getElementById('theme-text-color').value,
    chartVisits: document.getElementById('theme-chart-visits').value,
    chartNewClients: document.getElementById('theme-chart-newclients').value,
    chartCardUsage: document.getElementById('theme-chart-cardusage').value,
    chartRewards: document.getElementById('theme-chart-rewards').value
  };
}

function themeSettingsPayload(themeName, colors) {
  return {
    theme_name: themeName,
    theme_primary: colors.primary,
    theme_sidebar: colors.sidebar,
    theme_screen: colors.screen,
    theme_text: colors.text,
    theme_chart_visits: colors.chartVisits,
    theme_chart_newclients: colors.chartNewClients,
    theme_chart_cardusage: colors.chartCardUsage,
    theme_chart_rewards: colors.chartRewards
  };
}

function highlightThemeSwatch(themeName) {
  document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('active', b.dataset.theme === themeName));
}

async function initTheme() {
  const s = await window.api.getSettings();
  const themeName = s.theme_name || 'gold';
  if (themeName === 'custom' && s.theme_primary && s.theme_sidebar) {
    const colors = {
      primary: s.theme_primary, sidebar: s.theme_sidebar,
      screen: s.theme_screen || '#f5f4f2', text: s.theme_text || '#241c1c',
      chartVisits: s.theme_chart_visits || s.theme_primary,
      chartNewClients: s.theme_chart_newclients || '#6b8f4e',
      chartCardUsage: s.theme_chart_cardusage || '#4a7fa6',
      chartRewards: s.theme_chart_rewards || '#c9a227'
    };
    applyTheme(colors);
    fillCustomThemeInputs(colors);
  } else {
    const preset = themePresetByName(themeName) || THEME_PRESETS.coffee;
    applyTheme(preset);
    fillCustomThemeInputs(preset);
  }
  highlightThemeSwatch(themeName);
}
// Сменился режим системы — тема «Как в системе» перекрашивается сразу (меню сотрудника со своей темой не трогаем).
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const s = await window.api.getSettings();
    if (s.theme_name === 'auto' && !staffThemeActive) initTheme();
  });
} catch (e) { /* старый движок */ }

document.querySelectorAll('.theme-swatch').forEach(btn => {
  btn.addEventListener('click', async () => {
    const themeName = btn.dataset.theme;
    highlightThemeSwatch(themeName);
    const customBox = document.getElementById('theme-custom-box');
    if (themeName === 'custom') {
      customBox.style.display = 'block';
      return;
    }
    customBox.style.display = 'none';
    const preset = themePresetByName(themeName);
    applyTheme(preset);
    fillCustomThemeInputs(preset);
    const current = await window.api.getSettings();
    await window.api.saveSettings({ ...current, ...themeSettingsPayload(themeName, preset) });
  });
});

document.getElementById('btn-apply-custom-theme').addEventListener('click', async () => {
  const colors = readCustomThemeInputs();
  applyTheme(colors);
  const current = await window.api.getSettings();
  await window.api.saveSettings({ ...current, ...themeSettingsPayload('custom', colors) });
});

// Возвращает код локали Intl для текущего языка приложения (для форматирования дат).
function localeCode() {
  if (getLang() === 'sk') return 'sk-SK';
  if (getLang() === 'uk') return 'uk-UA';
  if (getLang() === 'en') return 'en-GB';
  return 'ru-RU';
}

function formatDateTime(sqlDate) {
  if (!sqlDate) return '';
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z');
  return d.toLocaleString(localeCode(), { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString(localeCode(), { day: 'numeric', month: 'long' });
}

function formatDateDM(sqlDate) {
  if (!sqlDate) return '';
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString(localeCode(), { day: '2-digit', month: '2-digit' });
}

// ---------- накопительная карта: хелперы ----------
// Карта без цели (spend_target пустой/0) — «только учёт трат»: бонуса нет, сумма копится.
// ---------- 2.17: бонусы накопительной карты ----------
function spendBonusBoxHtml(card) {
  if (!card || card.type !== 'spend' || !(Number(card.spend_target) > 0)) return '';
  const bal = Math.round(Number(card.bonus_balance) || 0);
  const pts = Math.max(1, Math.round(Number(card.spend_bonus_points) || 1));
  return `<div class="bonus-box" data-card-id="${Number(card.id)}"><div class="bonus-box-main"><span class="bonus-box-n">⭐ ${bal}</span><span class="bonus-box-t">${escapeHtml(t('bonusBalanceWord')(bal))}<small>${escapeHtml(t('bonusRule')(moneyFmt(card.spend_target), pts))}</small></span></div>
    <button type="button" class="btn-secondary btn-redeem-bonus" data-card-id="${Number(card.id)}" ${bal > 0 ? '' : 'disabled'}>${escapeHtml(t('bonusRedeemBtn'))}</button></div>`;
}
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest && ev.target.closest('.btn-redeem-bonus');
  if (!b || b.disabled) return;
  const cardId = Number(b.dataset.cardId);
  const card = await window.api.cardById(cardId);
  const bal = Math.round(Number(card && card.bonus_balance) || 0);
  if (!bal) return;
  const v = await uiPrompt(t('bonusRedeemAsk')(bal), '1', { type: 'number', inputmode: 'numeric' });
  if (v === null || v === false || v === undefined) return;
  const r = await window.api.redeemBonus(cardId, v);
  if (r && r.error) { uiAlert(r.error === 'not_enough' ? t('bonusNotEnough')(r.balance) : t('bonusBadCount')); return; }
  if (soundEnabled) playBeep('reward');
  document.querySelectorAll(`.bonus-box[data-card-id="${cardId}"]`).forEach(box => { box.outerHTML = spendBonusBoxHtml(r.card); });
  document.querySelectorAll('.cm-visual').forEach(el => { if (document.querySelector(`.bonus-box[data-card-id="${cardId}"]`)) el.innerHTML = loyaltyCardVisualHtml(r.card, null); });
  showUndoToastLike(t('bonusUsedToast')(r.used, r.balance));
});
function updateSpendRuleHint() {
  const el = document.getElementById('nc-spend-rule'); if (!el) return;
  const target = Number(document.getElementById('nc-spend-target').value) || 0;
  const pts = Math.max(1, Math.round(Number(document.getElementById('nc-spend-points').value) || 1));
  el.textContent = target > 0 ? t('bonusRuleExample')(moneyFmt(target * 4), moneyFmt(target), pts, pts * 4) : '';
}
['nc-spend-target', 'nc-spend-points'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', updateSpendRuleHint); });
setTimeout(updateSpendRuleHint, 500);

function spendHasBonus(card) { return Number(card && card.spend_target) > 0; }
function fmtMoney(v) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// ---------- уровни клиентов ----------
// 2.19: пороги и привилегии настраиваются (Настройки → Уровни и бонусы); по умолчанию 50 и 100 покупок.
let tierCfg = { silver: 50, gold: 100, on: false, perks: { basic: { mult: 1, disc: 0 }, silver: { mult: 1, disc: 0 }, gold: { mult: 1, disc: 0 } } };
async function loadTierCfg() { try { tierCfg = await window.api.tiersConfig(); } catch (e) { /* по умолчанию */ } }
loadTierCfg();
function tierFromCount(n) {
  if (n >= tierCfg.gold) return 'gold';
  if (n >= tierCfg.silver) return 'silver';
  return 'basic';
}
function tierPerkText(tier) {
  const p = tierCfg.on && tierCfg.perks[tier]; if (!p) return '';
  return [p.mult > 1 ? t('tierPerkMult')(p.mult) : '', p.disc > 0 ? t('tierPerkDisc')(p.disc) : ''].filter(Boolean).join(' · ');
}
function tierEmoji(tier) {
  return tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉';
}
function tierRangeText(tier) {
  const base = tier === 'gold' ? t('tierRange2Gold')(tierCfg.gold) : tier === 'silver' ? t('tierRange2Silver')(tierCfg.silver, tierCfg.gold - 1) : t('tierRange2Basic')(tierCfg.silver - 1);
  const perk = tierPerkText(tier);
  return perk ? `${base} · ${perk}` : base;
}
function tierProgressText(count) {
  if (count >= tierCfg.gold) return t('tierMaxLevel');
  if (count >= tierCfg.silver) return t('tierProgressToGold')(tierCfg.gold - count);
  return t('tierProgressToSilver')(tierCfg.silver - count);
}
function tierProgressPercent(count) {
  if (count >= tierCfg.gold) return 100;
  if (count >= tierCfg.silver) return Math.round(((count - tierCfg.silver) / (tierCfg.gold - tierCfg.silver)) * 100);
  return Math.round((count / tierCfg.silver) * 100);
}

function historyLine(entry) {
  if (entry.result === 'gift') return t('historyGift')(moneyFmt(entry.amount_spent || 0));
  if (entry.result === 'discount' || entry.card_type === 'discount') {
    return t('historyDiscount');
  }
  if (entry.result === 'reward') return t('historyReward');
  return t('historyStamp')(entry.stamp_count_at ?? '?', entry.card_stamp_target ?? '?');
}

// ---------- навигация ----------
const navButtons = document.querySelectorAll('.nav-btn');
let currentView = 'dashboard';

function refreshActiveView() {
  if (currentView === 'dashboard') refreshDashboard();
  if (currentView === 'clients') refreshClients();
  if (currentView === 'newcard') refreshClientSelect();
  if (currentView === 'marketing') refreshMarketing();
  if (currentView === 'inventory') refreshInventory();
  if (currentView === 'scan') refreshScanClientCards();
  if (currentView === 'settings') { renderSetupChecklist(); if (typeof renderVenuePanel === 'function') renderVenuePanel(true).catch(() => {}); }
  if (currentOpenCardId) openCardModal(currentOpenCardId);
}

// Живое обновление: если данные поменялись из-за скана (или другого действия) с телефона,
// главный процесс присылает сигнал — просто перерисовываем то, что сейчас на экране,
// без необходимости переключать вкладки туда-обратно.
window.api.onRemoteDataChanged(() => {
  refreshActiveView();
});

// ---------- всплывающая карточка гостя при скане с телефона ----------
// Телефон сканирует — здесь, в правом нижнем углу, всплывает аккуратная карточка клиента
// с тем, что отмечено и сколько осталось. Несколько сканов подряд складываются стопкой
// (не больше 3), каждая исчезает сама через 9 секунд; наведение мыши придерживает её.
const REMOTE_TOAST_MS = 9000;
function remoteScanToast(payload) {
  const { method, result } = payload || {};
  if (!result) return;
  let cls = 'ok', text, card = result.card;
  if (result.error === 'not_found') { cls = 'err'; text = t('rsNotFound'); card = null; }
  else if (result.error === 'free_limit') { cls = 'err'; text = t('freeLimit_scan')(licenseMode ? licenseMode.limits : { clients: 10 }); }
  else if (result.error === 'too_soon') { cls = 'err'; text = t('rsTooSoon'); }
  else if (result.error === 'expired') { cls = 'err'; text = t('rsExpired'); }
  else if (result.error === 'already_used') { cls = 'err'; text = t('rsUsed'); }
  else if (result.error === 'gift_empty') { cls = 'err'; text = t('giftEmpty'); }
  else if (result.error === 'gift_expired') { cls = 'err'; text = t('giftExpired'); }
  else if (method === 'redeemGift') { if (!result.ok) return; text = t('giftRedeemed')(moneyFmt(result.amount), moneyFmt(result.balance)); }
  else if (result.type === 'gift') { cls = 'wait'; text = t('giftWait')(moneyFmt(card.gift_balance || 0)); }
  else if (method === 'addSpendAmount') {
    cls = result.reward ? 'reward' : 'ok';
    text = result.reward ? t('rsSpendReward')(escapeHtml(result.bonusText) || t('spendDefaultBonus')) + ' · ' + t('bonusEarnedShort')(result.earned || 0, Math.round(result.bonusBalance || 0)) : t('rsSpendAdded')(moneyFmt(result.accumulated));
  } else if (result.type === 'discount') text = t('rsDiscount')(card.discount_percent);
  else if (result.type === 'stamp' && result.reward) { cls = 'reward'; text = t('rsReward'); }
  else if (result.type === 'stamp') text = t('rsStamp')(card.stamp_count, card.stamp_target) + (result.bonusMultiplier > 1 ? ' · ×' + result.bonusMultiplier : '');
  else if (result.type === 'spend') { cls = 'wait'; text = t('rsWaitAmount'); }
  if (!text) return;
  if (soundEnabled) playBeep(cls === 'err' ? 'error' : cls === 'reward' ? 'reward' : 'ok');

  let stack = document.getElementById('remote-scan-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'remote-scan-stack';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  // Одна карта — одна всплывашка: ввод суммы обновляет уже показанную, а не плодит новую.
  if (card) stack.querySelectorAll(`.rs-toast[data-card="${card.id}"]`).forEach(el => el.remove());
  const toast = document.createElement('div');
  toast.className = `rs-toast rs-${cls}`;
  if (card) toast.dataset.card = card.id;
  const icon = cls === 'reward' ? '🎁' : cls === 'err' ? '!' : cls === 'wait' ? '…' : '✓';
  toast.innerHTML = `
    <div class="rs-head">
      <span class="rs-ic">${icon}</span>
      <span class="rs-text"><span class="rs-kicker">📱 ${t('rsTitle')}${card ? ' · ' + escapeHtml(card.client_name || '') : ''}</span><b>${text}</b></span>
      <button type="button" class="rs-close" aria-label="×">×</button>
    </div>
    ${card ? `<div class="rs-card">${loyaltyCardVisualHtml(card, card.id)}</div>` : ''}
    <div class="rs-timer"><i></i></div>`;
  stack.prepend(toast);
  while (stack.children.length > 3) stack.lastElementChild.remove();

  let left = REMOTE_TOAST_MS, startedAt = Date.now(), timer = null;
  const bar = toast.querySelector('.rs-timer i');
  const close = () => { toast.classList.add('rs-out'); setTimeout(() => toast.remove(), 250); };
  const run = () => {
    startedAt = Date.now();
    bar.style.transition = `width ${left}ms linear`;
    requestAnimationFrame(() => { bar.style.width = '0%'; });
    timer = setTimeout(close, left);
  };
  toast.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    left -= Date.now() - startedAt;
    const w = bar.getBoundingClientRect().width / bar.parentElement.getBoundingClientRect().width * 100;
    bar.style.transition = 'none'; bar.style.width = w + '%';
  });
  toast.addEventListener('mouseleave', run);
  toast.querySelector('.rs-close').addEventListener('click', close);
  if (card) {
    toast.querySelector('.rs-card .lcard').addEventListener('click', () => { openClientProfile(card.client_id); close(); });
    toast.querySelector('.rs-card .lcard').title = t('rsOpenProfile');
  }
  run();

  // Если открыта вкладка «Сканирование» — там тоже показываем все карты этого клиента.
  if (card && currentView === 'scan') showScanClientCards(card.client_id, card.id);
}
window.api.onRemoteScan(remoteScanToast);

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!roleCanView(btn.dataset.view)) return;
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    currentView = btn.dataset.view;
    if (currentView === 'dashboard') refreshDashboard();
    if (currentView === 'clients') refreshClients();
    if (currentView === 'newcard') refreshClientSelect();
    if (currentView === 'scan') { if (!document.body.classList.contains('phone-ui')) document.getElementById('scan-manual-input').focus(); loadPhoneScanQr(); refreshScanPromoBanner(); }
    if (currentView === 'campaigns') refreshCampaignSegments();
    if (currentView === 'marketing') refreshMarketing();
    if (currentView === 'inventory') refreshInventory();
    if (currentView === 'settings') { renderSetupChecklist(); renderSettingsCats(); }
    // Настройки теперь открываются как плитки → мини-окна; загрузка данных
    // происходит по клику на конкретную плитку (см. блок ниже), а не при открытии вкладки.
  });
});

// ---------- простые bar-графики (без сторонних библиотек) ----------
function renderBarChart(containerId, data) {
  const el = document.getElementById(containerId);
  if (!data.length || data.every(d => d.value === 0)) {
    el.innerHTML = emptyMiniHtml(t('noChartData'));
    return;
  }
  const max = Math.max(1, ...data.map(d => d.value));
  el.innerHTML = `<div class="bar-chart">${data.map(d => `
    <div class="bar-col">
      <div class="bar-value">${d.value}</div>
      <div class="bar-fill" style="height:${Math.max(2, Math.round((d.value / max) * 100))}%"></div>
      <div class="bar-label">${d.label}</div>
    </div>
  `).join('')}</div>`;
}

function fillDailySeries(rows, days) {
  const map = {};
  rows.forEach(r => { map[r.day] = r.n; });
  const result = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // местная дата, как в базе
    const label = d.toLocaleDateString(localeCode(), { day: '2-digit', month: '2-digit' });
    result.push({ label, value: map[key] || 0 });
  }
  return result;
}

function fillMonthlySeries(rows, months) {
  const map = {};
  rows.forEach(r => { map[r.ym] = r.n; });
  const result = [];
  const today = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(localeCode(), { month: 'short' });
    result.push({ label, value: map[key] || 0 });
  }
  return result;
}

// ---------- Dashboard ----------
// Рисует донат-график через SVG (без сторонних библиотек) — сегменты как последовательные
// дуги окружности со сдвигом stroke-dashoffset. Работает с любой темой оформления, цвета
// сегментов передаются явно.
function renderDonutChart(svgId, segments, centerLabel, centerSub) {
  const svg = document.getElementById(svgId);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 50, cx = 60, cy = 60, strokeWidth = 16;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  let html = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" class="donut-track" stroke-width="${strokeWidth}"/>`;
  if (total > 0) {
    segments.forEach(seg => {
      if (seg.value <= 0) return;
      const frac = seg.value / total;
      const dash = Math.max(0, frac * circumference - 1.5); // маленький зазор между сегментами
      html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round"/>`;
      offset += frac * circumference;
    });
  }
  html += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" class="donut-center-value">${centerLabel}</text>`;
  html += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-sub">${centerSub}</text>`;
  svg.innerHTML = html;
}

function renderClientActivityDonut(stats, adv) {
  const total = stats.totalClients || 0;
  const newCount = adv.newClientsThisMonth || 0;
  const inactiveCount = (adv.inactiveClients || []).length;
  const activeCount = Math.max(0, total - newCount - inactiveCount);

  const segments = [
    { key: 'returning', value: activeCount, color: 'var(--chart-color-visits)' },
    { key: 'new', value: newCount, color: 'var(--chart-color-newclients)' },
    { key: 'inactive', value: inactiveCount, color: '#c9c2b8' }
  ];
  renderDonutChart('client-activity-donut', segments, total, t('statClients'));

  const pct = (v) => total > 0 ? Math.round((v / total) * 100) : 0;
  const legendItems = [
    { key: 'returning', label: t('donutReturning'), value: activeCount },
    { key: 'new', label: t('donutNewThisMonth'), value: newCount },
    { key: 'inactive', label: t('donutInactive'), value: inactiveCount }
  ];
  document.getElementById('client-activity-legend').innerHTML = legendItems.map(item => `
    <div class="donut-legend-row">
      <span class="donut-legend-dot" style="background:${segments.find(s => s.key === item.key).color}"></span>
      <span class="donut-legend-label">${item.label}</span>
      <span class="donut-legend-value">${pct(item.value)}%</span>
    </div>
  `).join('');
}

// ---------- эта неделя / прошлая ----------
function weekChange(cur, prev) {
  if (!prev && !cur) return { txt: '—', cls: 'flat' };
  if (!prev) return { txt: t('wkNew'), cls: 'up' };
  const p = Math.round((cur - prev) / prev * 100);
  return { txt: (p > 0 ? '▲ +' : p < 0 ? '▼ ' : '') + p + '%', cls: p > 0 ? 'up' : p < 0 ? 'down' : 'flat' };
}
async function refreshWeekCompare() {
  const box = document.getElementById('wk-grid'); if (!box || !window.api.weekComparison) return;
  let w; try { w = await window.api.weekComparison(); } catch (e) { return; }
  if (!w || !w.current || !w.previous) { box.innerHTML = ''; return; }
  const c = w.current, p = w.previous;
  const rows = [
    ['visits', '🔁', c.visits, p.visits, false], ['clients', '👥', c.clients, p.clients, false], ['newClients', '🌱', c.newClients, p.newClients, false],
    ['rewards', '🎁', c.rewards, p.rewards, false], ['revenue', '💶', c.revenue, p.revenue, true], ['avgCheck', '🧾', c.avgCheck, p.avgCheck, true]
  ];
  if (c.receipts || p.receipts) rows.push(['sales', '🏪', c.sales, p.sales, true]);
  box.innerHTML = rows.map(([k, ic, cur, prev, money]) => {
    const ch = weekChange(cur, prev);
    const fmt = (v) => money ? `${fmtMoney(v)} ${currencySymbol()}` : String(v);
    return `<div class="wk-cell"><div class="wk-label">${ic} ${escapeHtml(t('wk_' + k))}</div><div class="wk-val">${escapeHtml(fmt(cur))}</div>
      <div class="wk-sub"><span class="wk-ch wk-${ch.cls}">${escapeHtml(ch.txt)}</span><span class="wk-prev">${escapeHtml(t('wkWas'))} ${escapeHtml(fmt(prev))}</span></div></div>`;
  }).join('');
}

// ---------- отдача от рассылок ----------
let roiDays = 7;
function roiTitle(x) {
  if (x.kind === 'auto') return t('roiAuto_' + x.rule) || x.rule;
  if (x.kind === 'winback') return t('roiWinback');
  if (x.kind === 'birthday') return t('roiBirthday');
  return x.title || '—';
}
let roiOpen = null, roiSort = 'date';
async function refreshCampaignRoi() {
  const box = document.getElementById('mk-roi'); if (!box || !window.api.campaignReport) return;
  const st = await window.api.getSettings();
  document.getElementById('roi-days').innerHTML = [7, 14, 30].map(d => `<button type="button" class="roi-day ${d === roiDays ? 'active' : ''}" data-d="${d}">${escapeHtml(t('roiDays')(d))}</button>`).join('') +
    `<select id="roi-sort" class="roi-sort"><option value="date">${escapeHtml(t('roiSortDate'))}</option><option value="rate">${escapeHtml(t('roiSortRate'))}</option><option value="revenue">${escapeHtml(t('roiSortRevenue'))}</option></select>` +
    `<label class="roi-rc">${escapeHtml(t('roiRewardCost'))} <input type="text" inputmode="decimal" id="roi-reward-cost" value="${escapeHtml(st.reward_cost || '')}" placeholder="—"> ${escapeHtml(currencySymbol())}</label>`;
  document.getElementById('roi-sort').value = roiSort;
  document.getElementById('roi-sort').addEventListener('change', (e) => { roiSort = e.target.value; refreshCampaignRoi(); });
  document.getElementById('roi-reward-cost').addEventListener('change', async (e) => { const v = e.target.value.trim(); const n = parseMoneyInput(v); await window.api.saveSettings({ ...(await window.api.getSettings()), reward_cost: v === '' ? '' : String(Math.max(0, isNaN(n) ? 0 : n)) }); refreshCampaignRoi(); });
  document.querySelectorAll('#roi-days .roi-day').forEach(b => b.addEventListener('click', () => { roiDays = Number(b.dataset.d); refreshCampaignRoi(); }));
  let r; try { r = await window.api.campaignReport(roiDays); } catch (e) { return; }
  if (!r || !Array.isArray(r.items)) r = { items: [], baselineRate: null };
  if (!r.items.length) { box.innerHTML = `<div class="mk-todo-empty">${escapeHtml(t('roiEmpty'))}</div>`; return; }
  const items = r.items.slice();
  if (roiSort === 'rate') items.sort((a, b) => b.rate - a.rate); else if (roiSort === 'revenue') items.sort((a, b) => b.revenue - a.revenue);
  const best = Math.max(...items.filter(x => x.recipients >= 3 && !x.inProgress).map(x => x.rate), 0);
  const base = r.baselineRate;
  const money = (v) => v == null ? '—' : `${fmtMoney(v)} ${currencySymbol()}`;
  const pct = (v) => String(v).replace('.', getLang() === 'en' ? '.' : ',') + '%';
  box.innerHTML = (base !== null ? `<div class="roi-base">${escapeHtml(t('roiBaseline')(roiDays, base))}</div>` : '') +
    `<div class="roi-row roi-row-head"><span>${escapeHtml(t('roiColMail'))}</span><span class="num">${escapeHtml(t('roiColSent'))}</span><span class="num">${escapeHtml(t('roiColBack'))}</span><span>${escapeHtml(t('roiColRate'))}</span><span class="num">${escapeHtml(t('roiColRevenue'))}</span></div>` +
    items.map(x => {
      const lift = base !== null && !x.inProgress && x.recipients >= 3 ? (x.rate >= base + 5 ? 'good' : x.rate < base - 5 ? 'weak' : '') : '';
      const date = x.kind === 'auto' ? t('roiLast90') : (x.createdAt ? new Date(String(x.createdAt).replace(' ', 'T') + 'Z').toLocaleDateString(getLang() === 'en' ? 'en-GB' : getLang()) : '');
      const open = roiOpen === x.key;
      const m = (label, val, note, cls) => `<div class="roi-m ${cls || ''}"><span>${escapeHtml(label)}</span><b>${escapeHtml(String(val))}</b>${note ? `<small>${escapeHtml(note)}</small>` : ''}</div>`;
      const detail = !open ? '' : `<div class="roi-detail">
        <div class="roi-mgrid">
          ${x.sent !== undefined ? m(t('roiM_sent'), x.sent + (x.failed ? ' · ' + t('roiM_failed')(x.failed) : ''), t('roiM_sentNote')) : ''}
          ${m(t('roiM_returned'), `${x.returned} / ${x.recipients}`, t('roiM_observed'), 'obs')}
          ${m(t('roiM_visits'), x.visits, t('roiM_observed'), 'obs')}
          ${m(t('roiM_purchases'), x.purchases, t('roiM_observed'), 'obs')}
          ${m(t('roiM_revenue'), money(x.revenue), t('roiM_revenueNote'), 'obs')}
          ${m(t('roiM_rewards'), x.rewards, t('roiM_confirmed'), 'conf')}
          ${m(t('roiM_rewardsCost'), money(x.rewardsCost), x.rewardsCost == null ? t('roiM_needRewardCost') : t('roiM_rewardsCostNote'), '')}
          ${m(t('roiM_extra'), x.extraEstimate == null ? '—' : x.extraEstimate, t('roiM_extraNote'), 'est')}
          ${m(t('roiM_net'), money(x.revenueMinusCosts), t('roiM_netNote'), '')}
        </div>
        ${x.id ? `<label class="roi-cost">${escapeHtml(t('roiM_cost'))} <input type="text" inputmode="decimal" class="roi-cost-input" data-id="${x.id}" value="${x.cost == null ? '' : x.cost}" placeholder="0"> ${escapeHtml(currencySymbol())}</label>` : ''}
        <div class="roi-disclaimer">${escapeHtml(t('roiDisclaimer'))}</div></div>`;
      return `<div class="roi-row roi-click ${x.rate === best && best > 0 && !x.inProgress && x.recipients >= 3 ? 'roi-best' : ''} ${open ? 'roi-open' : ''}" data-key="${escapeHtml(x.key)}" role="button" tabindex="0">
        <span class="roi-name"><b>${escapeHtml(roiTitle(x))}</b><small>${escapeHtml(date)} · ${escapeHtml((x.channels || '').replace('email', 'Email').replace('telegram', 'Telegram'))}${x.inProgress ? ' · ' + escapeHtml(t('roiInProgress')) : ''}${x.avgDays != null ? ' · ' + escapeHtml(t('roiAvgDays')(x.avgDays)) : ''}</small></span>
        <span class="num">${x.recipients}</span><span class="num"><b>${x.returned}</b></span>
        <span class="roi-rate"><span class="roi-bar"><i style="width:${Math.min(100, x.rate)}%"></i></span><b class="${lift ? 'roi-' + lift : ''}">${pct(x.rate)}</b></span>
        <span class="num">${x.revenue ? escapeHtml(money(x.revenue)) : '—'}</span></div>${detail}`;
    }).join('');
  box.querySelectorAll('.roi-click').forEach(row => {
    const toggle = () => { roiOpen = roiOpen === row.dataset.key ? null : row.dataset.key; refreshCampaignRoi(); };
    row.addEventListener('click', toggle); row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
  box.querySelectorAll('.roi-cost-input').forEach(inp => {
    inp.addEventListener('click', (e) => e.stopPropagation());
    inp.addEventListener('change', async () => { const raw = inp.value.trim(), n = parseMoneyInput(raw); if (raw && isNaN(n)) { flashBadInput(inp); return; } const r2 = await window.api.setCampaignCost(Number(inp.dataset.id), raw ? String(n) : ''); if (r2 && r2.ok) refreshCampaignRoi(); });
  });
}

// ---------- карточка клиента после скана ----------
async function renderScanInsight(clientId) {
  const box = document.getElementById('scan-insight'); if (!box || !window.api.clientInsight) return;
  let x; try { x = await window.api.clientInsight(clientId); } catch (e) { x = null; }
  if (!x || !x.name || lastScanClientId !== clientId) { if (!x || !x.name) box.style.display = 'none'; return; }
  x.topItems = Array.isArray(x.topItems) ? x.topItems : [];
  const chips = [];
  if (x.isNew) chips.push(`<span class="si-chip si-new">🌱 ${escapeHtml(t('siNew'))}</span>`);
  if (x.birthdayInDays === 0) chips.push(`<span class="si-chip si-bday">🎂 ${escapeHtml(t('siBirthdayToday'))}</span>`);
  else if (x.birthdayInDays != null) chips.push(`<span class="si-chip si-bday">🎂 ${escapeHtml(t('siBirthdaySoon')(x.birthdayInDays))}</span>`);
  if (x.daysSinceLast != null && x.avgGapDays && x.daysSinceLast > x.avgGapDays * 2 && x.daysSinceLast >= 14) chips.push(`<span class="si-chip si-back">👋 ${escapeHtml(t('siWelcomeBack'))}</span>`);
  const stat = (v, l) => `<div class="si-stat"><b>${escapeHtml(String(v))}</b><span>${escapeHtml(l)}</span></div>`;
  const last = x.daysSinceLast == null ? t('siFirstVisit') : x.daysSinceLast === 0 ? t('siToday') : t('siDaysAgo')(x.daysSinceLast);
  box.innerHTML = `<div class="si-head"><div class="si-avatar">${escapeHtml((x.name || '?').trim().charAt(0).toUpperCase())}</div><div class="si-who"><b>${escapeHtml(x.name)}</b><div class="si-chips">${chips.join('')}</div></div></div>
    <div class="si-stats">${stat(x.visits, t('siVisits'))}${stat(last, t('siLastVisit'))}${x.avgGapDays ? stat(t('siEvery')(Math.round(x.avgGapDays)), t('siRhythm')) : ''}${x.spentTotal ? stat(fmtMoney(x.spentTotal) + ' ' + currencySymbol(), t('siSpent')) : ''}</div>
    ${x.topItems.length ? `<div class="si-usual"><span>🛍 ${escapeHtml(t('siUsually'))}</span>${x.topItems.map(i => `<span class="si-item">${escapeHtml(i.name)} <em>×${escapeHtml(String(i.qty).replace('.', ','))}</em></span>`).join('')}</div>` : ''}
    ${x.notes ? `<div class="si-notes">📝 ${escapeHtml(x.notes)}</div>` : ''}`;
  box.style.display = '';
}

// «Требует внимания»: короткий список дел на сегодня из всех разделов программы.
async function refreshAttention() {
  const box = document.getElementById('attn-list'); if (!box) return;
  let inv = {}, online = {}, flags = [];
  try { [inv, online, flags] = await Promise.all([window.api.invSummary ? window.api.invSummary() : {}, window.api.onlineInfo ? window.api.onlineInfo() : {}, window.api.clientsWithFlags()]); } catch (e) { /* часть данных недоступна */ }
  const st = (online && online.stats) || {};
  const near = (flags || []).filter(c => c.isNearReward).length, risk = (flags || []).filter(c => c.isAtRisk).length;
  const items = [];
  if (!features.inventory) inv.low = 0;
  if (!features.pos) inv.pending = 0;
  if (inv.low > 0) items.push({ ic: '📦', cls: 'warn', text: t('attnLow')(inv.low), btn: t('attnOpen'), go: () => { document.querySelector('.nav-btn[data-view="inventory"]').click(); setTimeout(() => { invTab = 'products'; const c = document.getElementById('inv-low'); c.checked = true; refreshInventory(); }, 60); } });
  if (inv.pending > 0) items.push({ ic: '🧾', cls: 'info', text: t('attnPending')(inv.pending), btn: t('attnOpen'), go: () => { document.querySelector('.nav-btn[data-view="inventory"]').click(); setTimeout(() => { invTab = 'receipts'; refreshInventory(); }, 60); } });
  if (st.expiringSoon > 0) items.push({ ic: '⏳', cls: 'warn', text: t('attnBonusSoon')(st.expiringSoon) });
  if (near > 0) items.push({ ic: '🎯', cls: 'good', text: t('attnNear')(near), btn: t('attnWrite'), go: () => jumpToCampaignSegment('near') });
  if (risk > 0) items.push({ ic: '⚠️', cls: 'warn', text: t('attnRisk')(risk), btn: t('attnWrite'), go: () => jumpToCampaignSegment('risk') });
  box.innerHTML = items.length ? items.map((x, i) => `<div class="attn-item attn-${x.cls}"><span class="attn-ic">${x.ic}</span><span class="attn-text">${escapeHtml(x.text)}</span>${x.btn ? `<button type="button" class="attn-btn" data-i="${i}">${escapeHtml(x.btn)} →</button>` : ''}</div>`).join('')
    : `<div class="attn-ok">✨ ${escapeHtml(t('attnAllGood'))}</div>`;
  box.querySelectorAll('.attn-btn').forEach(b => b.addEventListener('click', () => items[Number(b.dataset.i)].go()));
}


// ---------- v2.23: шапка Главной и строки активности ----------
// Пустые состояния: значок, заголовок, подсказка и (по желанию) кнопка — вместо серой строки «нет данных».
function emptyStateHtml(icon, fallback, title, sub, actionHtml, compact) {
  return `<div class="empty-state${compact ? ' es-compact' : ''}"><div class="es-ic" aria-hidden="true">${kpiIc(icon, fallback)}</div>
    <div class="es-title">${escapeHtml(title)}</div>${sub ? `<div class="es-sub">${escapeHtml(sub)}</div>` : ''}${actionHtml || ''}</div>`;
}
function emptyMiniHtml(text) { return `<p class="hint empty-mini">${escapeHtml(text)}</p>`; }
function kpiIc(n, fb) { return (window.LoyaIcons && LoyaIcons.icon(n)) || fb; }
function nameHue(name) { let h = 0; for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
function initialsOf(name) { const p = String(name || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
function shortWhen(sqlDate) {
  if (!sqlDate) return '';
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z'), now = new Date();
  const time = d.toLocaleTimeString(localeCode(), { hour: '2-digit', minute: '2-digit' });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return time;
  if (diff === 1) return t('actYesterday') + ' ' + time;
  return d.toLocaleDateString(localeCode(), { day: 'numeric', month: 'short' }) + ' ' + time;
}
function activityRowHtml(entry) {
  const name = entry.client_name || '—';
  let chip = '', chipCls = 'stamp', dots = '';
  if (entry.result === 'reward') { chip = t('actChipReward'); chipCls = 'reward'; }
  else if (entry.result === 'gift') { chip = t('actChipGift'); chipCls = 'reward'; }
  else if (entry.result === 'discount' || entry.card_type === 'discount') { chip = t('actChipDiscount') + (entry.discount_percent ? ` −${entry.discount_percent}%` : ''); chipCls = 'disc'; }
  else {
    const n = Number(entry.stamp_count_at) || 0, tg = Number(entry.card_stamp_target) || 0;
    chip = t('actChipStamp')(n, tg || '?');
    if (tg > 0 && tg <= 16) dots = `<span class="act-dots" aria-hidden="true">${Array.from({ length: tg }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</span>`;
  }
  return `<div class="activity-row act-row">
      <span class="act-ava" style="--h:${nameHue(name)}">${escapeHtml(initialsOf(name))}</span>
      <span class="act-main"><b>${escapeHtml(name)}</b>${dots}</span>
      <span class="act-chip act-${chipCls}">${escapeHtml(chip)}</span>
      <span class="activity-when hint" title="${escapeHtml(formatDateTime(entry.created_at))}">${escapeHtml(shortWhen(entry.created_at))}</span>
    </div>`;
}
function renderDashHero(stats) {
  const h = new Date().getHours();
  const greet = h < 5 ? t('greetEvening') : h < 12 ? t('greetMorning') : h < 18 ? t('greetDay') : t('greetEvening');
  const g = document.getElementById('dash-greet'); if (g) g.textContent = greet;
  const sub = document.getElementById('dash-hero-sub');
  if (sub) {
    const date = new Date().toLocaleDateString(localeCode(), { weekday: 'long', day: 'numeric', month: 'long' });
    // Итоги дня: визиты, новые клиенты, подарки — только то, что уже случилось сегодня.
    const extra = [stats.newClientsToday ? t('dashTodayNew')(stats.newClientsToday) : '', stats.rewardsToday ? t('dashTodayGifts')(stats.rewardsToday) : ''].filter(Boolean);
    sub.innerHTML = `<span>${escapeHtml(date.charAt(0).toUpperCase() + date.slice(1))}</span><span class="dot">·</span><span>${escapeHtml(t('dashTodayScans')(stats.scansToday || 0))}</span>`
      + extra.map(x => `<span class="dot">·</span><span class="dash-today-chip">${escapeHtml(x)}</span>`).join('');
  }
}
document.getElementById('btn-dash-scan').addEventListener('click', () => document.querySelector('.nav-btn[data-view="scan"]').click());
document.getElementById('dash-qsearch').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('dash-qsearch-input').value.trim();
  document.querySelector('.nav-btn[data-view="clients"]').click();
  setTimeout(() => { const inp = document.getElementById('client-search'); if (inp) { inp.value = q; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); } }, 80);
  document.getElementById('dash-qsearch-input').value = '';
});

async function refreshDashboard() {
  try { await refreshDashboardInner(); } finally { applyDashSections(); refreshFreeBannerSoon(); renderHomeStart().catch(() => {}); refreshPointBar().catch(() => {}); }
}
// «Клиентов N из 10» в полосе пробной версии — пересчитываем после изменений, а не раз в минуту.
let freeBannerTimer = null;
function refreshFreeBannerSoon() {
  if (!licenseMode || licenseMode.mode !== 'free') return;
  clearTimeout(freeBannerTimer);
  freeBannerTimer = setTimeout(() => window.api.licenseMode().then(info => { licenseMode = info; renderFreeBanner(); }).catch(() => {}), 400);
}
// Ряд «по дням» за последние N дней (дни без событий — нули) из строк { day: 'YYYY-MM-DD', n }.
function daySeries(rows, days = 14) {
  const map = {}; (rows || []).forEach(r => { map[r.day] = Number(r.n) || 0; });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push(map[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] || 0);
  }
  return out;
}
// Мини-график под цифрой на плитке Главной: линия за 14 дней (сегодня — справа). Пустой ряд не рисуем.
function sparklineSvg(vals) {
  if (!vals || !vals.some(v => v > 0)) return '';
  const W = 120, H = 30, max = Math.max(...vals), step = W / (vals.length - 1);
  const pts = vals.map((v, i) => [+(i * step).toFixed(1), +(H - 3 - (v / max) * (H - 6)).toFixed(1)]);
  const line = pts.map(p => p.join(',')).join(' ');
  return `<div class="kpi-spark-wrap"><svg class="kpi-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(t('kpiSpark14'))}"><title>${escapeHtml(t('kpiSpark14'))}</title>
    <polygon class="ks-area" points="0,${H} ${line} ${W},${H}"/><polyline class="ks-line" points="${line}" vector-effect="non-scaling-stroke"/></svg></div>`;
}
async function refreshDashboardInner() {
  refreshAttention();
  refreshWeekCompare();
  const [stats, birthdays, recent, adv, topClients, topCards, topSpenders, visits, newClientsByMonth, rewards, cardUsage, com, allClientsForNameday] = await Promise.all([
    window.api.getStats(),
    window.api.upcomingBirthdays(14),
    window.api.historyRecent(10),
    window.api.getAdvancedStats(),
    window.api.topClients(5),
    window.api.topCards(5),
    window.api.topSpenders(5),
    window.api.visitsByDay(14),
    window.api.newClientsByMonth(6),
    window.api.rewardsByDay(14),
    window.api.cardUsageByType(),
    window.api.clientOfMonth(window.__comToday),
    window.api.listClients()
  ]);

  renderNamedaySection(allClientsForNameday);
  refreshWeather();
  refreshOverdueClients();
  renderClientActivityDonut(stats, adv);
  refreshAnalyticsExtra();
  refreshTeamReport();

  const comBox = document.getElementById('client-of-month-box');
  // v2.16: клиент месяца — только под конец месяца и в первые дни следующего (см. clients:ofMonth).
  const comLive = com && com.phase !== 'early' && !com.empty;
  comBox.style.display = comLive ? 'flex' : 'none';
  comBox.classList.toggle('com-empty', !comLive);
  comBox.classList.toggle('com-results', !!(com && com.phase === 'results'));
  if (comLive) {
    comBox.dataset.clientId = com.id;
    const monthName = new Date(com.ym + '-15T12:00:00').toLocaleString(getLang() === 'en' ? 'en-GB' : getLang(), { month: 'long' });
    document.querySelector('#client-of-month-box .com-label').textContent = com.phase === 'results' ? t('comResultsLabel')(monthName) : t('comFinalLabel')(com.daysLeft);
    document.getElementById('com-name').textContent = com.name;
    document.getElementById('com-visits').textContent = t('visitsCount')(com.visits) + ' · ' + (com.phase === 'results' ? t('comResultsHint') : t('comFinalHint'));
    document.querySelector('#client-of-month-box .com-gift').style.display = '';
    const congr = document.getElementById('btn-com-congrats');
    if (congr) { congr.style.display = com.hasEmail || com.hasTelegram ? '' : 'none'; congr.dataset.name = com.name; }

    const newBox = document.getElementById('com-gift-new-box');
    const existingBox = document.getElementById('com-gift-existing-box');
    if (com.gift && com.gift.status === 'pending') {
      newBox.style.display = 'none';
      existingBox.style.display = 'flex';
      existingBox.dataset.giftId = com.gift.id;
      document.getElementById('com-gift-existing-text').textContent = t('giftPendingText')(com.gift.gift_text);
      document.getElementById('btn-mark-gift-given').style.display = '';
    } else if (com.gift && com.gift.status === 'given') {
      newBox.style.display = 'none';
      existingBox.style.display = 'flex';
      existingBox.dataset.giftId = '';
      document.getElementById('com-gift-existing-text').textContent = t('giftGivenText')(com.gift.gift_text);
      document.getElementById('btn-mark-gift-given').style.display = 'none';
    } else {
      newBox.style.display = 'flex';
      existingBox.style.display = 'none';
      document.getElementById('com-gift-input').value = '';
    }
  } else {
    comBox.dataset.clientId = '';
  }

  renderDashHero(stats);
  const kpi = (ic, value, label, delta, cls, sub, series) => `
    <div class="kpi-top"><span class="kpi-ic">${ic}</span><span class="stat-label">${label}</span></div>
    <div class="stat-value">${value}</div>
    ${delta ? `<div class="kpi-delta kpi-${cls}">${escapeHtml(delta)}</div>` : ''}${sub ? `<div class="stat-sub">${sub}</div>` : ''}${series ? sparklineSvg(series) : ''}`;
  const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const newClientsRows = Object.entries((allClientsForNameday || []).reduce((acc, c) => {
    if (c.created_at) { const d = new Date(String(c.created_at).replace(' ', 'T') + 'Z'); if (!isNaN(d)) { const k = localDay(d); acc[k] = (acc[k] || 0) + 1; } }
    return acc;
  }, {})).map(([day, n]) => ({ day, n }));
  const plus = (n) => n > 0 ? t('kpiWeekPlus')(n) : t('kpiWeekZero');
  document.getElementById('stat-clients-box').innerHTML = kpi(kpiIc('users', '👥'), stats.totalClients, t('statClients'), plus(stats.newClients7 || 0), (stats.newClients7 || 0) > 0 ? 'up' : 'flat', '', daySeries(newClientsRows));
  document.getElementById('stat-cards-box').innerHTML = kpi(kpiIc('card', '💳'), stats.totalCards, t('statCards'), plus(stats.newCards7 || 0), (stats.newCards7 || 0) > 0 ? 'up' : 'flat',
    `${stats.discountCards} ${t('statDiscountCards')} · ${stats.stampCards} ${t('statStampCards')}`, daySeries(stats.cardsByDay));
  const sc = weekChange(stats.scans7 || 0, stats.scansPrev7 || 0);
  document.getElementById('stat-scans-box').innerHTML = kpi(kpiIc('scan', '📷'), stats.totalScans, t('statScans'), t('kpiScansWeek')(stats.scans7 || 0, stats.scansPrev7 ? sc.txt : ''), sc.cls === 'down' ? 'down' : (stats.scans7 || 0) > 0 ? 'up' : 'flat',
    `${stats.scansToday} ${t('statScansToday')}`, daySeries(visits));
  document.getElementById('stat-rewards-box').innerHTML = kpi(kpiIc('gift', '🎁'), stats.totalRewards, t('statRewards'), plus(stats.rewards7 || 0), (stats.rewards7 || 0) > 0 ? 'up' : 'flat', '', daySeries(rewards));

  const bList = document.getElementById('birthdays-list');
  bList.innerHTML = birthdays.length
    ? birthdays.map(c => `
        <div class="birthday-row">
          <span>${escapeHtml(c.name)}</span>
          <span class="birthday-when">${c.isToday ? t('birthdayToday') : `${formatDateShort(c.birthday)} — ${t('birthdayInDays')(c.daysUntil)}`}</span>
        </div>
      `).join('')
    : `<p class="hint">${t('noBirthdaysUpcoming')}</p>`;
  // «Поздравить всех» отправляет только сегодняшним именинникам — без них кнопка ничего не сделает.
  document.getElementById('btn-congratulate-all').style.display = birthdays.some(c => c.isToday) ? '' : 'none';

  const rList = document.getElementById('recent-activity-list');
  rList.innerHTML = recent.length
    ? recent.map(entry => activityRowHtml(entry)).join('')
    : emptyStateHtml('scan', '📷', t('emptyActivityTitle'), t('emptyActivitySub'), '', true);

  // Продвинутая статистика
  document.getElementById('adv-stat-active-box').innerHTML = `<div class="stat-value">${adv.activeClients}</div><div class="stat-label">${t('statActiveClients')}</div>`;
  document.getElementById('adv-stat-new-box').innerHTML = `<div class="stat-value">${adv.newClientsThisMonth}</div><div class="stat-label">${t('statNewClientsMonth')}</div>`;
  document.getElementById('adv-stat-returning-box').innerHTML = `<div class="stat-value">${adv.returningClients}</div><div class="stat-label">${t('statReturningClients')}</div>`;
  document.getElementById('adv-stat-avgvisits-box').innerHTML = `<div class="stat-value">${adv.avgVisits}</div><div class="stat-label">${t('statAvgVisits')}</div>`;
  document.getElementById('adv-stat-discounts-box').innerHTML = `<div class="stat-value">${adv.discountsUsed}</div><div class="stat-label">${t('statDiscountsUsed')}</div>`;

  // Неактивные клиенты
  const inactiveBox = document.getElementById('inactive-clients-box');
  if (adv.inactiveClients.length > 0) {
    inactiveBox.style.display = 'block';
    document.getElementById('inactive-clients-text').textContent = t('inactiveClientsText')(adv.inactiveClients.length);
    document.getElementById('inactive-clients-list').innerHTML = adv.inactiveClients.map(c => `
      <div class="top-row">
        <span>${escapeHtml(c.name)}</span>
        <span class="hint">${c.last_visit ? formatDateDM(c.last_visit) : t('neverVisited')}</span>
      </div>
    `).join('');
  } else {
    inactiveBox.style.display = 'none';
  }

  // Топ-списки
  const topClientsEl = document.getElementById('top-clients-list');
  topClientsEl.innerHTML = topClients.length
    ? topClients.map((c, i) => `<div class="top-row"><span>${i + 1}. ${escapeHtml(c.name)}</span><span class="hint">${t('visitsCount')(c.visits)}</span></div>`).join('')
    : emptyMiniHtml(t('noChartData'));

  const topCardsEl = document.getElementById('top-cards-list');
  topCardsEl.innerHTML = topCards.length
    ? topCards.map((c, i) => {
        const name = c.type === 'discount' ? `${t('optDiscount')} (-${c.discount_percent}%)` : escapeHtml(c.title || (c.type === 'spend' ? t('chipSpend') : c.type === 'gift' ? t('chipGift') : t('chipStamp')));
        return `<div class="top-row"><span>${i + 1}. ${c.type === 'discount' ? '💳' : c.type === 'spend' ? '💰' : c.type === 'gift' ? '🎁' : '☕'} ${name}</span><span class="hint">${t('usesCount')(c.uses)}</span></div>`;
      }).join('')
    : emptyMiniHtml(t('noChartData'));

  const topSpendersEl = document.getElementById('top-spenders-list');
  topSpendersEl.innerHTML = topSpenders.length
    ? topSpenders.map((c, i) => `<div class="top-row"><span>${i + 1}. ${escapeHtml(c.name)}</span><span class="hint">${moneyFmt(c.total)}</span></div>`).join('')
    : emptyMiniHtml(t('noChartData'));

  // Графики
  renderBarChart('chart-visits', fillDailySeries(visits, 14));
  renderBarChart('chart-new-clients', fillMonthlySeries(newClientsByMonth, 6));
  renderBarChart('chart-rewards', fillDailySeries(rewards, 14));
  renderBarChart('chart-card-usage', [
    { label: t('chartUsageDiscount'), value: cardUsage.discount },
    { label: t('chartUsageStamp'), value: cardUsage.stampAdd },
    { label: t('chartUsageReward'), value: cardUsage.reward }
  ]);
}

// ---------- дополнительная аналитика: выручка, воронка лояльности, тепловая карта ----------
function pctChange(cur, prev) {
  if (!prev) return null;
  return Math.round((cur - prev) / prev * 100);
}

async function refreshAnalyticsExtra() {
  const [rev, revByMonth, heat, funnel] = await Promise.all([
    window.api.revenueStats(), window.api.revenueByMonth(6), window.api.visitHeatmap(90), window.api.loyaltyFunnel()
  ]);
  if (!rev || !funnel || !heat) return;

  const trend = (cur, prev) => {
    const p = pctChange(cur, prev);
    if (p === null) return '';
    return `<div class="stat-trend ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${t('vsPrevMonth')(p)}</div>`;
  };
  const noData = `<div class="stat-sub hint">${t('noRevenueYet')}</div>`;
  document.getElementById('stat-revenue-box').innerHTML =
    `<div class="stat-value">${moneyFmt(rev.monthRevenue)}</div><div class="stat-label">${t('statRevenueMonth')}</div>` +
    (rev.totalChecks ? trend(rev.monthRevenue, rev.prevMonthRevenue) : noData);
  document.getElementById('stat-avgcheck-box').innerHTML =
    `<div class="stat-value">${moneyFmt(rev.avgCheck)}</div><div class="stat-label">${t('statAvgCheck')}</div>` +
    (rev.totalChecks ? trend(rev.avgCheck, rev.prevAvgCheck) : noData);

  renderBarChart('chart-revenue', fillMonthlySeries(revByMonth || [], 6).map(d => ({ ...d, value: Math.round(d.value) })));

  // Воронка: каждая ступень — доля от всех клиентов.
  const steps = [
    { key: 'funnelTotal', n: funnel.total },
    { key: 'funnelFirst', n: funnel.firstVisit },
    { key: 'funnelReturned', n: funnel.returned },
    { key: 'funnelRegular', n: funnel.regular },
    { key: 'funnelRewarded', n: funnel.rewarded }
  ];
  const base = Math.max(1, funnel.total);
  document.getElementById('loyalty-funnel').innerHTML = steps.map((st, i) => {
    const pct = Math.round(st.n / base * 100);
    return `<div class="funnel-row">
      <div class="funnel-label"><span>${t(st.key)}</span><b>${st.n}</b></div>
      <div class="funnel-bar"><i style="width:${Math.max(st.n ? 3 : 0, pct)}%; opacity:${1 - i * 0.13}"></i><span>${funnel.total ? pct + '%' : ''}</span></div>
    </div>`;
  }).join('');

  // Тепловая карта: строки — дни недели с понедельника, столбцы — часы с 7 до 23.
  const el = document.getElementById('visit-heatmap');
  if (!heat.total) { el.innerHTML = emptyMiniHtml(t('noChartData')); return; }
  const hours = [];
  for (let h = 7; h <= 23; h++) hours.push(h);
  // Если посещения бывают и ночью/рано утром — показываем все 24 часа.
  const hasEarly = heat.grid.some(row => row.slice(0, 7).some(v => v > 0));
  const hourList = hasEarly ? [...Array(24).keys()] : hours;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const dayName = (dow) => new Date(2024, 0, 7 + dow).toLocaleDateString(localeCode(), { weekday: 'short' });
  let html = `<div class="heatmap" style="--hm-n:${hourList.length};grid-template-columns: 44px repeat(${hourList.length}, minmax(0, 1fr))">`;
  html += '<span></span>' + hourList.map(h => `<span class="hm-hour">${h}</span>`).join('');
  order.forEach(dow => {
    html += `<span class="hm-day">${dayName(dow)}</span>`;
    hourList.forEach(h => {
      const v = heat.grid[dow][h];
      const a = v ? 0.15 + 0.85 * (v / heat.max) : 0;
      html += `<span class="hm-cell${v ? '' : ' hm-zero'}" style="--a:${a.toFixed(2)}" title="${dayName(dow)} ${h}:00 — ${v}"></span>`;
    });
  });
  html += '</div>';
  el.innerHTML = html;
}

document.getElementById('btn-toggle-activity').addEventListener('click', async () => {
  const recent = await window.api.historyRecent(100);
  const listEl = document.getElementById('activity-modal-list');
  listEl.innerHTML = recent.length
    ? recent.map(entry => `
        <div class="activity-row">
          <span>${escapeHtml(entry.client_name)}</span>
          <span class="activity-what">${historyLine(entry)}</span>
          <span class="activity-when hint">${formatDateTime(entry.created_at)}</span>
        </div>
      `).join('')
    : `<p class="hint">${t('noActivity')}</p>`;
  document.getElementById('activity-modal').style.display = 'flex';
});

document.getElementById('activity-modal-close').addEventListener('click', () => {
  document.getElementById('activity-modal').style.display = 'none';
});
document.getElementById('activity-modal').addEventListener('click', (e) => {
  if (e.target.id === 'activity-modal') e.currentTarget.style.display = 'none';
});

document.getElementById('btn-congratulate-all').addEventListener('click', async () => {
  const statusEl = document.getElementById('congratulate-status');
  const channels = await pickChannels({ kind: 'birthday', marketing: true, title: t('chTitleBirthday') });
  if (!channels) return;
  if (channels.none) { statusEl.textContent = t('congratulateNone'); return; }
  statusEl.textContent = t('congratulateSending');
  await syncMsgImages();
  const res = await window.api.sendBirthdayAll(getLang(), { channels });
  if (res.error === 'pro_only') { statusEl.textContent = ''; showFreeLimit('mail'); return; }
  if (res.error) setErrStatus(statusEl, res.error, t('mailError'));
  else statusEl.textContent = sendResultText(res) || t('congratulateNone');
});

document.getElementById('btn-send-reengagement').addEventListener('click', async () => {
  const statusEl = document.getElementById('reengagement-status');
  const channels = await pickChannels({ kind: 'winback', marketing: true, title: t('chTitleWinback') });
  if (!channels) return;
  if (channels.none) { statusEl.textContent = t('reengagementNone'); return; }
  statusEl.textContent = t('reengagementSending');
  await syncMsgImages();
  const res = await window.api.sendReengagementAll(getLang(), { channels });
  if (res.error === 'pro_only') { statusEl.textContent = ''; showFreeLimit('mail'); return; }
  if (res.error) setErrStatus(statusEl, res.error, t('mailError'));
  else statusEl.textContent = sendResultText(res) || t('reengagementNone');
});

// ---------- модальное окно карты ----------
const modal = document.getElementById('card-modal');
let currentOpenCardId = null;
document.getElementById('modal-close').addEventListener('click', () => { modal.style.display = 'none'; currentOpenCardId = null; });
modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; currentOpenCardId = null; } });

async function loadTelegramLinkBox(clientId) {
  const box = document.getElementById('telegram-link-body');
  try {
    const info = await window.api.telegramGetClientLinkInfo(clientId);
    if (!info.connected) {
      box.innerHTML = t('telegramNotConnectedHint');
      return;
    }
    if (info.linked) {
      box.innerHTML = `
        <p>✅ ${t('telegramClientLinked')}</p>
        <button type="button" id="btn-telegram-unlink-client" class="btn-secondary">${t('btnTelegramUnlinkClient')}</button>
      `;
      document.getElementById('btn-telegram-unlink-client').addEventListener('click', async () => {
        await window.api.telegramDisconnectClient(clientId);
        loadTelegramLinkBox(clientId);
      });
    } else {
      const qr = await window.api.qrDataUrl(info.deepLink, { width: 220 });
      box.innerHTML = `
        <p>${t('telegramNotLinkedHint')}</p>
        <img src="${qr}" alt="Telegram QR" class="telegram-link-qr">
      <p class="hint">${t('telegramScanHint')}</p>
    `;
    }
  } catch (err) {
    box.innerHTML = '';
  }
}

// Закрытие выпадающих меню «Отправить» по клику вне их — подписка одна на всё
// приложение (не пересоздаётся при каждом открытии карточки клиента), ищет актуальные
// меню в DOM на момент клика, поэтому не важно, сколько раз открывалась/закрывалась карточка.
// Закрывает сразу оба возможных меню — и в карточке клиента, и во вкладке "Рассылки".
document.addEventListener('click', () => {
  ['send-dropdown-menu', 'campaign-send-menu'].forEach(id => {
    const menu = document.getElementById(id);
    if (menu) menu.style.display = 'none';
  });
});

async function openCardModal(cardId) {
  currentOpenCardId = cardId;
  const card = await window.api.cardById(cardId);
  const body = document.getElementById('modal-body');

  let progressHtml = '', bonusHtml = '';
  if (card.type === 'stamp') {
    const pct = Math.round((card.stamp_count / card.stamp_target) * 100);
    const remaining = card.stamp_target - card.stamp_count;
    progressHtml = `
      <p>${card.title || ''}</p>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <p>${t('stampProgress')(card.stamp_count, card.stamp_target, remaining)}</p>
    `;
  } else if (card.type === 'spend') {
    const accumulated = card.spend_accumulated || 0;
    if (spendHasBonus(card)) {
      const pct = Math.min(100, Math.round((accumulated / card.spend_target) * 100));
      progressHtml = `
        <p>${card.title || ''}</p>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <p>${t('spendProgress')(fmtMoney(accumulated), fmtMoney(card.spend_target), currencySymbol())}</p>
        ${card.spend_bonus_text ? `<p class="hint">🎁 ${escapeHtml(card.spend_bonus_text)}</p>` : ''}
      `;
      bonusHtml = spendBonusBoxHtml(card);
    } else {
      progressHtml = `
        <p>${card.title || ''}</p>
        <p>${t('spendTotal')(fmtMoney(accumulated), currencySymbol())}</p>
      `;
    }
  } else if (card.type === 'gift') {
    progressHtml = `<p>${t('giftBalanceLine')(moneyFmt(card.gift_balance || 0), moneyFmt(card.gift_amount || 0))}</p>`;
  } else {
    progressHtml = `<p>${t('discountLabel')(card.discount_percent)}</p>`;
  }
  // 2.19: когда сгорят бонусы/штампы (если включено сгорание).
  let expiryHtml = '';
  if (card.type === 'spend' || card.type === 'stamp') {
    try { const ex = await window.api.expiryCard(card.id); if (ex && ex.date) expiryHtml = `<p class="hint cm-expiry">⏳ ${escapeHtml(t('expiryLine')(fmtDateShort(ex.date)))}</p>`; } catch (e) { /* нет данных */ }
  } else if (card.type === 'gift') {
    expiryHtml = `<p class="hint cm-expiry">${escapeHtml(card.expires_at ? t('giftUntil')(fmtDateShort(card.expires_at)) : t('giftNoExpiry'))}</p>`;
  }

  // Окно карты: слева — открытка, которую получает клиент, справа — состояние карты
  // (та же «пластиковая» карта, что на сканировании) и действия.
  body.innerHTML = `
    <div class="cm-layout">
      <div class="cm-left">
        <img id="modal-catcard-img" class="catcard-preview catcard-preview-main" src="" alt="">
      </div>
      <div class="cm-right">
        <div class="cm-head">
          <h2 class="cm-name client-name-link" data-client-id="${card.client_id}">${escapeHtml(card.client_name)}</h2>
          <span class="cm-code">${escapeHtml(card.code)}</span>
        </div>
        <div class="cm-visual">${loyaltyCardVisualHtml(card, null)}</div>
        ${bonusHtml}${expiryHtml}
        <p class="client-total-spent" id="client-total-spent-line" style="display:none"></p>
        <div class="cm-sendrow">
          <div class="send-dropdown-wrap cm-send">
            <button type="button" id="btn-send-toggle" class="cm-primary">${t('btnSendDropdown')} ▾</button>
            <div id="send-dropdown-menu" class="send-dropdown-menu" style="display:none">
              <button type="button" data-channel="email" id="send-opt-email">✉️ ${t('sendChannelEmail')}</button>
              <button type="button" data-channel="telegram" id="send-opt-telegram">✈️ ${t('sendChannelTelegram')}</button>
              <div class="send-dropdown-menu-divider"></div>
              <button type="button" data-channel="both" id="send-opt-both">✉️✈️ ${t('sendChannelBoth')}</button>
            </div>
          </div>
          <label class="cm-lang" title="${escapeHtml(t('emailLangLabel'))}"><span>${t('emailLangLabel')}</span>
            <select id="email-lang-select">
              <option value="uk">UA · Українська</option>
              <option value="sk">SK · Slovenčina</option>
              <option value="en">EN · English</option>
              <option value="ru">RU · Русский</option>
            </select>
          </label>
        </div>
        <div class="cm-actions">
          ${card.type === 'stamp' ? `<button id="btn-mark-manual" class="cm-secondary">✋ ${t('btnMarkManual')}</button>` : ''}
          ${card.type === 'stamp' ? `<button id="btn-cups-reminder" class="cm-secondary">🔔 ${t('btnCupsReminder')}</button>` : ''}
          <button id="btn-download-catcard" class="cm-secondary">🖼 ${t('btnDownloadCatCard')}</button>
          <button id="btn-save-qr" class="cm-secondary">🔳 ${t('btnSaveQr')}</button>
          <button id="btn-print-card" class="cm-secondary">${t('printCardBtn')}</button>
          <button id="btn-wallet-send" class="cm-secondary">${t('walletSendBtn')}</button>
        </div>
        <div id="modal-mail-status" class="hint"></div>
        <div id="gwallet-link-row" style="display:none" hidden>
          <button type="button" id="btn-gwallet-add" class="gwallet-add-btn" hidden>🎟️ ${t('btnAddToGwallet')}</button>
        </div>
        <div class="cm-foot">
          <button type="button" class="cm-tab" data-panel="cm-panel-tg">📱 Telegram</button>
          <button type="button" class="cm-tab" data-panel="cm-panel-hist">🕘 ${t('historyHeading')}</button>
          <button id="btn-delete-card" class="cm-delete" title="${escapeHtml(t('btnDeleteCard'))}">🗑 <span>${t('btnDeleteCard')}</span></button>
        </div>
        <div class="cm-panel" id="cm-panel-tg" hidden><div id="telegram-link-body" class="hint">${t('loading')}</div></div>
        <div class="cm-panel" id="cm-panel-hist" hidden><div id="card-history-list" class="history-list"></div></div>
      </div>
    </div>
  `;
  body.querySelectorAll('.cm-tab').forEach(tb => tb.addEventListener('click', () => {
    const open = tb.classList.contains('active');
    body.querySelectorAll('.cm-tab').forEach(x => x.classList.remove('active'));
    body.querySelectorAll('.cm-panel').forEach(x => { x.hidden = true; });
    if (!open) { tb.classList.add('active'); const pnl = document.getElementById(tb.dataset.panel); pnl.hidden = false; pnl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }));
  body.querySelector('#btn-wallet-send').addEventListener('click', async () => {
    const choice = await uiChoice(t('walletSendTitle'), [
      { key: 'email', label: t('walletViaEmail') }, { key: 'telegram', label: t('walletViaTelegram') }, { key: 'copy', label: t('walletCopy') }]);
    if (!choice) return;
    const res = await window.api.walletSendLink(card.id, choice, getLang());
    if (res.error) { if (res.error === 'wallet_rejected') uiAlert(t('errWalletRejected')(res.detail || '')); else alertErr(res.error); return; }
    if (choice === 'copy') { try { await navigator.clipboard.writeText(res.link); } catch (e) { /* ниже покажем ссылку */ } uiAlert(t('walletCopied')); }
    else uiAlert(t('walletSent'));
  });
  body.querySelector('#btn-print-card').addEventListener('click', async () => {
    document.getElementById('card-modal').style.display = 'none';
    currentOpenCardId = null;
    if (!allClients.length) await refreshClients();
    openPrintModal(card.client_id);
  });
  const nameLink = body.querySelector('.cm-name');
  if (nameLink) nameLink.addEventListener('click', () => { document.getElementById('card-modal').style.display = 'none'; currentOpenCardId = null; openClientProfile(card.client_id); });

  modal.style.display = 'flex'; // показываем окно сразу после заполнения содержимого —
  // остальное (Telegram, генерация открытки) дозагружается асинхронно уже в открытом окне,
  // и если что-то из этого упадёт с ошибкой, само окно с QR-кодом всё равно откроется.

  window.api.getClientTotalSpent(card.client_id).then(total => {
    if (total > 0) {
      const line = document.getElementById('client-total-spent-line');
      if (line) {
        line.textContent = `💰 ${t('clientTotalSpentLabel')}: ${moneyFmt(total)}`;
        line.style.display = 'block';
      }
    }
  }).catch(() => {});

  document.getElementById('email-lang-select').value = card.client_language || getLang();

  let catCardDataUrl = null;
  if (card.type === 'gift') {
    // 2.19: у сертификата своя картинка — номинал, срок и QR (уходит в письме и в Telegram, её же можно распечатать).
    drawGiftCertificate(card, document.getElementById('email-lang-select').value || getLang()).then((u) => { catCardDataUrl = u; document.getElementById('modal-catcard-img').src = u; }).catch(() => {});
  } else pickCatTemplate(card.code, card.client_language || getLang(), currentNicheId, card.card_template_id).then(async (catTemplate) => {
    if (catTemplate && catTemplate.isNewPick) window.api.setCardTemplateId(card.id, catTemplate.id);
    catCardDataUrl = catTemplate
      ? await composeCatCard(card.code, catTemplate, currentBrandName)
      : await window.api.qrDataUrl(card.code, { width: 500, bgColor: '#ffffff' });
    document.getElementById('modal-catcard-img').src = catCardDataUrl;
  });

  document.getElementById('btn-download-catcard').addEventListener('click', async () => {
    if (!catCardDataUrl) return;
    const res = await window.api.saveDataUrlFile(catCardDataUrl, `${card.client_name}-cat-card.png`, t('saveCatCardDialogTitle'));
    if (!res.canceled) uiAlert(t('savedFile') + res.filePath);
  });

  loadTelegramLinkBox(card.client_id);

  // Google Wallet: отдельной кнопки в окне карты нет — ссылка «Добавить в Google Wallet»
  // сама уходит клиенту внутри письма и сообщения в Telegram при отправке карты.

  // ---------- объединённая кнопка «Отправить»: Email / Telegram / оба сразу ----------
  const sendToggleBtn = document.getElementById('btn-send-toggle');
  const sendMenu = document.getElementById('send-dropdown-menu');
  const statusEl = document.getElementById('modal-mail-status');
  const emailOpt = document.getElementById('send-opt-email');
  const telegramOpt = document.getElementById('send-opt-telegram');
  const bothOpt = document.getElementById('send-opt-both');
  const hasEmail = !!card.client_email;
  emailOpt.disabled = !hasEmail;
  if (!hasEmail) emailOpt.title = t('noEmail');
  // Статус привязки Telegram узнаём отдельным (необязательным) запросом — если он вдруг
  // не пройдёт (нет соединения с главным процессом и т.п.), кнопка Email всё равно должна
  // остаться рабочей, поэтому оборачиваем именно эту часть в try/catch.
  let tgLinked = false;
  try {
    const telegramInfo = await window.api.telegramGetClientLinkInfo(card.client_id);
    const hasTelegram = telegramInfo.connected && telegramInfo.linked;
    tgLinked = !!hasTelegram;
    telegramOpt.disabled = !hasTelegram;
    bothOpt.disabled = !(hasEmail && hasTelegram);
    if (!hasTelegram) telegramOpt.title = t('telegramNotLinkedShort');
  } catch (err) {
    telegramOpt.disabled = true;
    bothOpt.disabled = true;
  }

  sendToggleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    // v2.16: «Отправлять сразу везде» — без меню, туда, где клиент есть.
    const st = await window.api.getSettings();
    if (st.send_mode === 'all' && (hasEmail || tgLinked)) { doSend(hasEmail && tgLinked ? 'both' : hasEmail ? 'email' : 'telegram'); return; }
    sendMenu.style.display = sendMenu.style.display === 'block' ? 'none' : 'block';
  });

  async function doSend(channel) {
    sendMenu.style.display = 'none';
    const emailLang = document.getElementById('email-lang-select').value;
    statusEl.textContent = t('mailSending');
    const results = [];
    if (channel === 'email' || channel === 'both') {
      const res = await window.api.sendCardEmail(card.id, emailLang, { width: 400, bgColor: '#ffffff' }, catCardDataUrl || null);
      results.push(res.ok ? `✉️ ${t('mailSent')}` : `✉️ ${t('mailError')}${errText(res.error)}`);
    }
    if (channel === 'telegram' || channel === 'both') {
      const res = await window.api.telegramSendCard(card.id, emailLang, catCardDataUrl || null);
      results.push(res.ok ? `✈️ ${t('mailSent')}` : `✈️ ${t('mailError')}${errText(res.error)}`);
    }
    statusEl.textContent = results.join(' · ');
  }

  emailOpt.addEventListener('click', () => { if (!emailOpt.disabled) doSend('email'); });
  telegramOpt.addEventListener('click', () => { if (!telegramOpt.disabled) doSend('telegram'); });
  bothOpt.addEventListener('click', () => { if (!bothOpt.disabled) doSend('both'); });

  const history = await window.api.historyByCard(card.id);
  const histEl = document.getElementById('card-history-list');
  histEl.innerHTML = history.length
    ? history.map(h => `
        <div class="history-row">
          <span>${h.result === 'reward' ? t('historyReward') : (h.result === 'discount' ? t('historyDiscount') : t('historyStamp')(h.stamp_count_at ?? '?', h.card_stamp_target ?? card.stamp_target))}${h.amount_spent ? ` · 💰 ${h.amount_spent}` : ''}</span>
          <span class="hint">${formatDateTime(h.created_at)}</span>
        </div>
      `).join('')
    : `<p class="hint">${t('noHistory')}</p>`;

  document.getElementById('btn-save-qr').addEventListener('click', async () => {
    const res = await window.api.qrSaveFile(card.code, `${card.client_name}-card.png`, t('saveQrDialogTitle'), { width: 400, bgColor: '#ffffff' });
    if (!res.canceled) uiAlert(t('savedFile') + res.filePath);
  });

  document.getElementById('btn-delete-card').addEventListener('click', async () => {
    if (!canDelete()) { uiAlert(t('noAccessAction')); return; }
    if (!await uiConfirm(t('confirmDeleteCard'), { danger: true })) return;
    const del = await window.api.deleteCard(card.id);
    if (del && del.error === 'no_access') { uiAlert(t('noAccessAction')); return; }
    modal.style.display = 'none';
    refreshClients();
  });

  const markManualBtn = document.getElementById('btn-mark-manual');
  if (markManualBtn) {
    markManualBtn.addEventListener('click', async () => {
      await window.api.markCardManually(card.id);
      openCardModal(card.id);
    });
  }

  const cupsReminderBtn = document.getElementById('btn-cups-reminder');
  if (cupsReminderBtn) {
    cupsReminderBtn.addEventListener('click', async () => {
      const statusEl = document.getElementById('modal-mail-status');
      const emailLang = document.getElementById('email-lang-select').value;
      const mail = await window.api.mailStatus();
      const st = await window.api.getSettings();
      const channels = await pickChannels({ reach: { total: 1, email: hasEmail ? 1 : 0, telegram: tgLinked ? 1 : 0, none: hasEmail || tgLinked ? 0 : 1, unique: 1, mailReady: !!mail.ready, telegramReady: !!st.telegram_bot_token, sendMode: st.send_mode || 'ask' } });
      if (!channels || channels.none) return;
      statusEl.textContent = t('mailSending');
      await syncMsgImages();
      const res = await window.api.sendCupsReminder(card.id, emailLang, { channels });
      if (res.error) setErrStatus(statusEl, res.error, t('mailError')); else statusEl.textContent = sendResultText(res);
    });
  }
}

// ---------- клиенты ----------
// Проверка полей клиента на языке приложения (системные подсказки браузера были бы на языке Windows).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateClientFields({ name, email }, nameEl, emailEl) {
  if (!name) { flashFieldError(nameEl, t('errNameRequired')); return false; }
  if (email && !EMAIL_RE.test(email)) { flashFieldError(emailEl, t('errEmailInvalid')); return false; }
  return true;
}
function flashFieldError(el, text) {
  if (!el) return;
  el.classList.remove('field-error'); void el.offsetWidth; el.classList.add('field-error');
  el.focus();
  let tip = el.parentElement.querySelector(':scope > .field-error-tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'field-error-tip'; el.insertAdjacentElement('afterend', tip); }
  tip.textContent = text;
  const clear = () => { el.classList.remove('field-error'); tip.remove(); el.removeEventListener('input', clear); };
  el.addEventListener('input', clear);
}

document.getElementById('add-client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"], button:not([type])');
  if (submitBtn && submitBtn.disabled) return;
  const name = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const birthday = document.getElementById('c-birthday').value;
  const notes = document.getElementById('c-notes').value.trim();
  const preferredLanguage = document.getElementById('c-language').value;
  const consentEmail = document.getElementById('c-consent-email').checked;
  const consentTelegram = document.getElementById('c-consent-telegram').checked;
  if (!validateClientFields({ name, email }, document.getElementById('c-name'), document.getElementById('c-email'))) return;

  // Защита от двойного нажатия — иначе быстрый двойной клик создаёт двух одинаковых клиентов.
  if (submitBtn) submitBtn.disabled = true;
  try {
    if (phone || email) {
      const dup = await window.api.checkClientDuplicate({ phone, email });
      if (dup.found && !await uiConfirm(t('confirmDuplicateClient')(dup.name))) return;
    }
    const added = await window.api.addClient({ name, email, phone, birthday, notes, preferredLanguage, consentEmail, consentTelegram, consentSource: 'manual' });
    if (added && added.error === 'free_limit') { showFreeLimit(added.limit || 'clients'); return; }
    e.target.reset();
    refreshClients();
    if (typeof added === 'number') setTimeout(() => issueCardFlow(added, name, true), 150);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

let allClients = [];
let allCards = [];
let purchaseCounts = {};

document.getElementById('clients-sort').addEventListener('change', () => renderClientsList());
// Поиск перерисовывает список с небольшой задержкой — при быстром наборе не тормозит.
let clientSearchTimer = null;
document.getElementById('client-search').addEventListener('input', () => {
  clearTimeout(clientSearchTimer);
  clientSearchTimer = setTimeout(renderClientsList, 120);
});
document.getElementById('btn-profile-back').addEventListener('click', () => {
  document.querySelector('[data-view="clients"]').click();
});

let clientFlagsById = {};
let lastClientsListIds = [];
const CLIENTS_PAGE = 60;
let clientsShown = CLIENTS_PAGE;
let clientsListKey = '';
let clientsFilter = 'all';
let tgBotOn = false;   // v2.16: пометка «нет Telegram» — только когда бот подключён
async function refreshClients() {
  refreshFreeBannerSoon();
  const [clients, cards, counts, flags, st] = await Promise.all([
    window.api.listClients(), window.api.listCards(), window.api.purchaseCounts(), window.api.clientsWithFlags(), window.api.getSettings()
  ]);
  tgBotOn = !!(st && st.telegram_bot_token);
  allClients = clients; allCards = cards; purchaseCounts = counts;
  clientFlagsById = {};
  (flags || []).forEach(f => { clientFlagsById[f.id] = f; });
  renderClientsList();
}

// Быстрые фильтры над списком клиентов (с количеством в каждом).
const CLIENT_FILTERS = [
  { key: 'all', label: () => t('fltAll'), test: () => true },
  { key: 'vip', label: () => '🏆 ' + t('segVip'), test: (c, f) => f && f.isVIP },
  { key: 'birthday', label: () => '🎂 ' + t('segBirthday'), test: (c, f) => f && f.isBirthdaySoon },
  { key: 'near', label: () => '🎯 ' + t('segNear'), test: (c, f) => f && f.isNearReward },
  { key: 'risk', label: () => '⚠️ ' + t('segRisk'), test: (c, f) => f && f.isAtRisk },
  { key: 'noemail', label: () => '✉️ ' + t('fltNoEmail'), test: (c) => !c.email }
];

function renderClientsList() {
  const query = document.getElementById('client-search').value.trim().toLowerCase();
  const queryDigits = query.replace(/\D/g, '');
  const listEl = document.getElementById('clients-list');

  // Фильтры — показываем только те, где кто-то есть.
  const filtersEl = document.getElementById('clients-filters');
  const fltCounts = CLIENT_FILTERS.map(f => ({ ...f, n: allClients.filter(c => f.test(c, clientFlagsById[c.id])).length }));
  if (!fltCounts.some(f => f.key === clientsFilter && (f.n || f.key === 'all'))) clientsFilter = 'all';
  filtersEl.innerHTML = fltCounts.filter(f => f.key === 'all' || f.n).map(f =>
    `<button type="button" class="clients-filter ${f.key === clientsFilter ? 'active' : ''}" data-flt="${f.key}">${f.label()} <span>${f.n}</span></button>`).join('');
  filtersEl.querySelectorAll('.clients-filter').forEach(b => b.addEventListener('click', () => { clientsFilter = b.dataset.flt; renderClientsList(); }));

  const fltDef = CLIENT_FILTERS.find(f => f.key === clientsFilter) || CLIENT_FILTERS[0];
  let filtered = allClients.filter(c => fltDef.test(c, clientFlagsById[c.id]));
  if (query) {
    // Поиск ещё и по коду карты и по цифрам телефона без пробелов/плюсов.
    const codeOwners = new Set(allCards.filter(cd => (cd.code || '').toLowerCase().includes(query)).map(cd => cd.client_id));
    filtered = filtered.filter(c =>
      (c.name || '').toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query) ||
      (queryDigits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(queryDigits)) ||
      codeOwners.has(c.id));
  }
  const sort = document.getElementById('clients-sort').value;
  const lastVisit = (c) => { const f = clientFlagsById[c.id]; return f && f.lastVisitAt ? f.lastVisitAt : ''; };
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'recent') return lastVisit(b).localeCompare(lastVisit(a));
    if (sort === 'visits') return (purchaseCounts[b.id] || 0) - (purchaseCounts[a.id] || 0);
    if (sort === 'newest') return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    return String(a.name || '').localeCompare(String(b.name || ''), localeCode(), { sensitivity: 'base' });
  });
  const countEl = document.getElementById('clients-count');
  if (countEl) countEl.textContent = t('clientsCount')(filtered.length, allClients.length);
  lastClientsListIds = filtered.map(c => c.id);

  if (allClients.length === 0) {
    listEl.innerHTML = emptyStateHtml('userPlus', '👥', t('emptyClientsTitle'), t('emptyClientsSub'),
      `<button type="button" class="es-btn" id="btn-empty-add-client">${escapeHtml(t('emptyAddClient'))}</button>`);
    document.getElementById('btn-empty-add-client').addEventListener('click', () => {
      const box = document.querySelector('#view-clients .add-client-box'); if (!box) return;
      box.open = true; box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const inp = box.querySelector('input'); if (inp) setTimeout(() => inp.focus(), 250);
    });
    return;
  }
  if (filtered.length === 0) {
    listEl.innerHTML = emptyStateHtml('search', '🔍', String(t('noSearchResults')).replace(/[.。]$/, ''), t('emptySearchSub'),
      `<button type="button" class="es-btn es-btn-ghost" id="btn-empty-reset-search">${escapeHtml(t('emptyResetSearch'))}</button>`);
    document.getElementById('btn-empty-reset-search').addEventListener('click', () => {
      const inp = document.getElementById('client-search'); if (inp) inp.value = '';
      clientsFilter = 'all'; renderClientsList();
    });
    return;
  }

  // Большие базы (тысячи клиентов): показываем по 60 карточек, остальное — кнопкой
  // «Показать ещё». Карты раскладываем по клиентам один раз, а не перебором для каждого.
  const cardsByClient = {};
  allCards.forEach(card => { (cardsByClient[card.client_id] = cardsByClient[card.client_id] || []).push(card); });
  const listKey = JSON.stringify([query, clientsFilter, sort]);
  if (listKey !== clientsListKey) { clientsListKey = listKey; clientsShown = CLIENTS_PAGE; }
  const visible = filtered.slice(0, clientsShown);
  const rest = filtered.length - visible.length;

  listEl.innerHTML = visible.map(c => {
    const clientCards = cardsByClient[c.id] || [];
    const cardsHtml = renderClientChips(c.id, clientCards);

    const purchaseCount = purchaseCounts[c.id] || 0;
    const tier = tierFromCount(purchaseCount);
    const isNewClient = c.created_at && (Date.now() - new Date(c.created_at.replace(' ', 'T') + 'Z').getTime()) < 14 * 86400000;
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    const initial = (String(c.name || '?').trim().charAt(0) || '?').toUpperCase();
    const meta = [
      c.email ? escapeHtml(c.email) : `<span class="cc-muted">${t('noEmail')}</span>`,
      c.phone ? escapeHtml(c.phone) : '',
      c.birthday ? `🎂 ${formatDateShort(c.birthday)}` : ''
    ].filter(Boolean).map(x => `<span>${x}</span>`).join('');

    return `
      <div class="client-card" data-client-row="${c.id}">
        <div class="cc-head">
          <div class="cc-avatar cc-avatar-${tier}" aria-hidden="true">${escapeHtml(initial)}</div>
          <div class="cc-id">
            <div class="cc-name-row">
              <h3 class="client-name-link" data-client-id="${c.id}">${escapeHtml(c.name)}</h3>
              <span class="cc-pill cc-tier cc-tier-${tier}" title="${tierRangeText(tier)}">${tierEmoji(tier)} ${tierLabel}</span>
              ${isNewClient ? `<span class="cc-pill cc-new">${t('badgeNew')}</span>` : ''}
              ${tgBotOn ? (c.telegram_chat_id ? `<span class="cc-pill cc-tg cc-tg-on" title="${escapeHtml(t('tgLinkedTip'))}">✈️</span>` : `<span class="cc-pill cc-tg cc-tg-off" title="${escapeHtml(t('tgNotLinkedTip'))}">✈️ ${escapeHtml(t('tgNotLinkedBadge'))}</span>`) : ''}
            </div>
            <div class="cc-meta">${meta}</div>
          </div>
          <div class="client-card-actions">
            <button type="button" class="cc-more-btn" aria-haspopup="true" aria-expanded="false" aria-label="${escapeHtml(t('navMore'))}">⋯</button>
            <button class="btn-edit-client" data-client="${c.id}" title="${t('btnEditClient')}" aria-label="${t('btnEditClient')}">✎<span class="cc-act-label">${escapeHtml(t('btnEditClient'))}</span></button>
            <button class="btn-delete-client" data-client="${c.id}" data-name="${escapeHtml(c.name)}" title="${t('btnDeleteClient')}" aria-label="${t('btnDeleteClient')}">🗑<span class="cc-act-label">${escapeHtml(t('btnDeleteClient'))}</span></button>
          </div>
        </div>
        <div class="cc-tier-line">
          <div class="cc-tier-track"><div class="cc-tier-fill" style="width:${tierProgressPercent(purchaseCount)}%"></div></div>
          <span class="cc-tier-text">${tierProgressText(purchaseCount)}</span>
        </div>
        ${c.notes && c.notes.trim() ? `<div class="client-note-preview">📝 ${escapeHtml(c.notes)}</div>` : ''}
        <div class="cc-cards">${cardsHtml}</div>
      </div>
    `;
  }).join('') + (rest > 0 ? `<button type="button" class="clients-more-btn" id="btn-clients-more">${t('showMore')(Math.min(rest, CLIENTS_PAGE), rest)}</button>` : '');
  const moreBtn = document.getElementById('btn-clients-more');
  if (moreBtn) moreBtn.addEventListener('click', () => { clientsShown += CLIENTS_PAGE; renderClientsList(); });

  // Профиль открывается щелчком по всей «шапке» клиента (аватар, имя, телефон), а не только по имени.
  listEl.querySelectorAll('.client-card .cc-head').forEach(head => {
    head.addEventListener('click', (e) => {
      if (e.target.closest('.client-card-actions, button, a, input')) return;
      const link = head.querySelector('.client-name-link');
      if (link) openClientProfile(Number(link.dataset.clientId));
    });
  });

  listEl.querySelectorAll('.mini-card').forEach(el => {
    el.addEventListener('click', () => {
      // Сгруппированные одинаковые скидки и «+N ещё» ведут в профиль, где все карты списком.
      if (el.dataset.openProfile) openClientProfile(Number(el.dataset.openProfile));
      else openCardModal(Number(el.dataset.card));
    });
  });

  listEl.querySelectorAll('.btn-delete-client').forEach(el => {
    el.addEventListener('click', async () => {
      closeClientMenus();
      if (!await uiConfirm(t('confirmDeleteClient')(el.dataset.name), { danger: true })) return;
      if (!(await requirePin())) return;
      scheduleClientDeletion(Number(el.dataset.client), el.dataset.name);
    });
  });

  listEl.querySelectorAll('.btn-edit-client').forEach(el => {
    el.addEventListener('click', () => { closeClientMenus(); toggleEditClient(Number(el.dataset.client)); });
  });
  // Телефон: «Изменить» и «Удалить» спрятаны в меню «⋯», чтобы карточка была компактной.
  listEl.querySelectorAll('.cc-more-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const box = el.closest('.client-card-actions'); const open = !box.classList.contains('cc-menu-open');
      closeClientMenus();
      box.classList.toggle('cc-menu-open', open); el.setAttribute('aria-expanded', String(open));
    });
  });
}
function closeClientMenus() {
  document.querySelectorAll('.client-card-actions.cc-menu-open').forEach(b => { b.classList.remove('cc-menu-open'); const m = b.querySelector('.cc-more-btn'); if (m) m.setAttribute('aria-expanded', 'false'); });
}
document.addEventListener('click', (e) => { if (!e.target.closest('.client-card-actions')) closeClientMenus(); });

// Чипы карт на карточке клиента. Одинаковые скидочные карты (например, 12 штук по -5%)
// сворачиваются в один чип «×12», а если чипов больше лимита — остальные прячутся за «+N ещё».
const CLIENT_CHIPS_LIMIT = 4;
function renderClientChips(clientId, clientCards) {
  if (!clientCards.length) return `<span class="cc-empty">${t('noClientCards')}</span> <button type="button" class="issue-card-btn" data-client="${clientId}">＋ ${t('issueCardBtn')}</button>`;
  const chips = [];
  const discountGroups = {};
  clientCards.forEach(card => {
    if (card.type === 'discount' && card.single_use) {
      chips.push({ kind: 'bonus', card });
    } else if (card.type === 'discount') {
      const key = String(card.discount_percent);
      if (!discountGroups[key]) {
        discountGroups[key] = { cards: [] };
        chips.push({ kind: 'discount', group: discountGroups[key], percent: card.discount_percent });
      }
      discountGroups[key].cards.push(card);
    } else {
      chips.push({ kind: card.type, card });
    }
  });

  const chipHtml = (ch) => {
    if (ch.kind === 'bonus') {
      const c = ch.card;
      const used = c.redeemed_count > 0;
      const expired = !used && c.expires_at && String(c.expires_at).slice(0, 10) < localDateStr();
      const label = used ? t('onlineStatUsed') : (expired ? t('onlineStatExpired') : t('bonusChip')(c.expires_at ? fmtBonusDate(c.expires_at) : ''));
      return `<button type="button" class="mini-card chip chip-discount chip-bonus ${used || expired ? 'chip-off' : ''}" data-card="${c.id}"><span class="chip-val">−${c.discount_percent}%</span><span class="chip-title">${escapeHtml(label)}</span></button>`;
    }
    if (ch.kind === 'discount') {
      const n = ch.group.cards.length;
      const attrs = n > 1
        ? `data-open-profile="${clientId}" title="${t('chipGroupTitle')}"`
        : `data-card="${ch.group.cards[0].id}"`;
      return `<button type="button" class="mini-card chip chip-discount" ${attrs}>
        <span class="chip-val">−${ch.percent}%</span><span class="chip-title">${t('chipDiscount')}</span>${n > 1 ? `<span class="chip-count">×${n}</span>` : ''}
      </button>`;
    }
    const card = ch.card;
    if (card.type === 'gift') {
      const off = !((Number(card.gift_balance) || 0) > 0) || (card.expires_at && String(card.expires_at).slice(0, 10) < localDateStr());
      return `<button type="button" class="mini-card chip chip-gift ${off ? 'chip-off' : ''}" data-card="${card.id}"><span class="chip-val">🎁 ${fmtMoney(card.gift_balance)}${currencySymbol()}</span><span class="chip-title">${escapeHtml(card.title || '') || t('chipGift')}</span></button>`;
    }
    if (card.type === 'spend') {
      const val = spendHasBonus(card)
        ? `${fmtMoney(card.spend_accumulated)}/${fmtMoney(card.spend_target)}${currencySymbol()}`
        : `${fmtMoney(card.spend_accumulated)}${currencySymbol()}`;
      const title = escapeHtml(card.title || '') || (spendHasBonus(card) ? t('chipSpend') : t('chipSpendTrack'));
      return `<button type="button" class="mini-card chip chip-spend" data-card="${card.id}"><span class="chip-val">${val}</span><span class="chip-title">${title}</span></button>`;
    }
    const title = escapeHtml(card.title || '') || t('chipStamp');
    return `<button type="button" class="mini-card chip chip-stamp" data-card="${card.id}"><span class="chip-val">${card.stamp_count}/${card.stamp_target}${Number(card.discount_percent) > 0 ? ` · −${card.discount_percent}%` : ''}</span><span class="chip-title">${title}</span></button>`;
  };

  const visible = chips.slice(0, CLIENT_CHIPS_LIMIT).map(chipHtml).join('');
  const hidden = chips.length - CLIENT_CHIPS_LIMIT;
  const more = hidden > 0
    ? `<button type="button" class="mini-card chip chip-more" data-open-profile="${clientId}" title="${t('chipGroupTitle')}">${t('chipMore')(hidden)}</button>`
    : '';
  return visible + more + `<button type="button" class="cc-add-card issue-card-btn-plus" data-client="${clientId}" title="${escapeHtml(t('issueCardBtn'))}" aria-label="${escapeHtml(t('issueCardBtn'))}">＋</button>`;
}

// Экранирование текста перед вставкой в innerHTML (заметки — произвольный текст пользователя).
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Редактирование клиента — во всплывающем окне (раньше раскрывалось внутри карточки на пол-экрана).
async function toggleEditClient(clientId) {
  const box = document.getElementById('ec-body');
  const c = allClients.find(x => x.id === clientId) || await window.api.getClient(clientId);
  if (!c) return;
  document.getElementById('ec-title').textContent = `✎ ${c.name}`;
  box.innerHTML = `
    <div class="ec-grid">
    <label class="birthday-label"><span>${t('phName')}</span><input type="text" class="edit-name" value="${escapeHtml(c.name)}" placeholder="${t('phName')}"></label>
    <label class="birthday-label"><span>${t('phPhone')}</span><input type="text" class="edit-phone" value="${escapeHtml(c.phone)}" placeholder="${t('phPhone')}"></label>
    <label class="birthday-label"><span>${t('phEmail')}</span><input type="email" class="edit-email" value="${escapeHtml(c.email)}" placeholder="${t('phEmail')}"></label>
    <label class="birthday-label"><span>${t('phBirthday')}</span>
      <input type="date" class="edit-birthday" value="${c.birthday || ''}">
    </label>
    <label class="birthday-label"><span>${t('phNotes')}</span>
      <textarea class="edit-notes" rows="2" placeholder="${NichesModule.getClientNoteExample(currentNicheId, getLang())}">${escapeHtml(c.notes)}</textarea>
    </label>
    <label class="birthday-label"><span>${t('phPreferredLanguage')}</span>
      <select class="edit-language">
        <option value="">${t('langUseAppDefault')}</option>
        <option value="ru">Русский</option>
        <option value="sk">Slovenčina</option>
        <option value="uk">Українська</option>
        <option value="en">English</option>
      </select>
    </label>
    </div>
    <div class="consent-box"><div class="consent-box-title">${t('consentTitle')}</div>
      <label class="segment-check"><input type="checkbox" class="edit-consent-email" ${c.consent_email ? 'checked' : ''}> <span>${t('consentEmailLbl')}</span></label>
      <label class="segment-check"><input type="checkbox" class="edit-consent-telegram" ${c.consent_telegram ? 'checked' : ''}> <span>${t('consentTelegramLbl')}</span></label>
      <label class="segment-check"><input type="checkbox" class="edit-dnc" ${c.do_not_contact ? 'checked' : ''}> <span>${t('consentDnc')}</span></label>
      <div class="hint">${escapeHtml(consentInfo(c))}</div></div>
    <div class="edit-actions">
      <button class="btn-save-edit">${t('btnSaveEdit')}</button>
      <button class="btn-cancel-edit" type="button">${t('btnCancelEdit')}</button>
    </div>
  `;
  box.querySelector('.edit-language').value = c.preferred_language || '';
  lxOpen('lx-editclient');
  setTimeout(() => { const f = box.querySelector('.edit-name'); if (f) f.focus(); }, 30);

  box.querySelector('.btn-cancel-edit').addEventListener('click', () => lxClose('lx-editclient'));

  box.querySelector('.btn-save-edit').addEventListener('click', async () => {
    const nameVal = box.querySelector('.edit-name').value.trim();
    const emailVal = box.querySelector('.edit-email').value.trim();
    if (!validateClientFields({ name: nameVal, email: emailVal }, box.querySelector('.edit-name'), box.querySelector('.edit-email'))) return;
    await window.api.updateClient(clientId, {
      name: nameVal,
      email: emailVal,
      phone: box.querySelector('.edit-phone').value.trim(),
      birthday: box.querySelector('.edit-birthday').value,
      notes: box.querySelector('.edit-notes').value.trim(),
      preferredLanguage: box.querySelector('.edit-language').value,
      consentEmail: box.querySelector('.edit-consent-email').checked,
      consentTelegram: box.querySelector('.edit-consent-telegram').checked,
      doNotContact: box.querySelector('.edit-dnc').checked,
      consentSource: 'manual'
    });
    lxClose('lx-editclient');
    await refreshClients();
    if (currentView === 'profile') openClientProfile(clientId);
  });
}

// ---------- профиль клиента ----------
async function openClientProfile(clientId) {
  currentView = 'profile';
  navButtons.forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-profile').classList.add('active');

  const client = allClients.find(c => c.id === clientId) || await window.api.getClient(clientId);
  // 2.20: профиль открывается и из «Записей»/отзывов — когда список карт ещё не загружен, берём карты гостя из базы.
  let cards = allCards.filter(c => c.client_id === clientId);
  if (!cards.length) { try { cards = await window.api.cardsByClient(clientId) || []; } catch (e) { cards = []; } }
  const [stats, history, referrals] = await Promise.all([
    window.api.clientStats(clientId),
    window.api.historyByClient(clientId, 15),
    window.api.referralCount(clientId)
  ]);
  const tier = stats.tier;

  const cardsHtml = cards.length
    ? cards.map(card => {
        if (card.type === 'discount') {
          return `<div class="profile-card-row" data-card="${card.id}">
            <div class="profile-card-row-top"><span>💳 ${t('optDiscount')}</span><span class="badge-discount">-${card.discount_percent}%</span></div>
          </div>`;
        }
        if (card.type === 'spend') {
          const title = escapeHtml(card.title || '') || (spendHasBonus(card) ? t('chipSpend') : t('chipSpendTrack'));
          if (!spendHasBonus(card)) {
            return `<div class="profile-card-row" data-card="${card.id}">
              <div class="profile-card-row-top"><span>💰 ${title}</span><span class="badge-spend">${t('spendTotal')(fmtMoney(card.spend_accumulated), currencySymbol())}</span></div>
            </div>`;
          }
          const spendPct = Math.min(100, Math.round(((card.spend_accumulated || 0) / card.spend_target) * 100));
          return `<div class="profile-card-row" data-card="${card.id}">
            <div class="profile-card-row-top"><span>💰 ${title}</span><span class="badge-spend">${fmtMoney(card.spend_accumulated)} / ${fmtMoney(card.spend_target)}${currencySymbol()}</span></div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${spendPct}%"></div></div>
          </div>`;
        }
        if (card.type === 'gift') {
          const amt = Number(card.gift_amount) || 0, bal = Number(card.gift_balance) || 0;
          return `<div class="profile-card-row" data-card="${card.id}">
            <div class="profile-card-row-top"><span>🎁 ${escapeHtml(card.title || '') || t('chipGift')}</span><span class="badge-spend">${fmtMoney(bal)} / ${fmtMoney(amt)}${currencySymbol()}</span></div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${amt ? Math.round(bal / amt * 100) : 0}%"></div></div>
          </div>`;
        }
        const pct = Math.round((card.stamp_count / card.stamp_target) * 100);
        return `<div class="profile-card-row" data-card="${card.id}">
          <div class="profile-card-row-top"><span>☕ ${card.title || ''}</span><span class="badge-stamp">${card.stamp_count} / ${card.stamp_target}</span></div>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')
    : `<p class="hint">${t('noClientCards')}</p>`;

  const historyHtml = history.length
    ? history.map(h => {
        let label;
        if (h.result === 'gift') label = t('historyGift')(moneyFmt(h.amount_spent || 0));
        else if (h.result === 'discount') label = t('historyDiscount');
        else if (h.result === 'reward') label = t('historyReward');
        else label = t('historyPurchaseNum')(h.stamp_count_at ?? '?');
        return `<div class="history-row"><span class="hint">${formatDateDM(h.created_at)}</span><span>${label}</span></div>`;
      }).join('')
    : `<p class="hint">${t('noPurchasesYet')}</p>`;

  // Профиль в стиле приложения: шапка с аватаром и статистикой, карты — «пластиковые»,
  // история — отдельной панелью.
  const initial = (String(client.name || '?').trim().charAt(0) || '?').toUpperCase();
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const visualCards = cards.length
    ? `<div class="pf-cards">${groupDiscountCards(cards).map(g => loyaltyCardVisualHtml(g.card, null, g.count)).join('')}</div>`
    : `<p class="hint">${t('noClientCards')}</p>`;
  document.getElementById('profile-content').innerHTML = `
    <div class="pf-header">
      <div class="pf-id">
        <div class="cc-avatar cc-avatar-${tier} pf-avatar">${escapeHtml(initial)}</div>
        <div class="pf-id-text">
          <div class="pf-name-row">
            <h1>${escapeHtml(client.name)}</h1>
            <span class="cc-pill cc-tier cc-tier-${tier}" title="${tierRangeText(tier)}">${tierEmoji(tier)} ${tierLabel}</span>
          </div>
          <div class="pf-meta">
            ${client.email ? `<span>📧 ${escapeHtml(client.email)}</span>` : ''}
            ${client.phone ? `<span>📱 ${escapeHtml(client.phone)}</span>` : ''}
            ${client.birthday ? `<span>🎂 ${formatDateShort(client.birthday)}</span>` : ''}
          </div>
          <div class="cc-tier-line pf-tier-line">
            <div class="cc-tier-track"><div class="cc-tier-fill" style="width:${tierProgressPercent(stats.totalPurchases)}%"></div></div>
            <span class="cc-tier-text">${tierProgressText(stats.totalPurchases)}</span>
          </div>
        </div>
      </div>
      <div class="pf-stats">
        <div class="pf-stat"><b>${stats.totalPurchases}</b><span>${t('profileTotalPurchases')('').replace(/[:\s]+$/, '')}</span></div>
        <div class="pf-stat"><b>${stats.totalRewards}</b><span>${t('profileTotalRewards')('').replace(/[:\s]+$/, '')}</span></div>
        ${referrals ? `<div class="pf-stat"><b>${referrals}</b><span>${t('profileReferrals')('').replace(/[:\s]+$/, '')}</span></div>` : ''}
      </div>
    </div>
    ${client.notes && client.notes.trim() ? `<div class="profile-note pf-note">📝 ${escapeHtml(client.notes)}</div>` : ''}

    <div class="pf-columns">
      <div class="pf-panel">
        <h2>${t('profileCardsHeading')}</h2>
        ${visualCards}
      </div>
      <div class="pf-panel">
        <h2>${t('profileHistoryHeading')}</h2>
        <div class="history-list profile-history-list">${historyHtml}</div>
      </div>
    </div>
    <div class="pf-actions-row"><div class="pf-actions pf-grow" id="pf-grow" data-act="sendCards"></div>
    <div class="pf-actions" data-act="clientDelete"><button type="button" class="btn-secondary" id="pf-merge">🔗 ${escapeHtml(t('mergeBtn'))}</button></div></div>
  `;
  const mb = document.getElementById('pf-merge');
  if (mb) mb.addEventListener('click', () => openMergeDialog(client));
  if (window.growProfileHook) window.growProfileHook(client);   // 2.20: пригласить друга, попросить отзыв

  document.querySelectorAll('#profile-content .lcard').forEach(el => {
    el.addEventListener('click', () => openCardModal(Number(el.dataset.card)));
  });
  document.querySelectorAll('#profile-content .profile-card-row').forEach(el => {
    el.addEventListener('click', () => openCardModal(Number(el.dataset.card)));
  });
}

// ---------- 2.18: объединение дублей клиента ----------
async function openMergeDialog(client) {
  let m = document.getElementById('lx-merge');
  if (!m) { m = document.createElement('div'); m.id = 'lx-merge'; m.className = 'lx-modal'; m.style.display = 'none'; document.body.appendChild(m); }
  const dups = await window.api.clientDuplicates(client.id).catch(() => []);
  const all = await window.api.listClients();
  const row = (c) => `<button type="button" class="mg-row" data-id="${c.id}"><span class="mg-av">${escapeHtml((c.name || '?').trim().charAt(0).toUpperCase())}</span><span class="mg-t"><b>${escapeHtml(c.name)}</b><small>${escapeHtml([c.phone, c.email].filter(Boolean).join(' · ') || '—')}</small></span>${c.score ? `<span class="mg-hint">${escapeHtml(t('mergeLikely'))}</span>` : ''}</button>`;
  m.innerHTML = `<div class="lx-box mg-box"><div class="lx-head"><b>🔗 ${escapeHtml(t('mergeTitle'))}</b><button type="button" class="lx-close" id="mg-x">✕</button></div>
    <p class="choose-text">${escapeHtml(t('mergeIntro')(client.name))}</p>
    ${dups.length ? `<div class="mg-sub">${escapeHtml(t('mergeSuggested'))}</div><div class="mg-list">${dups.map(row).join('')}</div>` : ''}
    <input type="search" id="mg-q" class="mg-q" placeholder="${escapeHtml(t('mergeSearchPh'))}" autocomplete="off">
    <div class="mg-list" id="mg-res"></div></div>`;
  const close = () => { m.style.display = 'none'; };
  document.getElementById('mg-x').addEventListener('click', close);
  const pickHandler = (root) => root.querySelectorAll('.mg-row').forEach(b => b.addEventListener('click', async () => {
    const other = all.find(c => c.id === Number(b.dataset.id)) || dups.find(c => c.id === Number(b.dataset.id));
    if (!other) return;
    const ok = await uiDialog({ icon: '🔗', text: t('mergeConfirm')(client.name, other.name), okText: t('mergeOk'), cancelText: t('dlgCancel') });
    if (!ok) return;
    const r = await window.api.clientMerge(client.id, other.id);
    if (r && r.ok) { close(); showUndoToastLike(t('mergeDone')(other.name, client.name)); refreshClients(); refreshDashboard(); openClientProfile(client.id); }
    else uiAlert(r && r.error === 'no_access' ? t('noAccessAction') : t('netRemoteErr'));
  }));
  pickHandler(m);
  const q = document.getElementById('mg-q'), res = document.getElementById('mg-res');
  const norm = (v) => String(v || '').toLowerCase();
  q.addEventListener('input', () => {
    const v = norm(q.value.trim()); const d = v.replace(/\D/g, '');
    if (v.length < 2) { res.innerHTML = ''; return; }
    const found = all.filter(c => c.id !== client.id && (norm(c.name).includes(v) || norm(c.email).includes(v) || (d.length >= 3 && String(c.phone || '').replace(/\D/g, '').includes(d)))).slice(0, 12);
    res.innerHTML = found.map(row).join('') || `<p class="hint">${escapeHtml(t('mergeNone'))}</p>`;
    pickHandler(res);
  });
  m.style.display = 'flex'; setTimeout(() => q.focus(), 50);
}

// ---------- новая карта ----------
let pendingNewCardClient = null;   // «+» на карточке клиента → «Новая карта» уже с этим клиентом
async function refreshClientSelect() {
  const clients = await window.api.listClients();
  const sel = document.getElementById('nc-client');
  sel.innerHTML = clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  if (pendingNewCardClient && clients.some(c => c.id === pendingNewCardClient)) sel.value = String(pendingNewCardClient);
  pendingNewCardClient = null;
  document.getElementById('nc-no-clients').style.display = clients.length ? 'none' : 'block';
  const settings = await window.api.getSettings();
  fillCurrencySelect(document.getElementById('nc-spend-currency'), settings.spend_currency || 'EUR');
  syncNewCardType();
}

// Тип карты выбирается плитками; скрытый select #nc-type остаётся источником значения.
function syncNewCardType() {
  const type = document.getElementById('nc-type').value;
  document.getElementById('nc-discount-fields').style.display = type === 'discount' || type === 'combo' ? 'block' : 'none';
  document.getElementById('nc-stamp-fields').style.display = type === 'stamp' || type === 'combo' ? 'block' : 'none';
  document.getElementById('nc-spend-fields').style.display = type === 'spend' ? 'block' : 'none';
  document.getElementById('nc-gift-fields').style.display = type === 'gift' ? 'block' : 'none';
  document.querySelectorAll('.nc-type-tile').forEach(tile => {
    const on = tile.dataset.type === type;
    tile.classList.toggle('active', on);
    tile.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  renderNewCardPreview();
}
document.getElementById('nc-type').addEventListener('change', syncNewCardType);
document.querySelectorAll('.nc-type-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    document.getElementById('nc-type').value = tile.dataset.type;
    syncNewCardType();
  });
});

// Живой предпросмотр карты справа — обновляется при любом изменении формы.
function renderNewCardPreview() {
  const type = document.getElementById('nc-type').value;
  const niche = NichesModule.getNiche(currentNicheId);
  const clientSel = document.getElementById('nc-client');
  const clientName = clientSel.selectedOptions[0] ? clientSel.selectedOptions[0].textContent : t('ncPreviewClient');
  const cur = CURRENCY_SYMBOLS[document.getElementById('nc-spend-currency').value] || '€';
  const money = (v) => getLang() === 'en' ? `${cur}${v}` : `${v} ${cur}`;
  let typeLabel, title, body, how;

  if (type === 'discount') {
    const p = Math.max(0, Math.min(100, Number(document.getElementById('nc-discount').value) || 0));
    typeLabel = t('ncTypeDiscountName');
    title = t('chipDiscount');
    body = `<div class="ncp-big">−${p}%</div>`;
    how = t('ncHowDiscount')(p);
  } else if (type === 'stamp' || type === 'combo') {
    const n = Math.max(2, Math.min(50, Number(document.getElementById('nc-target').value) || 10));
    typeLabel = t(type === 'combo' ? 'ncTypeComboName' : 'ncTypeStampName');
    title = document.getElementById('nc-title').value.trim() || t('chipStamp');
    const shown = Math.min(n, 20);
    let dots = '';
    for (let i = 1; i <= shown; i++) {
      dots += i === shown ? '<span class="ncp-stamp ncp-stamp-gift">🎁</span>' : '<span class="ncp-stamp"></span>';
    }
    const cp = type === 'combo' ? Math.max(1, Math.min(90, Number(document.getElementById('nc-discount').value) || 5)) : 0;
    body = `${cp ? `<div class="ncp-combo">−${cp}%</div>` : ''}<div class="ncp-stamps ${shown > 10 ? 'ncp-stamps-dense' : ''}">${dots}</div>${n > 20 ? `<div class="ncp-sub">0 / ${n}</div>` : ''}`;
    how = cp ? t('ncHowCombo')(cp, n) : t('ncHowStamp')(n);
  } else if (type === 'gift') {
    const amt = parseMoneyInput(document.getElementById('nc-gift-amount').value) || 0;
    const months = Number(document.getElementById('nc-gift-months').value) || 0;
    typeLabel = t('ncTypeGiftName');
    title = document.getElementById('nc-gift-title').value.trim() || t('chipGift');
    const cs = CURRENCY_SYMBOLS[currentSpendCurrency] || '€';
    const m2 = (v) => getLang() === 'en' ? `${cs}${fmtMoney(v)}` : `${fmtMoney(v)} ${cs}`;
    body = `<div class="ncp-big">${m2(amt)}</div><div class="ncp-sub">🎁 ${escapeHtml(months ? t('giftValidMonths')(months) : t('giftNoExpiry'))}</div>`;
    how = t('ncHowGift')(m2(amt));
  } else {
    const bonusOn = document.getElementById('nc-spend-bonus-enabled').checked;
    const target = Number(document.getElementById('nc-spend-target').value) || 0;
    const bonus = document.getElementById('nc-spend-bonus-text').value.trim() || t('spendDefaultBonus');
    title = document.getElementById('nc-spend-title').value.trim() || (bonusOn ? t('chipSpend') : t('chipSpendTrack'));
    typeLabel = t('ncTypeSpendName');
    if (bonusOn) {
      body = `<div class="ncp-big">${money(0)}<span class="ncp-of"> / ${money(target)}</span></div><div class="ncp-bar"><i></i></div><div class="ncp-sub">🎁 ${escapeHtml(bonus)}</div>`;
      how = t('ncHowSpendBonus')(money(target), escapeHtml(bonus));
    } else {
      body = `<div class="ncp-big">${money(0)}</div>`;
      how = t('ncHowSpendTrack');
    }
  }
  document.getElementById('ncp-brand').textContent = `${niche.emoji} ${currentBrandName}`;
  document.getElementById('ncp-type').textContent = typeLabel;
  document.getElementById('ncp-body').innerHTML = body;
  document.getElementById('ncp-title').textContent = title;
  document.getElementById('ncp-client').textContent = clientName;
  document.getElementById('ncp-how').innerHTML = how;
  document.getElementById('nc-preview-card').dataset.type = type;
}
document.getElementById('new-card-form').addEventListener('input', renderNewCardPreview);
document.getElementById('new-card-form').addEventListener('change', renderNewCardPreview);

// Галочка «давать бонус»: без неё карта просто считает траты клиента (для отчёта),
// поэтому поля суммы и бонуса прячем и показываем пояснение.
function syncSpendBonusFields() {
  const on = document.getElementById('nc-spend-bonus-enabled').checked;
  document.getElementById('nc-spend-bonus-fields').style.display = on ? '' : 'none';
  document.getElementById('nc-spend-track-hint').style.display = on ? 'none' : 'block';
}
document.getElementById('nc-spend-bonus-enabled').addEventListener('change', syncSpendBonusFields);

document.getElementById('new-card-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ncBtn = e.target.querySelector('button[type="submit"]');
  if (ncBtn && ncBtn.disabled) return;
  if (ncBtn) { ncBtn.disabled = true; setTimeout(() => { ncBtn.disabled = false; }, 800); }
  const clientId = Number(document.getElementById('nc-client').value);
  const type = document.getElementById('nc-type').value;
  if (!clientId) { uiAlert(t('firstAddClient')); return; }

  let payload = { clientId, type };
  if (type === 'discount') {
    payload.discountPercent = Number(document.getElementById('nc-discount').value);
  } else if (type === 'gift') {
    payload.giftAmount = parseMoneyInput(document.getElementById('nc-gift-amount').value);
    payload.giftMonths = Number(document.getElementById('nc-gift-months').value) || 0;
    payload.title = document.getElementById('nc-gift-title').value.trim();
    if (!(payload.giftAmount > 0)) { flashBadInput(document.getElementById('nc-gift-amount')); return; }
  } else if (type === 'spend') {
    payload.title = document.getElementById('nc-spend-title').value.trim();
    const bonusOn = document.getElementById('nc-spend-bonus-enabled').checked;
    payload.spendTarget = bonusOn ? Number(document.getElementById('nc-spend-target').value) : null;
    payload.spendBonusText = bonusOn ? document.getElementById('nc-spend-bonus-text').value.trim() : null;
    payload.spendBonusPoints = bonusOn ? Math.max(1, Math.round(Number(document.getElementById('nc-spend-points').value) || 1)) : 1;
    if (bonusOn && !(payload.spendTarget > 0)) { document.getElementById('nc-spend-target').focus(); return; }
    // Валюта — единая настройка на весь бизнес, а не отдельно у каждой карты:
    // обновляем её здесь же, чтобы не нужен был отдельный экран настроек для этого.
    const currency = document.getElementById('nc-spend-currency').value;
    const current = await window.api.getSettings();
    if (current.spend_currency !== currency) await window.api.saveSettings({ ...current, spend_currency: currency });
    currentSpendCurrency = currency;
  } else {
    payload.title = document.getElementById('nc-title').value.trim();
    payload.stampTarget = Number(document.getElementById('nc-target').value);
    if (type === 'combo') { payload.type = 'stamp'; payload.discountPercent = Math.max(1, Math.min(90, Number(document.getElementById('nc-discount').value) || 5)); }
  }

  const card = await window.api.createCard(payload);
  if (card && card.error === 'free_limit') { showFreeLimit(card.limit || 'cards'); return; }
  if (card && card.error === 'invalid_amount') { flashBadInput(document.getElementById('nc-gift-amount')); return; }
  if (card && card.error === 'discount_cap') { uiAlert(t('discountCap')(card.max)); document.getElementById('nc-discount').focus(); return; }
  e.target.reset();
  syncSpendBonusFields();
  syncNewCardType();
  document.querySelector('[data-view="clients"]').click();
  openCardModal(card.id);
});

// ---------- сканирование ----------
const scanResultEl = document.getElementById('scan-result');
const manualInput = document.getElementById('scan-manual-input');

manualInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const code = manualInput.value.trim();
    manualInput.value = '';
    if (code) await handleScan(code);
  }
});

// ---------- отмена удаления клиента ----------
const pendingDeletions = new Map();

function showUndoToast(message, onUndo) {
  const container = document.getElementById('undo-toast-container');
  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  const textEl = document.createElement('span');
  textEl.textContent = message;
  const btnEl = document.createElement('button');
  btnEl.type = 'button';
  btnEl.textContent = t('btnUndo');
  btnEl.addEventListener('click', () => {
    onUndo();
    toast.remove();
  });
  toast.appendChild(textEl);
  toast.appendChild(btnEl);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

function scheduleClientDeletion(clientId, clientName) {
  if (!canDelete()) { uiAlert(t('noAccessAction')); return; }
  const row = document.querySelector(`[data-client-row="${clientId}"]`);
  if (row) row.style.display = 'none';

  showUndoToast(t('clientDeletedToast')(clientName), () => {
    clearTimeout(pendingDeletions.get(clientId));
    pendingDeletions.delete(clientId);
    if (row) row.style.display = '';
  });

  const timeoutId = setTimeout(async () => {
    pendingDeletions.delete(clientId);
    await window.api.deleteClient(clientId);
    refreshClients();
  }, 6000);
  pendingDeletions.set(clientId, timeoutId);
}

// ---------- PIN-код ----------
function requirePin() {
  return new Promise(async (resolve) => {
    const isSet = await window.api.pinIsSet();
    if (!isSet) { resolve(true); return; }

    const modal = document.getElementById('pin-modal');
    const input = document.getElementById('pin-input');
    const errorEl = document.getElementById('pin-error');
    const submitBtn = document.getElementById('pin-submit');
    const cancelBtn = document.getElementById('pin-cancel');
    input.value = '';
    errorEl.textContent = '';
    modal.style.display = 'flex';
    input.focus();

    function cleanup(result) {
      modal.style.display = 'none';
      submitBtn.removeEventListener('click', onSubmit);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKeydown);
      resolve(result);
    }
    async function onSubmit() {
      const res = await window.api.pinVerify(input.value.trim());
      if (res.ok) cleanup(true);
      else { errorEl.textContent = t('pinWrong'); input.value = ''; input.focus(); }
    }
    function onCancel() { cleanup(false); }
    function onKeydown(e) { if (e.key === 'Enter') onSubmit(); }

    submitBtn.addEventListener('click', onSubmit);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKeydown);
  });
}

// ---------- PIN-код: настройки ----------
async function loadPinStatus() {
  const isSet = await window.api.pinIsSet();
  document.getElementById('pin-status-label').textContent = isSet ? t('pinIsSet') : t('pinNotSet');
  document.getElementById('btn-pin-remove').style.display = isSet ? '' : 'none';
}

document.getElementById('btn-pin-save').addEventListener('click', async () => {
  const statusEl = document.getElementById('pin-settings-status');
  const pin = document.getElementById('pin-new-input').value.trim();
  if (!pin) return;
  const res = await window.api.pinSet(pin);
  if (res.error) {
    statusEl.textContent = res.error === 'pin_format' ? t('pinFormatError') : res.error;
  } else {
    statusEl.textContent = t('settingsSaved');
    document.getElementById('pin-new-input').value = '';
    loadPinStatus();
    setTimeout(() => statusEl.textContent = '', 2000);
  }
});

document.getElementById('btn-pin-remove').addEventListener('click', async () => {
  if (!(await requirePin())) return;
  await window.api.pinClear();
  loadPinStatus();
});

document.getElementById('btn-backup-now').addEventListener('click', async () => {
  const res = await window.api.backupCreateNow();
  const statusEl = document.getElementById('data-actions-status');
  statusEl.textContent = t('backupDone')(res.folder);
});

document.getElementById('btn-backup-open').addEventListener('click', () => {
  window.api.backupOpenFolder();
});

// ---------- звук при сканировании ----------
let soundEnabled = true;
let audioCtx = null;

// Отклик на результат скана: короткая вибрация (телефон/планшет) и крупная отметка поверх экрана «Сканирование».
function scanFx(type) {
  try { if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(type === 'error' ? [70, 60, 70] : type === 'reward' ? [40, 50, 90] : 45); } catch (e) { /* без вибрации */ }
  if (currentView !== 'scan' || !document.body.classList.contains('phone-ui') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let el = document.getElementById('scan-fx');
  if (!el) { el = document.createElement('div'); el.id = 'scan-fx'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
  el.className = '';
  el.innerHTML = `<span class="sfx-dot">${type === 'error' ? '✕' : type === 'reward' ? '🎁' : '✓'}</span>`;
  void el.offsetWidth;
  el.className = 'sfx-' + (type === 'error' ? 'error' : type === 'reward' ? 'reward' : 'ok');
  clearTimeout(scanFx.tm); scanFx.tm = setTimeout(() => { el.className = ''; }, 1100);
}
function playBeep(type) {
  scanFx(type);
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const tone = (freq, delay) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = audioCtx.currentTime + delay;
      gain.gain.setValueAtTime(0.15, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    };
    if (type === 'error') tone(220, 0);
    else if (type === 'reward') { tone(660, 0); tone(990, 0.15); }
    else tone(760, 0);
  } catch (e) { /* звук не критичен */ }
}

// ---------- визуальные карты клиента на вкладке «Сканирование» ----------
// Та же «пластиковая» карта, что в предпросмотре на вкладке «Новая карта», но с реальным
// состоянием: сколько штампов, сколько накоплено, сколько осталось до бонуса.
function moneyFmt(v) {
  const cur = currencySymbol();
  return getLang() === 'en' ? `${cur}${fmtMoney(v)}` : `${fmtMoney(v)} ${cur}`;
}
async function drawGiftCertificate(card, lang) {
  const L = (k, ...a) => { const v = tl(lang, k); return typeof v === 'function' ? v(...a) : v; };
  const W = 1200, H = 760;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const st = await window.api.getSettings();
  const c1 = st.theme_primary || '#b8862d';
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1b1610'); g.addColorStop(1, '#2d2416');
  x.fillStyle = g; x.beginPath(); x.roundRect ? x.roundRect(0, 0, W, H, 48) : x.rect(0, 0, W, H); x.fill();
  x.fillStyle = c1; x.globalAlpha = 0.9; x.fillRect(0, 0, 18, H); x.globalAlpha = 1;
  // лента
  x.fillStyle = c1; x.globalAlpha = 0.18; x.beginPath(); x.arc(W - 120, 120, 260, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
  const font = (w, sz) => `${w} ${sz}px "Segoe UI", Roboto, Arial, sans-serif`;
  x.fillStyle = '#f5d78e'; x.font = font(700, 34); x.fillText(String(st.brand_name || 'Loya').slice(0, 40), 70, 100);
  x.fillStyle = '#efe5d2'; x.font = font(800, 54); x.fillText('🎁 ' + (card.title || L('chipGift')).slice(0, 34), 70, 190);
  const cs = CURRENCY_SYMBOLS[st.spend_currency || 'EUR'] || '€';
  const amt = fmtMoney(card.gift_balance != null ? card.gift_balance : card.gift_amount);
  x.fillStyle = '#ffffff'; x.font = font(900, 150); x.fillText(lang === 'en' ? cs + amt : `${amt} ${cs}`, 66, 390);
  x.fillStyle = '#d9cdb5'; x.font = font(500, 34);
  x.fillText(String(card.client_name || '').slice(0, 36), 70, 470);
  x.fillText(card.expires_at ? L('giftUntil', fmtDateShort(card.expires_at)) : L('giftNoExpiry'), 70, 525);
  x.fillStyle = '#a99c84'; x.font = font(500, 26); x.fillText(card.code, 70, H - 60);
  const qr = await window.api.qrDataUrl(card.code, { width: 360, bgColor: '#ffffff' });
  await new Promise((res) => { const im = new Image(); im.onload = () => { x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect ? x.roundRect(W - 440, H - 440, 380, 380, 28) : x.rect(W - 440, H - 440, 380, 380); x.fill(); x.drawImage(im, W - 430, H - 430, 360, 360); res(); }; im.onerror = res; im.src = qr; });
  return cv.toDataURL('image/png');
}
function fmtDateShort(d) { try { return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString(localeCode(), { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return String(d || ''); } }
function loyaltyCardVisualHtml(card, scannedId, groupCount) {
  const niche = NichesModule.getNiche(currentNicheId);
  let typeLabel, title, body;
  if (card.type === 'discount') {
    typeLabel = t('ncTypeDiscountName');
    title = t('chipDiscount');
    body = `<div class="ncp-big">−${card.discount_percent}%</div><div class="ncp-sub">${t('lcDiscountEvery')}</div>`;
  } else if (card.type === 'gift') {
    const amt = Number(card.gift_amount) || 0, bal = Number(card.gift_balance) || 0;
    typeLabel = t('ncTypeGiftName');
    title = escapeHtml(card.title || '') || t('chipGift');
    body = `<div class="ncp-big">${moneyFmt(bal)}<span class="ncp-of"> / ${moneyFmt(amt)}</span></div>
      <div class="ncp-bar"><i style="width:${amt ? Math.max(3, Math.round(bal / amt * 100)) : 0}%"></i></div>
      <div class="ncp-sub">${card.expires_at ? t('giftUntil')(fmtDateShort(card.expires_at)) : t('giftNoExpiry')}</div>`;
  } else if (card.type === 'stamp') {
    const n = card.stamp_target, have = card.stamp_count || 0;
    typeLabel = t(Number(card.discount_percent) > 0 ? 'ncTypeComboName' : 'ncTypeStampName');
    title = escapeHtml(card.title || '') || t('chipStamp');
    if (n <= 20) {
      let dots = '';
      for (let i = 1; i <= n; i++) {
        if (i <= have) dots += '<span class="ncp-stamp ncp-stamp-on">✓</span>';
        else if (i === n) dots += '<span class="ncp-stamp ncp-stamp-gift">🎁</span>';
        else dots += '<span class="ncp-stamp"></span>';
      }
      body = `<div class="ncp-stamps ${n > 10 ? 'ncp-stamps-dense' : ''}">${dots}</div>`;
    } else {
      body = `<div class="ncp-big">${have}<span class="ncp-of"> / ${n}</span></div><div class="ncp-bar"><i style="width:${Math.max(3, Math.round(have / n * 100))}%"></i></div>`;
    }
    body += `<div class="ncp-sub">${t('lcStampsLeft')(Math.max(1, n - have))}</div>`;
    if (Number(card.discount_percent) > 0) body = `<div class="ncp-combo">−${card.discount_percent}%</div>` + body;
  } else {
    const acc = card.spend_accumulated || 0;
    typeLabel = t('ncTypeSpendName');
    if (spendHasBonus(card)) {
      const pct = Math.min(100, Math.max(3, Math.round(acc / card.spend_target * 100)));
      const bonus = escapeHtml(card.spend_bonus_text || '') || t('spendDefaultBonus');
      title = escapeHtml(card.title || '') || t('chipSpend');
      body = `<div class="ncp-big">${moneyFmt(acc)}<span class="ncp-of"> / ${moneyFmt(card.spend_target)}</span></div>
        <div class="ncp-bar"><i style="width:${pct}%"></i></div>
        <div class="ncp-sub">🎁 ${t('lcSpendLeft')(moneyFmt(Math.max(0, card.spend_target - acc)), bonus)}</div>${Math.round(card.bonus_balance || 0) > 0 ? `<div class="ncp-bonus">⭐ ${t('bonusBalance')(Math.round(card.bonus_balance))}</div>` : ''}`;
    } else {
      title = escapeHtml(card.title || '') || t('chipSpendTrack');
      body = `<div class="ncp-big">${moneyFmt(acc)}</div><div class="ncp-sub">${t('lcSpendTotal')}</div>`;
    }
  }
  const isScanned = card.id === scannedId;
  return `
    <button type="button" class="nc-preview-card lcard ${isScanned ? 'lcard-scanned' : ''}" data-card="${card.id}" data-type="${card.type}">
      <span class="ncp-top">
        <span class="ncp-brand">${niche.emoji} ${escapeHtml(currentBrandName)}</span>
        <span class="ncp-type">${isScanned ? '✓ ' + t('scanJustScanned') : typeLabel}${groupCount > 1 ? ` ×${groupCount}` : ''}</span>
      </span>
      <span class="ncp-body">${body}</span>
      <span class="ncp-bottom">
        <span class="ncp-title">${title}</span>
        <span class="ncp-client">${card.code || ''}</span>
      </span>
    </button>`;
}

// Одинаковые скидочные карты (12 штук по −5%) показываем одной карточкой «×12».
function localDateStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function groupDiscountCards(cards) {
  const groups = [];
  const byPercent = {};
  cards.forEach(c => {
    if (c.type === 'discount' && !c.single_use) {
      const key = String(c.discount_percent);
      if (byPercent[key]) { byPercent[key].count++; return; }
      byPercent[key] = { card: c, count: 1 };
      groups.push(byPercent[key]);
    } else groups.push({ card: c, count: 1 });
  });
  return groups;
}

let lastScanClientId = null;
let lastScanCardId = null;
async function showScanClientCards(clientId, scannedCardId) {
  lastScanClientId = clientId; lastScanCardId = scannedCardId;
  renderScanInsight(clientId);
  const box = document.getElementById('scan-client-cards');
  document.getElementById('scan-empty').style.display = 'none';
  const all = await window.api.listCards();
  const cards = all.filter(c => c.client_id === clientId);
  // Отсканированная карта всегда первая.
  cards.sort((a, b) => (b.id === scannedCardId) - (a.id === scannedCardId));
  if (!cards.length) { box.style.display = 'none'; return; }
  // Одинаковые скидочные карты (например, 12 штук по −5%) показываем одной картой «×12».
  const groups = [];
  const byPercent = {};
  cards.forEach(c => {
    if (c.type === 'discount') {
      const key = String(c.discount_percent);
      if (byPercent[key]) { byPercent[key].count++; return; }
      byPercent[key] = { card: c, count: 1 };
      groups.push(byPercent[key]);
    } else {
      groups.push({ card: c, count: 1 });
    }
  });
  box.innerHTML = `
    <div class="scan-client-head">
      <h2 class="client-name-link" data-client-id="${clientId}">${t('scanClientCardsHeading')(escapeHtml(cards[0].client_name || ''))}</h2>
    </div>
    <div class="scan-cards-grid">${groups.map(g => loyaltyCardVisualHtml(g.card, scannedCardId, g.count)).join('')}</div>`;
  box.style.display = 'block';
  box.querySelector('.client-name-link').addEventListener('click', () => openClientProfile(clientId));
  box.querySelectorAll('.lcard').forEach(el => el.addEventListener('click', () => openCardModal(Number(el.dataset.card))));
}
function refreshScanClientCards() {
  if (lastScanClientId) showScanClientCards(lastScanClientId, lastScanCardId);
}

async function handleScan(code) {
  const res = await window.api.scanCode(code);
  // Отсканировали карточку сотрудника — это смена кассира, а не карта клиента.
  if (res.error === 'not_found' && /^\d{12}$/.test(String(code || '').replace(/[\s-]/g, ''))) {
    const lr = await window.api.staffLoginByCode(code);
    if (lr && lr.ok) { playBeep('ok'); await onStaffLoggedIn(lr); showUndoToastLike(t('staffSwitched')(lr.name || t('teamRoleOwner'))); return; }
  }
  if (res.error === 'not_found') {
    playBeep('error');
    scanResultEl.innerHTML = `<div class="result-box error">${t('cardNotFound')(code)}</div>`;
    document.getElementById('scan-empty').style.display = 'none';
    document.getElementById('scan-client-cards').style.display = 'none';
    document.getElementById('scan-insight').style.display = 'none';
    lastScanClientId = null;
    return;
  }
  if (res.error === 'free_limit') {
    playBeep('error');
    scanResultEl.innerHTML = `<div class="result-box error">${escapeHtml(t('freeLimit_scan')(licenseMode ? licenseMode.limits : { clients: 10 }))}</div>`;
    document.getElementById('scan-empty').style.display = 'none';
    document.getElementById('scan-insight').style.display = 'none';
    lastScanClientId = null;
    showFreeLimit('scan');
    return;
  }
  if (res.error === 'expired' || res.error === 'already_used') {
    playBeep('error');
    const nm = escapeHtml(res.card.client_name);
    scanResultEl.innerHTML = `<div class="result-box error">${res.error === 'expired' ? t('bonusExpiredResult')(nm, !!res.permanentCard) : t('bonusUsedResult')(nm)}</div>`;
    document.getElementById('scan-empty').style.display = 'none';
    showScanClientCards(res.card.client_id, res.card.id);
    if (res.permanentCard) refreshClients();
    return;
  }
  if (res.error === 'gift_empty' || res.error === 'gift_expired') {
    playBeep('error');
    scanResultEl.innerHTML = `<div class="result-box error">${escapeHtml(res.error === 'gift_empty' ? t('giftEmpty') : t('giftExpired'))} · ${escapeHtml(res.card.client_name)}</div>`;
    document.getElementById('scan-empty').style.display = 'none';
    showScanClientCards(res.card.client_id, res.card.id);
    return;
  }
  if (res.error === 'too_soon') {
    playBeep('error');
    scanResultEl.innerHTML = `<div class="result-box error">${t('scanTooSoon')(escapeHtml(res.card.client_name), res.minutesAgo)}</div>
      <button type="button" class="btn-secondary scan-force-btn" id="btn-scan-force">${t('scanForce')}</button>`;
    document.getElementById('btn-scan-force').addEventListener('click', async () => {
      const forced = await window.api.scanCodeForce(res.card.code);
      handleScanResult(forced, res.card.code);
    });
    showScanClientCards(res.card.client_id, res.card.id);
    return;
  }
  handleScanResult(res, code);
}

// 2.19: уровень клиента после скана — «новый уровень!» или напоминание о привилегии (скидка уровня для кассира).
function tierNoteHtml(res) {
  if (!res || !res.tier) return '';
  const label = res.tier === 'gold' ? 'GOLD' : res.tier === 'silver' ? 'SILVER' : 'BASIC';
  const perk = res.tierPerk ? [res.tierPerk.mult > 1 ? t('tierPerkMult')(res.tierPerk.mult) : '', res.tierPerk.disc > 0 ? t('tierPerkDisc')(res.tierPerk.disc) : ''].filter(Boolean).join(' · ') : '';
  if (res.tierUp && res.tierUp !== 'basic') return `<div class="result-box reward tier-up">🎉 ${t('tierUpNow')((res.card ? res.card.client_name : ''), `${tierEmoji(res.tier)} ${label}`)}${perk ? `<div class="tier-perk">${escapeHtml(perk)}</div>` : ''}</div>`;
  if (perk) return `<div class="scan-bonus-note tier-note">${tierEmoji(res.tier)} ${label}: ${escapeHtml(perk)}</div>`;
  return '';
}
async function handleScanResult(res, code) {
  if (!res || res.error) return;
  // Имя и название вставляются в HTML — экранируем, чтобы «<…>» в имени не стало кодом.
  res = { ...res, card: { ...res.card, client_name: escapeHtml(res.card.client_name), title: escapeHtml(res.card.title || '') },
    pendingGift: res.pendingGift ? { ...res.pendingGift, gift_text: escapeHtml(res.pendingGift.gift_text) } : res.pendingGift };
  let html;
  if (res.type === 'discount') {
    playBeep('ok');
    html = `<div class="result-box success">${t('discountResult')(res.card.client_name, res.card.discount_percent)}</div>`;
    if (res.bonusRedeemed) html += `<div class="result-box reward" style="margin-top:8px">${t('bonusRedeemedNote')(!!res.permanentCard)}</div>`;
  } else if (res.type === 'stamp') {
    if (res.reward) {
      playBeep('reward');
      html = `<div class="result-box reward">${t('rewardResult')(res.card.client_name, res.card.title || t('chipStamp'))}</div>`;
    } else {
      playBeep('ok');
      html = `<div class="result-box success">${t('stampResult')(res.card.client_name, res.card.title || t('chipStamp'), res.card.stamp_count, res.card.stamp_target, res.remaining)}</div>`;
    }
    // 2.25: «штампы + скидка» — кассиру сразу видно, какую скидку дать
    if (Number(res.card.discount_percent) > 0) html = `<div class="result-box success scan-combo-disc">${t('comboDiscountNow')(res.card.discount_percent)}</div>` + html;
    if (res.welcomeBonus) html += `<div class="scan-bonus-note">${t('scanWelcomeApplied')}</div>`;
    else if (res.bonusMultiplier > 1) html += `<div class="scan-bonus-note">${t('scanBonusApplied')(res.bonusMultiplier)}</div>`;
  } else if (res.type === 'gift') {
    // 2.19: подарочный сертификат — показываем остаток и списываем сумму покупки (можно частями).
    playBeep('ok');
    const bal = Number(res.card.gift_balance) || 0;
    scanResultEl.innerHTML = `
      <div class="result-box success">${t('giftScanned')(res.card.client_name, moneyFmt(bal), moneyFmt(res.card.gift_amount || 0))}</div>
      <div class="scan-amount-row scan-amount-required" id="gift-amount-row" data-card-id="${res.card.id}">
        <span class="scan-amount-label">🎁 ${t('giftHowMuch')}</span>
        <input type="text" inputmode="decimal" autocomplete="off" id="gift-amount-input" class="scan-amount-input" placeholder="0.00">
        <button type="button" class="btn-secondary" id="btn-gift-all">${t('giftAll')(moneyFmt(bal))}</button>
        <button type="button" id="btn-gift-confirm">${t('giftDeduct')}</button>
      </div>${res.pendingReceipt ? `<div class="scan-receipt-note">🧾 ${t('posFromReceipt')(fmtMoney(res.pendingReceipt.total), currencySymbol())}</div>` : ''}`;
    const inp = document.getElementById('gift-amount-input');
    if (res.pendingReceipt) inp.value = Math.min(bal, Number(res.pendingReceipt.total) || 0);
    document.getElementById('btn-gift-all').addEventListener('click', () => { inp.value = fmtMoney(bal); inp.focus(); });
    document.getElementById('btn-gift-confirm').addEventListener('click', async () => {
      const amount = parseMoneyInput(inp.value);
      if (isNaN(amount) || amount <= 0) { flashBadInput(inp); return; }
      const r = await window.api.redeemGift(res.card.id, amount);
      if (r && r.error === 'gift_not_enough') { flashBadInput(inp); showUndoToastLike(t('giftNotEnough')(moneyFmt(r.balance))); return; }
      if (!r || r.error) { flashBadInput(inp); return; }
      if (res.pendingReceipt && Math.abs(Number(res.pendingReceipt.total) - amount) < 0.005) { try { await window.api.claimReceipt(res.pendingReceipt.id, res.card.id, 'gift'); } catch (e) { /* не критично */ } }
      playBeep('ok');
      scanResultEl.innerHTML = `<div class="result-box success">${t('giftRedeemedResult')(escapeHtml(r.card.client_name), moneyFmt(r.amount), moneyFmt(r.balance))}</div>
        <button id="btn-undo-last-scan" class="btn-secondary btn-undo-scan">${t('btnUndoLastScan')}</button>`;
      document.getElementById('btn-undo-last-scan').addEventListener('click', async () => {
        if (!await uiConfirm(t('confirmUndoScan'))) return;
        const u = await window.api.undoLastScan();
        if (u.ok) { document.getElementById('btn-undo-last-scan').outerHTML = `<div class="hint">${t('undoScanDone')(escapeHtml(u.clientName))}</div>`; refreshScanClientCards(); }
      });
      showScanClientCards(r.card.client_id, r.card.id);
    });
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') document.getElementById('btn-gift-confirm').click(); });
    if (!document.body.classList.contains('phone-ui')) inp.focus();
    showScanClientCards(res.card.client_id, res.card.id);
    return;
  } else if (res.type === 'spend') {
    // Накопительная карта — сканирование само по себе ничего не начисляет, сумма
    // покупки обязательна и вводится прямо здесь же, следующим шагом.
    playBeep('ok');
    html = `
      <div class="result-box success">${spendHasBonus(res.card)
        ? t('spendCardScanned')(res.card.client_name, res.card.title || t('chipSpend'), fmtMoney(res.card.spend_accumulated), fmtMoney(res.card.spend_target), currencySymbol())
        : t('spendTrackScanned')(res.card.client_name, res.card.title || t('chipSpendTrack'), fmtMoney(res.card.spend_accumulated), currencySymbol())}</div>
      <div class="scan-amount-row scan-amount-required" id="spend-amount-row" data-card-id="${res.card.id}">
        <span class="scan-amount-label">💰 ${t('scanAmountRequiredLabel')}</span>
        <input type="text" inputmode="decimal" autocomplete="off" id="spend-amount-input" class="scan-amount-input" placeholder="0.00" autofocus>
        <button type="button" id="btn-spend-amount-confirm">${t('btnConfirm')}</button>
      </div>${res.pendingReceipt ? `<div class="scan-receipt-note">🧾 ${t('posFromReceipt')(fmtMoney(res.pendingReceipt.total), currencySymbol())}</div>` : ''}`;
    scanResultEl.innerHTML = html;
    if (res.pendingReceipt) document.getElementById('spend-amount-input').value = res.pendingReceipt.total;
    document.getElementById('btn-spend-amount-confirm').addEventListener('click', async () => {
      const row = document.getElementById('spend-amount-row');
      const input = document.getElementById('spend-amount-input');
      const amount = parseMoneyInput(input.value);
      if (isNaN(amount) || amount <= 0) { flashBadInput(input); return; }
      const spendRes = await window.api.addSpendAmount(Number(row.dataset.cardId), amount);
      if (spendRes.error) return;
      // Сумму из чека кассы подтвердили — привязываем чек к клиенту (если сумму исправили, чек ждёт дальше).
      if (res.pendingReceipt && Math.abs(Number(res.pendingReceipt.total) - amount) < 0.005) { try { await window.api.claimReceipt(res.pendingReceipt.id, Number(row.dataset.cardId), 'spend'); } catch (e) { /* не критично */ } }
      renderSpendConfirmedResult(spendRes);
    });
    document.getElementById('spend-amount-input').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') document.getElementById('btn-spend-amount-confirm').click();
    });
    document.getElementById('spend-amount-input').focus();
    showScanClientCards(res.card.client_id, res.card.id);
    return; // остальной код функции (undo-кнопка и т.д.) относится к другим типам карт
  }
  html += tierNoteHtml(res);
  if (res.receiptLinked) html += `<div class="scan-receipt-note">🧾 ${t('posLinked')(fmtMoney(res.receiptLinked.total), currencySymbol())}</div>`;
  html += `<button id="btn-undo-last-scan" class="btn-secondary btn-undo-scan">${t('btnUndoLastScan')}</button>`;

  if (res.historyId && (res.type === 'discount' || res.type === 'stamp')) {
    html += `
      <div class="scan-amount-row" id="scan-amount-row" data-history-id="${res.historyId}">
        <span class="scan-amount-label">💰 ${t('scanAmountLabel')}</span>
        <input type="text" inputmode="decimal" autocomplete="off" id="scan-amount-input" class="scan-amount-input" placeholder="0.00">
        <button type="button" id="btn-scan-amount-save">${t('btnSave')}</button>
      </div>`;
  }

  if (res.pendingGift) {
    html += `
      <div class="result-box gift-reminder">
        🎁 ${t('giftReminderText')(res.pendingGift.gift_text)}
        <button id="btn-mark-gift-given-scan" data-gift="${res.pendingGift.id}">${t('btnMarkGiftGiven')}</button>
      </div>`;
  }

  if (res.card && res.card.client_notes && res.card.client_notes.trim()) {
    html += `
      <div class="result-box client-note">
        📝 ${t('clientNoteLabel')} ${escapeHtml(res.card.client_notes)}
      </div>`;
  }

  scanResultEl.innerHTML = html;

  const giftBtn = document.getElementById('btn-mark-gift-given-scan');
  if (giftBtn) {
    giftBtn.addEventListener('click', async () => {
      await window.api.markGiftGiven(Number(giftBtn.dataset.gift));
      giftBtn.closest('.gift-reminder').remove();
    });
  }

  const undoBtn = document.getElementById('btn-undo-last-scan');
  if (undoBtn) {
    undoBtn.addEventListener('click', async () => {
      if (!await uiConfirm(t('confirmUndoScan'))) return;
      const undoRes = await window.api.undoLastScan();
      if (undoRes.ok) {
        undoBtn.outerHTML = `<div class="hint">${t('undoScanDone')(escapeHtml(undoRes.clientName))}</div>`;
        refreshScanClientCards();
      }
    });
  }
  showScanClientCards(res.card.client_id, res.card.id);

  // Сумма покупки — целиком по желанию. Сотрудник может ввести и сохранить, а может
  // просто отсканировать следующую карту, ничего не потеряется и не заблокируется.
  const saveAmountBtn = document.getElementById('btn-scan-amount-save');
  if (saveAmountBtn) {
    saveAmountBtn.addEventListener('click', async () => {
      const row = document.getElementById('scan-amount-row');
      const input = document.getElementById('scan-amount-input');
      const amount = parseMoneyInput(input.value);
      if (isNaN(amount) || amount < 0) { flashBadInput(input); return; }
      await window.api.updateScanAmount(Number(row.dataset.historyId), amount);
      row.outerHTML = `<div class="hint">✅ ${t('scanAmountSaved')}</div>`;
    });
  }
}

// Показывает итог после того, как сотрудник ввёл сумму на накопительной карте —
// отдельная функция, а не продолжение handleScan, потому что сам факт "покупка
// состоялась" здесь наступает только сейчас, а не в момент скана.
function renderSpendConfirmedResult(spendRes) {
  spendRes = { ...spendRes, card: { ...spendRes.card, client_name: escapeHtml(spendRes.card.client_name), title: escapeHtml(spendRes.card.title || '') },
    pendingGift: spendRes.pendingGift ? { ...spendRes.pendingGift, gift_text: escapeHtml(spendRes.pendingGift.gift_text) } : spendRes.pendingGift };
  let html;
  if (spendRes.reward) {
    playBeep('reward');
    html = `<div class="result-box reward">${t('spendRewardResult')(spendRes.card.client_name, spendRes.card.title || t('chipSpend'), escapeHtml(spendRes.bonusText) || t('spendDefaultBonus'))}
      <div class="bonus-earned">${t('bonusEarned')(spendRes.earned || 0, spendRes.times || 1, Math.round(spendRes.bonusBalance || 0))}</div></div>`;
  } else if (spendRes.target) {
    playBeep('ok');
    html = `<div class="result-box success">${t('spendProgressResult')(spendRes.card.client_name, fmtMoney(spendRes.accumulated), fmtMoney(spendRes.target), currencySymbol())}</div>`;
  } else {
    playBeep('ok');
    html = `<div class="result-box success">${t('spendTotalResult')(spendRes.card.client_name, fmtMoney(spendRes.accumulated), currencySymbol())}</div>`;
  }
  if (Math.round(spendRes.bonusBalance || 0) > 0) html += spendBonusBoxHtml(spendRes.card);
  html += tierNoteHtml(spendRes);
  html += `<button id="btn-undo-last-scan" class="btn-secondary btn-undo-scan">${t('btnUndoLastScan')}</button>`;

  if (spendRes.pendingGift) {
    html += `
      <div class="result-box gift-reminder">
        🎁 ${t('giftReminderText')(spendRes.pendingGift.gift_text)}
        <button id="btn-mark-gift-given-scan" data-gift="${spendRes.pendingGift.id}">${t('btnMarkGiftGiven')}</button>
      </div>`;
  }

  scanResultEl.innerHTML = html;

  const giftBtn = document.getElementById('btn-mark-gift-given-scan');
  if (giftBtn) {
    giftBtn.addEventListener('click', async () => {
      await window.api.markGiftGiven(Number(giftBtn.dataset.gift));
      giftBtn.closest('.gift-reminder').remove();
    });
  }

  document.getElementById('btn-undo-last-scan').addEventListener('click', async () => {
    if (!await uiConfirm(t('confirmUndoScan'))) return;
    const undoRes = await window.api.undoLastScan();
    if (undoRes.ok) {
      document.getElementById('btn-undo-last-scan').outerHTML = `<div class="hint">${t('undoScanDone')(escapeHtml(undoRes.clientName))}</div>`;
      refreshScanClientCards();
    }
  });
  showScanClientCards(spendRes.card.client_id, spendRes.card.id);
}

// ---------- сканирование через веб-камеру ----------
let scanning = false;
let videoStream = null;
const videoEl = document.getElementById('scan-video');

document.getElementById('btn-start-camera').addEventListener('click', async () => {
  if (typeof jsQR === 'undefined') await ensureJsQr();
  if (typeof jsQR === 'undefined') {
    uiAlert(t('cameraLibMissing'));
    return;
  }
  try {
    // Сначала пробуем заднюю камеру (телефоны), но НЕ как жёсткое требование —
    // на большинстве ноутбуков задней камеры нет, и жёсткое требование 'environment'
    // приводило к ошибке OverconstrainedError и молчаливому отказу камеры.
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
  } catch (err) {
    try {
      // Резервный вариант: любая доступная камера, без требований к направлению.
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err2) {
      console.error('[camera] getUserMedia failed:', err2.name, err2.message);
      uiAlert(t('cameraError') + `${err2.name}: ${err2.message}`);
      return;
    }
  }
  videoEl.srcObject = videoStream;
  videoEl.style.display = 'block';
  await videoEl.play();
  document.getElementById('btn-start-camera').style.display = 'none';
  document.getElementById('btn-stop-camera').style.display = 'inline-block';

  scanning = true;
  const scanCanvas = document.createElement('canvas');
  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

  const tick = () => {
    if (!scanning) return;
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA && videoEl.videoWidth > 0) {
      scanCanvas.width = videoEl.videoWidth;
      scanCanvas.height = videoEl.videoHeight;
      scanCtx.drawImage(videoEl, 0, 0, scanCanvas.width, scanCanvas.height);
      try {
        const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          stopCamera();
          handleScan(code.data);
          return;
        }
      } catch (err) {
        console.error('[camera] jsQR scan failed:', err);
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
});

document.getElementById('btn-stop-camera').addEventListener('click', stopCamera);

function stopCamera() {
  scanning = false;
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
  videoEl.style.display = 'none';
  document.getElementById('btn-start-camera').style.display = 'inline-block';
  document.getElementById('btn-stop-camera').style.display = 'none';
}

// ---------- настройки почты ----------
async function renderMailMode() {
  const st = await window.api.mailStatus();
  const s = await window.api.getSettings();
  const title = document.getElementById('mail-mode-title'), desc = document.getElementById('mail-mode-desc');
  const box = document.getElementById('mail-mode-box'), reset = document.getElementById('btn-mail-reset-default');
  box.classList.remove('mail-ok', 'mail-warn', 'mail-custom-on');
  if (st.mode === 'custom') {
    title.textContent = t('emailModeCustomTitle')(s.smtp_user || '');
    desc.textContent = t('emailModeCustomDesc');
    box.classList.add('mail-custom-on'); reset.style.display = '';
  } else if (!st.hasLicense) {
    title.textContent = t('emailModeNeedLicense'); desc.textContent = t('emailModeNeedLicenseDesc');
    box.classList.add('mail-warn'); reset.style.display = 'none';
  } else {
    title.textContent = t('emailModeDefaultTitle')(st.fromName); desc.textContent = t('emailModeDefaultDesc')(st.fromName);
    box.classList.add('mail-ok'); reset.style.display = 'none';
  }
  document.getElementById('mail-mode-ic').textContent = st.mode === 'custom' ? '📬' : (st.hasLicense ? '✅' : '⚠️');
  document.getElementById('mail-custom').open = st.mode === 'custom';
}

async function loadSettings() {
  const s = await window.api.getSettings();
  document.getElementById('s-host').value = s.smtp_host || '';
  document.getElementById('s-port').value = s.smtp_port || '587';
  document.getElementById('s-user').value = s.smtp_user || '';
  document.getElementById('s-pass').value = s.smtp_pass || '';
  document.getElementById('s-fromname').value = s.smtp_from_name || '';
  document.getElementById('s-replyto').value = s.reply_to_email || '';
  document.getElementById('s-sound-enabled').checked = s.sound_enabled !== '0';
  renderMailMode();
}

async function saveEmailSettingsForm() {
  const current = await window.api.getSettings();
  const host = document.getElementById('s-host').value.trim(), user = document.getElementById('s-user').value.trim(), pass = document.getElementById('s-pass').value;
  const customFilled = !!(host && user && pass);
  const patch = {
    ...current,
    smtp_host: host,
    smtp_port: document.getElementById('s-port').value.trim(),
    smtp_user: user,
    smtp_pass: pass,
    smtp_from_name: document.getElementById('s-fromname').value.trim(),
    reply_to_email: document.getElementById('s-replyto').value.trim(),
    sound_enabled: document.getElementById('s-sound-enabled').checked ? '1' : '0'
  };
  // Заполнили свою почту целиком — переключаемся на неё; иначе остаёмся на рабочей почте Loya.
  patch.mail_mode = customFilled ? 'custom' : 'default';
  await window.api.saveSettings(patch);
  soundEnabled = document.getElementById('s-sound-enabled').checked;
  renderMailMode();
}

document.getElementById('s-sound-enabled').addEventListener('change', async (e) => {
  soundEnabled = e.target.checked;
  try { await window.api.saveSettings({ sound_enabled: soundEnabled ? '1' : '0' }); } catch (err) { /* не критично */ }
});
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveEmailSettingsForm();
  document.getElementById('settings-status').textContent = t('settingsSaved');
  setTimeout(() => document.getElementById('settings-status').textContent = '', 2000);
});

document.getElementById('btn-mail-reset-default').addEventListener('click', async () => {
  await window.api.mailResetDefault();
  document.getElementById('settings-status').textContent = t('emailResetDone');
  setTimeout(() => document.getElementById('settings-status').textContent = '', 4000);
  renderMailMode();
});

document.getElementById('btn-send-test-email').addEventListener('click', async () => {
  const btn = document.getElementById('btn-send-test-email');
  const statusEl = document.getElementById('settings-status');
  await saveEmailSettingsForm(); // тестируем именно то, что сейчас в полях формы
  const s = await window.api.getSettings();
  const mode = (await window.api.mailStatus()).mode;
  let to = '';
  if (mode !== 'custom') {
    to = await uiPrompt(t('emailTestPrompt'), s.reply_to_email || '');
    if (to === null) return;
    to = to.trim();
  }
  btn.disabled = true;
  statusEl.textContent = t('testEmailSending');
  const res = await window.api.sendTestEmail(getLang(), to);
  if (res.error) {
    setErrStatus(statusEl, res.error, t('mailError'));
    // Неудача на своей почте — сразу показываем путь назад.
    if (mode === 'custom') document.getElementById('btn-mail-reset-default').style.display = '';
  } else {
    statusEl.textContent = t('testEmailSent');
    setTimeout(() => statusEl.textContent = '', 4000);
  }
  btn.disabled = false;
});

// 2.26: «Как клиент увидит письмо» — пример письма с картой в оформлении заведения, на телефоне и на компьютере.
async function openMailPreview() {
  let m = document.getElementById('lx-mailpv');
  if (!m) { m = document.createElement('div'); m.id = 'lx-mailpv'; m.className = 'lx-modal'; m.style.display = 'none'; document.body.appendChild(m); }
  m.innerHTML = `<div class="lx-box lx-wide mpv-box"><div class="lx-head"><b>👁 ${escapeHtml(t('mailPvTitle'))}</b><button type="button" class="lx-close" id="mpv-x">✕</button></div>
    <p class="hint mpv-hint">${escapeHtml(t('mailPvHint'))}</p>
    <div class="mpv-bar"><span class="mpv-subj" id="mpv-subj"></span><span class="mpv-seg" role="tablist"><button type="button" class="mpv-tab on" data-w="phone">📱 ${escapeHtml(t('mailPvPhone'))}</button><button type="button" class="mpv-tab" data-w="pc">🖥 ${escapeHtml(t('mailPvPc'))}</button></span></div>
    <div class="mpv-stage"><div class="mpv-device mpv-phone" id="mpv-device"><iframe id="mpv-frame" sandbox="" title="${escapeHtml(t('mailPvTitle'))}"></iframe></div></div>
    <div class="lx-actions"><button type="button" class="btn-secondary" id="mpv-brand">🎨 ${escapeHtml(t('mailPvBrand'))}</button><button type="button" id="mpv-send">✉️ ${escapeHtml(t('mailPvSend'))}</button></div></div>`;
  const close = () => { m.style.display = 'none'; };
  document.getElementById('mpv-x').addEventListener('click', close);
  m.addEventListener('click', (e) => { if (e.target === m) close(); });
  m.querySelectorAll('.mpv-seg button').forEach(b => b.addEventListener('click', () => {
    m.querySelectorAll('.mpv-seg button').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('mpv-device').className = 'mpv-device mpv-' + b.dataset.w;
  }));
  document.getElementById('mpv-send').addEventListener('click', () => { close(); document.getElementById('btn-send-test-email').click(); });
  document.getElementById('mpv-brand').addEventListener('click', () => { close(); openSettingsTile('settings-modal-brand'); });
  m.style.display = 'flex';
  const r = await window.api.mailPreview(getLang());
  const fr = document.getElementById('mpv-frame');
  if (!r || !r.ok) { fr.srcdoc = `<p style="font:14px Arial;padding:20px;color:#b91c1c">${escapeHtml((r && r.error) || t('mailError'))}</p>`; return; }
  document.getElementById('mpv-subj').textContent = t('mailPvSubject') + ': ' + r.subject;
  fr.srcdoc = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0">' + r.html;
}
document.getElementById('btn-mail-preview').addEventListener('click', openMailPreview);

document.getElementById('btn-com-congrats').addEventListener('click', async () => {
  const box = document.getElementById('client-of-month-box');
  const clientId = Number(box.dataset.clientId);
  const statusEl = document.getElementById('com-gift-status');
  if (!clientId) return;
  const giftText = document.getElementById('com-gift-input').value.trim();
  if (giftText && document.getElementById('com-gift-new-box').style.display !== 'none') { await window.api.saveClientGift({ clientId, giftText }); }
  const [c, mail, st] = await Promise.all([window.api.getClient(clientId), window.api.mailStatus(), window.api.getSettings()]);
  if (!c) return;
  const reach = { total: 1, unique: 1, email: c.email ? 1 : 0, telegram: c.telegram_chat_id ? 1 : 0, mailReady: !!mail.ready, telegramReady: !!st.telegram_bot_token, sendMode: st.send_mode || 'ask' };
  reach.none = reach.email || reach.telegram ? 0 : 1;
  const channels = await pickChannels({ reach, marketing: false, title: t('chTitleCongrats')(c.name) });
  if (!channels || channels.none) return;
  statusEl.textContent = t('mailSending');
  await syncMsgImages();
  const res = await window.api.msgCongrats({ clientId, channels, lang: getLang() });
  if (res.error) setErrStatus(statusEl, res.error, t('mailError')); else statusEl.textContent = sendResultText(res);
  if (!res.error) refreshDashboard();
});

document.getElementById('btn-save-gift').addEventListener('click', async () => {
  const clientId = Number(document.getElementById('client-of-month-box').dataset.clientId);
  const giftText = document.getElementById('com-gift-input').value.trim();
  if (!giftText) return;
  await window.api.saveClientGift({ clientId, giftText });
  const statusEl = document.getElementById('com-gift-status');
  statusEl.textContent = t('giftSaved');
  setTimeout(() => statusEl.textContent = '', 2000);
  refreshDashboard();
});

document.getElementById('btn-mark-gift-given').addEventListener('click', async () => {
  const giftId = Number(document.getElementById('com-gift-existing-box').dataset.giftId);
  if (!giftId) return;
  await window.api.markGiftGiven(giftId);
  refreshDashboard();
});

// ---------- Meniny (словацкий календарь именин) ----------
function renderNamedaySection(clients) {
  const box = document.getElementById('nameday-box');
  if (document.body.classList.contains('no-meniny')) { box.style.display = 'none'; return; }
  const names = todayNamedayNames();
  if (names.length === 0) {
    box.style.display = 'none';
    return;
  }
  const normNames = names.map(namedayNormalize);
  const matches = clients.filter(c => normNames.includes(namedayNormalize(namedayFirstName(c.name))));
  if (matches.length === 0) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('nameday-text').textContent = t('namedayText')(names.join(', '), matches.length);
  document.getElementById('nameday-list').innerHTML = matches.map(c => `
    <div class="top-row">
      <span>${escapeHtml(c.name)}</span>
      <span class="hint">${c.nameday_last_sent === today ? t('namedayAlreadySent') : (c.email || t('noEmail'))}</span>
    </div>
  `).join('');

  const toSend = matches.filter(c => (c.email || c.telegram_chat_id) && c.nameday_last_sent !== today).map(c => c.id);
  box.dataset.clientIds = JSON.stringify(toSend);
}

document.getElementById('btn-congratulate-nameday').addEventListener('click', async () => {
  const statusEl = document.getElementById('nameday-status');
  const clientIds = JSON.parse(document.getElementById('nameday-box').dataset.clientIds || '[]');
  if (clientIds.length === 0) {
    statusEl.textContent = t('namedayNoneToSend');
    return;
  }
  const giftType = document.getElementById('nameday-gift-select').value;
  const channels = await pickChannels({ clientIds, marketing: true, title: t('chTitleNameday') });
  if (!channels) return;
  if (channels.none) { statusEl.textContent = t('namedayNoneToSend'); return; }
  statusEl.textContent = t('congratulateSending');
  await syncMsgImages();
  const res = await window.api.sendNamedayAll({ clientIds, giftType, defaultLang: getLang(), channels });
  if (res && res.error === 'pro_only') { showFreeLimit('mail'); return; }
  if (res.error) {
    setErrStatus(statusEl, res.error, t('mailError'));
  } else {
    statusEl.textContent = sendResultText(res) || t('namedayNoneToSend');
    refreshDashboard();
  }
});

// ---------- погода ----------
const WEATHER_CODE_INFO = {
  ru: {
    clear: { icon: '☀️', text: 'Ясно' }, cloudy: { icon: '⛅', text: 'Облачно' },
    fog: { icon: '🌫️', text: 'Туман' }, drizzle: { icon: '🌦️', text: 'Морось' },
    rain: { icon: '🌧️', text: 'Дождь' }, snow: { icon: '🌨️', text: 'Снег' },
    showers: { icon: '🌧️', text: 'Ливень' }, storm: { icon: '⛈️', text: 'Гроза' }
  },
  sk: {
    clear: { icon: '☀️', text: 'Jasno' }, cloudy: { icon: '⛅', text: 'Oblačno' },
    fog: { icon: '🌫️', text: 'Hmla' }, drizzle: { icon: '🌦️', text: 'Mrholenie' },
    rain: { icon: '🌧️', text: 'Dážď' }, snow: { icon: '🌨️', text: 'Sneženie' },
    showers: { icon: '🌧️', text: 'Prehánky' }, storm: { icon: '⛈️', text: 'Búrka' }
  },
  uk: {
    clear: { icon: '☀️', text: 'Ясно' }, cloudy: { icon: '⛅', text: 'Хмарно' },
    fog: { icon: '🌫️', text: 'Туман' }, drizzle: { icon: '🌦️', text: 'Мряка' },
    rain: { icon: '🌧️', text: 'Дощ' }, snow: { icon: '🌨️', text: 'Сніг' },
    showers: { icon: '🌧️', text: 'Злива' }, storm: { icon: '⛈️', text: 'Гроза' }
  },
  en: {
    clear: { icon: '☀️', text: 'Clear' }, cloudy: { icon: '⛅', text: 'Cloudy' },
    fog: { icon: '🌫️', text: 'Fog' }, drizzle: { icon: '🌦️', text: 'Drizzle' },
    rain: { icon: '🌧️', text: 'Rain' }, snow: { icon: '🌨️', text: 'Snow' },
    showers: { icon: '🌧️', text: 'Showers' }, storm: { icon: '⛈️', text: 'Thunderstorm' }
  }
};

function weatherCodeInfo(code) {
  const dict = WEATHER_CODE_INFO[getLang()] || WEATHER_CODE_INFO.ru;
  if (code === 0) return dict.clear;
  if ([1, 2, 3].includes(code)) return dict.cloudy;
  if ([45, 48].includes(code)) return dict.fog;
  if ([51, 53, 55, 56, 57].includes(code)) return dict.drizzle;
  if ([61, 63, 65, 66, 67].includes(code)) return dict.rain;
  if ([71, 73, 75, 77].includes(code)) return dict.snow;
  if ([80, 81, 82].includes(code)) return dict.showers;
  if ([85, 86].includes(code)) return dict.snow;
  if ([95, 96, 99].includes(code)) return dict.storm;
  return dict.cloudy;
}

// Готовые тексты рассылок в зависимости от погоды (в них клиент может редактировать перед отправкой).
const WEATHER_CAMPAIGNS = {
  hot: {
    ru: { subject: 'Спасаемся от жары вместе! ☀️', body: 'Сегодня настоящая жара на улице! 🌞\nЗагляните к нам — внутри прохладно и уютно, ждём вас на {phrase} в Loya.\nБудем рады видеть вас в гостях! ❄️' },
    sk: { subject: 'Utečte pred horúčavou k nám! ☀️', body: 'Dnes je vonku poriadne teplo! 🌞\nZastavte sa u nás — vnútri je príjemný chládok, čakáme vás na {phrase} v Loya.\nTešíme sa na vašu návštevu! ❄️' },
    uk: { subject: 'Рятуємось від спеки разом! ☀️', body: 'Сьогодні справжня спека на вулиці! 🌞\nЗавітайте до нас — усередині прохолодно й затишно, чекаємо на вас на {phrase} у Loya.\nБудемо раді бачити вас у гостях! ❄️' },
    en: { subject: 'Beat the heat with us! ☀️', body: 'It\u2019s really hot outside today! 🌞\nStop by — it\u2019s cool and cozy inside, we\u2019re waiting for you for {phrase} at Loya.\nWe\u2019d love to see you! ❄️' }
  },
  cold: {
    ru: { subject: 'Согрейтесь у нас ☕', body: 'На улице прохладно и не очень уютно...\nЗайдите к нам согреться — заходите на {phrase}, уже ждём вас в Loya.\nБудем рады видеть вас в гостях! ☕🍰' },
    sk: { subject: 'Zohrejte sa u nás ☕', body: 'Vonku je chladno a nie veľmi príjemne...\nZastavte sa u nás zohriať — príďte na {phrase}, už na vás čakáme v Loya.\nTešíme sa na vašu návštevu! ☕🍰' },
    uk: { subject: 'Зігрійтесь у нас ☕', body: 'На вулиці прохолодно і не дуже затишно...\nЗавітайте до нас зігрітися — заходьте на {phrase}, вже чекаємо на вас у Loya.\nБудемо раді бачити вас у гостях! ☕🍰' },
    en: { subject: 'Come warm up with us ☕', body: 'It\u2019s a bit chilly and gloomy outside today...\nStop by to warm up — come in for {phrase}, we\u2019re waiting for you at Loya.\nWe\u2019d love to see you! ☕🍰' }
  },
  neutral: {
    ru: { subject: 'Отличная погода, чтобы заглянуть к нам ☀️', body: 'Сегодня на улице просто приятно! 😊\nИдеальный повод выйти на прогулку и заглянуть к нам на {phrase}.\nЖдём вас в гостях в Loya! ☕' },
    sk: { subject: 'Skvelé počasie na to, aby ste sa u nás zastavili ☀️', body: 'Dnes je vonku príjemne! 😊\nIdeálna príležitosť vyraziť na prechádzku a zastaviť sa u nás na {phrase}.\nTešíme sa na vašu návštevu v Loya! ☕' },
    uk: { subject: 'Чудова погода, щоб завітати до нас ☀️', body: 'Сьогодні на вулиці просто приємно! 😊\nІдеальний привід вийти на прогулянку і завітати до нас на {phrase}.\nЧекаємо на вас у Loya! ☕' },
    en: { subject: 'Great weather to stop by ☀️', body: 'It\u2019s just pleasant outside today! 😊\nA perfect reason to go for a walk and stop by for {phrase}.\nWe\u2019re looking forward to seeing you at Loya! ☕' }
  }
};

async function refreshOverdueClients() {
  const box = document.getElementById('overdue-box');
  const clients = await window.api.overdueClients();
  if (!clients || clients.length === 0) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';
  document.getElementById('overdue-list').innerHTML = clients.map(c => `
    <div class="activity-row">
      <span>${escapeHtml(c.name)}</span>
      <span class="activity-what">${t('overdueDaysText')(c.daysSinceLast, c.avgGap)}</span>
    </div>
  `).join('');
}

// значок уже стоит слева от заголовка — эмодзи из начала перевода убираем
const wxTitle = (k) => String(t(k)).replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '');
async function refreshWeather() {
  const box = document.getElementById('weather-box');
  // Погода: явно включили — показываем для любой ниши; явно выключили — прячем; не выбирали — как у ниши.
  if (features.weatherRaw === '0' || (features.weatherRaw !== '1' && !NichesModule.getNiche(currentNicheId).showWeatherWidget)) {
    box.style.display = 'none';
    return;
  }
  const res = await window.api.getWeather(getLang());
  if (res.notConfigured || res.error) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';
  const card = document.getElementById('weather-card');
  card.classList.remove('hot', 'cold', 'rainy');

  const info = weatherCodeInfo(res.weatherCode);
  document.getElementById('weather-icon').textContent = info.icon;
  document.getElementById('weather-city-name').textContent = res.city;
  document.getElementById('weather-temp').textContent = `${Math.round(res.tempC)}°C`;
  document.getElementById('weather-condition').textContent = info.text;

  const phrase = NichesModule.getInvitePhrase(currentNicheId, getLang());
  const suggestionBox = document.getElementById('weather-suggestion-box');
  if (res.suggestion === 'hot') {
    card.classList.add('hot');
    suggestionBox.style.display = 'flex';
    document.getElementById('weather-offer-icon').textContent = '🍋';
    document.getElementById('weather-offer-title').textContent = wxTitle('weatherHotOfferTitle');
    document.getElementById('weather-suggestion-text').textContent = t('weatherHotSuggestion')(Math.round(res.tempC), phrase);
    suggestionBox.dataset.kind = 'hot';
  } else if (res.suggestion === 'cold') {
    card.classList.add(res.precipitation > 0 ? 'rainy' : 'cold');
    suggestionBox.style.display = 'flex';
    document.getElementById('weather-offer-icon').textContent = '☕';
    document.getElementById('weather-offer-title').textContent = wxTitle('weatherColdOfferTitle');
    document.getElementById('weather-suggestion-text').textContent = t('weatherColdSuggestion')(Math.round(res.tempC), phrase);
    suggestionBox.dataset.kind = 'cold';
  } else {
    suggestionBox.style.display = 'flex';
    document.getElementById('weather-offer-icon').textContent = '😊';
    document.getElementById('weather-offer-title').textContent = wxTitle('weatherNeutralOfferTitle');
    document.getElementById('weather-suggestion-text').textContent = t('weatherNeutralSuggestion')(Math.round(res.tempC), phrase);
    suggestionBox.dataset.kind = 'neutral';
  }
}

document.getElementById('btn-weather-fill-campaign').addEventListener('click', () => {
  const kind = document.getElementById('weather-suggestion-box').dataset.kind;
  const tpl = WEATHER_CAMPAIGNS[kind] && (WEATHER_CAMPAIGNS[kind][getLang()] || WEATHER_CAMPAIGNS[kind].ru);
  if (!tpl) return;
  const phrase = NichesModule.getInvitePhrase(currentNicheId, getLang());
  document.querySelector('[data-view="campaigns"]').click();
  document.getElementById('seg-all').checked = true;
  SEGMENT_IDS.forEach(id => document.getElementById(id).checked = false);
  document.getElementById('campaign-subject').value = tpl.subject.replace(/Loya/g, currentBrandName);
  document.getElementById('campaign-body').value = tpl.body.replace(/Loya/g, currentBrandName).replace('{phrase}', phrase);
  document.getElementById('campaign-subject').focus();
});

// ---------- подключение телефона по WiFi ----------
async function loadPairingInfo() {
  const info = await window.api.pairingGetInfo();
  document.getElementById('pairing-url').textContent = info.url;
  document.getElementById('pairing-key').textContent = info.key;
  const qr = await window.api.qrDataUrl(JSON.stringify({ url: info.url, key: info.key }), { width: 260 });
  document.getElementById('pairing-qr').src = qr;
}


async function loadPhoneScanQr() {
  const info = await window.api.getPhoneScanInfo();
  const scanUrl = `${info.url}?key=${encodeURIComponent(info.key)}&lang=${getLang()}`;
  document.getElementById('phone-scan-url').textContent = info.url;
  const qr = await window.api.qrDataUrl(scanUrl, { width: 260 });
  document.getElementById('phone-scan-qr').src = qr;
}


// ---------- саморегистрация клиентов по QR ----------
async function loadSelfregSettings() {
  const s = await window.api.getSettings();
  renderSrBg().catch(() => {});
  document.getElementById('selfreg-card-type').value = ['discount', 'spend', 'combo'].includes(s.selfreg_card_type) ? s.selfreg_card_type : 'stamp';
  document.getElementById('selfreg-stamp-title').value = s.selfreg_stamp_title || '';
  document.getElementById('selfreg-stamp-target').value = s.selfreg_stamp_target || '10';
  document.getElementById('selfreg-discount-percent').value = s.selfreg_discount_percent || '5';
  document.getElementById('selfreg-spend-title').value = s.selfreg_spend_title || '';
  document.getElementById('selfreg-spend-target').value = s.selfreg_spend_target || '500';
  document.getElementById('selfreg-spend-points').value = s.selfreg_spend_points || '1';
  fillCurrencySelect(document.getElementById('selfreg-spend-currency'), s.spend_currency || 'EUR');
  document.getElementById('wifi-ssid-input').value = s.wifi_ssid || '';
  document.getElementById('wifi-password-input').value = s.wifi_password || '';
  document.getElementById('reg-text-heading').value = s.registration_heading || '';
  document.getElementById('reg-text-subtitle').value = s.registration_subtitle || '';
  document.getElementById('reg-text-button').value = s.registration_button_text || '';
  toggleSelfregCardFields();
}

function toggleSelfregCardFields() {
  const type = document.getElementById('selfreg-card-type').value;
  const st = type === 'stamp' || type === 'combo';
  document.getElementById('selfreg-stamp-fields').style.display = st ? 'flex' : 'none';
  document.getElementById('selfreg-stamp-target-field').style.display = st ? 'flex' : 'none';
  document.getElementById('selfreg-discount-field').style.display = type === 'discount' || type === 'combo' ? 'flex' : 'none';
  document.getElementById('selfreg-spend-title-field').style.display = type === 'spend' ? 'flex' : 'none';
  document.getElementById('selfreg-spend-target-field').style.display = type === 'spend' ? 'flex' : 'none';
  document.getElementById('selfreg-spend-points-field').style.display = type === 'spend' ? 'flex' : 'none';
  document.getElementById('selfreg-spend-currency-field').style.display = type === 'spend' ? 'flex' : 'none';
}

document.getElementById('selfreg-card-type').addEventListener('change', toggleSelfregCardFields);

document.getElementById('btn-save-selfreg').addEventListener('click', async () => {
  const current = await window.api.getSettings();
  await window.api.saveSettings({
    ...current,
    selfreg_card_type: document.getElementById('selfreg-card-type').value,
    selfreg_stamp_title: document.getElementById('selfreg-stamp-title').value.trim(),
    selfreg_stamp_target: document.getElementById('selfreg-stamp-target').value,
    selfreg_discount_percent: document.getElementById('selfreg-discount-percent').value,
    selfreg_spend_title: document.getElementById('selfreg-spend-title').value.trim(),
    selfreg_spend_target: document.getElementById('selfreg-spend-target').value,
    selfreg_spend_points: String(Math.max(1, Math.round(Number(document.getElementById('selfreg-spend-points').value) || 1))),
    spend_currency: document.getElementById('selfreg-spend-currency').value
  });
  currentSpendCurrency = document.getElementById('selfreg-spend-currency').value;
  const statusEl = document.getElementById('selfreg-status');
  statusEl.textContent = t('settingsSaved');
  setTimeout(() => statusEl.textContent = '', 2000);
});

document.getElementById('btn-save-wifi').addEventListener('click', async () => {
  const current = await window.api.getSettings();
  await window.api.saveSettings({
    ...current,
    wifi_ssid: document.getElementById('wifi-ssid-input').value.trim(),
    wifi_password: document.getElementById('wifi-password-input').value
  });
  loadSelfregQrCodes();
  const statusEl = document.getElementById('selfreg-status');
  statusEl.textContent = t('settingsSaved');
  setTimeout(() => statusEl.textContent = '', 2000);
});

document.getElementById('btn-save-regtext').addEventListener('click', async () => {
  const current = await window.api.getSettings();
  await window.api.saveSettings({
    ...current,
    registration_heading: document.getElementById('reg-text-heading').value.trim(),
    registration_subtitle: document.getElementById('reg-text-subtitle').value.trim(),
    registration_button_text: document.getElementById('reg-text-button').value.trim()
  });
  const statusEl = document.getElementById('regtext-status');
  statusEl.textContent = t('settingsSaved');
  setTimeout(() => statusEl.textContent = '', 2000);
});

document.getElementById('btn-preview-regpage').addEventListener('click', async () => {
  const url = document.getElementById('register-url').textContent;
  if (url && url !== '…') window.api.openExternal(`${url}?lang=${getLang()}`);
});

async function loadSelfregQrCodes() {
  const s = await window.api.getSettings();
  const info = await window.api.registerGetInfo();
  document.getElementById('register-url').textContent = info.url;

  const mi = window.api.selfregModeInfo ? await window.api.selfregModeInfo() : { mode: 'wifi' };
  const online = mi.mode === 'online' && mi.joinUrl;
  const regUrl = online ? `${mi.joinUrl}?lang=${getLang()}` : `${info.url}?lang=${getLang()}`;
  if (online) document.getElementById('register-url').textContent = mi.joinUrl;
  const regQr = await window.api.qrDataUrl(regUrl, { width: 260 });
  document.getElementById('register-qr').src = regQr;
  // Режим «через интернет»: вводный текст без Wi-Fi и без настроек гостевой сети.
  const srModal = document.getElementById('settings-modal-selfreg'); if (srModal) srModal.classList.toggle('sr-online', !!online);
  const intro = document.getElementById('selfreg-intro');
  // Без Wi-Fi остаётся один QR — подпись без номера шага.
  const rl = document.getElementById('register-qr-label');
  if (rl) { rl.dataset.i18n = online ? 'selfregQrOnline' : 'selfregQrStep2'; rl.textContent = t(rl.dataset.i18n); }
  if (intro) { intro.dataset.i18n = online || document.documentElement.classList.contains('platform-android') ? 'selfregHintOnline' : 'selfregHint'; intro.textContent = t(intro.dataset.i18n); }
  const wq = document.getElementById('wifi-qr'); if (wq) { const wb = wq.closest('.selfreg-qr-block'); if (wb) wb.classList.toggle('hidden-by-mode', !!online); }

  const wifiBlock = document.getElementById('wifi-qr').closest('.selfreg-qr-block');
  if (s.wifi_ssid) {
    // Экранируем спецсимволы формата WIFI-QR (; , : \) обратным слэшем — иначе телефон
    // может неверно разобрать поля SSID/пароля.
    const esc = (v) => String(v || '').replace(/([\\;,:"])/g, '\\$1');
    const wifiPayload = `WIFI:T:${s.wifi_password ? 'WPA' : 'nopass'};S:${esc(s.wifi_ssid)};P:${esc(s.wifi_password || '')};;`;
    const wifiQr = await window.api.qrDataUrl(wifiPayload, { width: 260 });
    document.getElementById('wifi-qr').src = wifiQr;
    wifiBlock.style.display = 'flex';
  } else {
    wifiBlock.style.display = 'none';
  }
}

async function loadWeatherSettings() {
  const s = await window.api.getSettings();
  document.getElementById('weather-city-input').value = s.weather_city || '';
  document.getElementById('weather-hot-input').value = s.weather_hot_threshold || '25';
  document.getElementById('weather-cold-input').value = s.weather_cold_threshold || '8';
}

document.getElementById('btn-save-weather-city').addEventListener('click', async () => {
  const statusEl = document.getElementById('weather-settings-status');
  const city = document.getElementById('weather-city-input').value.trim();
  const hot = document.getElementById('weather-hot-input').value;
  const cold = document.getElementById('weather-cold-input').value;
  const current = await window.api.getSettings();
  await window.api.saveSettings({ ...current, weather_hot_threshold: hot, weather_cold_threshold: cold });

  if (!city) {
    statusEl.textContent = t('settingsSaved');
    setTimeout(() => statusEl.textContent = '', 2000);
    return;
  }
  statusEl.textContent = t('weatherLookingUp');
  const res = await window.api.setWeatherCity(city, getLang());
  if (res.error) {
    setErrStatus(statusEl, res.error);
  } else {
    statusEl.textContent = t('weatherCityFound')(res.resolvedName);
    refreshWeather();
  }
});

// ---------- Meniny — автоматика (настройки) ----------
async function loadNamedayAutoSettings() {
  const s = await window.api.getSettings();
  document.getElementById('nameday-auto-enabled').checked = s.nameday_auto_enabled === '1';
  document.getElementById('nameday-auto-gift').value = s.nameday_auto_gift || '';
  document.getElementById('nameday-auto-time').value = s.nameday_auto_time || '09:00';
}

document.getElementById('btn-save-nameday-auto').addEventListener('click', async () => {
  const current = await window.api.getSettings();
  await window.api.saveSettings({
    ...current,
    nameday_auto_enabled: document.getElementById('nameday-auto-enabled').checked ? '1' : '',
    nameday_auto_gift: document.getElementById('nameday-auto-gift').value,
    nameday_auto_time: document.getElementById('nameday-auto-time').value
  });
  const statusEl = document.getElementById('nameday-auto-status');
  statusEl.textContent = t('settingsSaved');
  setTimeout(() => statusEl.textContent = '', 2000);
});

// ---------- Рассылки ----------
let clientsWithFlags = [];

// ---------- Рассылки: готовые тексты, имя клиента, предпросмотр, последние рассылки ----------
const CAMPAIGN_QUICK_TPLS = {
  ru: [
    { ic: '🎉', k: 'Скидка на выходные', s: 'Выходные в {brand}: скидка 15%', b: '{name}, в эти выходные дарим вам скидку 15% на всё. Покажите карту на кассе — и скидка ваша.\n\nЖдём вас на {phrase}!' },
    { ic: '💛', k: 'Скучаем', s: 'Мы скучаем по вам, {name}', b: 'Давно вас не видели! Заходите на этой неделе — к вашей карте добавим бонусный штамп.\n\nЖдём вас на {phrase}!' },
    { ic: '✨', k: 'Новинка', s: 'Новинка в {brand}', b: '{name}, у нас новинка — приходите попробовать первыми! Для владельцев карты лояльности — особая цена до конца недели.' },
    { ic: '⏰', k: 'Счастливые часы', s: 'Счастливые часы в {brand}', b: 'С 14:00 до 16:00 каждый визит по карте считается за два штампа. Хорошее время заглянуть, {name}!' },
    { ic: '🤝', k: 'Приведи друга', s: 'Приходите с другом', b: '{name}, приведите друга — и вы оба получите бонус на карту. Просто назовите своё имя на кассе.' },
    { ic: '🙏', k: 'Спасибо', s: 'Спасибо, что вы с нами', b: '{name}, спасибо, что выбираете {brand}! Это благодаря вам мы растём. До встречи!' }
  ],
  uk: [
    { ic: '🎉', k: 'Знижка на вихідні', s: 'Вихідні в {brand}: знижка 15%', b: '{name}, у ці вихідні даруємо вам знижку 15% на все. Покажіть картку на касі — і знижка ваша.\n\nЧекаємо вас на {phrase}!' },
    { ic: '💛', k: 'Сумуємо', s: 'Ми сумуємо за вами, {name}', b: 'Давно вас не бачили! Заходьте цього тижня — до вашої картки додамо бонусний штамп.\n\nЧекаємо вас на {phrase}!' },
    { ic: '✨', k: 'Новинка', s: 'Новинка в {brand}', b: '{name}, у нас новинка — приходьте скуштувати першими! Для власників картки лояльності — особлива ціна до кінця тижня.' },
    { ic: '⏰', k: 'Щасливі години', s: 'Щасливі години в {brand}', b: 'З 14:00 до 16:00 кожен візит за карткою рахується за два штампи. Гарний час зазирнути, {name}!' },
    { ic: '🤝', k: 'Приведи друга', s: 'Приходьте з другом', b: '{name}, приведіть друга — і ви обоє отримаєте бонус на картку. Просто назвіть своє ім’я на касі.' },
    { ic: '🙏', k: 'Дякуємо', s: 'Дякуємо, що ви з нами', b: '{name}, дякуємо, що обираєте {brand}! Це завдяки вам ми ростемо. До зустрічі!' }
  ],
  sk: [
    { ic: '🎉', k: 'Víkendová zľava', s: 'Víkend v {brand}: zľava 15 %', b: '{name}, tento víkend vám darujeme zľavu 15 % na všetko. Ukážte kartu pri pokladni a zľava je vaša.\n\nČakáme vás na {phrase}!' },
    { ic: '💛', k: 'Chýbate nám', s: 'Chýbate nám, {name}', b: 'Dlho sme sa nevideli! Príďte tento týždeň — na vašu kartu pridáme bonusovú pečiatku.\n\nČakáme vás na {phrase}!' },
    { ic: '✨', k: 'Novinka', s: 'Novinka v {brand}', b: '{name}, máme novinku — príďte ju ochutnať ako prví! Pre majiteľov vernostnej karty špeciálna cena do konca týždňa.' },
    { ic: '⏰', k: 'Šťastné hodiny', s: 'Šťastné hodiny v {brand}', b: 'Od 14:00 do 16:00 sa každá návšteva s kartou počíta za dve pečiatky. Dobrý čas zastaviť sa, {name}!' },
    { ic: '🤝', k: 'Priveď kamaráta', s: 'Príďte s kamarátom', b: '{name}, priveďte kamaráta — a obaja dostanete bonus na kartu. Stačí pri pokladni povedať vaše meno.' },
    { ic: '🙏', k: 'Ďakujeme', s: 'Ďakujeme, že ste s nami', b: '{name}, ďakujeme, že si vyberáte {brand}! Vďaka vám rastieme. Dovidenia!' }
  ],
  en: [
    { ic: '🎉', k: 'Weekend discount', s: 'Weekend at {brand}: 15% off', b: '{name}, this weekend you get 15% off everything. Just show your card at the counter.\n\nWe’re waiting for you for {phrase}!' },
    { ic: '💛', k: 'We miss you', s: 'We miss you, {name}', b: 'It’s been a while! Drop by this week and we’ll add a bonus stamp to your card.\n\nWe’re waiting for you for {phrase}!' },
    { ic: '✨', k: 'Something new', s: 'Something new at {brand}', b: '{name}, we’ve got something new — come and try it first! Loyalty card holders get a special price until the end of the week.' },
    { ic: '⏰', k: 'Happy hours', s: 'Happy hours at {brand}', b: 'From 2 to 4 pm every card visit counts as two stamps. A great time to drop by, {name}!' },
    { ic: '🤝', k: 'Bring a friend', s: 'Come with a friend', b: '{name}, bring a friend and you both get a bonus on your card. Just say your name at the counter.' },
    { ic: '🙏', k: 'Thank you', s: 'Thank you for being with us', b: '{name}, thank you for choosing {brand}! We grow thanks to you. See you soon!' }
  ]
};
// 2.28: праздничные тексты и картинки к рассылкам — по тому же календарю, что и оформление карт (LoyaCard.seasonFor).
const SEASON_TPLS = {
  ru: {
    xmas: { k: 'Рождество', s: 'Рождество в {brand} 🎄', b: '{name}, в {brand} уже пахнет Рождеством! Приходите за праздничным настроением — по карте лояльности вас ждёт приятный подарок.\n\nЖдём вас на {phrase}!' },
    newyear: { k: 'Новый год', s: 'С наступающим Новым годом! 🎆', b: '{name}, спасибо, что были с нами весь год! Желаем тепла и радости в новом году — и ждём в {brand} за первым штампом года.' },
    winter: { k: 'Зимнее тепло', s: 'Согреем вас в {brand} ❄️', b: '{name}, на улице холодно, а у нас тепло и уютно. Заходите погреться — по карте вас ждёт бонус до конца недели.' },
    valentine: { k: 'День влюблённых', s: 'Приходите вдвоём 💘', b: '{name}, в День влюблённых приходите в {brand} вдвоём — второму гостю бонусный штамп на карту.' },
    march8: { k: '8 Марта', s: 'С 8 Марта! 🌷', b: '{name}, поздравляем с праздником весны! В эти дни в {brand} для вас приятный сюрприз — просто покажите карту.' },
    easter: { k: 'Пасха', s: 'Светлой Пасхи! 🥚', b: '{name}, поздравляем с Пасхой! Ждём вас в {brand} на праздничных выходных — по карте лояльности приготовили подарок.' },
    spring: { k: 'Весна', s: 'Весна в {brand} 🌸', b: '{name}, пришла весна! Заходите в {brand} за весенним настроением — добавим бонусный штамп на карту.' },
    summer: { k: 'Лето', s: 'Летнее предложение в {brand} ☀️', b: '{name}, лето в разгаре! Освежитесь у нас — по карте лояльности летний бонус до конца недели.' },
    autumn: { k: 'Осень', s: 'Уютная осень в {brand} 🍂', b: '{name}, осень — лучшее время для тёплых встреч. Заходите — по карте вас ждёт осенний бонус.' },
    halloween: { k: 'Хэллоуин', s: 'Хэллоуин в {brand} 🎃', b: '{name}, приходите на Хэллоуин в костюме — и получите двойной штамп на карту! Без костюма тоже рады 😉' }
  },
  uk: {
    xmas: { k: 'Різдво', s: 'Різдво в {brand} 🎄', b: '{name}, у {brand} вже пахне Різдвом! Приходьте за святковим настроєм — за карткою лояльності на вас чекає приємний подарунок.\n\nЧекаємо вас на {phrase}!' },
    newyear: { k: 'Новий рік', s: 'З наступаючим Новим роком! 🎆', b: '{name}, дякуємо, що були з нами весь рік! Бажаємо тепла й радості в новому році — і чекаємо в {brand} за першим штампом року.' },
    winter: { k: 'Зимове тепло', s: 'Зігріємо вас у {brand} ❄️', b: '{name}, надворі холодно, а в нас тепло й затишно. Заходьте погрітися — за карткою на вас чекає бонус до кінця тижня.' },
    valentine: { k: 'День закоханих', s: 'Приходьте удвох 💘', b: '{name}, у День закоханих приходьте в {brand} удвох — другому гостю бонусний штамп на картку.' },
    march8: { k: '8 Березня', s: 'З 8 Березня! 🌷', b: '{name}, вітаємо зі святом весни! Цими днями в {brand} для вас приємний сюрприз — просто покажіть картку.' },
    easter: { k: 'Великдень', s: 'Світлого Великодня! 🥚', b: '{name}, вітаємо з Великоднем! Чекаємо вас у {brand} на святкових вихідних — за карткою лояльності приготували подарунок.' },
    spring: { k: 'Весна', s: 'Весна в {brand} 🌸', b: '{name}, прийшла весна! Заходьте в {brand} по весняний настрій — додамо бонусний штамп на картку.' },
    summer: { k: 'Літо', s: 'Літня пропозиція в {brand} ☀️', b: '{name}, літо в розпалі! Освіжіться в нас — за карткою лояльності літній бонус до кінця тижня.' },
    autumn: { k: 'Осінь', s: 'Затишна осінь у {brand} 🍂', b: '{name}, осінь — найкращий час для теплих зустрічей. Заходьте — за карткою на вас чекає осінній бонус.' },
    halloween: { k: 'Гелловін', s: 'Гелловін у {brand} 🎃', b: '{name}, приходьте на Гелловін у костюмі — і отримайте подвійний штамп на картку! Без костюма теж раді 😉' }
  },
  sk: {
    xmas: { k: 'Vianoce', s: 'Vianoce v {brand} 🎄', b: '{name}, v {brand} už voňajú Vianoce! Príďte po sviatočnú náladu — s vernostnou kartou na vás čaká milý darček.\n\nČakáme vás na {phrase}!' },
    newyear: { k: 'Nový rok', s: 'Šťastný nový rok! 🎆', b: '{name}, ďakujeme, že ste boli s nami celý rok! Prajeme vám veľa tepla a radosti v novom roku — a čakáme vás v {brand} na prvú pečiatku roka.' },
    winter: { k: 'Zimné teplo', s: 'Zahrejeme vás v {brand} ❄️', b: '{name}, vonku je zima, u nás teplo a útulne. Príďte sa zahriať — s kartou na vás do konca týždňa čaká bonus.' },
    valentine: { k: 'Valentín', s: 'Príďte vo dvojici 💘', b: '{name}, na Valentína príďte do {brand} vo dvojici — druhý hosť dostane bonusovú pečiatku na kartu.' },
    march8: { k: 'MDŽ', s: 'Všetko najlepšie k MDŽ! 🌷', b: '{name}, blahoželáme k sviatku! V týchto dňoch na vás v {brand} čaká milé prekvapenie — stačí ukázať kartu.' },
    easter: { k: 'Veľká noc', s: 'Požehnanú Veľkú noc! 🥚', b: '{name}, prajeme krásnu Veľkú noc! Čakáme vás v {brand} cez sviatočný víkend — s vernostnou kartou máme pre vás darček.' },
    spring: { k: 'Jar', s: 'Jar v {brand} 🌸', b: '{name}, prišla jar! Príďte do {brand} po jarnú náladu — pridáme vám bonusovú pečiatku na kartu.' },
    summer: { k: 'Leto', s: 'Letná ponuka v {brand} ☀️', b: '{name}, leto je v plnom prúde! Osviežte sa u nás — s vernostnou kartou letný bonus do konca týždňa.' },
    autumn: { k: 'Jeseň', s: 'Útulná jeseň v {brand} 🍂', b: '{name}, jeseň je najlepší čas na teplé stretnutia. Príďte — s kartou na vás čaká jesenný bonus.' },
    halloween: { k: 'Halloween', s: 'Halloween v {brand} 🎃', b: '{name}, príďte na Halloween v kostýme — a dostanete dvojitú pečiatku na kartu! Aj bez kostýmu ste vítaní 😉' }
  },
  en: {
    xmas: { k: 'Christmas', s: 'Christmas at {brand} 🎄', b: '{name}, it already smells like Christmas at {brand}! Come for some festive cheer — a little gift is waiting on your loyalty card.\n\nWe’re waiting for you for {phrase}!' },
    newyear: { k: 'New Year', s: 'Happy New Year! 🎆', b: '{name}, thank you for being with us all year! Wishing you warmth and joy in the new year — come to {brand} for your first stamp of the year.' },
    winter: { k: 'Winter warmth', s: 'Warm up at {brand} ❄️', b: '{name}, it’s cold outside and cosy in here. Drop by to warm up — a bonus is waiting on your card until the end of the week.' },
    valentine: { k: 'Valentine’s Day', s: 'Come as a couple 💘', b: '{name}, on Valentine’s Day come to {brand} together — the second guest gets a bonus stamp.' },
    march8: { k: '8 March', s: 'Happy Women’s Day! 🌷', b: '{name}, happy 8 March! These days a nice surprise is waiting for you at {brand} — just show your card.' },
    easter: { k: 'Easter', s: 'Happy Easter! 🥚', b: '{name}, happy Easter! Come to {brand} over the holiday weekend — there’s a gift on your loyalty card.' },
    spring: { k: 'Spring', s: 'Spring at {brand} 🌸', b: '{name}, spring is here! Come to {brand} for a spring mood — we’ll add a bonus stamp to your card.' },
    summer: { k: 'Summer', s: 'Summer offer at {brand} ☀️', b: '{name}, summer is in full swing! Cool down with us — a summer bonus on your loyalty card until the end of the week.' },
    autumn: { k: 'Autumn', s: 'Cosy autumn at {brand} 🍂', b: '{name}, autumn is the best time for warm get-togethers. Drop by — an autumn bonus is waiting on your card.' },
    halloween: { k: 'Halloween', s: 'Halloween at {brand} 🎃', b: '{name}, come in costume on Halloween and get a double stamp! No costume? You’re welcome too 😉' }
  }
};
const SEASON_EMOJI = { xmas: '🎄', newyear: '🎆', winter: '❄️', valentine: '💘', march8: '🌷', easter: '🥚', spring: '🌸', summer: '☀️', autumn: '🍂', halloween: '🎃' };
const SEASON_COL = { xmas: { a: '#d24b2f', b: '#2f8f5b' }, newyear: { a: '#f4cf5b', b: '#7c4dff' }, winter: { a: '#8fd3ff', b: '#4fc3f7' }, valentine: { a: '#ff4f86', b: '#ff9eb8' }, march8: { a: '#ff8fb1', b: '#ffd54a' },
  easter: { a: '#9be37a', b: '#ffd27a' }, spring: { a: '#ff9ec4', b: '#9be37a' }, summer: { a: '#ffd54a', b: '#2ec5c5' }, autumn: { a: '#ff8a3d', b: '#c0392b' }, halloween: { a: '#ff7a1a', b: '#7b3fbf' } };
// Праздничная сцена 400×400 из тех же значков, что и на картах (вектор, без интернета).
function seasonSceneSvg(season) {
  const g = (id, x, y, s, c, k, rot) => `<g transform="rotate(${rot || 0} ${x} ${y})">${LoyaCard.glyph(id, x, y, s, c, k || 'rgba(255,255,255,.85)')}</g>`;
  const star = (x, y, r, c) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); } return `<path d="${d}Z" fill="${c}"/>`; };
  const burst = (x, y, r, c) => Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${(x + Math.cos(a) * r * .35).toFixed(1)} ${(y + Math.sin(a) * r * .35).toFixed(1)}L${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`; }).join('');
  let b = '';
  if (season === 'xmas') {
    b = `<rect x="186" y="300" width="28" height="40" rx="5" fill="#7a5236"/><path d="M200 60 L300 200 H100 Z" fill="#2f8f5b"/><path d="M200 130 L320 290 H80 Z" fill="#267a4c"/>` +
      [[160, 190, '#d24b2f'], [240, 210, '#f4cf5b'], [200, 250, '#ffffff'], [130, 270, '#f4cf5b'], [270, 268, '#d24b2f'], [215, 160, '#d24b2f']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/>`).join('') + star(200, 58, 30, '#f4cf5b');
  } else if (season === 'newyear') {
    b = burst(110, 110, 70, '#f4cf5b') + burst(300, 90, 55, '#ff6fa8') + g('wine', 165, 255, 150, '#f4cf5b', null, -14) + g('wine', 245, 255, 150, '#ffffff', null, 14) + star(320, 230, 18, '#8fd3ff') + star(80, 250, 14, '#ffffff');
  } else if (season === 'winter') {
    b = g('snowflake', 200, 185, 210, '#ffffff') + g('snowflake', 80, 90, 60, '#8fd3ff') + g('snowflake', 330, 300, 70, '#8fd3ff') + g('coffee', 300, 110, 90, '#ffffff', '#4fc3f7');
  } else if (season === 'valentine') {
    b = g('heart', 200, 210, 250, '#ff4f86') + g('heart', 90, 100, 80, '#ff9eb8', null, -15) + g('heart', 320, 110, 64, '#ffffff', null, 15) + g('heart', 320, 310, 50, '#ff9eb8', null, 10);
  } else if (season === 'march8') {
    const tulip = (x, y, s, c, rot) => `<g transform="rotate(${rot} ${x} ${y + s * 1.6})"><path d="M${x} ${y} q ${-s * .1} ${s * .9} ${s * .05} ${s * 1.6}" stroke="#5aa84a" stroke-width="${s * .09}" fill="none"/><path d="M${x + s * .05} ${y + s * 1.1} q ${s * .45} ${-s * .2} ${s * .5} ${-s * .7} q ${-s * .4} ${s * .1} ${-s * .5} ${s * .7}" fill="#6cc25a"/><path d="M${x - s * .32} ${y - s * .5} q 0 ${s * .55} ${s * .32} ${s * .55} q ${s * .32} 0 ${s * .32} ${-s * .55} l ${-s * .16} ${s * .16} l ${-s * .16} ${-s * .26} l ${-s * .16} ${s * .26} z" fill="${c}"/></g>`;
    b = tulip(150, 120, 110, '#ff6fa8', -18) + tulip(250, 110, 110, '#ffd54a', 18) + tulip(200, 90, 120, '#ff8fb1', 0) + `<path d="M150 330 L250 330 L215 270 L185 270 Z" fill="#ffffff" opacity=".9"/>`;
  } else if (season === 'easter') {
    b = `<path d="M40 330 Q 200 270 360 330 L360 360 L40 360 Z" fill="#6cc25a"/>` + g('egg', 130, 250, 140, '#ffd27a', null, -12) + g('egg', 270, 250, 140, '#ff9ec4', null, 12) + g('egg', 200, 215, 160, '#8fd3ff') + star(320, 110, 16, '#ffffff');
  } else if (season === 'spring') {
    b = `<path d="M60 340 C 140 260 200 220 330 90" stroke="#7a5236" stroke-width="10" fill="none" stroke-linecap="round"/>` + g('flower', 330, 95, 110, '#ff9ec4', '#ffd54a') + g('flower', 220, 190, 120, '#ffffff', '#ffd54a') + g('flower', 120, 270, 100, '#ffc1d9', '#ffd54a') + g('leaf', 280, 220, 70, '#6cc25a', null, 40) + g('leaf', 170, 150, 60, '#6cc25a', null, -60);
  } else if (season === 'summer') {
    b = `<circle cx="150" cy="150" r="78" fill="#ffd54a"/>` + burst(150, 150, 130, '#ffd54a') + g('icecream', 270, 250, 190, '#ff9ec4', '#ffffff', 10) + `<path d="M20 345 q 45 -22 90 0 t 90 0 t 90 0 t 90 0 V 400 H 20 Z" fill="#2ec5c5" opacity=".75"/>`;
  } else if (season === 'autumn') {
    b = g('leaf', 140, 140, 170, '#ff8a3d', null, -20) + g('leaf', 270, 120, 120, '#c0392b', null, 40) + g('leaf', 290, 260, 110, '#f4b400', null, 100) + g('coffee', 150, 280, 140, '#ffffff', '#ff8a3d');
  } else if (season === 'halloween') {
    b = `<circle cx="290" cy="110" r="60" fill="#ffe9a8"/>` + g('pumpkin', 190, 250, 230, '#ff7a1a', '#3a1f05') +
      `<path d="M150 235 l 18 -22 l 18 22 z M212 235 l 18 -22 l 18 22 z M150 280 q 50 30 100 0 l -12 14 l -12 -10 l -14 12 l -12 -12 l -14 12 l -12 -10 z" fill="#3a1f05"/>` +
      `<path d="M90 90 q -14 -20 -32 -11 q 6 6 0 14 q -9 -3 -18 6 q 21 -3 30 11 q 5 -9 20 -11 q 15 2 20 11 q 9 -14 30 -11 q -9 -9 -18 -6 q -6 -8 0 -14 q -18 -9 -32 11 z" fill="#1b1225"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">${b}</svg>`;
}
function renderCampaignTpls() {
  const box = document.getElementById('campaign-tpls'); if (!box) return;
  const list = CAMPAIGN_QUICK_TPLS[document.getElementById('campaign-lang-select').value] || CAMPAIGN_QUICK_TPLS[getLang()] || CAMPAIGN_QUICK_TPLS.ru;
  const lang0 = document.getElementById('campaign-lang-select').value;
  const se = window.LoyaCard ? LoyaCard.seasonFor(new Date()) : '';
  const st = se && (SEASON_TPLS[lang0] || SEASON_TPLS[getLang()] || SEASON_TPLS.ru)[se];
  box.innerHTML = `<span class="campaign-tpls-label">${escapeHtml(t('cpReadyTexts'))}</span>` + (st ? `<button type="button" class="cp-tpl cp-tpl-season" data-season="${se}" title="${escapeHtml(t('cpSeasonTip'))}">${SEASON_EMOJI[se] || '🎉'} ${escapeHtml(st.k)}</button>` : '') + list.map((x, i) => `<button type="button" class="cp-tpl" data-i="${i}">${x.ic} ${escapeHtml(x.k)}</button>`).join('');
  const sb = box.querySelector('.cp-tpl-season');
  if (sb) sb.addEventListener('click', async () => {
    const subj = document.getElementById('campaign-subject'), body = document.getElementById('campaign-body');
    if ((subj.value.trim() || body.value.trim()) && !await uiConfirm(t('cpReplaceText'))) return;
    const lang = document.getElementById('campaign-lang-select').value;
    const x = (SEASON_TPLS[lang] || SEASON_TPLS.ru)[se];
    subj.value = x.s.replace(/\{brand\}/g, currentBrandName);
    body.value = x.b.replace(/\{brand\}/g, currentBrandName).replace('{phrase}', NichesModule.getInvitePhrase(currentNicheId, lang));
    body.focus();
    campaignImgRemoved = false;
    setCampaignTplImage({ k: x.k, ic: '✨' }, lang, null, se);
  });
  box.querySelectorAll('.cp-tpl').forEach(b => b.addEventListener('click', async () => {
    const subj = document.getElementById('campaign-subject'), body = document.getElementById('campaign-body');
    if ((subj.value.trim() || body.value.trim()) && !await uiConfirm(t('cpReplaceText'))) return;
    const x = list[Number(b.dataset.i)];
    const lang = document.getElementById('campaign-lang-select').value;
    const phrase = NichesModule.getInvitePhrase(currentNicheId, lang);
    subj.value = x.s.replace(/\{brand\}/g, currentBrandName);
    body.value = x.b.replace(/\{brand\}/g, currentBrandName).replace('{phrase}', phrase);
    body.focus();
    // v2.16: к готовому тексту — картинка по теме (можно убрать или заменить своей).
    campaignImgRemoved = false;
    setCampaignTplImage(x, lang, CP_TPL_SCENES[Number(b.dataset.i)]);
  }));
}
document.getElementById('campaign-lang-select').addEventListener('change', (e) => { e.target.dataset.touched = '1'; renderCampaignTpls(); });
document.getElementById('btn-cp-insert-name').addEventListener('click', () => {
  const ta = document.getElementById('campaign-body');
  const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, a) + '{name}' + ta.value.slice(b);
  ta.focus(); ta.selectionStart = ta.selectionEnd = a + 6;
});
function cpLinkify(txt) { return escapeHtml(txt).replace(/(https?:\/\/[^\s<]+)/g, '<a href="#" class="cp-link">$1</a>'); }
document.getElementById('btn-cp-preview').addEventListener('click', async () => {
  await ensureCampaignImage();
  const lang = document.getElementById('campaign-lang-select').value;
  const sel = getSelectedCampaignClients();
  const name = (sel.find(c => c.email) || sel[0] || {}).name || t('cpSampleName');
  const subj = document.getElementById('campaign-subject').value.trim() || t('phCampaignSubject');
  const body = document.getElementById('campaign-body').value;
  const usesName = /\{name\}/i.test(body);
  const hello = { sk: 'Dobrý deň', uk: 'Доброго дня', en: 'Hello', ru: 'Здравствуйте' }[lang] || 'Здравствуйте';
  const lines = body.split('\n').filter(l => l.trim()).map(l => `<p>${cpLinkify(l).replace(/\{name\}/gi, escapeHtml(name))}</p>`).join('') || `<p class="cp-empty">${escapeHtml(t('cpPreviewEmpty'))}</p>`;
  const img = campaignFiles.map(f => /^data:image\//.test(f.dataUrl) ? `<p><img src="${f.dataUrl}" alt=""></p>` : `<p class="cp-file">📎 ${escapeHtml(f.name)}</p>`).join('');
  document.getElementById('cp-preview-body').innerHTML = `
    <div class="cp-mail">
      <div class="cp-mail-head"><div class="cp-mail-av">${currentBrandLogo ? `<img src="${currentBrandLogo}" alt="">` : escapeHtml(currentBrandName.charAt(0).toUpperCase())}</div>
        <div><b>${escapeHtml(currentBrandName)}</b><span>${escapeHtml(t('cpTo'))}: ${escapeHtml(name)}</span></div></div>
      <div class="cp-mail-subj">${escapeHtml(subj.replace(/\{name\}/gi, name))}</div>
      <div class="cp-mail-body">${usesName ? '' : `<p>${hello}, ${escapeHtml(name)}!</p>`}${lines}${img}</div>
      <div class="cp-mail-foot">${escapeHtml(t('cpUnsubNote'))}</div>
    </div>`;
  lxOpen('lx-cpreview');
});
async function renderCampaignRecent() {
  const box = document.getElementById('campaign-recent'); if (!box || !window.api.campaignReport) return;
  let rep;
  try { rep = await window.api.campaignReport(7); } catch (e) { return; }
  const items = ((rep && rep.items) || (Array.isArray(rep) ? rep : [])).filter(x => x.kind !== 'auto').slice(0, 5);
  if (!items.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="campaign-recent-head"><b>${escapeHtml(t('cpRecentTitle'))}</b><span class="hint">${escapeHtml(t('cpRecentHint'))}</span></div>` +
    items.map(x => `<div class="cp-recent-row"><span class="cp-recent-title">${escapeHtml(x.title || '—')}</span>
      <span class="cp-recent-meta">${escapeHtml(formatDateShort(String(x.createdAt || '').slice(0, 10)))} · ${escapeHtml(String(x.channels || '').replace('+', ' + '))}</span>
      <span class="cp-recent-num">👥 ${x.recipients || 0}</span>
      <span class="cp-recent-num cp-recent-ret" title="${escapeHtml(t('cpRecentHint'))}">↩ ${x.returned || 0} · ${x.rate || 0}%${x.inProgress ? ' …' : ''}</span></div>`).join('');
}

async function refreshCampaignSegments() {
  clientsWithFlags = await window.api.clientsWithFlags();
  updateCampaignRecipientCount();
  renderCampaignTpls();
  renderCampaignRecent();
}

// Все сегменты получателей рассылки (кроме «Все клиенты»), включая «умные».
const SEGMENT_IDS = ['seg-active', 'seg-inactive', 'seg-birthday', 'seg-vip', 'seg-near', 'seg-newbie', 'seg-risk', 'seg-fans'];

function getSelectedCampaignClients() {
  const all = document.getElementById('seg-all').checked;
  const active = document.getElementById('seg-active').checked;
  const inactive = document.getElementById('seg-inactive').checked;
  const birthday = document.getElementById('seg-birthday').checked;
  const vip = document.getElementById('seg-vip').checked;
  const near = document.getElementById('seg-near').checked;
  const newbie = document.getElementById('seg-newbie').checked;
  const risk = document.getElementById('seg-risk').checked;
  const fans = document.getElementById('seg-fans').checked;
  let result = all ? clientsWithFlags : clientsWithFlags.filter(c =>
    (active && c.isActive) || (inactive && c.isInactive) || (birthday && c.isBirthdaySoon) || (vip && c.isVIP)
    || (near && c.isNearReward) || (newbie && c.isNewNoReturn) || (risk && c.isAtRisk) || (fans && c.isFan)
  );
  const langFilterOn = document.getElementById('campaign-lang-filter').checked;
  if (langFilterOn) {
    const lang = document.getElementById('campaign-lang-select').value;
    // Клиент без выбранного языка получает письма на языке программы — его тоже считаем.
    result = result.filter(c => (c.preferred_language || getLang()) === lang);
  }
  return result;
}

function updateCampaignRecipientCount() {
  const selected = getSelectedCampaignClients();
  const withEmail = selected.filter(c => c.email);
  document.getElementById('campaign-recipient-count').textContent = t('campaignRecipients')(selected.length, withEmail.length);
}

['seg-all', ...SEGMENT_IDS].forEach(id => {
  document.getElementById(id).addEventListener('change', (e) => {
    if (id === 'seg-all' && e.target.checked) {
      SEGMENT_IDS.forEach(o => document.getElementById(o).checked = false);
    } else if (id !== 'seg-all' && e.target.checked) {
      document.getElementById('seg-all').checked = false;
    }
    updateCampaignRecipientCount();
  });
});
document.getElementById('campaign-lang-select').addEventListener('change', updateCampaignRecipientCount);
document.getElementById('campaign-lang-filter').addEventListener('change', updateCampaignRecipientCount);

// ---------- вложение к рассылке ----------
// 2.25: к рассылке можно приложить несколько картинок и файлов (до 6, всего до 20 МБ).
let campaignFiles = []; // [{ name, dataUrl, auto? }]
const CP_MAX_FILES = 6, CP_MAX_BYTES = 20 * 1024 * 1024;
let campaignImgRemoved = false;   // 2.27: владелец сам убрал картинку — не добавляем её снова
function cpImgTitle(subj) { return String(subj || '').replace(/\{name\}/gi, '').replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').replace(/^[\s,.!:—-]+|[\s,:—-]+$/g, '').replace(/\s{2,}/g, ' ').trim().replace(/^\p{Ll}/u, (c) => c.toUpperCase()); }
// 2.27: каждое сообщение — с картинкой: если ни готового текста, ни своей картинки нет, рисуем по теме письма.
async function ensureCampaignImage() {
  if (campaignFiles.length || campaignImgRemoved) return;
  const subj = cpImgTitle(document.getElementById('campaign-subject').value);
  if (!subj) return;
  await setCampaignTplImage({ k: subj, ic: '✨' }, document.getElementById('campaign-lang-select').value || getLang(), 'letter');
}
const CP_TPL_ART = { '🎉': ['🎉', '🏷️', '✨'], '💛': ['💛', '👋', 'NICHE'], '✨': ['✨', '🆕', 'NICHE'], '⏰': ['⏰', '⭐', '✨'], '🤝': ['🤝', '💛', '🎁'], '🙏': ['🙏', '💛', '✨'] };
async function setCampaignTplImage(x, lang, scene, season) {
  const st = await window.api.getSettings();
  if (st.msg_images === '0') return;
  if (campaignFiles.some(f => !f.auto)) return;   // свои вложения не трогаем
  const cv = await drawMsgImage('campaign', lang, { title: x.k, emojis: CP_TPL_ART[x.ic] || [x.ic, '✨', '💛'], seed: x.ic, scene, season });
  const dataUrl = canvasToLimitedUrl(cv, 'image/jpeg', 880 * 1024, [1, 0.8]);
  if (!dataUrl) return;
  campaignFiles = [{ name: 'loya-' + Date.now() + '.jpg', dataUrl, auto: true }];
  showCampaignAttachment();
}
function showCampaignAttachment() {
  const previewEl = document.getElementById('campaign-attachment-preview');
  if (!campaignFiles.length) { previewEl.innerHTML = ''; if (typeof renderCampaignPreview === 'function') try { renderCampaignPreview(); } catch (e) { /* нет */ } return; }
  previewEl.innerHTML = `<div class="cp-files">${campaignFiles.map((f, i) => {
    const isImg = /^data:image\//.test(f.dataUrl);
    return `<div class="cp-file-item${f.auto ? ' auto' : ''}">${isImg ? `<img class="cp-att-thumb" src="${f.dataUrl}" alt="">` : '<span class="cp-file-ic">📎</span>'}
      <span class="cp-file-name">${f.auto ? escapeHtml(t('cpAutoImg')) : escapeHtml(f.name)}</span>
      <button type="button" class="cp-file-x" data-i="${i}" title="${escapeHtml(t('cpRemoveImg'))}">✕</button></div>`;
  }).join('')}</div>${campaignFiles.length < CP_MAX_FILES ? `<span class="hint cp-files-hint">${escapeHtml(t('cpFilesHint')(campaignFiles.length, CP_MAX_FILES))}</span>` : ''}`;
  previewEl.querySelectorAll('.cp-file-x').forEach(b => b.addEventListener('click', () => { if ((campaignFiles[Number(b.dataset.i)] || {}).auto) campaignImgRemoved = true; campaignFiles.splice(Number(b.dataset.i), 1); document.getElementById('campaign-attachment').value = ''; showCampaignAttachment(); }));
  if (typeof renderCampaignPreview === 'function') try { renderCampaignPreview(); } catch (e) { /* нет */ }
}

document.getElementById('campaign-attachment').addEventListener('change', async (e) => {
  const list = Array.from(e.target.files || []);
  e.target.value = '';
  if (!list.length) return;
  campaignFiles = campaignFiles.filter(f => !f.auto);   // своя картинка заменяет автоматическую
  for (const file of list) {
    if (campaignFiles.length >= CP_MAX_FILES) break;
    const total = campaignFiles.reduce((a, f) => a + f.dataUrl.length * 0.75, 0);
    if (total + file.size > CP_MAX_BYTES) { uiAlert(t('cpFilesTooBig')); break; }
    const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); });
    if (dataUrl) campaignFiles.push({ name: file.name, dataUrl });
  }
  showCampaignAttachment();
});

document.getElementById('campaign-form').addEventListener('submit', (e) => {
  e.preventDefault(); // сама отправка теперь только через кнопки в выпадающем меню ниже
});

function getCampaignFormValues() {
  return {
    subject: document.getElementById('campaign-subject').value.trim(),
    bodyText: document.getElementById('campaign-body').value.trim(),
    lang: document.getElementById('campaign-lang-select').value,
    clientIds: getSelectedCampaignClients().map(c => c.id)
  };
}

async function sendCampaignByChannel(channel) {
  document.getElementById('campaign-send-menu').style.display = 'none';
  const statusEl = document.getElementById('campaign-status');
  const { subject, bodyText, lang, clientIds } = getCampaignFormValues();
  if (clientIds.length === 0) {
    statusEl.textContent = t('campaignNoRecipients');
    return;
  }
  if (!subject) { document.getElementById('campaign-subject').focus(); return; }
  if (!bodyText) { document.getElementById('campaign-body').focus(); return; }

  statusEl.textContent = t('campaignSending');
  await ensureCampaignImage();
  const res = await window.api.sendCampaign({
    subject, bodyText, lang, clientIds,
    attachments: campaignFiles.map(f => ({ name: f.name, dataUrl: f.dataUrl })),
    // Email отправляем, только если выбран этот канал или "оба сразу" — при этом бэкенд
    // сам отфильтрует получателей без email/без согласия на рассылку, здесь фильтровать
    // заранее не нужно (иначе клиенты только с Telegram потеряются из выборки).
    sendEmail: channel === 'email' || channel === 'both',
    alsoTelegram: channel === 'telegram' || channel === 'both'
  });
  if (res.error === 'pro_only') { statusEl.textContent = ''; showFreeLimit('mail'); return; }
  if (res.error) {
    setErrStatus(statusEl, res.error, t('mailError'));
    return;
  }
  const parts = [];
  if (channel !== 'telegram') parts.push(t('campaignResult')(res.sent, res.failed));
  if (channel !== 'email') parts.push(t('campaignResultTelegram')(res.telegramSent || 0, res.telegramFailed || 0));
  statusEl.textContent = parts.join(' · ');
  document.getElementById('campaign-form').reset();
  campaignFiles = []; campaignImgRemoved = false;
  document.getElementById('campaign-attachment-preview').innerHTML = '';
  // reset() вернул и выбор получателей к «Все клиенты» — пересчитываем счётчик.
  updateCampaignRecipientCount();
}

document.getElementById('btn-campaign-send-toggle').addEventListener('click', async (e) => {
  e.stopPropagation();
  const st = await window.api.getSettings();
  if (st.send_mode === 'all') { sendCampaignByChannel('both'); return; }
  const menu = document.getElementById('campaign-send-menu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
});
document.getElementById('campaign-send-email').addEventListener('click', () => sendCampaignByChannel('email'));
document.getElementById('campaign-send-telegram').addEventListener('click', () => sendCampaignByChannel('telegram'));
document.getElementById('campaign-send-both').addEventListener('click', () => sendCampaignByChannel('both'));

// ---------- отправить всем клиентам их карточки ----------
document.getElementById('btn-send-all-cards').addEventListener('click', async () => {
  const statusEl = document.getElementById('send-all-cards-status');
  const all = await window.api.listCards();
  const [mail, st] = await Promise.all([window.api.mailStatus(), window.api.getSettings()]);
  const withEmail = all.filter(c => c.client_email), withTg = all.filter(c => c.client_has_tg);
  const reach = { total: all.length, email: withEmail.length, telegram: withTg.length, unique: all.filter(c => c.client_email || c.client_has_tg).length, mailReady: !!mail.ready, telegramReady: !!st.telegram_bot_token, sendMode: st.send_mode || 'ask' };
  reach.none = reach.total - reach.unique;
  const channels = reach.unique ? await pickChannels({ reach, marketing: false, title: t('chTitleCards') }) : { none: true };
  if (!channels) return;
  if (channels.none) { statusEl.textContent = t('sendAllCardsNone'); return; }
  const cards = all.filter(c => (channels.includes('email') && c.client_email) || (channels.includes('telegram') && c.client_has_tg));
  if (cards.length === 0) { statusEl.textContent = t('sendAllCardsNone'); return; }
  if (!await uiConfirm(t('sendAllCardsConfirm')(cards.length))) return;

  const res = { sent: 0, failed: 0, telegramSent: 0, telegramFailed: 0 };
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    statusEl.textContent = t('sendAllCardsProgress')(i + 1, cards.length);
    try {
      const lang = card.client_language || getLang();
      const template = await pickCatTemplate(card.code, lang, currentNicheId, card.card_template_id);
      if (template && template.isNewPick) window.api.setCardTemplateId(card.id, template.id);
      const catCardDataUrl = await composeCatCard(card.code, template, currentBrandName);
      if (channels.includes('email') && card.client_email) {
        const r = await window.api.sendCardEmail(card.id, lang, { width: 400, bgColor: '#ffffff' }, catCardDataUrl);
        if (r.ok) res.sent++; else res.failed++;
      }
      if (channels.includes('telegram') && card.client_has_tg) {
        const r = await window.api.telegramSendCard(card.id, lang, catCardDataUrl);
        if (r && r.ok) res.telegramSent++; else res.telegramFailed++;
      }
    } catch (err) {
      res.failed++;
    }
  }
  statusEl.textContent = sendResultText(res);
});

// ---------- управление данными ----------
document.getElementById('btn-export-clients').addEventListener('click', async () => {
  const statusEl = document.getElementById('data-actions-status');
  const res = await window.api.exportClientsCsv();
  if (!res.canceled) statusEl.textContent = t('savedFile') + res.filePath;
});

document.getElementById('btn-import-clients').addEventListener('click', () => openImportWizard());
// Прежний быстрый импорт оставлен как функция (кнопка теперь открывает мастер с предпросмотром).
async function legacyImportClients() {
  const statusEl = document.getElementById('data-actions-status');
  const res = await window.api.importClientsCsv();
  if (res.canceled) return;
  if (res.error) {
    setErrStatus(statusEl, res.error);
    return;
  }
  statusEl.textContent = t('importResult')(res.imported, res.skipped);
  refreshClients();
  refreshDashboard();
  if (res.limited) showFreeLimit('import');
}

document.getElementById('btn-reset-stats').addEventListener('click', async () => {
  if (!await uiConfirm(t('confirmResetStats'), { danger: true })) return;
  if (!(await requirePin())) return;
  await window.api.resetStatistics();
  document.getElementById('data-actions-status').textContent = t('resetStatsDone');
  refreshDashboard();
  if (currentView === 'clients') refreshClients();
});

document.getElementById('btn-reset-all').addEventListener('click', async () => {
  if (!await uiConfirm(t('confirmResetAll'), { danger: true })) return;
  if (!(await requirePin())) return;
  const typed = await uiPrompt(t('confirmResetAllTyped'));
  if (!typed || typed.trim().toUpperCase() !== t('resetConfirmWord').toUpperCase()) {
    uiAlert(t('resetConfirmMismatch'));
    return;
  }
  await window.api.resetAllData();
  document.getElementById('data-actions-status').textContent = t('resetAllDone');
  refreshDashboard();
  refreshClients();
});

// ---------- Маркетинг ----------
// "Сюрприз дня" — идеи для акций на сегодня. Универсальные формулировки; там, где нужно
// упомянуть, на что зовём клиента (аналог "чашечку кофе"), используется {phrase} —
// подставляется из Business Theme Context (niches.js) под выбранную нишу и язык.
const SURPRISE_IDEAS = {
  ru: [
    { title: '⏰ Счастливый час', text: 'Сегодня с 15:00 до 16:00 — скидка 20% на всё. Хороший повод оживить тихие часы дня.' },
    { title: '👥 Приведи друга', text: 'Сегодня: приведи друга, который у вас впервые — вы оба получаете приятный бонус.' },
    { title: '📸 Фото дня', text: 'Клиент выкладывает у себя в соцсети фото с отметкой вашего бизнеса — небольшой подарок на выбор.' },
    { title: '🎁 Друг в подарок', text: 'Сегодня, если клиент придёт с другом — приглашаем его друга на {phrase} бесплатно.' },
    { title: '🎲 Счастливый чек', text: 'Каждый 10-й чек сегодня — бесплатный. Объявите об этом клиентам заранее, будет интрига.' },
    { title: '🎉 Приятный сюрприз', text: 'Сегодня дарим небольшой приятный сюрприз каждому клиенту, пока есть в наличии.' },
    { title: '💬 Отзыв — скидка', text: 'Кто оставит отзыв сегодня — получает скидку 15% на следующий визит.' },
    { title: '🌅 Ранняя пташка', text: 'Скидка 10% всем, кто зайдёт до 9:00 — хороший повод поднять утренний трафик.' }
  ],
  uk: [
    { title: '⏰ Щаслива година', text: 'Сьогодні з 15:00 до 16:00 — знижка 20% на все. Гарний привід пожвавити тихі години дня.' },
    { title: '👥 Приведи друга', text: 'Сьогодні: приведи друга, який у вас вперше — ви обидва отримуєте приємний бонус.' },
    { title: '📸 Фото дня', text: 'Клієнт викладає у себе в соцмережі фото з відміткою вашого бізнесу — невеликий подарунок на вибір.' },
    { title: '🎁 Друг у подарунок', text: 'Сьогодні, якщо клієнт прийде з другом — запрошуємо його друга на {phrase} безкоштовно.' },
    { title: '🎲 Щасливий чек', text: 'Кожен 10-й чек сьогодні — безкоштовний. Оголосіть про це клієнтам заздалегідь, буде інтрига.' },
    { title: '🎉 Приємний сюрприз', text: 'Сьогодні даруємо невеликий приємний сюрприз кожному клієнту, поки є в наявності.' },
    { title: '💬 Відгук — знижка', text: 'Хто залишить відгук сьогодні — отримує знижку 15% на наступний візит.' },
    { title: '🌅 Рання пташка', text: 'Знижка 10% усім, хто зайде до 9:00 — гарний привід підняти ранковий трафік.' }
  ],
  sk: [
    { title: '⏰ Šťastná hodina', text: 'Dnes od 15:00 do 16:00 — zľava 20 % na všetko. Skvelý spôsob, ako oživiť tichšie hodiny dňa.' },
    { title: '👥 Priveď priateľa', text: 'Dnes: priveď priateľa, ktorý je u vás prvýkrát — obaja dostanete príjemný bonus.' },
    { title: '📸 Fotka dňa', text: 'Klient zverejní na sociálnej sieti fotku s označením vášho podniku — malý darček podľa výberu.' },
    { title: '🎁 Priateľ zadarmo', text: 'Dnes, ak klient príde s priateľom — pozývame jeho priateľa na {phrase} zadarmo.' },
    { title: '🎲 Šťastný účet', text: 'Každý 10. účet dnes je zadarmo. Oznámte to klientom vopred, bude to intrigujúce.' },
    { title: '🎉 Príjemné prekvapenie', text: 'Dnes dávame malé príjemné prekvapenie každému klientovi, kým vydrží zásoba.' },
    { title: '💬 Recenzia = zľava', text: 'Kto dnes napíše recenziu, dostane zľavu 15 % na ďalšiu návštevu.' },
    { title: '🌅 Ranné vtáča', text: 'Zľava 10 % pre všetkých, ktorí prídu do 9:00 — dobrý spôsob, ako zvýšiť ranný ruch.' }
  ],
  en: [
    { title: '⏰ Happy hour', text: 'Today from 3 to 4 PM — 20% off everything. A good way to liven up the quiet hours of the day.' },
    { title: '👥 Bring a friend', text: 'Today: bring a friend who\u2019s visiting for the first time — you both get a nice bonus.' },
    { title: '📸 Photo of the day', text: 'A client posts a photo tagging your business on social media — a small gift of their choice.' },
    { title: '🎁 Friend on the house', text: 'Today, if a client brings a friend — their friend gets {phrase} for free.' },
    { title: '🎲 Lucky receipt', text: 'Every 10th receipt today is free. Announce it to clients in advance for some intrigue.' },
    { title: '🎉 Little surprise', text: 'Today we\u2019re giving every client a small nice surprise, while supplies last.' },
    { title: '💬 Review for a discount', text: 'Anyone who leaves a review today gets 15% off their next visit.' },
    { title: '🌅 Early bird', text: '10% off for everyone who stops by before 9 AM — a good way to boost morning traffic.' }
  ]
};

let surpriseIndex = null;

function pickSurpriseIndex(random) {
  const list = SURPRISE_IDEAS[getLang()] || SURPRISE_IDEAS.ru;
  if (random) return Math.floor(Math.random() * list.length);
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return dayOfYear % list.length;
}

function surpriseTextFor(idea) {
  return idea.text.replace('{phrase}', NichesModule.getInvitePhrase(currentNicheId, getLang()));
}

function renderSurprise(random) {
  const list = SURPRISE_IDEAS[getLang()] || SURPRISE_IDEAS.ru;
  if (surpriseIndex === null || random) surpriseIndex = pickSurpriseIndex(random);
  const idea = list[surpriseIndex];
  document.getElementById('surprise-text').innerHTML = `<b>${idea.title}</b><br>${escapeHtml(surpriseTextFor(idea))}`;
  renderSurpriseThumb(idea, surpriseIndex);
}

// 2.25: маленькая картинка к идее — та же, что уйдёт в рассылку
let surpriseThumbSeq = 0;
async function renderSurpriseThumb(idea, idx) {
  const box = document.getElementById('surprise-thumb'); if (!box) return;
  const seq = ++surpriseThumbSeq;
  try {
    const cv = await drawMsgImage('campaign', getLang(), { title: idea.title.replace(/^\p{Emoji}\s*/u, ''), scene: SURPRISE_SCENES[idx], emojis: ['✨'] });
    if (seq !== surpriseThumbSeq) return;
    box.innerHTML = ''; cv.className = 'surprise-thumb-cv'; box.appendChild(cv);
  } catch (e) { box.innerHTML = ''; }
}
document.getElementById('btn-surprise-reroll').addEventListener('click', () => renderSurprise(true));

document.getElementById('btn-surprise-fill').addEventListener('click', () => {
  const list = SURPRISE_IDEAS[getLang()] || SURPRISE_IDEAS.ru;
  const idea = list[surpriseIndex];
  document.querySelector('[data-view="marketing"]');
  document.querySelector('[data-view="campaigns"]').click();
  document.getElementById('seg-all').checked = true;
  SEGMENT_IDS.forEach(id => document.getElementById(id).checked = false);
  document.getElementById('campaign-subject').value = idea.title.replace(/^\p{Emoji}\s*/u, '');
  document.getElementById('campaign-body').value = surpriseTextFor(idea);
  document.getElementById('campaign-subject').focus();
  campaignImgRemoved = false;
  setCampaignTplImage({ k: idea.title.replace(/^\p{Emoji}\s*/u, ''), ic: '✨' }, getLang(), SURPRISE_SCENES[surpriseIndex]);
});

const WEEKDAY_NAMES = {
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  uk: ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\u2019ятниця', 'Субота'],
  sk: ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

function renderTimingInsights(weekday, hour) {
  const names = WEEKDAY_NAMES[getLang()] || WEEKDAY_NAMES.ru;
  const wEl = document.getElementById('weekday-insight');
  const hEl = document.getElementById('hour-insight');

  if (weekday.total < 5) {
    wEl.innerHTML = `<div class="insight-label">${t('weakDayLabel')}</div><div class="hint">${t('insightNotEnoughData')}</div>`;
  } else {
    let minIdx = 0;
    for (let i = 1; i < 7; i++) if (weekday.counts[i] < weekday.counts[minIdx]) minIdx = i;
    wEl.innerHTML = `<div class="insight-label">${t('weakDayLabel')}</div><div class="insight-value">${names[minIdx]}</div><div class="insight-hint">${t('weakDayHint')}</div>`;
  }

  if (hour.total < 5) {
    hEl.innerHTML = `<div class="insight-label">${t('bestTimeLabel')}</div><div class="hint">${t('insightNotEnoughData')}</div>`;
  } else {
    let maxIdx = 0;
    for (let i = 1; i < 24; i++) if (hour.counts[i] > hour.counts[maxIdx]) maxIdx = i;
    hEl.innerHTML = `<div class="insight-label">${t('bestTimeLabel')}</div><div class="insight-value">${String(maxIdx).padStart(2, '0')}:00–${String((maxIdx + 1) % 24).padStart(2, '0')}:00</div><div class="insight-hint">${t('bestTimeHint')}</div>`;
  }
}

// Готовые тексты рассылки под сегмент — как и остальной маркетинг, используют {phrase}
// из Business Theme Context (niches.js), а не зашитое "кофе". Сегменты active/vip не
// требуют упоминания конкретной услуги, поэтому там {phrase} не используется.
const SEGMENT_CAMPAIGN_TEMPLATES = {
  inactive: {
    ru: { subject: 'Мы скучаем по вам! 👋', body: 'Давно вас не было — будем рады видеть вас снова! Заходите на {phrase}, у нас найдётся, чем вас порадовать.' },
    sk: { subject: 'Chýbate nám! 👋', body: 'Už ste u nás dlho neboli — radi vás privítame znova! Príďte na {phrase}, máme pre vás niečo pekné.' },
    uk: { subject: 'Ми сумуємо за вами! 👋', body: 'Ви давно у нас не були — будемо раді бачити вас знову! Заходьте на {phrase}, знайдеться чим порадувати.' },
    en: { subject: 'We miss you! 👋', body: 'It\u2019s been a while — we\u2019d love to see you again! Come in for {phrase}, we have something nice for you.' }
  },
  birthday: {
    ru: { subject: 'С днём рождения! 🎉', body: 'Поздравляем с днём рождения! Ждём в гости на {phrase} — будет приятный сюрприз.' },
    sk: { subject: 'Všetko najlepšie k narodeninám! 🎉', body: 'Prajeme vám všetko najlepšie k narodeninám! Radi vás privítame na {phrase} — bude pre vás milé prekvapenie.' },
    uk: { subject: 'З днем народження! 🎉', body: 'Вітаємо з днем народження! Чекаємо в гості на {phrase} — буде приємний сюрприз.' },
    en: { subject: 'Happy Birthday! 🎉', body: 'Happy birthday! Come see us for {phrase} — we\u2019ve got a nice surprise waiting for you.' }
  },
  vip: {
    ru: { subject: 'Спасибо, что вы с нами! 🏆', body: 'Вы один из наших самых активных клиентов — спасибо за доверие! В знак благодарности у нас для вас особое предложение. Загляните к нам в ближайшее время.' },
    sk: { subject: 'Ďakujeme, že ste s nami! 🏆', body: 'Ste jedným z našich najvernejších klientov — ďakujeme za dôveru! Na znak vďaky pre vás máme špeciálnu ponuku. Zastavte sa čoskoro.' },
    uk: { subject: 'Дякуємо, що ви з нами! 🏆', body: 'Ви один із наших найактивніших клієнтів — дякуємо за довіру! На знак вдячності у нас для вас особлива пропозиція. Завітайте найближчим часом.' },
    en: { subject: 'Thank you for being with us! 🏆', body: 'You\u2019re one of our most loyal clients — thank you for your trust! As a thank-you, we have a special offer just for you. Stop by soon.' }
  },
  fans: {
    ru: { subject: 'Нам очень важно ваше мнение ⭐', body: 'Спасибо, что вы наш постоянный гость! Если вам у нас нравится — оставьте, пожалуйста, короткий отзыв, это очень нам поможет:\n{review}\n\nЖдём вас снова на {phrase}!' },
    sk: { subject: 'Veľmi nám záleží na vašom názore ⭐', body: 'Ďakujeme, že ste náš stály hosť! Ak sa vám u nás páči, zanechajte nám prosím krátku recenziu, veľmi nám to pomôže:\n{review}\n\nTešíme sa na vás znova na {phrase}!' },
    uk: { subject: 'Нам дуже важлива ваша думка ⭐', body: 'Дякуємо, що ви наш постійний гість! Якщо вам у нас подобається — залиште, будь ласка, короткий відгук, це нам дуже допоможе:\n{review}\n\nЧекаємо на вас знову на {phrase}!' },
    en: { subject: 'Your opinion means a lot to us ⭐', body: 'Thank you for being a regular! If you enjoy coming to us, please leave a short review — it helps us a lot:\n{review}\n\nSee you again for {phrase}!' }
  },
  near: {
    ru: { subject: 'Вам остался всего шаг до подарка 🎁', body: 'Вы почти у цели — ещё совсем немного, и вас ждёт подарок по вашей карте! Заходите на {phrase}, будем рады видеть.' },
    sk: { subject: 'K darčeku vám chýba už len krok 🎁', body: 'Ste takmer v cieli — ešte kúsok a na vašej karte vás čaká darček! Príďte na {phrase}, tešíme sa na vás.' },
    uk: { subject: 'Вам лишився лише крок до подарунка 🎁', body: 'Ви майже біля мети — ще трохи, і на вас чекає подарунок за вашою карткою! Заходьте на {phrase}, будемо раді бачити.' },
    en: { subject: 'Just one step from your reward 🎁', body: 'You\u2019re almost there — just a little more and a reward on your card is yours! Come in for {phrase}, we\u2019d love to see you.' }
  },
  newbie: {
    ru: { subject: 'Будем рады видеть вас снова 👋', body: 'Спасибо, что заглянули к нам! Приходите ещё — ваша карта уже работает, и каждый визит приближает вас к подарку. Ждём на {phrase}.' },
    sk: { subject: 'Radi vás opäť privítame 👋', body: 'Ďakujeme, že ste sa u nás zastavili! Príďte znova — vaša karta už funguje a každá návšteva vás približuje k darčeku. Čakáme vás na {phrase}.' },
    uk: { subject: 'Будемо раді бачити вас знову 👋', body: 'Дякуємо, що завітали до нас! Приходьте ще — ваша картка вже працює, і кожен візит наближає вас до подарунка. Чекаємо на {phrase}.' },
    en: { subject: 'We\u2019d love to see you again 👋', body: 'Thanks for stopping by! Come again — your card is already active and every visit brings you closer to a reward. See you for {phrase}.' }
  },
  risk: {
    ru: { subject: 'Давно не виделись! Мы приготовили кое-что для вас 💛', body: 'Мы заметили, что вы давно к нам не заглядывали, и соскучились! Приходите на {phrase} — у нас для вас приятный сюрприз.' },
    sk: { subject: 'Dlho sme sa nevideli! Máme pre vás niečo pekné 💛', body: 'Všimli sme si, že ste u nás dlho neboli, a chýbate nám! Príďte na {phrase} — máme pre vás milé prekvapenie.' },
    uk: { subject: 'Давно не бачились! Ми підготували дещо для вас 💛', body: 'Ми помітили, що ви давно до нас не заходили, і скучили! Приходьте на {phrase} — на вас чекає приємний сюрприз.' },
    en: { subject: 'Long time no see! We have something for you 💛', body: 'We noticed you haven\u2019t visited in a while, and we miss you! Come in for {phrase} — a nice surprise is waiting for you.' }
  },
  active: {
    ru: { subject: 'Новости для вас 👋', body: 'Спасибо, что вы с нами! Рассказываем о новинках и текущих предложениях — заходите узнать подробности.' },
    sk: { subject: 'Novinky pre vás 👋', body: 'Ďakujeme, že ste s nami! Prinášame novinky a aktuálne ponuky — zastavte sa a dozviete sa viac.' },
    uk: { subject: 'Новини для вас 👋', body: 'Дякуємо, що ви з нами! Розповідаємо про новинки та поточні пропозиції — заходьте дізнатися більше.' },
    en: { subject: 'News for you 👋', body: 'Thanks for being with us! Here\u2019s what\u2019s new and our current offers — stop by to learn more.' }
  }
};

function jumpToCampaignSegment(key) {
  document.querySelector('[data-view="campaigns"]').click();
  const map = { active: 'seg-active', inactive: 'seg-inactive', birthday: 'seg-birthday', vip: 'seg-vip', near: 'seg-near', newbie: 'seg-newbie', risk: 'seg-risk', fans: 'seg-fans' };
  SEGMENT_IDS.forEach(id => document.getElementById(id).checked = false);
  document.getElementById('seg-all').checked = false;
  document.getElementById(map[key]).checked = true;
  updateCampaignRecipientCount();

  const tpl = (SEGMENT_CAMPAIGN_TEMPLATES[key] && (SEGMENT_CAMPAIGN_TEMPLATES[key][getLang()] || SEGMENT_CAMPAIGN_TEMPLATES[key].ru));
  if (tpl) {
    const phrase = NichesModule.getInvitePhrase(currentNicheId, getLang());
    document.getElementById('campaign-subject').value = tpl.subject;
    document.getElementById('campaign-body').value = tpl.body.replace('{phrase}', phrase).replace('{review}', reviewUrlCache || '');
  }
  // 2.27: к сегменту — своя картинка (как у готовых текстов)
  const title = cpImgTitle(document.getElementById('campaign-subject').value) || (document.querySelector(`#segments-grid .mk-seg-${key} .mk-seg-title`) || {}).textContent || '';
  campaignImgRemoved = false;
  setCampaignTplImage({ k: title, ic: '✨' }, getLang(), SEG_SCENES[key]);
}

function jumpToCampaignLanguage(lang) {
  document.querySelector('[data-view="campaigns"]').click();
  document.getElementById('seg-all').checked = true;
  SEGMENT_IDS.forEach(id => document.getElementById(id).checked = false);
  document.getElementById('campaign-lang-select').value = lang;
  document.getElementById('campaign-lang-filter').checked = true;
  updateCampaignRecipientCount();
}

const LANGUAGE_LABELS = { ru: 'Русский', sk: 'Slovenčina', uk: 'Українська', en: 'English' };

// ---------- Маркетинг: блоки как на Главной (порядок, ширина, скрытие) ----------
const MK_DEFAULT = [
  { id: 'kpi', w: 12 }, { id: 'idea', w: 7 }, { id: 'insights', w: 5 }, { id: 'todo', w: 12 },
  { id: 'atrisk', w: 6 }, { id: 'birthdays', w: 6 }, { id: 'segments', w: 12 }, { id: 'roi', w: 12 },
  { id: 'referral', w: 6 }, { id: 'reviews', w: 6 }, { id: 'lang', w: 12 }
];
const MK_TITLES = { kpi: 'mkKpiHeading', idea: 'mkIdeaLabel', insights: 'insightsHeading', todo: 'mkTodoHeading', atrisk: 'mkRiskHeading', birthdays: 'mkBdayHeading', segments: 'segmentsHeading', roi: 'roiHeading', referral: 'mkReferralHeading', reviews: 'mkReviewsHeading', lang: 'languageStatsHeading' };
let mkLayout = MK_DEFAULT.map(x => ({ ...x, hidden: false }));
function mkNormalize(list) {
  const known = new Map(MK_DEFAULT.map(x => [x.id, x]));
  const out = [];
  (Array.isArray(list) ? list : []).forEach(x => { if (x && known.has(x.id) && !out.some(o => o.id === x.id)) out.push({ id: x.id, w: Math.max(3, Math.min(12, Math.round(Number(x.w) || known.get(x.id).w))), hidden: !!x.hidden }); });
  // новые блоки (появились в обновлении) — в конец, видимыми
  MK_DEFAULT.forEach(d => { if (!out.some(o => o.id === d.id)) out.push({ ...d, hidden: false }); });
  return out;
}
async function loadMkLayout() {
  try { const st = await window.api.getSettings(); mkLayout = mkNormalize(st.marketing_layout ? JSON.parse(st.marketing_layout) : MK_DEFAULT); }
  catch (e) { mkLayout = mkNormalize(MK_DEFAULT); }
  applyMkLayout();
}
function applyMkLayout() {
  const grid = document.getElementById('mk-grid'); if (!grid) return;
  mkLayout.forEach(x => {
    const el = grid.querySelector(`:scope > .mk-block[data-mk="${x.id}"]`); if (!el) return;
    grid.appendChild(el);
    el.style.gridColumn = `span ${x.w}`;
    el.dataset.w = String(x.w);
    el.classList.toggle('mk-hidden', !!x.hidden);
  });
}
function mkReadLayout() {
  return Array.from(document.querySelectorAll('#mk-grid > .mk-block')).map(el => ({ id: el.dataset.mk, w: Number(el.dataset.w) || 12, hidden: el.classList.contains('mk-hidden') }));
}
function mkEnterEdit() {
  const grid = document.getElementById('mk-grid');
  grid.classList.add('mk-editing');
  document.getElementById('mk-edit-actions').style.display = 'flex';
  document.getElementById('btn-mk-edit').style.display = 'none';
  grid.querySelectorAll(':scope > .mk-block').forEach(el => {
    if (el.querySelector(':scope > .mk-tb')) return;
    const tb = document.createElement('div'); tb.className = 'mk-tb';
    tb.innerHTML = `<span class="mk-tb-grip">⠿</span><span class="mk-tb-title">${escapeHtml(t(MK_TITLES[el.dataset.mk]) || '')}</span>
      <select class="mk-tb-w">${[[3, '25%'], [4, '33%'], [6, '50%'], [8, '66%'], [9, '75%'], [12, '100%']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <button type="button" class="mk-tb-hide" title="${escapeHtml(t('dashHideWidget'))}">👁</button>`;
    const sel = tb.querySelector('.mk-tb-w');
    const setW = (w) => { el.dataset.w = String(w); el.style.gridColumn = `span ${w}`; if (![...sel.options].some(o => o.value === String(w))) { const o = document.createElement('option'); o.value = String(w); o.textContent = Math.round(w / 12 * 100) + '%'; sel.appendChild(o); } sel.value = String(w); };
    setW(Number(el.dataset.w) || 12);
    sel.addEventListener('change', () => setW(Number(sel.value)));
    tb.querySelector('.mk-tb-hide').addEventListener('click', () => el.classList.toggle('mk-hidden'));
    el.prepend(tb);
    ['w', 'e'].forEach(dir => {
      const h = document.createElement('div'); h.className = `mk-rh mk-rh-${dir}`; h.title = t('dashResizeHint2');
      h.addEventListener('pointerdown', (e) => mkStartResize(e, el, dir, setW));
      el.appendChild(h);
    });
    el.addEventListener('pointerdown', mkMoveHandler);
  });
}
function mkExitEdit() {
  const grid = document.getElementById('mk-grid');
  grid.classList.remove('mk-editing');
  grid.querySelectorAll('.mk-tb, .mk-rh').forEach(x => x.remove());
  grid.querySelectorAll(':scope > .mk-block').forEach(el => el.removeEventListener('pointerdown', mkMoveHandler));
  document.getElementById('mk-edit-actions').style.display = 'none';
  document.getElementById('btn-mk-edit').style.display = '';
}
function mkStartResize(e, el, dir, setW) {
  if (e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  const grid = document.getElementById('mk-grid');
  const gr = grid.getBoundingClientRect(), r = el.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;
  const col = (gr.width - gap * 11) / 12;
  const sx = e.clientX;
  el.classList.add('mk-resizing');
  const move = (ev) => {
    const wPx = Math.max(col, r.width + (dir === 'e' ? 1 : -1) * (ev.clientX - sx));
    setW(Math.max(3, Math.min(12, Math.round((wPx + gap) / (col + gap)))));
  };
  const up = () => { el.classList.remove('mk-resizing'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
function mkMoveHandler(e) {
  const el = e.currentTarget;
  if (e.button !== 0 || e.target.closest('select, button, input, a, .mk-rh')) return;
  const grid = document.getElementById('mk-grid');
  const sx = e.clientX, sy = e.clientY;
  let zone = null, started = false;
  const rect = el.getBoundingClientRect();
  const begin = () => {
    started = true;
    zone = document.createElement('div'); zone.className = 'dash-drop-zone mk-drop';
    zone.style.gridColumn = el.style.gridColumn; zone.style.height = Math.min(rect.height, 220) + 'px';
    el.after(zone);
    Object.assign(el.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', margin: '0', zIndex: 50 });
    el.classList.add('mk-dragging');
  };
  const move = (ev) => {
    if (!started) { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 6) return; begin(); }
    el.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px)`;
    el.style.pointerEvents = 'none';
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    el.style.pointerEvents = '';
    const target = under && under.closest('#mk-grid > .mk-block');
    if (target && target !== el) {
      const r = target.getBoundingClientRect();
      const wide = r.width > grid.getBoundingClientRect().width * 0.7;
      const before = wide ? ev.clientY < r.top + r.height / 2 : ev.clientX < r.left + r.width / 2;
      if (before) { if (target.previousElementSibling !== zone) target.before(zone); } else if (target.nextElementSibling !== zone) target.after(zone);
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    if (!started) return;
    el.style.transform = '';
    ['position', 'left', 'top', 'width', 'height', 'margin', 'zIndex'].forEach(k => { el.style[k] = ''; });
    el.style.gridColumn = `span ${el.dataset.w}`;
    el.classList.remove('mk-dragging');
    zone.replaceWith(el);
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
document.getElementById('btn-mk-edit').addEventListener('click', mkEnterEdit);
document.getElementById('btn-mk-save').addEventListener('click', async () => {
  mkLayout = mkNormalize(mkReadLayout());
  mkExitEdit(); applyMkLayout();
  const st = await window.api.getSettings();
  await window.api.saveSettings({ ...st, marketing_layout: JSON.stringify(mkLayout) });
});
document.getElementById('btn-mk-reset').addEventListener('click', () => {
  mkLayout = mkNormalize(MK_DEFAULT);
  mkExitEdit(); applyMkLayout(); mkEnterEdit();
});
loadMkLayout();

// Новые блоки маркетинга: «Возвращаемость», «Под угрозой ухода», «Дни рождения».
async function renderMkExtras() {
  try {
    const k = await window.api.mkRetention();
    const delta = k.visitsPrev30 ? Math.round((k.visits30 - k.visitsPrev30) / k.visitsPrev30 * 100) : null;
    const tile = (val, label, sub, cls = '') => `<div class="mk-kpi-tile ${cls}"><b>${val}</b><span>${escapeHtml(label)}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    document.getElementById('mk-kpi').innerHTML =
      tile(k.repeatRate + '%', t('mkKpiRepeat'), escapeHtml(t('mkKpiRepeatSub')(k.repeaters, k.withVisit)), 'mk-kpi-main') +
      tile(k.returning30, t('mkKpiReturned'), escapeHtml(t('mkKpiReturnedSub'))) +
      tile(k.avgGapDays ? t('mkKpiDays')(k.avgGapDays) : '—', t('mkKpiGap'), '') +
      tile(k.visits30, t('mkKpiVisits'), delta === null ? '' : `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</em>`) +
      tile(k.atRisk, t('mkKpiRisk'), '', k.atRisk ? 'mk-kpi-warn' : '') +
      tile(k.avgCheck ? moneyFmt(k.avgCheck) : '—', t('mkKpiCheck'), '');
  } catch (e) { /* блок просто пустой */ }
  try {
    const list = await window.api.overdueList(6);
    const el = document.getElementById('mk-atrisk');
    el.innerHTML = list.length ? list.map(c => `<div class="mk-li"><button type="button" class="mk-li-name client-name-link" data-cid="${c.clientId}">${escapeHtml(c.name)}</button><span class="mk-li-sub">${escapeHtml(t('mkRiskRow')(c.avgGap, c.daysSinceLast))}</span></div>`).join('') +
      `<button type="button" class="mk-li-cta" data-seg="risk">${escapeHtml(t('mkWrite'))}</button>`
      : `<div class="mk-todo-empty">${escapeHtml(t('mkRiskNone'))}</div>`;
  } catch (e) { /* пусто */ }
  try {
    const list = await window.api.upcomingBirthdays(14);
    const el = document.getElementById('mk-birthdays');
    el.innerHTML = list.length ? list.slice(0, 6).map(c => `<div class="mk-li"><button type="button" class="mk-li-name client-name-link" data-cid="${c.id}">${escapeHtml(c.name)}</button><span class="mk-li-sub">${c.isToday ? '🎉 ' + escapeHtml(t('mkBdayToday')) : escapeHtml(t('mkBdayIn')(c.daysUntil))}</span></div>`).join('') +
      `<button type="button" class="mk-li-cta" data-seg="birthday">${escapeHtml(t('mkWrite'))}</button>`
      : `<div class="mk-todo-empty">${escapeHtml(t('mkBdayNone'))}</div>`;
  } catch (e) { /* пусто */ }
  document.querySelectorAll('#mk-atrisk .mk-li-name, #mk-birthdays .mk-li-name').forEach(b => b.addEventListener('click', () => openClientProfile(Number(b.dataset.cid))));
  document.querySelectorAll('#mk-atrisk .mk-li-cta, #mk-birthdays .mk-li-cta').forEach(b => b.addEventListener('click', () => jumpToCampaignSegment(b.dataset.seg)));
}

async function refreshMarketing() {
  refreshCampaignRoi();
  renderMkExtras();
  const clients = await window.api.clientsWithFlags();
  const segments = [
    { key: 'active', icon: '🟢', title: t('segActive'), count: clients.filter(c => c.isActive).length },
    { key: 'inactive', icon: '💤', title: t('segInactive'), count: clients.filter(c => c.isInactive).length },
    { key: 'birthday', icon: '🎂', title: t('segBirthday'), count: clients.filter(c => c.isBirthdaySoon).length },
    { key: 'vip', icon: '🏆', title: t('segVip'), count: clients.filter(c => c.isVIP).length },
    { key: 'near', icon: '🎯', title: t('segNear'), count: clients.filter(c => c.isNearReward).length },
    { key: 'newbie', icon: '🌱', title: t('segNewbie'), count: clients.filter(c => c.isNewNoReturn).length },
    { key: 'risk', icon: '⚠️', title: t('segRisk'), count: clients.filter(c => c.isAtRisk).length },
    { key: 'fans', icon: '⭐', title: t('segFans'), count: clients.filter(c => c.isFan).length }
  ];
  const promoSettings = await window.api.getSettings();
  reviewUrlCache = promoSettings.review_url || '';
  const total = clients.length;

  // «Что сделать сегодня» — конкретные поводы для рассылки, самые важные сверху.
  const cnt = Object.fromEntries(segments.map(x => [x.key, x.count]));
  const todos = [
    { key: 'near', icon: '🎯', text: t('mkTodoNear')(cnt.near), n: cnt.near },
    { key: 'risk', icon: '⚠️', text: t('mkTodoRisk')(cnt.risk), n: cnt.risk },
    { key: 'newbie', icon: '🌱', text: t('mkTodoNewbie')(cnt.newbie), n: cnt.newbie },
    { key: 'birthday', icon: '🎂', text: t('mkTodoBirthday')(cnt.birthday), n: cnt.birthday },
    // Просьба об отзыве — только если указана ссылка на отзывы.
    { key: 'fans', icon: '⭐', text: t('mkTodoReview')(cnt.fans), n: reviewUrlCache ? cnt.fans : 0 }
  ].filter(x => x.n > 0);
  document.getElementById('mk-todo').innerHTML = todos.length
    ? todos.map(x => `
      <div class="mk-todo-row mk-todo-${x.key}">
        <span class="mk-todo-icon">${x.icon}</span>
        <span class="mk-todo-text">${x.text}</span>
        <button type="button" class="mk-todo-btn" data-segment="${x.key}">${t('mkTodoAction')}</button>
      </div>`).join('')
    : `<div class="mk-todo-empty">${t('mkTodoEmpty')}</div>`;
  document.querySelectorAll('#mk-todo .mk-todo-btn').forEach(btn => {
    btn.addEventListener('click', () => jumpToCampaignSegment(btn.dataset.segment));
  });

  // «Приведи друга»: статистика и лучшие амбассадоры.
  const refEl = document.getElementById('mk-referral');
  if (promoSettings.referral_enabled !== '1') {
    refEl.innerHTML = `<div class="mk-todo-empty">${t('mkReferralOff')}</div>`;
  } else {
    const rs = await window.api.referralStats();
    refEl.innerHTML = `
      <div class="mk-ref-stats">
        <div class="mk-ref-stat"><b>${rs.total}</b><span>${t('mkReferralTotal')}</span></div>
        <div class="mk-ref-stat"><b>${rs.month}</b><span>${t('mkReferralMonth')}</span></div>
      </div>
      <div class="mk-ref-top">
        <div class="mk-ref-top-title">${t('mkReferralTop')}</div>
        ${rs.top.length ? rs.top.map((r, i) => `<div class="top-row"><span>${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${escapeHtml(r.name)}</span><span class="hint">${r.n}</span></div>`).join('') : `<p class="hint">${t('mkReferralNone')}</p>`}
      </div>`;
  }
  document.getElementById('segments-grid').innerHTML = segments.map(s => {
    const pct = total ? Math.round(s.count / total * 100) : 0;
    return `
    <button type="button" class="mk-seg mk-seg-${s.key}" data-segment="${s.key}" ${s.count ? '' : 'data-empty="1"'}>
      <span class="mk-seg-top"><span class="mk-seg-icon">${s.icon}</span><span class="mk-seg-pct">${pct}%</span></span>
      <span class="mk-seg-count">${s.count}</span>
      <span class="mk-seg-title">${s.title}</span>
      <span class="mk-seg-bar"><i style="width:${pct}%"></i></span>
      <span class="mk-seg-cta">${t('mkWrite')}</span>
    </button>`;
  }).join('');
  document.querySelectorAll('#segments-grid .mk-seg').forEach(btn => {
    btn.addEventListener('click', () => jumpToCampaignSegment(btn.dataset.segment));
  });

  const langCounts = await window.api.clientLanguageCounts();
  const langCards = [
    { key: 'ru', icon: '🇷🇺', title: LANGUAGE_LABELS.ru, count: langCounts.ru },
    { key: 'sk', icon: '🇸🇰', title: LANGUAGE_LABELS.sk, count: langCounts.sk },
    { key: 'uk', icon: '🇺🇦', title: LANGUAGE_LABELS.uk, count: langCounts.uk },
    { key: 'en', icon: '🇬🇧', title: LANGUAGE_LABELS.en, count: langCounts.en },
    { key: 'unset', icon: '❔', title: t('languageUnset'), count: langCounts.unset }
  ];
  const langTotal = langCards.reduce((sum, l) => sum + (l.count || 0), 0);
  const langPct = (n) => langTotal ? Math.round((n || 0) / langTotal * 100) : 0;
  document.getElementById('language-stats-grid').innerHTML = `
    <div class="mk-lang-bar">${langCards.filter(l => l.count).map(l => `<i class="mk-lang-${l.key}" style="width:${langPct(l.count)}%" title="${l.title}: ${l.count}"></i>`).join('') || '<i class="mk-lang-empty" style="width:100%"></i>'}</div>
    <div class="mk-lang-total hint">${t('mkLangTotal')(langTotal)}</div>
    <div class="mk-lang-rows">
      ${langCards.map(l => `
        <div class="mk-lang-row">
          <span class="mk-lang-dot mk-lang-${l.key}"></span>
          <span class="mk-lang-icon">${l.icon}</span>
          <span class="mk-lang-name">${l.title}</span>
          <span class="mk-lang-count">${l.count || 0}</span>
          <span class="mk-lang-pct">${langPct(l.count)}%</span>
          ${l.key === 'unset' ? '<span></span>' : `<button type="button" class="mk-lang-btn" data-lang="${l.key}" ${l.count ? '' : 'disabled'}>${t('btnGoToCampaign')}</button>`}
        </div>`).join('')}
    </div>`;
  document.querySelectorAll('#language-stats-grid .mk-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => jumpToCampaignLanguage(btn.dataset.lang));
  });

  renderSurprise();

  const [weekday, hour] = await Promise.all([window.api.visitsByWeekday(), window.api.visitsByHour()]);
  renderTimingInsights(weekday, hour);
}

// ---------- составление открытки с котиком по запросу главного процесса ----------
// Нужно для саморегистрации по QR: сервер работает в главном процессе, где нет Canvas/DOM,
// поэтому сама картинка составляется прямо здесь, в этом (уже открытом) окне.
window.api.onComposeCatCardRequest(async (e, { requestId, code, lang, cardId }) => {
  try {
    const template = await pickCatTemplate(code, lang, currentNicheId);
    if (template && template.isNewPick && cardId) window.api.setCardTemplateId(cardId, template.id);
    const dataUrl = await composeCatCard(code, template, currentBrandName);
    window.api.sendComposeCatCardResponse({ requestId, dataUrl });
  } catch (err) {
    window.api.sendComposeCatCardResponse({ requestId, dataUrl: null });
  }
});

// ---------- настройки: плитки открывают мини-окна ----------
const SETTINGS_LOADERS = {
  'settings-modal-brand': () => loadBrandSettings(),
  'settings-modal-telegram': () => loadTelegramSettings(),
  'settings-modal-gwallet': () => loadGwalletSettings(),
  'settings-modal-updates': () => loadUpdatesSettings(),
  'settings-modal-subscription': () => loadSubscriptionSettings(),
  'settings-modal-sendhistory': () => loadSendHistory(),
  'settings-modal-email': () => loadSettings(),
  'settings-modal-selfreg': () => { loadSelfregSettings(); loadSelfregQrCodes(); },
  'settings-modal-poster': () => { openPosterEditor(); markSetting('poster_opened'); },
  'settings-modal-pairing': () => loadPairingInfo(),
  'settings-modal-weather': () => loadWeatherSettings(),
  'settings-modal-nameday': () => loadNamedayAutoSettings(),
  'settings-modal-pin': () => loadPinStatus(),
  'settings-modal-promo': () => loadPromoSettings(),
  'settings-modal-team': () => loadTeamSettings(),
  'settings-modal-auto': () => loadAutoSettings(),
  'settings-modal-online': () => loadOnlineSettings(),
  'settings-modal-owner': () => loadOwnerSettings(),
  'settings-modal-pos': () => loadPosSettings(),
  'settings-modal-manual': () => renderManual(),
  'settings-modal-cardart': () => {
    const niche = NichesModule.getNiche(currentNicheId);
    document.getElementById('cardart-niche-tab-label').textContent = `${niche.emoji} ${niche.name[getLang()] || niche.name.ru}`;
    loadCardArtGrid(cardArtCurrentLang);
  }
  // settings-modal-theme и settings-modal-data не нуждаются в отдельной загрузке —
  // тема уже применена при старте приложения (initTheme), а «Управление данными» без состояния.
};

document.querySelectorAll('.settings-tile[data-modal]').forEach(tile => {
  tile.addEventListener('click', () => {
    const modalId = tile.dataset.modal;
    const loader = SETTINGS_LOADERS[modalId];
    if (loader) loader();
    document.getElementById(modalId).style.display = 'flex';
    renderSettingsNext(modalId, tile);
  });
});
function closeSettingsModals() { document.querySelectorAll('.settings-modal-overlay').forEach(o => { o.style.display = 'none'; }); }
// 2.17: внизу каждой настройки — соседние настройки того же раздела, чтобы не искать дальше.
function renderSettingsNext(modalId, tile) {
  const modal = document.querySelector('#' + modalId + ' .settings-modal'); if (!modal) return;
  let foot = modal.querySelector(':scope > .set-next');
  if (!foot) { foot = document.createElement('div'); foot.className = 'set-next'; modal.appendChild(foot); }
  const group = tile.closest('.settings-group');
  const sibs = group ? Array.from(group.querySelectorAll('.settings-tile')).filter(x => x !== tile && getComputedStyle(x).display !== 'none') : [];
  if (!sibs.length) { foot.innerHTML = ''; return; }
  const title = group.querySelector('.settings-group-title').textContent.trim();
  foot.innerHTML = `<div class="set-next-h">${escapeHtml(t('setNextTitle')(title))}</div><div class="set-next-list">${sibs.map((x, n) => `<button type="button" class="set-next-btn" data-n="${n}"><span>${x.querySelector('.settings-tile-icon').textContent}</span>${escapeHtml(x.querySelector('.settings-tile-title').textContent.trim())}</button>`).join('')}</div>`;
  foot.querySelectorAll('.set-next-btn').forEach(b => b.addEventListener('click', () => { document.getElementById(modalId).style.display = 'none'; sibs[Number(b.dataset.n)].click(); }));
}

document.querySelectorAll('.settings-modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
  overlay.querySelector('.settings-modal-close').addEventListener('click', () => {
    overlay.style.display = 'none';
    renderSetupChecklist();
  });
});

// Понятные сообщения вместо технических кодов и английских ошибок почтового сервера.
function errText(err) {
  const e = String(err || '');
  const map = {
    telegram_not_connected: 'errTelegramNotConnected', telegram_not_linked: 'errTelegramNotLinked',
    not_configured: 'errNotConfigured', not_found: 'errNotFound', invalid_key: 'errInvalidKey',
    city_not_found: 'errCityNotFound', network: 'errNetwork', pin_format: 'pinFormatError', pro_only: 'errProOnly', free_limit: 'errFreeLimit', failed: 'errFailed', wallet_server: 'errWalletServer', weak_password: 'errWeakPassword', not_enabled: 'errFailed', wallet_unavailable: 'errWalletUnavailable', no_client_email: 'errNoClientEmail', license_inactive: 'errLicenseInactive', daily_limit: 'errDailyLimit', service_busy: 'errServiceBusy', mail_not_configured: 'errMailNotConfigured', need_license: 'errNeedLicense', bad_email: 'errEmailInvalid', invalid_amount: 'errInvalidAmount', not_spend_card: 'errNotFound',
    email_unverified: 'errEmailUnverified', daily_limit: 'errDailyLimit', service_busy: 'errMailBusy',
    no_channel: 'errNoChannel', no_link: 'refLinkNeedOnline', dk_not_configured: 'dkNotReady', time: 'errApTime', name: 'errApName'
  };
  if (map[e]) return t(map[e]);
  if (/invalid login|535|534|auth|credentials|username and password/i.test(e)) return t('errSmtpAuth');
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|getaddrinfo|EAI_AGAIN|network/i.test(e)) return t('errNetwork');
  return e;
}

// ---------- 2.18: ошибка + кнопка «что сделать» ----------
// Вместо голого текста ошибки — понятная причина и кнопка, которая сразу ведёт туда, где это исправить.
function openSettingsModal(id) {
  const tile = document.querySelector(`.settings-tile[data-modal="${id}"]`);
  closeSettingsModals();
  document.querySelectorAll('.lx-modal').forEach(x => { if (x.style.display === 'flex' && x.id !== 'lx-setup') x.style.display = 'none'; });
  const nav = document.querySelector('.nav-btn[data-view="settings"]'); if (nav) nav.click();
  if (tile) setTimeout(() => tile.click(), 60);
}
function errAction(code) {
  const e = String(code || '');
  if (e === 'telegram_not_connected') return { label: t('fixTelegram'), run: () => openSettingsModal('settings-modal-telegram') };
  if (e === 'email_unverified') return { label: t('fixVerifyResend'), run: async () => {
    const r = await window.api.verifyResend(getLang());
    if (r && r.ok) uiAlert(r.already ? t('verifyAlready') : t('verifySent')(r.sentTo || ''));
    else uiAlert(errText((r && r.error) || 'failed'));
  } };
  if (e === 'not_configured' || /invalid login|535|534|auth|credentials|username and password/i.test(e)) return { label: t('fixMail'), run: () => openSettingsModal('settings-modal-email') };
  if (['license_inactive', 'pro_only', 'need_license', 'free_limit', 'license_required'].includes(e)) return { label: t('fixSubscription'), run: () => openSubscriptionSettings() };
  return null;
}
function setErrStatus(el, code, prefix) {
  if (!el) return;
  el.textContent = (prefix || '') + errText(code);
  const a = errAction(code);
  if (a) { const b = document.createElement('button'); b.type = 'button'; b.className = 'err-fix'; b.textContent = a.label + ' →'; b.addEventListener('click', a.run); el.appendChild(document.createTextNode(' ')); el.appendChild(b); }
}
async function alertErr(code, text) {
  const a = errAction(code);
  if (!a) return uiAlert(text || errText(code));
  const go = await uiDialog({ text: text || errText(code), okText: a.label, cancelText: t('dlgClose'), icon: '⚠️' });
  if (go) a.run();
}

// ---------- «Что нового» после обновления ----------
// Показываем один раз при первом запуске новой версии: пункты всех версий новее той,
// что пользователь уже видел. На новой установке (идёт знакомство) — ничего не показываем.
function renderChangelogEntries(entries) {
  const lang = getLang();
  const dateFmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString(localeCode(), { day: 'numeric', month: 'long', year: 'numeric' });
  return entries.map(e => `
    <div class="wn-version">
      <div class="wn-version-head">${t('wnVersion')(e.version, dateFmt(e.date))}</div>
      <ul>${(e.items[lang] || e.items.ru).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
    </div>`).join('');
}
function openWhatsNew(entries, { title, sub, button }) {
  document.getElementById('wn-title').textContent = title;
  document.getElementById('wn-sub').textContent = sub || '';
  document.getElementById('wn-sub').style.display = sub ? '' : 'none';
  document.getElementById('wn-body').innerHTML = renderChangelogEntries(entries);
  document.getElementById('btn-wn-close').textContent = button;
  document.getElementById('whats-new-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('btn-wn-close').focus(), 50);
}
document.getElementById('btn-wn-close').addEventListener('click', () => {
  document.getElementById('whats-new-overlay').style.display = 'none';
});
document.getElementById('btn-updates-history').addEventListener('click', () => {
  openWhatsNew(CHANGELOG, { title: t('wnHistoryTitle'), button: t('wnClose') });
});
async function checkWhatsNew() {
  const current = await window.api.getCurrentVersion();
  const st = await window.api.getSettings();
  const seen = st.last_seen_version;
  const save = () => window.api.saveSettings({ ...st, last_seen_version: current });
  if (st.onboarding_completed !== '1') { await save(); return; }
  // Если версия ещё ни разу не запоминалась (обновление со старой версии) — показываем
  // только текущую; иначе — все версии новее просмотренной (не больше трёх).
  const fresh = CHANGELOG.filter(e => compareVersions(e.version, current) <= 0 &&
    (seen ? compareVersions(e.version, seen) > 0 : e.version === current)).slice(0, 3);
  if (seen === current || !fresh.length) { if (seen !== current) await save(); return; }
  await save();
  openWhatsNew(fresh, { title: t('wnTitle'), sub: t('wnSub')(current), button: t('wnGotIt') });
}

// ---------- презентация при первом запуске ----------
const TOUR_SLIDES = [
  { art: ['💳', '📷', '🎁'], t: 'tour1T', d: 'tour1D' },
  { art: ['⌁', '📱', '⚡'], t: 'tour2T', d: 'tour2D' },
  { art: ['🖨', '📲', '✉️'], t: 'tour3T', d: 'tour3D' },
  { art: ['🎯', '🤖', '📣'], t: 'tour4T', d: 'tour4D' },
  { art: ['📈', '🔥', '👥'], t: 'tour5T', d: 'tour5D' },
  { art: ['✉️', '📱', '📋'], t: 'tour6T', d: 'tour6D' }
];
let tourIndex = 0;
function renderTour() {
  const sl = TOUR_SLIDES[tourIndex];
  const art = document.getElementById('tour-art');
  art.innerHTML = sl.art.map((e, i) => `<span class="tour-art-i tour-art-${i}">${e}</span>`).join('');
  art.classList.remove('tour-anim'); void art.offsetWidth; art.classList.add('tour-anim');
  document.getElementById('tour-title').textContent = t(sl.t);
  document.getElementById('tour-desc').textContent = t(sl.d);
  document.getElementById('tour-dots').innerHTML = TOUR_SLIDES.map((_, i) => `<button type="button" class="tour-dot ${i === tourIndex ? 'active' : ''}" data-i="${i}" aria-label="${i + 1}"></button>`).join('');
  document.querySelectorAll('#tour-dots .tour-dot').forEach(b => b.addEventListener('click', () => { tourIndex = Number(b.dataset.i); renderTour(); }));
  const last = tourIndex === TOUR_SLIDES.length - 1;
  document.getElementById('btn-tour-next').textContent = last ? t('tourDone') : t('tourNext');
  document.getElementById('btn-tour-skip').style.visibility = last ? 'hidden' : 'visible';
}
function showTour() {
  tourIndex = 0;
  renderTour();
  document.getElementById('tour-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('btn-tour-next').focus(), 50);
}
async function closeTour() {
  document.getElementById('tour-overlay').style.display = 'none';
  const st = await window.api.getSettings();
  if (st.tour_seen !== '1') await window.api.saveSettings({ ...st, tour_seen: '1' });
}
document.getElementById('btn-tour-next').addEventListener('click', () => {
  if (tourIndex < TOUR_SLIDES.length - 1) { tourIndex++; renderTour(); }
  else { closeTour(); const b = document.querySelector('[data-view="settings"]'); if (b) b.click(); }
});
document.getElementById('btn-tour-skip').addEventListener('click', closeTour);
document.getElementById('tour-overlay').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') document.getElementById('btn-tour-next').click();
  if (e.key === 'ArrowLeft' && tourIndex > 0) { tourIndex--; renderTour(); }
  if (e.key === 'Escape') closeTour();
});

// ---------- руководство ----------
function renderManual() {
  const sections = MANUAL[getLang()] || MANUAL.ru;
  const q = (document.getElementById('manual-search').value || '').trim().toLowerCase();
  const list = document.getElementById('manual-list');
  const matches = sections.map((sec, i) => ({ sec, i, hit: !q || (sec.title + ' ' + sec.p.join(' ')).toLowerCase().includes(q) })).filter(x => x.hit);
  const mark = (txt) => {
    const safe = escapeHtml(txt);
    if (!q) return safe;
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  };
  list.innerHTML = matches.length ? matches.map(({ sec }) => `
    <details class="manual-sec" ${q ? 'open' : ''}>
      <summary><span class="manual-ic">${sec.icon}</span><span>${mark(sec.title)}</span></summary>
      <ul>${sec.p.map(x => `<li>${mark(x)}</li>`).join('')}</ul>
    </details>`).join('') : emptyMiniHtml(t('noChartData'));
}
document.getElementById('manual-search').addEventListener('input', renderManual);
document.getElementById('btn-manual-tour').addEventListener('click', () => {
  document.getElementById('settings-modal-manual').style.display = 'none';
  showTour();
});

// ---------- автоматические рассылки ----------
const AUTO_RULE_IDS = ['winback', 'near', 'welcome', 'birthday'];
async function loadAutoSettings() {
  const [st, stats, preview] = await Promise.all([window.api.getSettings(), window.api.autoStats(), window.api.autoPreview()]);
  document.getElementById('auto-need-mail').style.display = (await window.api.mailStatus()).ready ? 'none' : 'block';
  document.getElementById('auto-time').value = st.auto_time || '10:00';
  document.getElementById('auto-winback-days').value = st.auto_winback_days || '30';
  AUTO_RULE_IDS.forEach(r => {
    document.getElementById(`auto-${r}-enabled`).checked = st[`auto_${r}_enabled`] === '1';
    document.getElementById(`auto-${r}-waiting`).textContent = t('autoWaiting')(preview[r] || 0);
    document.getElementById(`auto-${r}-sent`).textContent = t('autoSent30')(stats[r] || 0);
    document.querySelector(`.auto-rule[data-rule="${r}"]`).classList.toggle('auto-on', st[`auto_${r}_enabled`] === '1');
  });
}
async function saveAutoSettings() {
  const st = await window.api.getSettings();
  const patch = { auto_time: document.getElementById('auto-time').value || '10:00', auto_winback_days: document.getElementById('auto-winback-days').value };
  AUTO_RULE_IDS.forEach(r => { patch[`auto_${r}_enabled`] = document.getElementById(`auto-${r}-enabled`).checked ? '1' : '0'; });
  await window.api.saveSettings({ ...st, ...patch });
  loadAutoSettings();
}
['auto-time', 'auto-winback-days', ...AUTO_RULE_IDS.map(r => `auto-${r}-enabled`)].forEach(id =>
  document.getElementById(id).addEventListener('change', saveAutoSettings));
document.getElementById('btn-auto-run').addEventListener('click', async () => {
  const statusEl = document.getElementById('auto-status');
  const btn = document.getElementById('btn-auto-run');
  btn.disabled = true;
  statusEl.textContent = t('campaignSending');
  const res = await window.api.autoRunNow();
  btn.disabled = false;
  if (res.error) { setErrStatus(statusEl, res.error); return; }
  const total = Object.values(res.sent || {}).reduce((a, b) => a + b, 0);
  statusEl.textContent = t('autoRunDone')(total);
  loadAutoSettings();
});

// ---------- управление подпиской ----------
document.getElementById('btn-manage-sub').addEventListener('click', () => window.api.openExternal('https://loya-loyalty.com/manage'));
function renderSubPlanBox() {
  const box = document.getElementById('sub-plan-box'); if (!box) return;
  const m = licenseMode; if (!m) { box.innerHTML = ''; return; }
  const dt = m.trialUntil ? new Date(m.trialUntil).toLocaleDateString(getLang() === 'en' ? 'en-GB' : getLang()) : '';
  box.innerHTML = m.mode === 'full'
    ? `<div class="sub-plan sub-plan-ok">✅ ${escapeHtml(m.trial ? t('subPlanTrial')(dt, m.daysLeft) : t('subPlanTier')(m.tier === 'pro' ? 'Pro' : 'Starter'))}</div>`
    : `<div class="sub-plan sub-plan-free"><div>${escapeHtml(t('subPlanFree'))} ${escapeHtml(t('subHintFree'))}</div>${m.canBuy ? `<button type="button" id="btn-sub-open-site" class="fb-btn fb-primary">${escapeHtml(t('subPlanOpenSite'))}</button>` : ''}</div>`;
  const b = document.getElementById('btn-sub-open-site'); if (b) b.addEventListener('click', () => window.api.openSubscribe());
}
setInterval(renderSubPlanBox, 1500);

// ---------- проверка связи с сервером ----------
document.getElementById('btn-server-check').addEventListener('click', async (e) => {
  const btn = e.currentTarget, box = document.getElementById('server-check-result');
  btn.disabled = true; box.innerHTML = `<div class="sc-line">${t('serverCheckRunning')}</div>`;
  let res = [];
  try { res = await window.api.serverCheck(); } catch (err) { res = []; }
  btn.disabled = false;
  const host = (u) => String(u).replace(/^https:\/\//, '');
  const line = (ok, label, text) => `<div class="sc-line ${ok ? 'sc-ok' : 'sc-bad'}"><span>${ok ? '✅' : '❌'}</span><span><b>${escapeHtml(label)}</b>: ${escapeHtml(text)}</span></div>`;
  const alive = res.find(r => r.reachable && r.data);
  const answering = res.find(r => r.reachable);
  let html = `<div class="sc-title">${alive ? t('scTitleOk') : (answering ? t('scTitleOld') : t('scTitleDown'))}</div>`;
  const mainOk = !!(res[0] && res[0].reachable && res[0].data);
  res.forEach((r, i) => {
    // Запасной адрес со старой версией не мешает, пока основной работает — показываем спокойно, не красным.
    if (i > 0 && mainOk && !r.data) { html += `<div class="sc-line"><span>ℹ️</span><span><b>${escapeHtml(host(r.base))}</b>: ${escapeHtml(t('scBackupOld'))}</span></div>`; return; }
    html += line(r.reachable && !!r.data, host(r.base), `${!r.reachable ? t('scHostDown') : (r.data ? t('scHostOk') : t('scOutdated'))} (${i === 0 ? t('scMain') : t('scBackup')})`);
  });
  if (!alive && answering) html += `<p class="hint">${t('scOutdatedHint')}</p>`;
  else if (!alive) html += `<p class="hint">${t('scDownHint')}</p>`;
  else {
    if (!(res[0].reachable && res[0].data)) html += `<p class="hint">${t('scUsingBackup')}</p>`;
    const d = alive.data || {};
    html += line(!!d.wallet && !!d.walletKeyValid, t('scWallet'), !d.wallet ? t('scWalletNo') : (!d.walletKeyValid ? t('scWalletBadKey') : t('scWalletOk')));
    html += line(!!d.hero, t('scHero'), d.hero ? t('scHeroOk') : t('scHeroNo')(d.heroError || '?'));
    html += line(!!d.mail, t('scMail'), d.mail ? t('scMailOk') : t('scMailNo'));
    html += d.apple ? line(true, t('scApple'), t('scAppleOk')) : `<div class="sc-line"><span>ℹ️</span><span><b>${escapeHtml(t('scApple'))}</b>: ${escapeHtml(t('scAppleNo'))}</span></div>`;
    html += line(!!d.db, t('scDb'), d.db ? t('scDbOk') : t('scDbNo'));
    if (d.db) { const miss = d.tablesMissing || []; html += line(miss.length === 0, t('scTables'), miss.length ? t('scTablesNo')(miss.join(', ')) : t('scTablesOk')); }
    const key = (await window.api.getSettings()).license_key;
    if (!key) html += line(false, t('scLicense'), t('scLicenseNoKey'));
    else if (d.license === 'active') html += line(true, t('scLicense'), t('scLicenseActive'));
    else if (d.license === 'not_found') html += line(false, t('scLicense'), t('scLicenseNotFound'));
    else html += line(false, t('scLicense'), d.license ? t('scLicenseInactive')(d.license) : t('scDbNo'));
  }
  box.innerHTML = html;
});

// ---------- товары и склад ----------
const INV_UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'pack', 'service'];
let invTab = 'products';
let invEditing = null, invMoving = null, invMoveKind = 'in', invExportPeriod = 'month';
function invQty(n) { const v = Math.round(Number(n || 0) * 1000) / 1000; return getLang() === 'en' ? String(v) : String(v).replace('.', ','); }
function invMoney(v) { return `${fmtMoney(v)} ${currencySymbol()}`; }
function invDate(s) { if (!s) return ''; const d = new Date(String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? s : d.toLocaleString(getLang() === 'en' ? 'en-GB' : getLang(), { dateStyle: 'short', timeStyle: 'short' }); }
function openInvModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeInvModal(id) { document.getElementById(id).style.display = 'none'; }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeInvModal(b.dataset.close)));
['inv-product-modal', 'inv-move-modal', 'inv-export-modal'].forEach(id => document.getElementById(id).addEventListener('mousedown', (e) => { if (e.target.id === id) closeInvModal(id); }));
function invT(key, fallback) { const v = t(key); return v && v !== key ? v : fallback; }

async function refreshInventory() {
  const sum = await window.api.invSummary();
  document.getElementById('inv-tiles').innerHTML = [
    [sum.products, t('invTileProducts')], [invMoney(sum.stockValue), t('invTileValue')],
    [sum.low, t('invTileLow'), sum.low > 0 ? 'warn' : ''], [invMoney(sum.sales30), t('invTileSales')(sum.receipts30)],
    [sum.pending, t('invTilePending'), sum.pending > 0 ? 'info' : '']
  ].map(([v, l, c]) => `<div class="inv-tile ${c || ''}"><b>${escapeHtml(String(v))}</b><span>${escapeHtml(l)}</span></div>`).join('');
  const cats = await window.api.invCategories();
  const sel = document.getElementById('inv-category'); const cur = sel.value;
  sel.innerHTML = `<option value="">${escapeHtml(t('invAllCategories'))}</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  sel.value = cats.includes(cur) ? cur : '';
  document.getElementById('inv-cat-list').innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
  document.querySelectorAll('#inv-tabs .inv-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === invTab));
  document.getElementById('inv-toolbar').style.display = invTab === 'products' ? '' : 'none';
  const box = document.getElementById('inv-list');
  if (invTab === 'products') {
    const list = await window.api.invList({ q: document.getElementById('inv-search').value, category: sel.value, lowOnly: document.getElementById('inv-low').checked });
    box.innerHTML = list.length ? `<div class="inv-row inv-row-head"><span>${t('invName')}</span><span>${t('invCategory')}</span><span class="num">${t('invPrice')}</span><span class="num">${t('invStock')}</span><span></span></div>` + list.map(p => {
      const low = p.min_stock > 0 && p.stock <= p.min_stock;
      return `<div class="inv-row" data-id="${p.id}"><span class="inv-name"><b>${escapeHtml(p.name)}</b><small>${escapeHtml([p.sku, p.barcode].filter(Boolean).join(' · '))}</small></span>
        <span class="inv-cat">${escapeHtml(p.category || '—')}</span><span class="num">${invMoney(p.price)}</span>
        <span class="num"><span class="inv-stock ${low ? 'low' : ''}">${invQty(p.stock)} ${escapeHtml(t('unit_' + p.unit))}</span></span>
        <span class="inv-acts"><button type="button" class="inv-mini" data-move="in">${t('invIn')}</button><button type="button" class="inv-mini" data-move="writeoff">${t('invOut')}</button><button type="button" class="inv-mini" data-move="adjust">${t('invCount')}</button><button type="button" class="inv-mini inv-mini-icon" data-edit title="${escapeHtml(t('invEdit'))}">✎</button></span></div>`;
    }).join('') : `<div class="inv-empty">${t('invEmpty')}</div>`;
    box.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => openInvMove(Number(b.closest('.inv-row').dataset.id), b.dataset.move)));
    box.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openInvProduct(Number(b.closest('.inv-row').dataset.id))));
  } else if (invTab === 'moves') {
    const moves = await window.api.invMoves({ limit: 300 });
    box.innerHTML = moves.length ? `<div class="inv-row inv-row-head inv-moves"><span>${t('invDate')}</span><span>${t('invName')}</span><span>${t('invKind')}</span><span class="num">${t('invQty')}</span><span class="num">${t('invStockAfter')}</span></div>` + moves.map(m => `<div class="inv-row inv-moves">
        <span>${escapeHtml(invDate(m.created_at))}</span><span><b>${escapeHtml(m.product_name)}</b>${m.note ? `<small>${escapeHtml(m.note === 'start' ? t('invNoteStart') : m.note === 'import' ? t('invNoteImport') : m.note)}</small>` : ''}</span>
        <span><span class="inv-kind k-${m.kind}">${escapeHtml(t('invKind_' + m.kind))}</span></span><span class="num ${m.qty < 0 ? 'neg' : 'pos'}">${m.qty > 0 ? '+' : ''}${invQty(m.qty)}</span><span class="num">${invQty(m.stock_after)}</span></div>`).join('') : `<div class="inv-empty">${t('invNoMoves')}</div>`;
  } else {
    const rec = await window.api.invReceipts({ limit: 200 });
    box.innerHTML = rec.length ? `<div class="inv-row inv-row-head inv-receipts"><span>${t('invDate')}</span><span>${t('invReceipt')}</span><span>${t('invClient')}</span><span class="num">${t('invTotal')}</span></div>` + rec.map(r => {
      let items = []; try { items = JSON.parse(r.items || '[]'); } catch (e) { /* пусто */ }
      return `<div class="inv-row inv-receipts"><span>${escapeHtml(invDate(r.created_at))}</span><span><b>${escapeHtml(r.external_id || '#' + r.id)}</b><small>${escapeHtml(invT('invSrc_' + r.source, r.source))}${items.length ? ' · ' + escapeHtml(items.slice(0, 3).map(i => `${i.name || i.sku || i.barcode} ×${invQty(i.qty)}`).join(', ')) + (items.length > 3 ? '…' : '') : ''}</small></span>
        <span>${r.status === 'pending' ? `<span class="inv-kind k-pending">${t('invWaitingCard')}</span> <button type="button" class="inv-mini inv-del-receipt" data-id="${r.id}" title="${escapeHtml(t('invDeleteReceipt'))}" aria-label="${escapeHtml(t('invDeleteReceipt'))}">🗑</button>` : escapeHtml(r.client_name || '—')}</span><span class="num"><b>${invMoney(r.total)}</b></span></div>`;
    }).join('') : `<div class="inv-empty">${t('invNoReceipts')}</div>`;
  }
}
document.querySelectorAll('#inv-tabs .inv-tab').forEach(b => b.addEventListener('click', () => { invTab = b.dataset.tab; refreshInventory(); }));
let invSearchTimer = null;
document.getElementById('inv-search').addEventListener('input', () => { clearTimeout(invSearchTimer); invSearchTimer = setTimeout(refreshInventory, 200); });
document.getElementById('inv-category').addEventListener('change', refreshInventory);
document.getElementById('inv-low').addEventListener('change', refreshInventory);

async function openInvProduct(id) {
  invEditing = id || null;
  const p = id ? (await window.api.invList({})).find(x => x.id === id) : null;
  document.getElementById('inv-product-title').textContent = p ? t('invProductEdit') : t('invProductNew');
  document.getElementById('invp-unit').innerHTML = INV_UNITS.map(u => `<option value="${u}">${escapeHtml(t('unitFull_' + u))}</option>`).join('');
  const set = (k, v) => { document.getElementById('invp-' + k).value = v == null ? '' : v; };
  set('name', p && p.name); set('sku', p && p.sku); set('barcode', p && p.barcode); set('category', p && p.category);
  set('unit', p ? p.unit : 'pcs'); set('price', p ? invQty(p.price) : ''); set('cost', p ? invQty(p.cost) : ''); set('min', p && p.min_stock ? invQty(p.min_stock) : ''); set('stock', '');
  document.getElementById('invp-stock-wrap').style.display = p ? 'none' : '';
  document.getElementById('btn-invp-delete').style.display = p ? '' : 'none';
  document.getElementById('invp-status').textContent = '';
  openInvModal('inv-product-modal');
  document.getElementById('invp-name').focus();
}
document.getElementById('btn-inv-add').addEventListener('click', () => openInvProduct(null));
document.getElementById('btn-invp-save').addEventListener('click', async () => {
  const g = (k) => document.getElementById('invp-' + k).value;
  const r = await window.api.invSave({ id: invEditing, name: g('name'), sku: g('sku'), barcode: g('barcode'), category: g('category'), unit: g('unit'), price: g('price'), cost: g('cost'), stock: g('stock'), minStock: g('min') });
  if (r.error === 'free_limit') { closeInvModal('inv-product-modal'); showFreeLimit('products'); return; }
  if (r.error) { document.getElementById('invp-status').textContent = invT('invErr_' + r.error, errText(r.error)); return; }
  closeInvModal('inv-product-modal'); refreshInventory();
});
document.getElementById('btn-invp-delete').addEventListener('click', async () => {
  if (!invEditing || !(await uiConfirm(t('invDeleteConfirm'), { danger: true }))) return;
  await window.api.invDelete(invEditing); closeInvModal('inv-product-modal'); refreshInventory();
});

async function openInvMove(id, kind) {
  const p = (await window.api.invList({})).find(x => x.id === id); if (!p) return;
  invMoving = p; invMoveKind = kind;
  document.getElementById('inv-move-title').textContent = p.name;
  document.getElementById('inv-move-current').textContent = t('invCurrentStock')(invQty(p.stock), t('unit_' + p.unit));
  const draw = () => {
    document.getElementById('inv-move-kinds').innerHTML = ['in', 'writeoff', 'adjust'].map(k => `<button type="button" class="inv-kind-btn ${k === invMoveKind ? 'active' : ''}" data-k="${k}">${t('invKindBtn_' + k)}</button>`).join('');
    document.querySelectorAll('#inv-move-kinds [data-k]').forEach(b => b.addEventListener('click', () => { invMoveKind = b.dataset.k; draw(); }));
    document.getElementById('inv-move-qty-label').textContent = invMoveKind === 'adjust' ? t('invQtyActual') : t('invQty');
    document.getElementById('inv-move-price-wrap').style.display = invMoveKind === 'in' ? '' : 'none';
  };
  draw();
  ['qty', 'price', 'note'].forEach(k => { document.getElementById('inv-move-' + k).value = ''; });
  if (kind === 'in') document.getElementById('inv-move-price').value = p.cost ? invQty(p.cost) : '';
  document.getElementById('inv-move-status').textContent = '';
  openInvModal('inv-move-modal');
  document.getElementById('inv-move-qty').focus();
}
document.getElementById('btn-inv-move-save').addEventListener('click', async () => {
  if (!invMoving) return;
  const r = await window.api.invMove(invMoving.id, invMoveKind, document.getElementById('inv-move-qty').value, { price: invMoveKind === 'in' ? (document.getElementById('inv-move-price').value || null) : null, note: document.getElementById('inv-move-note').value });
  if (r.error) { document.getElementById('inv-move-status').textContent = invT('invErr_' + r.error, errText(r.error)); return; }
  closeInvModal('inv-move-modal'); refreshInventory();
});
document.getElementById('inv-move-qty').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('btn-inv-move-save').click(); });

document.getElementById('btn-inv-import').addEventListener('click', async () => {
  const r = await window.api.invImportProducts();
  if (!r || r.canceled) return;
  if (r.error) { uiAlert(invT('invErr_' + r.error, errText(r.error))); return; }
  uiAlert(t('invImportDone')(r.created, r.updated, r.skipped)); refreshInventory();
});
document.getElementById('btn-inv-export').addEventListener('click', () => {
  const draw = () => {
    document.getElementById('inv-export-period').innerHTML = ['month', 'prev', 'all'].map(k => `<button type="button" class="inv-kind-btn ${k === invExportPeriod ? 'active' : ''}" data-p="${k}">${t('invPeriod_' + k)}</button>`).join('');
    document.querySelectorAll('#inv-export-period [data-p]').forEach(b => b.addEventListener('click', () => { invExportPeriod = b.dataset.p; draw(); }));
  };
  draw(); document.getElementById('inv-export-status').textContent = ''; openInvModal('inv-export-modal');
});
document.getElementById('btn-inv-export-go').addEventListener('click', async () => {
  const keys = ['name', 'sku', 'barcode', 'category', 'unit', 'price', 'cost', 'stock', 'minStock', 'stockValue', 'date', 'kind', 'qty', 'stockAfter', 'receipt', 'note', 'source', 'total', 'currency', 'client', 'items'];
  const H = {}; keys.forEach(k => { H[k] = t('csv_' + k); });
  ['in', 'writeoff', 'sale', 'return', 'adjust'].forEach(k => { H['k_' + k] = t('invKind_' + k); });
  const r = await window.api.invExport(invExportPeriod, H, getLang());
  if (!r || r.canceled) return;
  document.getElementById('inv-export-status').textContent = r.error ? errText(r.error) : t('invExportDone')(r.files.length);
});
document.getElementById('btn-inv-pos').addEventListener('click', () => {
  // Окно кассы живёт в «Настройках» — переходим туда и открываем его.
  const nav = document.querySelector('.nav-btn[data-view="settings"]');
  if (nav) nav.click();
  setTimeout(() => { const tile = document.querySelector('.settings-tile[data-modal="settings-modal-pos"]'); if (tile) tile.click(); }, 50);
});

// ---------- подключение кассы ----------
const POS_SAMPLE = { id: 'R-1001', total: 12.5, currency: 'EUR', created_at: '2026-10-02T14:05:00', card: 'LC-1A2B3C4D5E6F', phone: '+421900123456', items: [{ name: 'Cappuccino', sku: 'CAP', barcode: '4006381333931', qty: 2, price: 3.5 }, { name: 'Croissant', sku: 'CRO', qty: 1, price: 5.5 }] };
async function renderPosInfo(info) {
  document.getElementById('pos-enabled').checked = !!info.enabled;
  document.getElementById('pos-cloud').checked = !!info.cloud;
  document.getElementById('pos-local-url').textContent = info.localUrl || '—';
  document.getElementById('pos-token').textContent = info.token || t('posTokenAfterSave');
  const showCloud = !!(info.cloud && info.cloudUrl);
  document.getElementById('pos-cloud-row').style.display = showCloud ? '' : 'none';
  document.getElementById('pos-cloud-actions').style.display = showCloud ? '' : 'none';
  document.getElementById('pos-cloud-url').textContent = info.cloudUrl || '—';
  document.getElementById('pos-claim').value = info.claimMinutes || 10;
  document.getElementById('pos-format-json').textContent = 'POST ' + (info.localUrl || 'http://…/api/pos/receipt') + '\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n' + JSON.stringify(POS_SAMPLE, null, 2);
}
async function loadPosSettings() { document.getElementById('pos-status').textContent = ''; await renderPosInfo(await window.api.posInfo()); }
document.getElementById('btn-pos-save').addEventListener('click', async () => {
  if (document.getElementById('pos-enabled').checked && !features.pos) await setFeature('pos', true);
  const info = await window.api.posSave({ enabled: document.getElementById('pos-enabled').checked, cloud: document.getElementById('pos-cloud').checked, claimMinutes: document.getElementById('pos-claim').value });
  await renderPosInfo(info);
  document.getElementById('pos-status').textContent = info.cloudError ? (info.cloudError === 'license_inactive' ? t('errLicenseInactive') : info.cloudError === 'db_error' ? t('onlineDbErr')('') : t('posCloudErr')) : t('posSaved');
});
document.getElementById('btn-pos-rotate-local').addEventListener('click', async () => { if (await uiConfirm(t('posRotateConfirm'))) renderPosInfo(await window.api.posRotate('local')); });
document.getElementById('btn-pos-rotate-cloud').addEventListener('click', async () => { if (await uiConfirm(t('posRotateConfirm'))) renderPosInfo(await window.api.posRotate('cloud')); });
document.getElementById('btn-pos-test').addEventListener('click', async () => {
  const r = await window.api.posTest();
  document.getElementById('pos-status').textContent = r && r.ok ? t('posTestOk') : errText((r && r.error) || 'failed');
});
document.querySelectorAll('#settings-modal-pos [data-copy]').forEach(b => b.addEventListener('click', async () => {
  const v = document.getElementById(b.dataset.copy).textContent;
  try { await navigator.clipboard.writeText(v); } catch (e) { /* без буфера */ }
  document.getElementById('pos-status').textContent = t('onlineCopied');
}));

// ---------- доступ из дома ----------
async function renderOwnerInfo(info) {
  document.getElementById('owner-need-license').style.display = info.hasLicense ? 'none' : 'block';
  document.getElementById('owner-off').style.display = info.enabled ? 'none' : 'block';
  document.getElementById('owner-on').style.display = info.enabled ? 'block' : 'none';
  if (!info.enabled) return;
  document.getElementById('owner-url').value = info.url || '';
  const qr = document.getElementById('owner-qr');
  if (info.url) { try { qr.src = await window.api.qrDataUrl(info.url, { width: 300, bgColor: '#ffffff' }); qr.style.display = 'block'; } catch (e) { qr.style.display = 'none'; } }
  const st = document.getElementById('owner-sync-state');
  if (info.lastError) st.textContent = t('ownerSyncErr');
  else if (info.lastSync) st.textContent = t('ownerSyncOk')(new Date(info.lastSync).toLocaleString(getLang() === 'en' ? 'en-GB' : getLang()));
  else st.textContent = t('ownerSyncNever');
  const ex = document.getElementById('owner-link-exp');
  ex.textContent = info.linkExpires ? t('ownerLinkExpires')(new Date(info.linkExpires).toLocaleDateString(getLang() === 'en' ? 'en-GB' : getLang())) : t('ownerLinkNoExpiry');
  const lg = document.getElementById('owner-logins'); const list = Array.isArray(info.logins) ? info.logins : [];
  lg.innerHTML = list.length ? list.map(l => `<div class="owner-login ${l.ok ? 'ok' : 'bad'}"><b>${l.ok ? '✅' : '⛔'} ${escapeHtml(new Date(l.at).toLocaleString(getLang() === 'en' ? 'en-GB' : getLang(), { dateStyle: 'short', timeStyle: 'short' }))}</b><span>${escapeHtml(t(l.method === 'code' ? 'ownerLoginCode' : 'ownerLoginLink'))}${l.ok ? '' : ' · ' + escapeHtml(t('ownerLoginFailed'))}${l.ip ? ' · ' + escapeHtml(l.ip) : ''}</span><small>${escapeHtml(String(l.ua || '').slice(0, 70))}</small></div>`).join('') : `<div class="hint">${escapeHtml(t('ownerLoginsNone'))}</div>`;
}
document.getElementById('btn-owner-logout-all').addEventListener('click', async () => {
  if (!(await uiConfirm(t('ownerLogoutAllConfirm')))) return;
  const r = await window.api.ownerLogoutAll();
  uiAlert(r && r.ok ? t('ownerLogoutAllDone') : errText((r && r.error) || 'failed'));
});
async function loadOwnerSettings() {
  document.getElementById('owner-status').textContent = '';
  document.getElementById('owner-status-off').textContent = '';
  document.getElementById('owner-pass').value = ''; document.getElementById('owner-pass2').value = '';
  await renderOwnerInfo(await window.api.ownerInfo());
}
async function ownerEnableFlow(inputId, statusId, btn) {
  const pass = document.getElementById(inputId).value;
  const statusEl = document.getElementById(statusId);
  if (pass.length < 8) { statusEl.textContent = t('errWeakPassword'); return; }
  btn.disabled = true; statusEl.textContent = '…';
  const expSel = document.getElementById(inputId === 'owner-pass' ? 'owner-exp1' : 'owner-exp2');
  const info = await window.api.ownerEnable(pass, expSel ? Number(expSel.value) : 0);
  btn.disabled = false;
  if (info.error) { statusEl.textContent = info.error === 'need_license' ? t('onlineNeedLicense') : (info.error === 'weak_password' ? t('errWeakPassword') : errText(info.error)); return; }
  document.getElementById(inputId).value = '';
  await renderOwnerInfo(info);
  document.getElementById('owner-status').textContent = t('ownerEnabledOk');
}
document.getElementById('btn-owner-enable').addEventListener('click', (e) => ownerEnableFlow('owner-pass', 'owner-status-off', e.currentTarget));
document.getElementById('btn-owner-change').addEventListener('click', (e) => ownerEnableFlow('owner-pass2', 'owner-status', e.currentTarget));
document.getElementById('btn-owner-sync').addEventListener('click', async (e) => {
  const btn = e.currentTarget; btn.disabled = true;
  await renderOwnerInfo(await window.api.ownerSyncNow());
  btn.disabled = false;
});
document.getElementById('btn-owner-disable').addEventListener('click', async () => {
  if (!(await uiConfirm(t('ownerDisableConfirm'), { danger: true }))) return;
  const info = await window.api.ownerDisable();
  await renderOwnerInfo(info);
  document.getElementById('owner-status-off').textContent = info.deferred ? t('ownerDisabledLater') : t('ownerDisabledOk');
});
document.getElementById('btn-owner-copy').addEventListener('click', async () => {
  const url = document.getElementById('owner-url').value;
  try { await navigator.clipboard.writeText(url); } catch (e) { document.getElementById('owner-url').select(); document.execCommand('copy'); }
  document.getElementById('owner-status').textContent = t('onlineCopied');
});
document.getElementById('btn-owner-open').addEventListener('click', () => { const u = document.getElementById('owner-url').value; if (u) window.api.openExternal(u); });

// ---------- регистрация по ссылке ----------
function fmtBonusDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return getLang() === 'en' ? `${m}/${d}` : `${d}.${m}`;
}
async function renderOnlineInfo(info) {
  document.getElementById('online-need-license').style.display = info.hasLicense ? 'none' : 'block';
  document.getElementById('online-enabled').checked = !!info.enabled;
  document.getElementById('online-title').value = info.title || '';
  document.getElementById('online-percent').value = info.percent;
  document.getElementById('online-days').value = info.days;
  const box = document.getElementById('online-link-box');
  box.style.display = info.url ? 'block' : 'none';
  if (info.url) {
    document.getElementById('online-url').value = info.url;
    const qr = document.getElementById('online-qr');
    try { qr.src = await window.api.qrDataUrl(info.url, { width: 300, bgColor: '#ffffff' }); qr.style.display = 'block'; } catch (e) { qr.style.display = 'none'; }
  }
  const st = info.stats || {};
  document.getElementById('online-stats').innerHTML = (st.total ? `<div class="online-stats-title">${t('onlineStatsTitle')}</div>
    <div class="online-stats-grid">
      <div><b>${st.total}</b><span>${t('onlineStatTotal')}</span></div><div><b>${st.active}</b><span>${t('onlineStatActive')}</span></div>
      <div><b>${st.used}</b><span>${t('onlineStatUsed')}</span></div><div><b>${st.expired}</b><span>${t('onlineStatExpired')}</span></div>
    </div><p class="hint field-tip">${t('onlineStatsTip')}</p>` : '');
}
async function loadOnlineSettings() {
  document.getElementById('online-status').textContent = '';
  await renderOnlineInfo(await window.api.onlineInfo());
}
document.getElementById('btn-online-save').addEventListener('click', async () => {
  const statusEl = document.getElementById('online-status');
  const btn = document.getElementById('btn-online-save');
  btn.disabled = true; statusEl.textContent = t('loading') || '…';
  const info = await window.api.onlineSave({
    enabled: document.getElementById('online-enabled').checked,
    title: document.getElementById('online-title').value,
    percent: document.getElementById('online-percent').value,
    days: document.getElementById('online-days').value
  });
  btn.disabled = false;
  await renderOnlineInfo(info);
  statusEl.textContent = !info.publishError ? t('onlineSavedOk')
    : info.publishError === 'need_license' ? t('onlineNeedLicense')
    : info.publishError === 'license_inactive' ? t('errLicenseInactive')
    : (info.publishError === 'db_error' || info.publishError === 'server_error') ? t('onlineDbErr')(info.publishDetail || '')
    : t('onlineLinkErr');
});
document.getElementById('btn-online-copy').addEventListener('click', async () => {
  const url = document.getElementById('online-url').value;
  try { await navigator.clipboard.writeText(url); } catch (e) { document.getElementById('online-url').select(); document.execCommand('copy'); }
  document.getElementById('online-status').textContent = t('onlineCopied');
});
document.getElementById('btn-online-open').addEventListener('click', () => {
  const url = document.getElementById('online-url').value;
  if (url) window.api.openExternal(url);
});

// ---------- печать карт и наклеек ----------
let printClientId = null;
function openPrintModal(clientId) {
  printClientId = clientId || null;
  document.getElementById('print-scope-client-opt').style.display = printClientId ? '' : 'none';
  const scope = printClientId ? 'client' : 'all';
  document.querySelector(`input[name="print-scope"][value="${scope}"]`).checked = true;
  document.getElementById('print-status').textContent = '';
  document.getElementById('print-modal').style.display = 'flex';
  updatePrintCount();
}
function cardsForPrint() {
  const scope = document.querySelector('input[name="print-scope"]:checked').value;
  const ids = scope === 'client' ? [printClientId] : scope === 'list' ? lastClientsListIds : allClients.map(c => c.id);
  const idSet = new Set(ids);
  const out = [];
  allClients.filter(c => idSet.has(c.id)).forEach(c => {
    groupDiscountCards(allCards.filter(cd => cd.client_id === c.id)).forEach(g => out.push({ ...g.card, client_name: c.name }));
  });
  return out;
}
function updatePrintCount() {
  const n = cardsForPrint().length;
  document.getElementById('print-count').textContent = n ? t('printCount')(n) : t('printNothing');
  document.getElementById('btn-print-do').disabled = !n;
  document.getElementById('btn-print-pdf').disabled = !n;
}
document.querySelectorAll('input[name="print-scope"], input[name="print-type"]').forEach(i => i.addEventListener('change', updatePrintCount));
document.getElementById('btn-open-print').addEventListener('click', async () => {
  if (!allClients.length) await refreshClients();
  openPrintModal(null);
});
document.getElementById('btn-print-close').addEventListener('click', () => { document.getElementById('print-modal').style.display = 'none'; });

async function buildPrintHtml() {
  const type = document.querySelector('input[name="print-type"]:checked').value;
  const cards = cardsForPrint();
  const css = getComputedStyle(document.documentElement);
  const primary = css.getPropertyValue('--color-primary').trim() || '#d4af37';
  const niche = NichesModule.getNiche(currentNicheId);
  const brand = escapeHtml(currentBrandName);
  const items = [];
  for (const c of cards) {
    const qr = await window.api.qrDataUrl(c.code, { width: 420, bgColor: '#ffffff' });
    const title = escapeHtml(c.title || (c.type === 'discount' ? `${t('chipDiscount')} −${c.discount_percent}%` : c.type === 'spend' ? t('chipSpend') : t('chipStamp')));
    items.push(type === 'cards'
      ? `<div class="pc"><div class="pc-l"><div class="pc-brand">${niche.emoji} ${brand}</div><div class="pc-title">${title}</div><div class="pc-name">${escapeHtml(c.client_name || '')}</div><div class="pc-hint">${t('printScanMe')}</div></div><div class="pc-r"><img src="${qr}"><div class="pc-code">${escapeHtml(c.code)}</div></div></div>`
      : `<div class="ps"><div class="ps-brand">${niche.emoji} ${brand}</div><img src="${qr}"><div class="ps-code">${escapeHtml(c.code)}</div></div>`);
  }
  const perPage = type === 'cards' ? 10 : 24;
  const pages = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(`<div class="page ${type}">${items.slice(i, i + perPage).join('')}</div>`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "Segoe UI", Arial, sans-serif; }
    .page { width: 210mm; height: 297mm; page-break-after: always; display: grid; justify-content: center; align-content: start; }
    .page.cards { grid-template-columns: repeat(2, 85.6mm); grid-auto-rows: 54mm; gap: 3mm 4mm; padding-top: 7.5mm; }
    .page.stickers { grid-template-columns: repeat(4, 40mm); grid-auto-rows: 40mm; gap: 5mm; padding-top: 16mm; }
    .pc { position: relative; overflow: hidden; border-radius: 3.2mm; display: flex; padding: 4.5mm; color: #f5efe3;
      background: radial-gradient(circle at 95% 0%, ${primary}88, transparent 60%), linear-gradient(150deg, #1f2430, #0b0d12); outline: .2mm solid #0003; }
    .pc-l { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .pc-brand { font-weight: 800; font-size: 11pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pc-title { margin-top: 1.5mm; font-size: 7.5pt; font-weight: 700; color: ${primary}; }
    .pc-name { margin-top: auto; font-size: 9pt; font-weight: 700; }
    .pc-hint { font-size: 6pt; opacity: .6; margin-top: .6mm; }
    .pc-r { width: 30mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm; }
    .pc-r img { width: 28mm; height: 28mm; background: #fff; border-radius: 2mm; padding: 1.2mm; }
    .pc-code { font-family: Consolas, monospace; font-size: 5.5pt; letter-spacing: .08em; opacity: .75; }
    .ps { border: .2mm dashed #bbb; border-radius: 3mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .8mm; background: #fff; color: #111; }
    .ps-brand { font-size: 6.5pt; font-weight: 800; max-width: 36mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ps img { width: 28mm; height: 28mm; }
    .ps-code { font-family: Consolas, monospace; font-size: 5.5pt; letter-spacing: .06em; }
  </style></head><body>${pages.join('')}</body></html>`;
}
async function doPrint(pdf) {
  const statusEl = document.getElementById('print-status');
  statusEl.textContent = t('printPreparing');
  const html = await buildPrintHtml();
  const res = await window.api.printHtml(html, { pdf, title: t('printHeading'), fileName: 'loya-cards' });
  statusEl.textContent = res && res.ok ? (pdf ? t('savedFile') + res.filePath : '') : '';
}
document.getElementById('btn-print-do').addEventListener('click', () => doPrint(false));
document.getElementById('btn-print-pdf').addEventListener('click', () => doPrint(true));

// Диалог с несколькими вариантами (кнопки-строки). Возвращает ключ выбранного или null.
function uiChoice(text, options) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'ui-dialog-overlay';
    overlay.innerHTML = `<div class="ui-dialog" role="dialog" aria-modal="true">
      <div class="ui-dialog-icon">💳</div><div class="ui-dialog-text"></div>
      <div class="ui-choice-list">${options.map(o => `<button type="button" class="ui-choice" data-k="${o.key}">${o.label}</button>`).join('')}</div>
      <div class="ui-dialog-actions"><button type="button" class="ui-dialog-cancel">${t('dlgCancel')}</button></div></div>`;
    overlay.querySelector('.ui-dialog-text').textContent = text;
    document.body.appendChild(overlay);
    const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); } }
    document.addEventListener('keydown', onKey, true);
    overlay.querySelectorAll('.ui-choice').forEach(b => b.addEventListener('click', () => close(b.dataset.k)));
    overlay.querySelector('.ui-dialog-cancel').addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
  });
}

// ---------- «Осталось настроить» в начале Настроек ----------
async function renderSetupChecklist() {
  const box = document.getElementById('setup-checklist');
  if (!box) return;
  const [st, mail] = await Promise.all([window.api.getSettings(), window.api.mailStatus()]);
  const hasKey = !!st.license_key;
  const items = [
    { ok: hasKey, ic: '🔑', title: t('setupKeyT'), desc: t('setupKeyD'), modal: 'settings-modal-subscription' },
    { ok: mail.ready, ic: '✉️', title: t('setupMailT'), desc: mail.ready ? t('setupMailOk') : t('setupMailNo'), modal: 'settings-modal-email' },
    { ok: !!st.telegram_bot_token, ic: '✈️', title: t('setupTgT'), desc: t('setupTgD'), modal: 'settings-modal-telegram', optional: true },
    { ok: !!st.selfreg_card_type, ic: '📋', title: t('setupRegT'), desc: t('setupRegD'), modal: 'settings-modal-selfreg' },
    { ok: hasKey, ic: '💳', title: t('setupWalletT'), desc: hasKey ? t('setupWalletOk') : t('setupWalletNo'), modal: 'settings-modal-subscription' }
  ];
  // Telegram — по желанию: не считаем его в «осталось настроить».
  const left = items.filter(i => !i.ok && !i.optional).length;
  const required = items.filter(i => !i.optional).length;
  // Состояние списка: '' — раскрыт, 'collapsed' — свёрнут в одну строку, 'hidden' — скрыт совсем
  // (ссылка «Список настройки» рядом с адресом сайта возвращает его обратно).
  const state = st.setup_checklist_state || '';
  const showLink = document.getElementById('btn-setup-show');
  if (showLink) showLink.style.display = state === 'hidden' ? '' : 'none';
  if (state === 'hidden') { box.style.display = 'none'; return; }
  box.style.display = '';
  const collapsed = state === 'collapsed';
  box.classList.toggle('setup-done', left === 0);
  box.classList.toggle('setup-collapsed', collapsed);
  const headBtns = `<span class="setup-head-btns">${left === 0 ? `<button type="button" class="setup-mini" data-setup-state="hidden">${t('setupHide')}</button>`
    : `<button type="button" class="setup-mini" data-setup-state="${collapsed ? '' : 'collapsed'}">${collapsed ? t('setupExpand') : t('setupCollapse')}</button>`}</span>`;
  box.innerHTML = `<div class="setup-head"><div class="setup-head-row"><b>${t('setupTitle')(left)}</b>${headBtns}</div>${collapsed ? '' : `<span>${t('setupSub')}</span>`}
    <div class="setup-bar"><i style="width:${Math.round((required - left) / required * 100)}%"></i></div></div>
    ${collapsed ? '' : `<div class="setup-list">${items.map(i => `<div class="setup-item ${i.ok ? 'ok' : ''}">
      <span class="setup-ic">${i.ok ? '✓' : i.ic}</span>
      <span class="setup-txt"><b>${escapeHtml(i.title)}${i.optional && !i.ok ? ` <em class="setup-opt">${escapeHtml(t('hsOptional'))}</em>` : ''}</b><small>${escapeHtml(i.desc)}</small></span>
      ${i.ok ? `<em>${t('setupDone')}</em>` : `<button type="button" data-modal-open="${i.modal}">${t('setupGo')}</button>`}</div>`).join('')}</div>`}`;
  box.querySelectorAll('[data-setup-state]').forEach(b => b.addEventListener('click', async () => {
    await window.api.saveSettings({ ...(await window.api.getSettings()), setup_checklist_state: b.dataset.setupState });
    renderSetupChecklist();
  }));
  box.querySelectorAll('[data-modal-open]').forEach(b => b.addEventListener('click', () => {
    const tile = document.querySelector(`.settings-tile[data-modal="${b.dataset.modalOpen}"]`);
    if (tile) tile.click();
  }));
}
document.getElementById('btn-setup-show').addEventListener('click', async () => {
  await window.api.saveSettings({ ...(await window.api.getSettings()), setup_checklist_state: '' });
  renderSetupChecklist();
});
document.getElementById('dev-site-link').addEventListener('click', (e) => { e.preventDefault(); window.api.openExternal('https://loya-loyalty.com'); });
document.getElementById('btn-open-site').addEventListener('click', async () => {
  window.api.openExternal(await window.api.websiteUrl());
});

// ---------- USB-сканер работает с любой вкладки ----------
// Сканер «печатает» код очень быстро и жмёт Enter. Если курсор не стоит в поле ввода,
// ловим такую быструю серию символов где угодно: сразу открываем «Сканирование» и
// отмечаем карту — кассиру не нужно сначала переключать вкладку.
(function setupGlobalScanner() {
  let buf = '';
  let times = [];
  const FAST_MS = 40;
  document.addEventListener('keydown', (e) => {
    const tgt = e.target;
    const typing = tgt && (tgt.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName));
    if (typing) { buf = ''; times = []; return; }
    const blocked = ['staff-login-overlay', 'onboarding-overlay', 'tour-overlay', 'whats-new-overlay'].some(id => {
      const el = document.getElementById(id);
      return el && el.style.display && el.style.display !== 'none';
    }) || document.querySelector('.ui-dialog-overlay');
    if (blocked) return;
    const now = performance.now();
    if (times.length && now - times[times.length - 1] > FAST_MS * 3) { buf = ''; times = []; }
    if (e.key === 'Enter') {
      const code = buf.trim();
      const intervals = times.slice(1).map((tm, i) => tm - times[i]);
      const avg = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 999;
      buf = ''; times = [];
      if (code.length >= 6 && avg < FAST_MS) {
        e.preventDefault();
        if (currentView !== 'scan') document.querySelector('[data-view="scan"]').click();
        handleScan(code);
      }
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      buf += e.key;
      times.push(now);
      if (buf.length > 64) { buf = buf.slice(-64); times = times.slice(-64); }
    }
  });
})();

// ---------- свои диалоги вместо системных confirm/prompt/alert ----------
// В Electron системный prompt() не работает вовсе, а confirm/alert выглядят чужеродно.
// Эти окна — в стиле приложения, на языке приложения, с Enter/Esc.
function uiDialog({ text, input, defaultValue = '', okText, cancelText, danger, type, inputmode, icon }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'ui-dialog-overlay';
    overlay.innerHTML = `
      <div class="ui-dialog ${danger ? 'ui-dialog-danger' : ''}" role="dialog" aria-modal="true">
        <div class="ui-dialog-icon">${icon || (danger ? '⚠️' : input ? '✏️' : 'ℹ️')}</div>
        <div class="ui-dialog-text"></div>
        ${input ? `<input class="ui-dialog-input" type="${type || 'text'}" ${inputmode ? `inputmode="${inputmode}"` : ''}>` : ''}
        <div class="ui-dialog-actions">
          ${cancelText !== null ? `<button type="button" class="ui-dialog-cancel">${cancelText || t('dlgCancel')}</button>` : ''}
          <button type="button" class="ui-dialog-ok">${okText || t('dlgOk')}</button>
        </div>
      </div>`;
    overlay.querySelector('.ui-dialog-text').textContent = text;
    const inputEl = overlay.querySelector('.ui-dialog-input');
    if (inputEl) inputEl.value = defaultValue || '';
    document.body.appendChild(overlay);
    const prevFocus = document.activeElement;
    const close = (val) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(val);
    };
    const ok = () => close(input ? inputEl.value : true);
    const cancel = () => close(input ? null : false);
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
      else if (e.key === 'Enter') {
        // Enter нажимает кнопку, на которой стоит фокус. В опасных диалогах фокус по умолчанию
        // на «Отмене» — случайный Enter ничего не удалит.
        e.preventDefault(); e.stopPropagation();
        const active = document.activeElement;
        if (active && overlay.contains(active) && active.tagName === 'BUTTON') active.click();
        else ok();
      }
    }
    document.addEventListener('keydown', onKey, true);
    overlay.querySelector('.ui-dialog-ok').addEventListener('click', ok);
    const cancelBtn = overlay.querySelector('.ui-dialog-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', cancel);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) cancel(); });
    setTimeout(() => (inputEl || overlay.querySelector(danger ? '.ui-dialog-cancel' : '.ui-dialog-ok')).focus(), 20);
    if (inputEl) inputEl.select();
  });
}
function uiConfirm(text, opts = {}) { return uiDialog({ text, danger: opts.danger, okText: opts.danger ? t('dlgConfirmDanger') : t('dlgOk') }); }
function uiPrompt(text, defaultValue = '', opts = {}) { return uiDialog({ text, input: true, defaultValue, type: opts.type, inputmode: opts.inputmode }); }
function uiAlert(text) { return uiDialog({ text, cancelText: null }); }

// ---------- сотрудники, роли и точки ----------
// Роль текущего пользователя за этим компьютером: owner | manager | cashier.
let currentRole = 'owner';
// Права по умолчанию (если программа ещё не получила права от главной части).
const ROLE_VIEWS = {
  cashier: ['dashboard', 'clients', 'newcard', 'scan', 'profile', 'appointments'],
  // Администратор: всё, кроме того, что отмечено data-owner-only (подписка, данные, PIN, доступ из дома…).
  manager: ['dashboard', 'clients', 'newcard', 'scan', 'profile', 'appointments', 'campaigns', 'marketing', 'inventory', 'settings']
};
const PERM_VIEW_KEYS = ['clients', 'newcard', 'scan', 'appointments', 'campaigns', 'inventory', 'marketing', 'settings'];
const PERM_ACT_KEYS = ['stats', 'dashEdit', 'clientAdd', 'clientEdit', 'clientDelete', 'cardDelete', 'cardManual', 'scanUndo', 'sendCards', 'exportData', 'productsEdit'];
function roleViewAllowed(view, role = currentRole) {
  if (role === 'owner' || view === 'dashboard' || view === 'profile') return true;
  const m = staffPerms.matrix && staffPerms.matrix[role];
  if (!m) return (ROLE_VIEWS[role] || []).includes(view);
  return !!m.views[view];
}
function roleActAllowed(act, role = currentRole) {
  if (role === 'owner') return true;
  const m = staffPerms.matrix && staffPerms.matrix[role];
  if (!m) return act === 'stats' ? !!staffPerms.cashierStats : ['clientDelete', 'cardDelete'].includes(act) ? !!staffPerms.cashierDelete : role === 'manager';
  if (act === 'productsEdit' && !m.views.inventory) return false;
  return !!m.acts[act];
}
let currentStaffName = null;
let staffPerms = { cashierStats: true, cashierMaxDiscount: 0, cashierDelete: false, staffTheme: true, standardDiscount: 0 };
function canDelete() { return roleActAllowed('clientDelete'); }
async function refreshPerms() {
  try { const p = await window.api.staffPerms(); if (p) staffPerms = p; } catch (e) { /* старая версия main */ }
  applyPermsUi();
}
function applyPermsUi() {
  const cashier = currentRole === 'cashier';
  const b = document.body.classList;
  PERM_VIEW_KEYS.forEach(v => b.toggle('noview-' + v, !roleViewAllowed(v)));
  PERM_ACT_KEYS.forEach(a => b.toggle('noact-' + a, !roleActAllowed(a)));
  b.toggle('cashier-no-stats', !roleActAllowed('stats'));
  b.toggle('cashier-no-delete', !roleActAllowed('cardDelete'));
  const nc = document.getElementById('nc-discount');
  const md = currentRole !== 'owner' && staffPerms.matrix && staffPerms.matrix[currentRole] ? staffPerms.matrix[currentRole].maxDiscount : (cashier ? staffPerms.cashierMaxDiscount : 0);
  if (nc) nc.max = md > 0 ? String(Math.max(md, staffPerms.standardDiscount || 0)) : '100';
  const tb = document.getElementById('btn-user-theme');
  if (tb) tb.style.display = currentStaffName && staffPerms.staffTheme ? '' : 'none';
}
// Личный цвет сотрудника (если разрешено) — иначе оформление заведения.
let staffThemeActive = false;
async function applyStaffTheme(theme) {
  staffThemeActive = !!(currentStaffName && staffPerms.staffTheme && theme && THEME_PRESETS[theme]);
  if (staffThemeActive) applyTheme(THEME_PRESETS[theme]);
  else await initTheme();
}
async function onStaffLoggedIn(res) {
  stopLoginCamera();
  document.getElementById('staff-login-overlay').style.display = 'none';
  applyRole(res.role, res.name);
  await refreshPerms();
  await applyStaffTheme(res.theme);
  refreshActiveView();
}
function roleCanView(view) {
  if (currentRole === 'owner') return true;
  const ok = roleViewAllowed(view);
  if (!ok) showUndoToastLike(t('noAccess'));
  return ok;
}
function showUndoToastLike(text) {
  const c = document.getElementById('undo-toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = 'undo-toast';
  el.textContent = text;
  c.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
function applyRole(role, name) {
  currentRole = role || 'owner';
  currentStaffName = name || null;
  document.body.classList.remove('role-owner', 'role-manager', 'role-cashier');
  document.body.classList.add('role-' + currentRole);
  const chip = document.getElementById('user-chip');
  const roleLabel = { owner: t('teamRoleOwner'), manager: t('teamRoleManager'), cashier: t('teamRoleCashier') }[currentRole];
  const display = name || t('teamRoleOwner');
  document.getElementById('user-chip-name').textContent = display;
  document.getElementById('user-chip-role').textContent = name ? roleLabel : '';
  document.getElementById('user-chip-avatar').textContent = display.trim().charAt(0).toUpperCase();
  // Если текущая вкладка недоступна новой роли — открываем «Сканирование».
  applyPermsUi();
  if (currentRole !== 'owner' && !roleViewAllowed(currentView)) {
    const v = ['scan', 'clients', 'dashboard'].find(x => roleViewAllowed(x)) || 'dashboard';
    document.querySelector(`.nav-btn[data-view="${v}"]`).click();
  }
}

let loginSelected = null; // { id, name } | { id: null } для владельца
async function showStaffLogin() {
  const st = await window.api.getSettings();
  const staff = await window.api.staffList();
  const niche = NichesModule.getNiche(currentNicheId);
  const lb = document.getElementById('login-brand');
  lb.innerHTML = (currentBrandLogo ? `<img class="login-brand-logo" src="${currentBrandLogo}" alt="">` : `<span>${niche.emoji}</span>`) + `<span>${escapeHtml(st.brand_name || currentBrandName)}</span>`;
  const users = [{ id: null, name: t('teamRoleOwner'), role: 'owner' }, ...staff.map(x => ({ id: x.id, name: x.name, role: x.role }))];
  document.getElementById('login-users').innerHTML = users.map(u => `
    <button type="button" class="login-user" data-id="${u.id || ''}" data-name="${escapeHtml(u.name)}">
      <span class="login-user-avatar role-${u.role}">${escapeHtml(u.name.trim().charAt(0).toUpperCase())}</span>
      <span class="login-user-name">${escapeHtml(u.name)}</span>
      <span class="login-user-role">${{ owner: t('teamRoleOwner'), manager: t('teamRoleManager'), cashier: t('teamRoleCashier') }[u.role]}</span>
    </button>`).join('');
  document.querySelectorAll('#login-users .login-user').forEach(btn => {
    btn.addEventListener('click', () => {
      loginSelected = { id: btn.dataset.id ? Number(btn.dataset.id) : null, name: btn.dataset.name };
      document.getElementById('login-users').style.display = 'none';
      document.getElementById('login-pin').style.display = 'flex';
      document.getElementById('login-pin-for').textContent = t('loginPinFor')(loginSelected.name);
      document.getElementById('login-error').textContent = '';
      const input = document.getElementById('login-pin-input');
      input.value = '';
      input.focus();
    });
  });
  document.getElementById('login-users').style.display = 'grid';
  document.getElementById('login-pin').style.display = 'none';
  document.getElementById('login-code-error').textContent = '';
  document.getElementById('login-code-input').value = '';
  document.getElementById('staff-login-overlay').style.display = 'flex';
  // Курсор сразу в поле кода — сканер (он «печатает» код и Enter) работает без щелчков.
  setTimeout(() => document.getElementById('login-code-input').focus(), 30);
}
async function submitStaffLogin() {
  const input = document.getElementById('login-pin-input');
  const res = await window.api.staffLogin(loginSelected ? loginSelected.id : null, input.value.trim());
  if (!res.ok) {
    document.getElementById('login-error').textContent = res.error === 'locked' ? t('loginLocked')(res.wait) : t('loginWrong');
    input.value = '';
    input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
    input.focus();
    return;
  }
  await onStaffLoggedIn(res);
}
document.getElementById('btn-login-enter').addEventListener('click', submitStaffLogin);
document.getElementById('login-pin-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitStaffLogin(); });
document.getElementById('btn-login-back').addEventListener('click', () => {
  document.getElementById('login-users').style.display = 'grid';
  document.getElementById('login-pin').style.display = 'none';
  setTimeout(() => document.getElementById('login-code-input').focus(), 30);
});
async function logoutToLogin() {
  await window.api.staffLogout();
  currentStaffName = null;
  await initTheme(); // экран входа — в оформлении заведения
  showStaffLogin();
}
document.getElementById('btn-user-switch').addEventListener('click', logoutToLogin);

// ---------- вход по QR-карточке: сканер, камера, телефон или ввод вручную ----------
async function submitLoginCode(raw) {
  const err = document.getElementById('login-code-error');
  const code = String(raw || '').replace(/\D/g, '');
  if (!code) return;
  const res = await window.api.staffLoginByCode(code);
  const input = document.getElementById('login-code-input');
  if (!res.ok) {
    err.textContent = res.error === 'locked' ? t('loginLocked')(res.wait) : res.error === 'staff_mode_off' ? t('loginModeOff') : t('loginCodeBad');
    input.value = '';
    input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
    input.focus();
    playBeep('error');
    return;
  }
  err.textContent = '';
  input.value = '';
  playBeep('ok');
  await onStaffLoggedIn(res);
}
document.getElementById('btn-login-code').addEventListener('click', () => submitLoginCode(document.getElementById('login-code-input').value));
document.getElementById('login-code-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitLoginCode(e.target.value); } });
let loginCamStream = null, loginCamOn = false;
function stopLoginCamera() {
  loginCamOn = false;
  if (loginCamStream) { loginCamStream.getTracks().forEach(tr => tr.stop()); loginCamStream = null; }
  const v = document.getElementById('login-video'); if (v) { v.style.display = 'none'; v.srcObject = null; }
}
document.getElementById('btn-login-camera').addEventListener('click', async () => {
  if (loginCamOn) { stopLoginCamera(); return; }
  if (typeof jsQR === 'undefined') await ensureJsQr();
  if (typeof jsQR === 'undefined') { uiAlert(t('cameraLibMissing')); return; }
  try { loginCamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }); }
  catch (e1) { try { loginCamStream = await navigator.mediaDevices.getUserMedia({ video: true }); } catch (e2) { uiAlert(t('cameraError') + `${e2.name}: ${e2.message}`); return; } }
  const v = document.getElementById('login-video');
  v.srcObject = loginCamStream; v.style.display = 'block'; await v.play();
  loginCamOn = true;
  const cv = document.createElement('canvas'); const cx = cv.getContext('2d', { willReadFrequently: true });
  const tick = () => {
    if (!loginCamOn) return;
    if (v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
      cv.width = v.videoWidth; cv.height = v.videoHeight; cx.drawImage(v, 0, 0, cv.width, cv.height);
      try {
        const qr = jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
        if (qr && qr.data) { stopLoginCamera(); submitLoginCode(qr.data); return; }
      } catch (e) { /* следующий кадр */ }
    }
    requestAnimationFrame(tick);
  };
  tick();
});
// Телефон-сканер отсканировал карточку сотрудника — окно на компьютере переключается само.
window.api.onStaffLoggedIn && window.api.onStaffLoggedIn(async (res) => {
  await onStaffLoggedIn(res);
  showUndoToastLike(t('staffSwitched')(res.name || t('teamRoleOwner')));
});

// ---------- свой цвет программы сотрудника ----------
function renderMyThemeGrid(currentTheme) {
  const grid = document.getElementById('mytheme-grid');
  const items = [{ id: '', label: t('myThemeVenue'), colors: null }].concat(Object.keys(THEME_PRESETS).map(id => ({ id, label: t(THEME_LABEL_KEYS[id] || id), colors: THEME_PRESETS[id] })));
  grid.innerHTML = items.map(it => `<button type="button" class="mytheme-item ${String(currentTheme || '') === it.id ? 'active' : ''}" data-theme="${it.id}">
      <span class="mytheme-sw" style="${it.colors ? `background:linear-gradient(135deg, ${it.colors.sidebar} 0 50%, ${it.colors.primary} 50% 100%)` : ''}">${it.colors ? '' : '🏠'}</span>
      <span>${escapeHtml(it.label)}</span></button>`).join('');
  grid.querySelectorAll('.mytheme-item').forEach(b => b.addEventListener('click', async () => {
    const r = await window.api.staffSetMyTheme(b.dataset.theme || null);
    if (!r || !r.ok) { uiAlert(t('noAccessAction')); return; }
    await applyStaffTheme(r.theme);
    renderMyThemeGrid(r.theme);
  }));
}
document.getElementById('btn-user-theme').addEventListener('click', async () => {
  const list = await window.api.staffList();
  const sess = await window.api.staffSession();
  const me = sess && list.find(x => x.id === sess.id);
  renderMyThemeGrid(me ? me.theme_name : '');
  lxOpen('lx-mytheme');
});

// Автоблокировка: если режим сотрудников включён и за кассой никто ничего не делал N минут,
// снова показываем экран «Кто сейчас работает?».
let lastActivityAt = Date.now();
['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach(ev =>
  document.addEventListener(ev, () => { lastActivityAt = Date.now(); }, { passive: true, capture: true }));
setInterval(async () => {
  const chip = document.getElementById('user-chip');
  const overlay = document.getElementById('staff-login-overlay');
  if (!chip || chip.style.display === 'none' || overlay.style.display === 'flex') return;
  const st = await window.api.getSettings();
  const mins = Number(st.staff_autolock_min) || 0;
  if (mins > 0 && Date.now() - lastActivityAt > mins * 60000) {
    await logoutToLogin();
  }
}, 30000);

// Ctrl+F (Cmd+F) — сразу к поиску клиента с любой вкладки.
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
    e.preventDefault();
    if (currentView !== 'clients') document.querySelector('[data-view="clients"]').click();
    const input = document.getElementById('client-search');
    input.focus();
    input.select();
  }
});

async function initStaffMode() {
  const st = await window.api.getSettings();
  const enabled = st.staff_mode_enabled === '1' && !!(await window.api.pinIsSet());
  document.getElementById('user-chip').style.display = enabled ? 'flex' : 'none';
  if (enabled && st.onboarding_completed === '1') showStaffLogin();
  else applyRole('owner', null);
  refreshPerms();
}

async function loadTeamSettings() {
  const [st, staff, locations, pinSet] = await Promise.all([
    window.api.getSettings(), window.api.staffList(), window.api.locationsList(), window.api.pinIsSet()
  ]);
  const lockSel = document.getElementById('team-autolock');
  lockSel.innerHTML = [0, 5, 15, 30, 60].map(m => `<option value="${m}">${m === 0 ? t('promoCooldownOff') : m < 60 ? t('promoMinutes')(m) : t('promoHours')(1)}</option>`).join('');
  lockSel.value = String([0, 5, 15, 30, 60].includes(Number(st.staff_autolock_min)) ? Number(st.staff_autolock_min) : 0);
  const modeBox = document.getElementById('team-mode-enabled');
  modeBox.checked = st.staff_mode_enabled === '1';
  modeBox.disabled = !pinSet;
  document.getElementById('team-mode-needpin').style.display = pinSet ? 'none' : 'block';

  const locName = (id) => (locations.find(l => l.id === id) || {}).name;
  document.getElementById('team-locations-list').innerHTML = locations.length
    ? locations.map(l => `
      <div class="team-row">
        <span class="team-row-ic">📍</span><span class="team-row-name">${escapeHtml(l.name)}</span>
        <button type="button" class="team-link" data-loc-rename="${l.id}">${t('teamRename')}</button>
        <button type="button" class="team-link team-danger" data-loc-remove="${l.id}" data-name="${escapeHtml(l.name)}">${t('teamRemove')}</button>
      </div>`).join('')
    : '';
  const locOptions = `<option value="">${t('teamNoLocation')}</option>` + locations.map(l => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('');
  document.getElementById('team-current-location').innerHTML = locOptions;
  document.getElementById('team-current-location').value = st.current_location_id || '';
  document.getElementById('team-staff-location').innerHTML = locOptions;

  document.getElementById('team-staff-list').innerHTML = staff.length
    ? staff.map(x => `
      <div class="team-row">
        <span class="team-row-ic role-${x.role}">${escapeHtml(x.name.trim().charAt(0).toUpperCase())}</span>
        <span class="team-row-name">${escapeHtml(x.name)}<small>${x.role === 'manager' ? t('teamRoleManager') : t('teamRoleCashier')}${x.location_id && locName(x.location_id) ? ' · 📍 ' + escapeHtml(locName(x.location_id)) : ''}</small></span>
        <button type="button" class="team-link" data-staff-role="${x.id}" data-role="${x.role}">${x.role === 'manager' ? t('teamRoleCashier') : t('teamRoleManager')} ⇄</button>
        <button type="button" class="team-link" data-staff-pin="${x.id}">${t('teamChangePin')}</button>
        <button type="button" class="team-link team-card-link" data-staff-card="${x.id}" data-name="${escapeHtml(x.name)}" data-role="${x.role}" data-email="${escapeHtml(x.email || '')}" data-has="${x.has_code ? 1 : 0}">${t('scCardBtn')}${x.has_code ? ' ✓' : ''}</button>
        <button type="button" class="team-link team-danger" data-staff-remove="${x.id}" data-name="${escapeHtml(x.name)}">${t('teamRemove')}</button>
      </div>`).join('')
    : `<p class="hint">${t('teamStaffEmpty')}</p>`;

  const box = document.getElementById('settings-modal-team');
  box.querySelectorAll('[data-loc-rename]').forEach(b => b.addEventListener('click', async () => {
    const name = await uiPrompt(t('teamNamePrompt'));
    if (name && name.trim()) { await window.api.locationsRename(Number(b.dataset.locRename), name.trim()); loadTeamSettings(); }
  }));
  box.querySelectorAll('[data-loc-remove]').forEach(b => b.addEventListener('click', async () => {
    if (!await uiConfirm(t('teamConfirmRemoveLocation')(b.dataset.name), { danger: true })) return;
    await window.api.locationsRemove(Number(b.dataset.locRemove)); loadTeamSettings();
  }));
  box.querySelectorAll('[data-staff-role]').forEach(b => b.addEventListener('click', async () => {
    await window.api.staffUpdate(Number(b.dataset.staffRole), { role: b.dataset.role === 'manager' ? 'cashier' : 'manager' }); loadTeamSettings();
  }));
  box.querySelectorAll('[data-staff-pin]').forEach(b => b.addEventListener('click', async () => {
    const pin = await uiPrompt(t('teamNewPinPrompt'), '', { type: 'password', inputmode: 'numeric' });
    if (!pin) return;
    const r = await window.api.staffUpdate(Number(b.dataset.staffPin), { pin: pin.trim() });
    document.getElementById('team-status').textContent = r.error ? t('pinFormatError') : t('settingsSaved');
  }));
  box.querySelectorAll('[data-staff-card]').forEach(b => b.addEventListener('click', () => issueStaffCard({
    staffId: Number(b.dataset.staffCard), name: b.dataset.name, role: b.dataset.role, email: b.dataset.email, had: b.dataset.has === '1'
  })));
  document.getElementById('perm-staff-theme').checked = st.perm_staff_theme !== '0';
  renderPermMatrix();
  box.querySelectorAll('[data-staff-remove]').forEach(b => b.addEventListener('click', async () => {
    if (!await uiConfirm(t('teamConfirmRemoveStaff')(b.dataset.name), { danger: true })) return;
    await window.api.staffRemove(Number(b.dataset.staffRemove)); loadTeamSettings();
  }));
}
document.getElementById('team-mode-enabled').addEventListener('change', async (e) => {
  const st = await window.api.getSettings();
  await window.api.saveSettings({ ...st, staff_mode_enabled: e.target.checked ? '1' : '0' });
  document.getElementById('user-chip').style.display = e.target.checked ? 'flex' : 'none';
  if (e.target.checked) applyRole('owner', null);
});
document.getElementById('perm-staff-theme').addEventListener('change', async (e) => {
  const st = await window.api.getSettings();
  await window.api.saveSettings({ ...st, perm_staff_theme: e.target.checked ? '1' : '0' });
  refreshPerms();
});
// ---------- редактор прав: роль → вкладки → действия ----------
let permEditRole = 'cashier';
const PERM_GROUPS = [
  { view: null, ic: '🏠', label: 'navDashboard', acts: ['stats', 'dashEdit'] },
  { view: 'clients', ic: '👥', label: 'navClients', acts: ['clientAdd', 'clientEdit', 'clientDelete', 'cardDelete', 'sendCards', 'exportData'] },
  { view: 'newcard', ic: '💳', label: 'navNewCard', acts: [], maxDiscount: true },
  { view: 'scan', ic: '📷', label: 'navScan', acts: ['cardManual', 'scanUndo'] },
  { view: 'appointments', ic: '📅', label: 'navAppointments', acts: [] },
  { view: 'campaigns', ic: '📣', label: 'navCampaigns', acts: [], hint: 'pvCampaignsHint' },
  { view: 'inventory', ic: '📦', label: 'navInventory', acts: ['productsEdit'] },
  { view: 'marketing', ic: '📊', label: 'navMarketing', acts: [], hint: 'pvMarketingHint' },
  { view: 'settings', ic: '⚙️', label: 'navSettings', acts: [], hint: 'pvSettingsHint' }
];
document.querySelectorAll('#perm-roles button').forEach(b => b.addEventListener('click', () => {
  permEditRole = b.dataset.role;
  document.querySelectorAll('#perm-roles button').forEach(x => x.classList.toggle('active', x === b));
  renderPermMatrix();
}));
async function renderPermMatrix() {
  const box = document.getElementById('perm-matrix'); if (!box) return;
  if (currentRole !== 'owner') permEditRole = 'cashier';
  let p = staffPerms;
  try { p = await window.api.staffPerms(); } catch (e) { /* ниже — что есть */ }
  const m = p.matrix && p.matrix[permEditRole];
  if (!m) { box.innerHTML = ''; return; }
  box.innerHTML = PERM_GROUPS.map(g => {
    const on = g.view ? !!m.views[g.view] : true;
    const acts = g.acts.map(a => `<label class="perm-act ${on ? '' : 'off'}"><input type="checkbox" data-act="${a}" ${m.acts[a] ? 'checked' : ''} ${on ? '' : 'disabled'}><span>${escapeHtml(t('pa_' + a))}</span></label>`).join('');
    const extra = g.maxDiscount ? `<label class="perm-act perm-disc ${on ? '' : 'off'}"><span>${escapeHtml(t('permMaxDiscount2'))}</span><input type="number" min="0" max="100" step="1" inputmode="numeric" id="perm-maxdisc" value="${m.maxDiscount || 0}" ${on ? '' : 'disabled'}><small class="hint">${escapeHtml(t('permMaxDiscountHint2'))}</small></label>` : '';
    const hint = g.hint ? `<div class="perm-ghint">${escapeHtml(t(g.hint))}</div>` : '';
    return `<div class="perm-group ${on ? 'on' : 'off'}">
      <div class="perm-ghead"><span class="perm-gic">${g.ic}</span><b>${escapeHtml(t(g.label))}</b>
        ${g.view ? `<label class="perm-switch" title="${escapeHtml(t('permOpenTab'))}"><input type="checkbox" data-view="${g.view}" ${on ? 'checked' : ''}><i></i></label>` : `<span class="perm-always">${escapeHtml(t('permAlways'))}</span>`}
      </div>${hint}${acts || extra ? `<div class="perm-acts">${acts}${extra}</div>` : ''}</div>`;
  }).join('');
  const save = async () => {
    const data = { views: {}, acts: {}, maxDiscount: 0 };
    box.querySelectorAll('[data-view]').forEach(i => { data.views[i.dataset.view] = i.checked ? 1 : 0; });
    box.querySelectorAll('[data-act]').forEach(i => { data.acts[i.dataset.act] = i.checked ? 1 : 0; });
    const md = document.getElementById('perm-maxdisc'); data.maxDiscount = md ? Math.max(0, Math.min(100, Math.round(Number(md.value) || 0))) : 0;
    const r = await window.api.staffSetPerms(permEditRole, data);
    const st = document.getElementById('perm-status');
    st.textContent = r && r.ok ? t('settingsSaved') : t('noAccess');
    setTimeout(() => { st.textContent = ''; }, 1800);
    await refreshPerms();
    renderPermMatrix();
  };
  box.querySelectorAll('input').forEach(i => i.addEventListener('change', save));
}
document.getElementById('btn-owner-card').addEventListener('click', async () => {
  const st = await window.api.getSettings();
  issueStaffCard({ staffId: null, name: st.owner_name || t('teamRoleOwner'), role: 'owner', email: st.owner_email || st.reply_to_email || '', had: !!st.owner_login_hash });
});

// ---------- QR-карточка входа сотрудника ----------
// Рисуется в оформлении заведения: цвета темы, значок вида бизнеса и название; QR + код под ним.
function cardTextColor(hex) {
  const c = hexToRgb(hex || '#111111');
  const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  return lum > 0.6 ? '#141414' : '#ffffff';
}
function prettyLoginCode(code) { return String(code).replace(/(\d{4})(?=\d)/g, '$1 '); }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fitText(ctx, text, maxW, size, weight) {
  let s = size;
  do { ctx.font = `${weight} ${s}px Inter, "Segoe UI", Arial, sans-serif`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 16);
}
async function drawStaffCard({ name, role, code }) {
  const st = await window.api.getSettings();
  const css = getComputedStyle(document.documentElement);
  const primary = (st.theme_name === 'custom' ? st.theme_primary : (themePresetByName(st.theme_name) || THEME_PRESETS.gold).primary) || css.getPropertyValue('--color-primary').trim();
  const sidebar = (st.theme_name === 'custom' ? st.theme_sidebar : (themePresetByName(st.theme_name) || THEME_PRESETS.gold).sidebar) || '#111111';
  const fg = cardTextColor(sidebar);
  const niche = NichesModule.getNiche(currentNicheId);
  const W = 1100, H = 680;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  roundRect(ctx, 0, 0, W, H, 44); ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, shade(sidebar, 0.12)); g.addColorStop(1, shade(sidebar, -0.25));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // мягкое пятно цвета заведения
  const rg = ctx.createRadialGradient(W * 0.15, H * 1.05, 10, W * 0.15, H * 1.05, W * 0.7);
  rg.addColorStop(0, primary + '66'); rg.addColorStop(1, primary + '00');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = primary; ctx.fillRect(0, 0, W, 14);
  ctx.restore();
  // слева: заведение, подпись, имя, роль
  ctx.fillStyle = fg; ctx.textBaseline = 'alphabetic';
  ctx.font = '56px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(niche.emoji || '⭐', 60, 120);
  fitText(ctx, st.brand_name || currentBrandName || 'Loya', 520, 44, 800); ctx.fillText(st.brand_name || currentBrandName || 'Loya', 140, 112);
  ctx.globalAlpha = 0.7; ctx.font = '600 24px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(t('scCardLabel').toUpperCase(), 60, 230); ctx.globalAlpha = 1;
  fitText(ctx, name, 560, 64, 800); ctx.fillText(name, 60, 305);
  const roleLabel = { owner: t('teamRoleOwner'), manager: t('teamRoleManager'), cashier: t('teamRoleCashier') }[role] || '';
  ctx.font = '700 26px Inter, "Segoe UI", Arial, sans-serif';
  const rw = ctx.measureText(roleLabel).width + 40;
  roundRect(ctx, 60, 340, rw, 48, 24); ctx.fillStyle = primary; ctx.fill();
  ctx.fillStyle = cardTextColor(primary); ctx.fillText(roleLabel, 80, 373);
  ctx.fillStyle = fg; ctx.globalAlpha = 0.75; ctx.font = '500 22px Inter, "Segoe UI", Arial, sans-serif';
  ctx.fillText(t('scCardHint'), 60, 600); ctx.globalAlpha = 1;
  // справа: белая плашка с QR и кодом
  const bx = 690, by = 70, bw = 350, bh = 540;
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  roundRect(ctx, bx, by, bw, bh, 30); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.shadowColor = 'transparent';
  const qrUrl = await window.api.qrDataUrl(code, { width: 600, bgColor: '#ffffff' });
  const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = qrUrl; });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, bx + 25, by + 25, bw - 50, bw - 50);
  ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'center';
  ctx.font = '700 36px Consolas, "Courier New", monospace';
  ctx.fillText(prettyLoginCode(code), bx + bw / 2, by + bw + 70);
  ctx.font = '500 18px Inter, "Segoe UI", Arial, sans-serif'; ctx.fillStyle = '#6b6b6b';
  ctx.fillText('loya-loyalty.com', bx + bw / 2, by + bh - 40);
  ctx.textAlign = 'left';
  return cv.toDataURL('image/png');
}
let staffCardCtx = null;
async function issueStaffCard({ staffId, name, role, email, had }) {
  const st = await window.api.getSettings();
  if (st.staff_mode_enabled !== '1') { await uiAlert(t('scNeedStaffMode')); }
  if (had && !await uiConfirm(t('scConfirmNew')(name), { danger: true })) return;
  const r = await window.api.staffIssueCode(staffId);
  if (!r || !r.ok) { uiAlert(t('noAccessAction')); return; }
  const png = await drawStaffCard({ name, role, code: r.code });
  staffCardCtx = { staffId, name, role, code: r.code, png };
  document.getElementById('sc-img').src = png;
  document.getElementById('sc-title').textContent = `${t('scTitle')} · ${name}`;
  document.getElementById('sc-email').value = email || '';
  document.getElementById('sc-status').textContent = '';
  lxOpen('lx-staffcard');
  if (document.getElementById('settings-modal-team').style.display !== 'none') loadTeamSettings();
}
document.getElementById('sc-send').addEventListener('click', async () => {
  if (!staffCardCtx) return;
  const status = document.getElementById('sc-status');
  const email = document.getElementById('sc-email').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = t('scBadEmail'); document.getElementById('sc-email').focus(); return; }
  status.textContent = '…';
  const r = await window.api.staffSendCard({ staffId: staffCardCtx.staffId, email, name: staffCardCtx.name, code: staffCardCtx.code, pngDataUrl: staffCardCtx.png, lang: getLang() });
  status.textContent = r && r.ok ? t('scSent')(email) : r && r.error === 'mail_not_ready' ? t('scMailNotReady') : r && r.error === 'email' ? t('scBadEmail') : t('scSendFail');
  if (r && r.ok && !staffCardCtx.staffId) { const s2 = await window.api.getSettings(); await window.api.saveSettings({ ...s2, owner_email: email }); }
});
document.getElementById('sc-save').addEventListener('click', () => {
  if (!staffCardCtx) return;
  const a = document.createElement('a');
  a.href = staffCardCtx.png;
  a.download = `loya-card-${String(staffCardCtx.name).replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'staff'}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  document.getElementById('sc-status').textContent = t('scSaved');
});
document.getElementById('sc-print').addEventListener('click', async () => {
  if (!staffCardCtx) return;
  const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(staffCardCtx.name)}</title><style>@page{margin:12mm}body{margin:0;display:flex;justify-content:center}img{width:85.6mm;height:auto;border-radius:3mm}</style><img src="${staffCardCtx.png}">`;
  try { await window.api.printHtml(html, { title: staffCardCtx.name, fileName: 'loya-staff-card' }); } catch (e) { /* окно печати закрыли */ }
});
document.getElementById('team-autolock').addEventListener('change', async (e) => {
  const st = await window.api.getSettings();
  await window.api.saveSettings({ ...st, staff_autolock_min: e.target.value });
});
document.getElementById('team-current-location').addEventListener('change', async (e) => {
  const st = await window.api.getSettings();
  await window.api.saveSettings({ ...st, current_location_id: e.target.value });
});
document.getElementById('btn-team-location-add').addEventListener('click', async () => {
  const input = document.getElementById('team-location-name');
  if (!input.value.trim()) { input.focus(); return; }
  const added = await window.api.locationsAdd(input.value.trim());
  if (added && added.error === 'pro_required') { showProRequired('locations'); return; }
  input.value = '';
  loadTeamSettings();
});
document.getElementById('btn-team-staff-add').addEventListener('click', async () => {
  const name = document.getElementById('team-staff-name');
  const pin = document.getElementById('team-staff-pin');
  const status = document.getElementById('team-status');
  if (!name.value.trim()) { name.focus(); return; }
  const emailEl = document.getElementById('team-staff-email');
  const role = document.getElementById('team-staff-role').value;
  const r = await window.api.staffAdd({
    name: name.value.trim(), role,
    pin: pin.value.trim(), locationId: Number(document.getElementById('team-staff-location').value) || null,
    email: emailEl.value.trim()
  });
  if (r.error) { status.textContent = r.error === 'no_access' ? t('noAccessAction') : t('pinFormatError'); pin.focus(); return; }
  const added = { staffId: r.id, name: name.value.trim(), role, email: emailEl.value.trim(), had: false };
  name.value = ''; pin.value = ''; emailEl.value = '';
  status.textContent = t('settingsSaved');
  setTimeout(() => status.textContent = '', 2000);
  await loadTeamSettings();
  // Сразу предлагаем карточку входа — её можно отправить новому сотруднику на почту.
  if (added.staffId && await uiDialog({ text: t('scOfferAfterAdd')(added.name), okText: t('scCardBtn'), cancelText: t('tourLater'), icon: '🪪' })) issueStaffCard(added);
});

// Отчёт «Команда и точки за месяц» на Главной.
async function refreshTeamReport() {
  const el = document.getElementById('team-report');
  if (!el) return;
  const [rep, staff, locations] = await Promise.all([window.api.teamReport(), window.api.staffList(), window.api.locationsList()]);
  if (!staff.length && !locations.length) { el.innerHTML = `<p class="hint">${t('teamReportEmpty')}</p>`; return; }
  const staffName = (r) => r.id ? escapeHtml(r.name || '?') : (r.source === 'phone' ? t('teamReportPhone') : t('teamReportOwnerDesk'));
  const table = (title, rows, nameFn) => {
    const max = Math.max(1, ...rows.map(r => r.scans));
    return `<div class="team-report-block">
      <div class="team-report-row team-report-headrow"><span>${title}</span><span>${t('teamReportScans')}</span><span>${t('teamReportClients')}</span><span>${t('teamReportRevenue')}</span></div>
      ${rows.length ? rows.map(r => `<div class="team-report-row">
        <span class="team-report-name">${nameFn(r)}<i style="width:${Math.round(r.scans / max * 100)}%"></i></span>
        <b>${r.scans}</b><span>${r.clients}</span><span>${moneyFmt(r.revenue)}</span>
      </div>`).join('') : emptyMiniHtml(t('noChartData'))}
    </div>`;
  };
  el.innerHTML = table(t('teamReportStaff'), rep.byStaff, staffName) +
    (locations.length ? table(t('teamReportLocation'), rep.byLocation, r => r.id ? '📍 ' + escapeHtml(r.name || '?') : t('teamReportNoLocation')) : '');
}

// ---------- акции и защита ----------
let reviewUrlCache = '';
const COOLDOWN_OPTIONS = [0, 5, 15, 30, 60, 180, 720];

async function loadPromoSettings() {
  const st = await window.api.getSettings();
  document.getElementById('promo-bonus-enabled').checked = st.bonus_stamps_enabled === '1';
  document.getElementById('promo-welcome-enabled').checked = st.welcome_double === '1';
  document.getElementById('promo-bonus-mult').value = st.bonus_stamps_mult || '2';
  document.getElementById('promo-bonus-from').value = st.bonus_stamps_from || '14:00';
  document.getElementById('promo-bonus-to').value = st.bonus_stamps_to || '16:00';
  const days = String(st.bonus_stamps_days || '').split(',').filter(Boolean);
  const order = [1, 2, 3, 4, 5, 6, 0];
  document.getElementById('promo-bonus-days').innerHTML = order.map(d => {
    const label = new Date(2024, 0, 7 + d).toLocaleDateString(localeCode(), { weekday: 'short' });
    return `<label class="promo-day"><input type="checkbox" value="${d}" ${days.includes(String(d)) ? 'checked' : ''}><span>${label}</span></label>`;
  }).join('');
  const cd = document.getElementById('promo-cooldown');
  cd.innerHTML = COOLDOWN_OPTIONS.map(m => `<option value="${m}">${m === 0 ? t('promoCooldownOff') : m < 60 ? t('promoMinutes')(m) : t('promoHours')(m / 60)}</option>`).join('');
  cd.value = String(COOLDOWN_OPTIONS.includes(Number(st.scan_cooldown_min)) ? Number(st.scan_cooldown_min) : 0);
  document.getElementById('promo-referral-enabled').checked = st.referral_enabled === '1';
  document.getElementById('promo-referral-bonus').value = st.referral_bonus_stamps || '1';
  if (window.growPromoLoad) window.growPromoLoad(st);   // 2.20: подарок другу, когда начислять, ссылка
  syncPromoFields();
}
function syncPromoFields() {
  document.getElementById('promo-bonus-fields').classList.toggle('promo-disabled', !document.getElementById('promo-bonus-enabled').checked);
}
document.getElementById('promo-bonus-enabled').addEventListener('change', syncPromoFields);
document.getElementById('btn-promo-save').addEventListener('click', async () => {
  const st = await window.api.getSettings();
  const days = Array.from(document.querySelectorAll('#promo-bonus-days input:checked')).map(i => i.value).join(',');
  await window.api.saveSettings({
    ...st,
    bonus_stamps_enabled: document.getElementById('promo-bonus-enabled').checked ? '1' : '0',
    welcome_double: document.getElementById('promo-welcome-enabled').checked ? '1' : '0',
    bonus_stamps_mult: document.getElementById('promo-bonus-mult').value,
    bonus_stamps_from: document.getElementById('promo-bonus-from').value,
    bonus_stamps_to: document.getElementById('promo-bonus-to').value,
    bonus_stamps_days: days,
    scan_cooldown_min: document.getElementById('promo-cooldown').value,
    referral_enabled: document.getElementById('promo-referral-enabled').checked ? '1' : '0',
    referral_bonus_stamps: document.getElementById('promo-referral-bonus').value,
    ...(window.growPromoSave ? window.growPromoSave() : {})
  });
  if (window.growPromoAfterSave) window.growPromoAfterSave();
  const statusEl = document.getElementById('promo-status');
  statusEl.textContent = t('settingsSaved');
  setTimeout(() => statusEl.textContent = '', 2000);
  refreshScanPromoBanner();
});

// Баннер на вкладке «Сканирование», когда прямо сейчас действуют «двойные штампы».
async function refreshScanPromoBanner() {
  const el = document.getElementById('scan-promo-banner');
  if (!el) return;
  const m = await window.api.stampMultiplier();
  el.style.display = m > 1 ? 'flex' : 'none';
  el.textContent = m > 1 ? t('scanBonusActive')(m) : '';
}
setInterval(() => { if (currentView === 'scan') refreshScanPromoBanner(); }, 60000);

// ---------- дизайн карточек (редактор шаблонов открытки с котиком) ----------
let cardArtCurrentLang = 'ru';
let cardArtMode = 'lang'; // 'lang' — котики по языку, 'niche' — строгие карточки под нишу бизнеса
let cardArtPickedFile = null; // { dataUrl, img (Image), naturalWidth, naturalHeight }
// cardArtBox — уже сохранённая (или ещё рисуемая) квадратная рамка под QR, в координатах
// холста: { x0, y0, size, radiusPct }. cardArtInteraction — что именно сейчас происходит
// с мышью: null | 'draw' (рисуем с нуля) | 'move' (тащим целиком) | 'resize' (тянем за уголок).
let cardArtBox = null;
let cardArtInteraction = null;
let cardArtInteractionStart = null; // снимок на момент mousedown — по режиму разный набор полей

const CARDART_HANDLE_SIZE = 16; // сторона зоны-угла для изменения размера, в px холста

async function loadCardArtGrid(lang) {
  cardArtMode = 'lang';
  cardArtCurrentLang = lang;
  document.querySelectorAll('.cardart-lang-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.lang === lang);
  });
  const gridEl = document.getElementById('cardart-grid');
  gridEl.innerHTML = `<div class="cardart-empty">${t('loading')}</div>`;
  const list = await window.api.cardTemplatesList(lang);
  renderCardArtGrid(list);
}

async function loadCardArtGridForNiche() {
  cardArtMode = 'niche';
  document.querySelectorAll('.cardart-lang-tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById('cardart-niche-tab').classList.add('active');
  const gridEl = document.getElementById('cardart-grid');
  gridEl.innerHTML = `<div class="cardart-empty">${t('loading')}</div>`;
  const list = await window.api.cardTemplatesListByNiche(currentNicheId);
  renderCardArtGrid(list);
}

// Стандартная карточка ниши (заглушка) — показываем первой, с названием заведения,
// чтобы было видно, что получают клиенты, пока нет своих картинок.
async function renderCardArtDefaultPreview() {
  const holder = document.getElementById('cardart-default-preview');
  if (!holder) return;
  const tpl = await nichePlaceholderTemplate(currentNicheId, cardArtMode === 'lang' ? cardArtCurrentLang : getLang());
  if (!tpl) return;
  let url = null;
  try { url = await composeCatCard('https://loya-loyalty.com', tpl, currentBrandName); } catch (e) { return; }
  const img = holder.querySelector('img');
  if (img && url) img.src = url;
}

function renderCardArtGrid(list) {
  const gridEl = document.getElementById('cardart-grid');
  const hasOwn = list && list.some(item => item.dataUrl);
  const defaultItem = `
    <div class="cardart-item cardart-default ${hasOwn ? 'cardart-default-off' : ''}" id="cardart-default-preview" title="${t('cardArtDefaultCaption')}">
      <img alt="">
      <span class="cardart-default-badge">${t('cardArtDefaultBadge')}</span>
    </div>`;
  if (!list || list.length === 0) {
    gridEl.innerHTML = defaultItem + `<div class="cardart-empty cardart-default-caption">${t('cardArtDefaultCaption')}</div>`;
    renderCardArtDefaultPreview();
    return;
  }
  gridEl.innerHTML = list.map(item => `
    <div class="cardart-item" data-id="${item.id}">
      ${item.dataUrl ? `<img src="${item.dataUrl}" alt="">` : `<div class="cardart-empty">${t('cardArtFileLost')}</div>`}
      <button type="button" class="btn-cardart-delete" data-id="${item.id}" title="${t('btnDeleteCard')}">✕</button>
    </div>
  `).join('') + (hasOwn ? '' : defaultItem);
  renderCardArtDefaultPreview();
  gridEl.querySelectorAll('.btn-cardart-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!await uiConfirm(t('cardArtConfirmDelete'), { danger: true })) return;
      await window.api.cardTemplateDelete(Number(btn.dataset.id));
      if (cardArtMode === 'niche') {
        invalidateCardTemplatesCache('niche:' + currentNicheId);
        loadCardArtGridForNiche();
      } else {
        invalidateCardTemplatesCache(cardArtCurrentLang);
        loadCardArtGrid(cardArtCurrentLang);
      }
    });
  });
}

document.querySelectorAll('.cardart-lang-tab:not(.cardart-niche-tab)').forEach(tab => {
  tab.addEventListener('click', () => loadCardArtGrid(tab.dataset.lang));
});
document.getElementById('cardart-niche-tab').addEventListener('click', () => loadCardArtGridForNiche());

const CARD_ART_MAX_FILE_MB = 10;
const CARD_ART_MAX_DIMENSION = 1500; // крупнее — сжимаем перед сохранением, чтобы файлы не разрастались

document.getElementById('cardart-file-trigger').addEventListener('click', () => {
  document.getElementById('cardart-file-input').click();
});

document.getElementById('cardart-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('cardart-file-name').textContent = file.name;
  const statusEl = document.getElementById('cardart-status');
  statusEl.textContent = '';

  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    statusEl.textContent = t('cardArtBadFormat');
    e.target.value = '';
    document.getElementById('cardart-file-name').textContent = t('cardArtNoFile');
    return;
  }
  if (file.size > CARD_ART_MAX_FILE_MB * 1024 * 1024) {
    statusEl.textContent = t('cardArtTooBig')(CARD_ART_MAX_FILE_MB);
    e.target.value = '';
    document.getElementById('cardart-file-name').textContent = t('cardArtNoFile');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const img = new Image();
    img.onload = () => {
      const { dataUrl, w, h } = downscaleImageIfNeeded(img, CARD_ART_MAX_DIMENSION);
      cardArtPickedFile = { dataUrl, img, naturalWidth: w, naturalHeight: h };
      setupCardArtCanvas();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Если картинка крупнее разумного предела — пересжимаем через canvas перед сохранением
// (иначе загруженные пользователем файлы могут раздувать папку с данными без ограничений).
function downscaleImageIfNeeded(img, maxDim) {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (w <= maxDim && h <= maxDim) {
    return { dataUrl: img.src, w, h };
  }
  const scale = maxDim / Math.max(w, h);
  const newW = Math.round(w * scale), newH = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  canvas.getContext('2d').drawImage(img, 0, 0, newW, newH);
  return { dataUrl: canvas.toDataURL('image/png'), w: newW, h: newH };
}

// ---------- редактор места под QR ----------
// Место под QR появляется сразу (не нужно рисовать с нуля), внутри — настоящий пример
// QR-кода, чтобы было видно итоговый вид. Двигать мышкой, менять размер за любой из
// 4 уголков, щелчок мимо — перенос QR в эту точку, ползунок размера, кнопки быстрой
// расстановки 3×3, стрелки на клавиатуре и «прилипание» к центру картинки.
let cardArtSampleQr = null;
let cardArtGuides = { v: false, h: false };
const CARDART_SNAP_PX = 7;

async function ensureCardArtSampleQr() {
  if (cardArtSampleQr) return cardArtSampleQr;
  const url = await window.api.qrDataUrl('https://loya-loyalty.com', { width: 400, bgColor: '#ffffff' });
  cardArtSampleQr = await loadImage(url);
  return cardArtSampleQr;
}

async function setupCardArtCanvas() {
  const canvas = document.getElementById('cardart-canvas');
  const editorEl = document.getElementById('cardart-editor');
  editorEl.style.display = 'block';
  document.getElementById('cardart-status').textContent = '';
  const overlayRow = document.getElementById('cardart-overlay-row');
  overlayRow.style.display = cardArtMode === 'niche' ? 'flex' : 'none';
  document.getElementById('cardart-overlay-checkbox').checked = cardArtMode === 'niche';

  // Картинка показывается крупно, но координаты сохраняются в долях (0..1) от её размеров.
  const maxDisplay = 460;
  const scale = Math.min(1, maxDisplay / cardArtPickedFile.naturalWidth, maxDisplay / cardArtPickedFile.naturalHeight);
  canvas.width = Math.round(cardArtPickedFile.naturalWidth * scale);
  canvas.height = Math.round(cardArtPickedFile.naturalHeight * scale);
  await ensureCardArtSampleQr();

  // Стартовое место: по центру по горизонтали, в нижней части — как на большинстве карточек.
  const size = Math.round(Math.min(canvas.width, canvas.height) * 0.35);
  cardArtBox = { x0: 0, y0: 0, size, radiusPct: 0 };
  setCardArtBoxCenter(canvas.width / 2, canvas.height * 0.66);
  cardArtInteraction = null;
  document.getElementById('cardart-radius-slider').value = '0';
  document.getElementById('cardart-radius-value').textContent = '0%';
  syncCardArtControls();
  drawCardArtCanvas();
  editorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clampCardArtBox() {
  const canvas = document.getElementById('cardart-canvas');
  const maxSize = Math.min(canvas.width, canvas.height);
  cardArtBox.size = Math.max(16, Math.min(maxSize, cardArtBox.size));
  cardArtBox.x0 = Math.max(0, Math.min(canvas.width - cardArtBox.size, cardArtBox.x0));
  cardArtBox.y0 = Math.max(0, Math.min(canvas.height - cardArtBox.size, cardArtBox.y0));
}

// Ставит центр QR в точку, с «прилипанием» к центральным линиям картинки.
function setCardArtBoxCenter(cx, cy, snap) {
  const canvas = document.getElementById('cardart-canvas');
  cardArtGuides = { v: false, h: false };
  if (snap) {
    if (Math.abs(cx - canvas.width / 2) < CARDART_SNAP_PX) { cx = canvas.width / 2; cardArtGuides.v = true; }
    if (Math.abs(cy - canvas.height / 2) < CARDART_SNAP_PX) { cy = canvas.height / 2; cardArtGuides.h = true; }
  }
  cardArtBox.x0 = cx - cardArtBox.size / 2;
  cardArtBox.y0 = cy - cardArtBox.size / 2;
  clampCardArtBox();
}

function syncCardArtControls() {
  const canvas = document.getElementById('cardart-canvas');
  if (!cardArtBox) return;
  const pct = Math.round(cardArtBox.size / canvas.width * 100);
  document.getElementById('cardart-size-slider').value = String(Math.max(8, Math.min(90, pct)));
  document.getElementById('cardart-size-value').textContent = pct + '%';
  document.getElementById('cardart-small-warn').style.display = pct < 20 ? 'block' : 'none';
}

function cardArtCanvasPoint(e) {
  const canvas = document.getElementById('cardart-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { x: Math.max(0, Math.min(canvas.width, x)), y: Math.max(0, Math.min(canvas.height, y)) };
}

// Какой уголок под курсором: 'nw' | 'ne' | 'sw' | 'se' | null.
function cardArtCornerAt(box, x, y) {
  const r = CARDART_HANDLE_SIZE;
  const corners = { nw: [box.x0, box.y0], ne: [box.x0 + box.size, box.y0], sw: [box.x0, box.y0 + box.size], se: [box.x0 + box.size, box.y0 + box.size] };
  for (const [name, [cx, cy]] of Object.entries(corners)) {
    if (Math.abs(x - cx) <= r && Math.abs(y - cy) <= r) return name;
  }
  return null;
}

function pointInBox(box, x, y) {
  return x >= box.x0 && x <= box.x0 + box.size && y >= box.y0 && y <= box.y0 + box.size;
}

const cardArtCanvasEl = document.getElementById('cardart-canvas');
cardArtCanvasEl.addEventListener('mousedown', (e) => {
  if (!cardArtBox) return;
  const { x, y } = cardArtCanvasPoint(e);
  const corner = cardArtCornerAt(cardArtBox, x, y);
  if (corner) {
    // Противоположный уголок остаётся на месте — как в любом графическом редакторе.
    const ax = corner.includes('w') ? cardArtBox.x0 + cardArtBox.size : cardArtBox.x0;
    const ay = corner.includes('n') ? cardArtBox.y0 + cardArtBox.size : cardArtBox.y0;
    cardArtInteraction = 'resize';
    cardArtInteractionStart = { corner, ax, ay };
  } else if (pointInBox(cardArtBox, x, y)) {
    cardArtInteraction = 'move';
    cardArtInteractionStart = { offsetX: x - (cardArtBox.x0 + cardArtBox.size / 2), offsetY: y - (cardArtBox.y0 + cardArtBox.size / 2) };
  } else {
    // Щелчок мимо — переносим QR в эту точку и сразу даём тащить дальше.
    setCardArtBoxCenter(x, y, true);
    cardArtInteraction = 'move';
    cardArtInteractionStart = { offsetX: 0, offsetY: 0 };
  }
  cardArtCanvasEl.focus();
  syncCardArtControls();
  drawCardArtCanvas();
  e.preventDefault();
});
cardArtCanvasEl.addEventListener('mousemove', (e) => {
  if (cardArtInteraction || !cardArtBox) return;
  const { x, y } = cardArtCanvasPoint(e);
  const corner = cardArtCornerAt(cardArtBox, x, y);
  cardArtCanvasEl.style.cursor = corner ? (corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize')
    : pointInBox(cardArtBox, x, y) ? 'move' : 'crosshair';
});
window.addEventListener('mousemove', (e) => {
  if (!cardArtInteraction || !cardArtBox) return;
  const canvas = cardArtCanvasEl;
  const { x, y } = cardArtCanvasPoint(e);
  if (cardArtInteraction === 'move') {
    setCardArtBoxCenter(x - cardArtInteractionStart.offsetX, y - cardArtInteractionStart.offsetY, true);
  } else if (cardArtInteraction === 'resize') {
    const { corner, ax, ay } = cardArtInteractionStart;
    const dirX = corner.includes('w') ? -1 : 1;
    const dirY = corner.includes('n') ? -1 : 1;
    const maxW = dirX > 0 ? canvas.width - ax : ax;
    const maxH = dirY > 0 ? canvas.height - ay : ay;
    const size = Math.max(16, Math.min(maxW, maxH, Math.max((x - ax) * dirX, (y - ay) * dirY)));
    cardArtBox.size = size;
    cardArtBox.x0 = dirX > 0 ? ax : ax - size;
    cardArtBox.y0 = dirY > 0 ? ay : ay - size;
    cardArtGuides = { v: false, h: false };
  }
  syncCardArtControls();
  drawCardArtCanvas();
});
window.addEventListener('mouseup', () => {
  if (!cardArtInteraction) return;
  cardArtInteraction = null;
  cardArtGuides = { v: false, h: false };
  drawCardArtCanvas();
});

// Стрелки — точная подвинка на 1 px (Shift — на 10 px).
cardArtCanvasEl.addEventListener('keydown', (e) => {
  if (!cardArtBox) return;
  const step = e.shiftKey ? 10 : 1;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (!moves[e.key]) return;
  e.preventDefault();
  cardArtBox.x0 += moves[e.key][0];
  cardArtBox.y0 += moves[e.key][1];
  clampCardArtBox();
  drawCardArtCanvas();
});

document.getElementById('cardart-size-slider').addEventListener('input', (e) => {
  if (!cardArtBox) return;
  const cx = cardArtBox.x0 + cardArtBox.size / 2, cy = cardArtBox.y0 + cardArtBox.size / 2;
  cardArtBox.size = Number(e.target.value) / 100 * cardArtCanvasEl.width;
  setCardArtBoxCenter(cx, cy);
  syncCardArtControls();
  drawCardArtCanvas();
});

// Быстрая расстановка 3×3 с отступом от краёв 6%.
document.querySelectorAll('#cardart-pos-grid button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!cardArtBox) return;
    const [col, row] = btn.dataset.pos.split(',').map(Number);
    const w = cardArtCanvasEl.width, h = cardArtCanvasEl.height, m = Math.min(w, h) * 0.06, sz = cardArtBox.size;
    const xs = [m + sz / 2, w / 2, w - m - sz / 2];
    const ys = [m + sz / 2, h / 2, h - m - sz / 2];
    setCardArtBoxCenter(xs[col], ys[row]);
    drawCardArtCanvas();
  });
});

document.getElementById('cardart-radius-slider').addEventListener('input', (e) => {
  const pct = Number(e.target.value);
  document.getElementById('cardart-radius-value').textContent = pct + '%';
  if (cardArtBox) cardArtBox.radiusPct = pct / 100;
  drawCardArtCanvas();
});

function cardArtRoundedPath(ctx, x0, y0, size, radius) {
  ctx.beginPath();
  if (radius > 0) {
    ctx.moveTo(x0 + radius, y0);
    ctx.arcTo(x0 + size, y0, x0 + size, y0 + size, radius);
    ctx.arcTo(x0 + size, y0 + size, x0, y0 + size, radius);
    ctx.arcTo(x0, y0 + size, x0, y0, radius);
    ctx.arcTo(x0, y0, x0 + size, y0, radius);
    ctx.closePath();
  } else {
    ctx.rect(x0, y0, size, size);
  }
}

function drawCardArtCanvas() {
  const canvas = cardArtCanvasEl;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(cardArtPickedFile.img, 0, 0, canvas.width, canvas.height);
  if (!cardArtBox || cardArtBox.size <= 0) return;
  const { x0, y0, size, radiusPct } = cardArtBox;
  const radius = (radiusPct || 0) * size;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#d4af37';

  // Настоящий пример QR на своём месте — видно, как будет выглядеть готовая карточка.
  ctx.save();
  cardArtRoundedPath(ctx, x0, y0, size, radius);
  ctx.clip();
  if (cardArtSampleQr) ctx.drawImage(cardArtSampleQr, x0, y0, size, size);
  else { ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0, size, size); }
  ctx.restore();

  // Направляющие по центру картинки (когда QR «прилип»).
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  if (cardArtGuides.v) { ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke(); }
  if (cardArtGuides.h) { ctx.beginPath(); ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke(); }
  ctx.restore();

  // Рамка и 4 уголка-ручки.
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  cardArtRoundedPath(ctx, x0, y0, size, radius);
  ctx.stroke();
  const hs = 9;
  [[x0, y0], [x0 + size, y0], [x0, y0 + size], [x0 + size, y0 + size]].forEach(([cx, cy]) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(cx - hs / 2 - 1, cy - hs / 2 - 1, hs + 2, hs + 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

document.getElementById('btn-cardart-save').addEventListener('click', async () => {
  const statusEl = document.getElementById('cardart-status');
  if (!cardArtBox || cardArtBox.size < 10) {
    statusEl.textContent = t('cardArtNoSquare');
    return;
  }
  const canvas = document.getElementById('cardart-canvas');
  const { x0, y0, size, radiusPct } = cardArtBox;
  const qrXPct = (x0 + size / 2) / canvas.width;
  const qrYPct = (y0 + size / 2) / canvas.height;
  const qrSizePct = size / canvas.width;

  statusEl.textContent = t('cardArtSaving');
  const res = await window.api.cardTemplateAdd({
    lang: cardArtMode === 'niche' ? null : cardArtCurrentLang,
    niche: cardArtMode === 'niche' ? currentNicheId : null,
    hasTextOverlay: cardArtMode === 'niche' && document.getElementById('cardart-overlay-checkbox').checked,
    imageDataUrl: cardArtPickedFile.dataUrl,
    qrXPct, qrYPct, qrSizePct, qrCornerRadiusPct: radiusPct || 0
  });
  if (res.error) {
    setErrStatus(statusEl, res.error, t('mailError'));
    return;
  }
  document.getElementById('cardart-editor').style.display = 'none';
  document.getElementById('cardart-file-input').value = '';
  document.getElementById('cardart-file-name').textContent = t('cardArtNoFile');
  cardArtPickedFile = null;
  cardArtBox = null;
  cardArtInteraction = null;
  statusEl.textContent = '';
  if (cardArtMode === 'niche') {
    invalidateCardTemplatesCache('niche:' + currentNicheId);
    loadCardArtGridForNiche();
  } else {
    invalidateCardTemplatesCache(cardArtCurrentLang);
    loadCardArtGrid(cardArtCurrentLang);
  }
});

document.getElementById('btn-cardart-cancel').addEventListener('click', () => {
  document.getElementById('cardart-editor').style.display = 'none';
  document.getElementById('cardart-file-input').value = '';
  document.getElementById('cardart-file-name').textContent = t('cardArtNoFile');
  cardArtPickedFile = null;
  cardArtBox = null;
  cardArtInteraction = null;
  document.getElementById('cardart-status').textContent = '';
});

// ---------- афиша для стойки: конструктор ----------
// Афиша рисуется на <canvas>: тот же рисунок — в предпросмотре, в картинке PNG и при печати.
const PZ_TEMPLATES = ['classic', 'lux', 'minimal', 'bright', 'photo', 'kraft'];
const PZ_COLORS = ['#d4af37', '#a9682f', '#e0473c', '#2f9e6a', '#2f6fde', '#7c4ddb', '#e0508f', '#1f2328'];
const PZ_FORMATS = { a4: [1240, 1754], square: [1080, 1080], story: [1080, 1920] };
let pz = null;            // текущие настройки
let pzAssets = { qrs: [], logo: null, bg: null };
let pzSaveTimer = null;
function pzDefaults() {
  const lang = ['uk', 'sk', 'en', 'ru'].includes(getLang()) ? getLang() : 'uk';
  return { tpl: 'lux', fmt: 'a4', lang, accent: (document.documentElement.style.getPropertyValue('--color-primary') || '#d4af37').trim() || '#d4af37', dim: 45, title: '', offer: '', footer: '', logo: true };
}
function tl(lang, key) { const d = I18N[lang] || I18N.ru; return key in d ? d[key] : I18N.ru[key]; }
function pzHex(h) { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); const n = parseInt(m ? m[1] : 'd4af37', 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function pzRgba(h, a) { const [r, g, b] = pzHex(h); return `rgba(${r},${g},${b},${a})`; }
function pzShade(h, k) { const [r, g, b] = pzHex(h).map(v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)))); return `rgb(${r},${g},${b})`; }
function pzLum(h) { const [r, g, b] = pzHex(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
function pzLines(ctx, text, maxW) {
  const out = []; let line = '';
  for (const w of String(text || '').split(/\s+/).filter(Boolean)) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
  }
  if (line) out.push(line);
  return out;
}
function pzRound(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
async function pzDefaultOffer(lang) {
  const s = await window.api.getSettings();
  const type = ['discount', 'spend'].includes(s.selfreg_card_type) ? s.selfreg_card_type : 'stamp';
  if (type === 'discount') return tl(lang, 'pzOfferDiscount')(Number(s.selfreg_discount_percent) || 5);
  if (type === 'spend') return tl(lang, 'pzOfferSpend');
  return tl(lang, 'pzOfferStamp')(Number(s.selfreg_stamp_target) || 10);
}
// Рисует афишу. W×H — размер в пикселях; opts — настройки; A — картинки (QR, логотип, фон).
function drawPoster(cv, W, H, o, A, texts) {
  const ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  const u = Math.min(W, H / 1.414) / 100;          // единица размера (A4 → 1% ширины)
  const acc = o.accent;
  const T = o.tpl === 'photo' && !A.bg ? 'lux' : o.tpl;
  const dark = ['lux', 'bright', 'photo'].includes(T);
  const ink = T === 'bright' ? '#ffffff' : dark ? '#f6eedb' : T === 'kraft' ? '#3b2a1a' : '#1f2328';
  const muted = T === 'bright' ? 'rgba(255,255,255,.82)' : dark ? 'rgba(246,238,219,.7)' : T === 'kraft' ? 'rgba(59,42,26,.72)' : 'rgba(31,35,40,.62)';
  const font = (wt, px) => `${wt} ${Math.round(px)}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  // ---- фон ----
  if (T === 'classic') { ctx.fillStyle = '#f6efe2'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; pzRound(ctx, 4 * u, 4 * u, W - 8 * u, H - 8 * u, 3 * u); ctx.fill(); ctx.strokeStyle = pzRgba(acc, .55); ctx.lineWidth = .5 * u; pzRound(ctx, 6 * u, 6 * u, W - 12 * u, H - 12 * u, 2 * u); ctx.stroke(); }
  else if (T === 'lux') { const g = ctx.createRadialGradient(W * .5, H * .25, 0, W * .5, H * .3, H * .9); g.addColorStop(0, '#24201a'); g.addColorStop(1, '#0a0908'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = pzRgba(acc, .7); ctx.lineWidth = .35 * u; ctx.strokeRect(4 * u, 4 * u, W - 8 * u, H - 8 * u); ctx.strokeStyle = pzRgba(acc, .3); ctx.strokeRect(5.5 * u, 5.5 * u, W - 11 * u, H - 11 * u); }
  else if (T === 'minimal') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = acc; ctx.fillRect(0, 0, W, 2.2 * u); ctx.fillRect(0, H - 2.2 * u, W, 2.2 * u); }
  else if (T === 'bright') { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, pzShade(acc, .12)); g.addColorStop(1, pzShade(acc, -.45)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(W * .92, H * .06, 30 * u, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(W * .05, H * .95, 24 * u, 0, Math.PI * 2); ctx.fill(); }
  else if (T === 'photo') { const im = A.bg; const k = Math.max(W / im.width, H / im.height); ctx.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k); ctx.fillStyle = `rgba(8,8,10,${(o.dim ?? 45) / 100})`; ctx.fillRect(0, 0, W, H); }
  else if (T === 'kraft') { ctx.fillStyle = '#e9dcc3'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(120,90,50,.07)'; for (let y = 0; y < H; y += 2.4 * u) for (let x = (y / (2.4 * u)) % 2 ? 1.2 * u : 0; x < W; x += 2.4 * u) { ctx.beginPath(); ctx.arc(x, y, .25 * u, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = pzRgba(acc, .5); ctx.setLineDash([1.2 * u, 1 * u]); ctx.lineWidth = .4 * u; pzRound(ctx, 4 * u, 4 * u, W - 8 * u, H - 8 * u, 3 * u); ctx.stroke(); ctx.setLineDash([]); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const cx = W / 2, maxW = W - 22 * u;
  // ---- раскладка: считаем высоту и, если не помещается, уменьшаем QR ----
  const qrCount = A.qrs.length || 1;
  const layout = (qr) => {
    let y = 11 * u; const items = [];
    const mark = o.logo && A.logo ? 15 * u : 0;
    if (mark) { items.push({ k: 'logo', y, h: mark }); y += mark + 3 * u; } else { items.push({ k: 'emoji', y: y + 8 * u }); y += 11 * u; }
    items.push({ k: 'brand', y: y + 4.6 * u }); y += 9 * u;
    ctx.font = font(800, 7.2 * u); const tLines = pzLines(ctx, texts.title, maxW).slice(0, 3);
    tLines.forEach((l, i) => items.push({ k: 'title', y: y + 6.6 * u + i * 8.4 * u, text: l })); y += tLines.length * 8.4 * u + 2.5 * u;
    if (texts.offer) { items.push({ k: 'offer', y }); y += 9.5 * u; }
    y += 2 * u;
    const pad = 2.6 * u, gap = 4 * u, cardW = qr * qrCount + gap * (qrCount - 1) + pad * 2;
    items.push({ k: 'qr', y, qr, cardW, pad, gap }); y += qr + pad * 2 + (qrCount > 1 ? 5 * u : 0) + 4 * u;
    items.push({ k: 'steps', y: y + 3 * u }); y += 10 * u;
    ctx.font = font(500, 2.9 * u); const fLines = pzLines(ctx, texts.footer, maxW).slice(0, 3);
    fLines.forEach((l, i) => items.push({ k: 'foot', y: y + 3 * u + i * 3.9 * u, text: l })); y += fLines.length * 3.9 * u + 6 * u;
    return { items, total: y };
  };
  let qr = Math.min(42 * u, (W - 20 * u) / qrCount - (qrCount - 1) * 2 * u), L = layout(qr);
  for (let i = 0; i < 30 && L.total > H; i++) { qr *= 0.93; L = layout(qr); }
  const shift = Math.max(0, (H - L.total) / 2.2);
  for (const it of L.items) {
    const y = it.y + shift;
    if (it.k === 'logo') { const im = A.logo, k = Math.min(it.h / im.width, it.h / im.height); ctx.drawImage(im, cx - im.width * k / 2, y, im.width * k, im.height * k); }
    else if (it.k === 'emoji') { ctx.font = font(400, 9 * u); ctx.fillStyle = ink; ctx.fillText(texts.emoji, cx, y); }
    else if (it.k === 'brand') { ctx.font = font(800, 4.6 * u); ctx.fillStyle = dark || T === 'bright' ? acc === '#1f2328' ? ink : (T === 'bright' ? '#fff' : acc) : acc; if (T === 'minimal' || T === 'classic' || T === 'kraft') ctx.fillStyle = pzLum(acc) > .8 ? ink : acc; ctx.fillText(texts.brand.toUpperCase(), cx, y); }
    else if (it.k === 'title') { ctx.font = font(800, 7.2 * u); ctx.fillStyle = ink; ctx.fillText(it.text, cx, y); }
    else if (it.k === 'offer') {
      ctx.font = font(800, 3.6 * u); const tw = Math.min(maxW, ctx.measureText(texts.offer).width + 7 * u), h = 7 * u;
      ctx.fillStyle = T === 'bright' ? '#ffffff' : acc; pzRound(ctx, cx - tw / 2, y, tw, h, h / 2); ctx.fill();
      ctx.fillStyle = T === 'bright' ? pzShade(acc, -.35) : (pzLum(acc) > .55 ? '#1b1205' : '#ffffff'); ctx.fillText(texts.offer, cx, y + h * .66, maxW - 4 * u);
    }
    else if (it.k === 'qr') {
      const x0 = cx - it.cardW / 2, h = it.qr + it.pad * 2 + (qrCount > 1 ? 5 * u : 0);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 4 * u; ctx.shadowOffsetY = 1.2 * u;
      ctx.fillStyle = '#ffffff'; pzRound(ctx, x0, y, it.cardW, h, 3 * u); ctx.fill(); ctx.restore();
      A.qrs.forEach((q, i) => {
        const qx = x0 + it.pad + i * (it.qr + it.gap), qy = y + it.pad;
        if (q.img) ctx.drawImage(q.img, qx, qy, it.qr, it.qr);
        if (qrCount > 1) { ctx.font = font(800, 2.7 * u); ctx.fillStyle = '#1f2328'; ctx.fillText(q.label, qx + it.qr / 2, qy + it.qr + 3.6 * u); }
      });
      // уголки «рамки сканера» цветом акцента
      ctx.strokeStyle = T === 'bright' ? '#ffffff' : acc; ctx.lineWidth = .9 * u; ctx.lineCap = 'round';
      const m = 1.6 * u, c = 6 * u, x1 = x0 - m, y1 = y - m, x2 = x0 + it.cardW + m, y2 = y + h + m;
      [[x1, y1 + c, x1, y1, x1 + c, y1], [x2 - c, y1, x2, y1, x2, y1 + c], [x1, y2 - c, x1, y2, x1 + c, y2], [x2 - c, y2, x2, y2, x2, y2 - c]].forEach(([a1, b1, a2, b2, a3, b3]) => { ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.lineTo(a3, b3); ctx.stroke(); });
    }
    else if (it.k === 'steps') {
      const st = texts.steps, w = Math.min(maxW, 76 * u) / 3;
      st.forEach((txt, i) => {
        const sx = cx - w + i * w;
        ctx.fillStyle = T === 'bright' ? '#ffffff' : acc; ctx.beginPath(); ctx.arc(sx, y - 1 * u, 2.4 * u, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = T === 'bright' ? pzShade(acc, -.35) : (pzLum(acc) > .55 ? '#1b1205' : '#fff'); ctx.font = font(800, 2.6 * u); ctx.fillText(String(i + 1), sx, y - .1 * u);
        ctx.fillStyle = ink; ctx.font = font(700, 2.5 * u); ctx.fillText(txt, sx, y + 5 * u, w - 2 * u);
      });
    }
    else if (it.k === 'foot') { ctx.font = font(500, 2.9 * u); ctx.fillStyle = muted; ctx.fillText(it.text, cx, y); }
  }
}
function pzLoadImg(src) { return new Promise((res) => { if (!src) { res(null); return; } const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
async function pzLoadQrs(lang) {
  const s = await window.api.getSettings();
  const info = await window.api.registerGetInfo();
  const mi = window.api.selfregModeInfo ? await window.api.selfregModeInfo() : { mode: 'wifi' };
  const online = mi.mode === 'online' && mi.joinUrl;
  const regUrl = online ? `${mi.joinUrl}?lang=${lang}` : `${info.url}?lang=${lang}`;
  const list = [];
  if (!online && s.wifi_ssid) {
    const esc = (v) => String(v || '').replace(/([\;,:"])/g, '\\$1');
    const payload = `WIFI:T:${s.wifi_password ? 'WPA' : 'nopass'};S:${esc(s.wifi_ssid)};P:${esc(s.wifi_password || '')};;`;
    list.push({ img: await pzLoadImg(await window.api.qrDataUrl(payload, { width: 900, margin: 1 })), label: tl(lang, 'selfregQrStep1') });
  }
  list.push({ img: await pzLoadImg(await window.api.qrDataUrl(regUrl, { width: 900, margin: 1 })), label: tl(lang, 'selfregQrStep2') });
  return list;
}
async function pzTexts() {
  const lang = pz.lang;
  return {
    brand: currentBrandName, emoji: NichesModule.getNiche(currentNicheId).emoji,
    title: pz.title.trim() || tl(lang, 'posterTitle'),
    offer: pz.offer.trim() || await pzDefaultOffer(lang),
    footer: pz.footer.trim() || tl(lang, pzAssets.qrs.length > 1 ? 'posterFooter' : 'pzFooterOne'),
    steps: [tl(lang, 'pzStep1'), tl(lang, 'pzStep2'), tl(lang, 'pzStep3')]
  };
}
async function pzRender() {
  if (!pz) return;
  const [W, H] = PZ_FORMATS[pz.fmt] || PZ_FORMATS.a4;
  const texts = await pzTexts();
  drawPoster(document.getElementById('pz-canvas'), W, H, pz, pzAssets, texts);
  // миниатюры дизайнов
  document.querySelectorAll('#pz-tpls canvas').forEach(c => drawPoster(c, Math.round(W / 6), Math.round(H / 6), { ...pz, tpl: c.dataset.tpl }, pzAssets, texts));
  document.querySelectorAll('#pz-tpls .pz-tpl').forEach(b => b.classList.toggle('active', b.dataset.tpl === pz.tpl));
  document.querySelectorAll('#pz-format button').forEach(b => b.classList.toggle('active', b.dataset.fmt === pz.fmt));
  document.querySelectorAll('#pz-colors .pz-color').forEach(b => b.classList.toggle('active', b.dataset.c && b.dataset.c.toLowerCase() === String(pz.accent).toLowerCase()));
  document.getElementById('pz-dim-row').style.display = pzAssets.bg ? '' : 'none';
  document.getElementById('pz-bg-remove').style.display = pzAssets.bg ? '' : 'none';
  document.getElementById('pz-bg-edit').style.display = pzAssets.bg ? '' : 'none';
  const th = document.getElementById('pz-bg-thumb'); th.style.backgroundImage = pzAssets.bg ? `url("${pzAssets.bg.src}")` : ''; th.classList.toggle('empty', !pzAssets.bg);
  document.getElementById('pz-logo').disabled = !pzAssets.logo;
}
function pzSave() {
  clearTimeout(pzSaveTimer);
  pzSaveTimer = setTimeout(async () => { const st = await window.api.getSettings(); await window.api.saveSettings({ ...st, poster_design: JSON.stringify(pz) }); }, 400);
}
async function openPosterEditor() {
  const st = await window.api.getSettings();
  let saved = {}; try { saved = JSON.parse(st.poster_design || '{}') || {}; } catch (e) { saved = {}; }
  pz = { ...pzDefaults(), ...saved };
  if (!PZ_TEMPLATES.includes(pz.tpl)) pz.tpl = 'lux';
  if (!PZ_FORMATS[pz.fmt]) pz.fmt = 'a4';
  pzAssets = { qrs: await pzLoadQrs(pz.lang), logo: await pzLoadImg(currentBrandLogo), bg: await pzLoadImg(await window.api.posterBgGet()) };
  const lang = pz.lang;
  document.getElementById('pz-tpls').innerHTML = PZ_TEMPLATES.map(k => `<button type="button" class="pz-tpl" data-tpl="${k}"><canvas data-tpl="${k}"></canvas><span>${escapeHtml(t('pzTpl_' + k))}</span></button>`).join('');
  document.getElementById('pz-colors').innerHTML = PZ_COLORS.map(c => `<button type="button" class="pz-color" data-c="${c}" style="background:${c}"></button>`).join('') + `<label class="pz-color pz-color-custom" title="${escapeHtml(t('pzColor'))}"><input type="color" id="pz-color-input" value="${pz.accent}"></label>`;
  document.getElementById('pz-lang').value = pz.lang;
  document.getElementById('pz-title').value = pz.title; document.getElementById('pz-offer').value = pz.offer; document.getElementById('pz-footer').value = pz.footer;
  document.getElementById('pz-title').placeholder = tl(lang, 'posterTitle');
  document.getElementById('pz-offer').placeholder = await pzDefaultOffer(lang);
  document.getElementById('pz-footer').placeholder = tl(lang, pzAssets.qrs.length > 1 ? 'posterFooter' : 'pzFooterOne');
  document.getElementById('pz-dim').value = String(pz.dim);
  document.getElementById('pz-logo').checked = !!pz.logo;
  document.querySelectorAll('#pz-tpls .pz-tpl').forEach(b => b.addEventListener('click', () => { pz.tpl = b.dataset.tpl; if (pz.tpl === 'photo' && !pzAssets.bg) document.getElementById('pz-bg-file').click(); pzRender(); pzSave(); }));
  document.querySelectorAll('#pz-colors .pz-color[data-c]').forEach(b => b.addEventListener('click', () => { pz.accent = b.dataset.c; pzRender(); pzSave(); }));
  document.getElementById('pz-color-input').addEventListener('input', (e) => { pz.accent = e.target.value; pzRender(); pzSave(); });
  await pzRender();
}
document.querySelectorAll('#pz-format button').forEach(b => b.addEventListener('click', () => { if (!pz) return; pz.fmt = b.dataset.fmt; pzRender(); pzSave(); }));
document.getElementById('pz-lang').addEventListener('change', async (e) => {
  pz.lang = e.target.value; pzAssets.qrs = await pzLoadQrs(pz.lang);
  document.getElementById('pz-title').placeholder = tl(pz.lang, 'posterTitle');
  document.getElementById('pz-offer').placeholder = await pzDefaultOffer(pz.lang);
  document.getElementById('pz-footer').placeholder = tl(pz.lang, pzAssets.qrs.length > 1 ? 'posterFooter' : 'pzFooterOne');
  pzRender(); pzSave();
});
['title', 'offer', 'footer'].forEach(k => document.getElementById('pz-' + k).addEventListener('input', (e) => { pz[k] = e.target.value; pzRender(); pzSave(); }));
document.getElementById('pz-dim').addEventListener('input', (e) => { pz.dim = Number(e.target.value); pzRender(); pzSave(); });
document.getElementById('pz-logo').addEventListener('change', (e) => { pz.logo = e.target.checked; pzRender(); pzSave(); });
document.getElementById('pz-bg-pick').addEventListener('click', () => document.getElementById('pz-bg-file').click());
async function pzEditBg(img) {
  const [fw, fh] = PZ_FORMATS[pz.fmt] || PZ_FORMATS.a4;
  const k = Math.min(1, 2480 / Math.max(fw * 2, fh * 2));
  const cv = await ImgEd.open({ img, W: Math.round(fw * 2 * k), H: Math.round(fh * 2 * k), title: t('iePosterTitle'), mode: 'cover', bg: '#111111' });
  if (!cv) return;
  const url = canvasToLimitedUrl(cv, 'image/jpeg', 2.9 * 1024 * 1024);
  const r = url ? await window.api.posterBgSave(url) : { error: 'bad_image' };
  if (!r || !r.ok) { document.getElementById('pz-status').textContent = t('brandLogoBad'); return; }
  pzAssets.bg = await pzLoadImg(url); pz.tpl = 'photo'; pzRender(); pzSave();
}
document.getElementById('pz-bg-file').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
  try { const img = await loadImageFromFile(file); imgOriginals.poster = img; await pzEditBg(img); }
  catch (err) { document.getElementById('pz-status').textContent = t('brandLogoBad'); }
});
document.getElementById('pz-bg-edit').addEventListener('click', async () => {
  const img = imgOriginals.poster || (pzAssets.bg && await loadImageFromUrl(pzAssets.bg.src).catch(() => null));
  if (img) pzEditBg(img);
});
document.getElementById('pz-bg-remove').addEventListener('click', async () => { await window.api.posterBgSave(null); pzAssets.bg = null; if (pz.tpl === 'photo') pz.tpl = 'lux'; pzRender(); pzSave(); });
document.getElementById('pz-reset').addEventListener('click', () => {
  pz = pzDefaults();
  ['title', 'offer', 'footer'].forEach(k => { document.getElementById('pz-' + k).value = ''; });
  document.getElementById('pz-lang').value = pz.lang; document.getElementById('pz-dim').value = String(pz.dim); document.getElementById('pz-logo').checked = true;
  pzRender(); pzSave();
});
// Афиша в высоком разрешении (для печати и файла): вдвое больше предпросмотра.
async function composePosterImage() {
  const [W, H] = PZ_FORMATS[pz.fmt] || PZ_FORMATS.a4;
  const cv = document.createElement('canvas');
  drawPoster(cv, W * 2, H * 2, pz, pzAssets, await pzTexts());
  return cv.toDataURL('image/png');
}
document.getElementById('btn-print-poster').addEventListener('click', async () => {
  if (!pz) return;
  const url = await composePosterImage();
  const page = pz.fmt === 'a4' ? 'A4' : 'A4';
  const imgCss = pz.fmt === 'a4' ? 'width:210mm;height:297mm' : 'width:190mm;margin:10mm auto';
  await window.api.printHtml(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(currentBrandName)}</title><style>@page{size:${page};margin:0}html,body{margin:0}img{display:block;${imgCss}}</style><img src="${url}">`, { title: t('posterHeading'), fileName: 'loya-poster' });
});
document.getElementById('btn-save-poster-image').addEventListener('click', async () => {
  const btn = document.getElementById('btn-save-poster-image');
  btn.disabled = true;
  try {
    const dataUrl = await composePosterImage();
    const res = await window.api.saveDataUrlFile(dataUrl, `${currentBrandName.toLowerCase().replace(/\s+/g, '-')}-poster-${pz.fmt}.png`, t('posterHeading'));
    if (!res.canceled) uiAlert(t('savedFile') + res.filePath);
  } finally {
    btn.disabled = false;
  }
});

// ===================== Упрощение: выдать карту, новые клиенты, обновить, возможности =====================
// Выдать карту за один клик: тип и правило — как в настройках саморегистрации (их задаёт мастер «Первые шаги»).
async function issueCardFlow(clientId, name, afterAdd) {
  const s = await window.api.getSettings();
  const st = Number(s.selfreg_stamp_target) || 10, dp = Number(s.selfreg_discount_percent) || 5, sp = Number(s.selfreg_spend_target) || 500;
  const def = ['discount', 'spend'].includes(s.selfreg_card_type) ? s.selfreg_card_type : 'stamp';
  const opts = [
    { key: 'stamp', label: '☕ ' + t('issueStamp')(st) + (def === 'stamp' ? ' ★' : '') },
    { key: 'discount', label: '% ' + t('issueDiscount')(dp) + (def === 'discount' ? ' ★' : '') },
    { key: 'spend', label: '💶 ' + t('issueSpend')(sp + ' ' + currencySymbol()) + (def === 'spend' ? ' ★' : '') }
  ];
  opts.sort((a, b) => (a.key === def ? -1 : b.key === def ? 1 : 0));
  if (roleViewAllowed('newcard')) opts.push({ key: 'custom', label: '⚙️ ' + t('issueCustom') });
  const choice = await uiChoice((afterAdd ? t('issueAfterAdd')(name) : t('issueTitle')(name)) + '\n\n' + t('issueHint'), opts);
  if (!choice) return;
  if (choice === 'custom') {
    pendingNewCardClient = clientId;
    document.querySelector('.nav-btn[data-view="newcard"]').click();
    return;
  }
  const payload = choice === 'discount' ? { clientId, type: 'discount', discountPercent: dp, title: s.selfreg_discount_title || '' }
    : choice === 'spend' ? { clientId, type: 'spend', spendTarget: sp, spendBonusText: s.selfreg_spend_title || '', spendBonusPoints: Number(s.selfreg_spend_points) || 1 }
    : { clientId, type: 'stamp', stampTarget: st, title: s.selfreg_stamp_title || '' };
  const card = await window.api.createCard(payload);
  if (card && card.error === 'free_limit') { showFreeLimit(card.limit || 'cards'); return; }
  if (card && card.error === 'discount_cap') { uiAlert(t('discountCap')(card.max)); return; }
  refreshClients(); refreshDashboard(); refreshRecentCount();
  uiAlert(t('issueDone')(name));
}
document.getElementById('clients-list').addEventListener('click', (e) => {
  const b = e.target.closest('.issue-card-btn, .cc-add-card'); if (!b) return;
  e.stopPropagation();
  const card = b.closest('.client-card'); const nm = card ? (card.querySelector('.client-name-link') || {}).textContent || '' : '';
  issueCardFlow(Number(b.dataset.client), nm.trim(), false);
});
// Чек, который ждёт карту, — удалить (если клиент так и не пришёл или чек пробит по ошибке).
document.getElementById('inv-list').addEventListener('click', async (e) => {
  const b = e.target.closest('.inv-del-receipt'); if (!b) return;
  if (!(await uiConfirm(t('invDeleteReceiptQ'), { danger: true }))) return;
  const r = await window.api.invDeleteReceipt(Number(b.dataset.id));
  if (r && r.ok) refreshInventory(); else uiAlert(errText((r && r.error) || 'failed'));
});

// ---------- «Обновить» и «Новые клиенты» ----------
const HOW_ICON = { online: '🌐', wifi: '📶', promo: '🎁', manual: '✍️' };
async function refreshRecentCount() {
  if (!window.api.clientsRecent) return;
  const list = await window.api.clientsRecent(1);
  const el = document.getElementById('recent-count'); if (!el) return;
  el.textContent = list.length ? String(list.length) : ''; el.style.display = list.length ? '' : 'none';
}
let recentDays = 1;
async function openRecent() {
  const list = await window.api.clientsRecent(recentDays);
  document.getElementById('recent-tabs').innerHTML = [1, 7, 30].map(d => `<button type="button" class="roi-day ${d === recentDays ? 'active' : ''}" data-d="${d}">${escapeHtml(t('recentRange_' + d))}</button>`).join('');
  document.querySelectorAll('#recent-tabs .roi-day').forEach(b => b.addEventListener('click', () => { recentDays = Number(b.dataset.d); openRecent(); }));
  const el = document.getElementById('lx-recent-list');
  el.innerHTML = list.length ? list.map(c => `<div class="lx-row"><div><b>${escapeHtml(c.name)}</b><small>${HOW_ICON[c.how] || ''} ${escapeHtml(t('how_' + c.how))} · ${escapeHtml(fmtDT(c.created_at))}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</small></div>
    ${c.cards ? `<span class="recent-ok">✅ ${escapeHtml(t('recentHasCard'))}</span>` : `<button type="button" class="issue-card-btn" data-client="${c.id}" data-name="${escapeHtml(c.name)}">＋ ${escapeHtml(t('issueCardBtn'))}</button>`}</div>`).join('') : `<div class="hint">${escapeHtml(t('recentNone'))}</div>`;
  el.querySelectorAll('.issue-card-btn').forEach(b => b.addEventListener('click', async () => { lxClose('lx-recent'); await issueCardFlow(Number(b.dataset.client), b.dataset.name, false); }));
  lxOpen('lx-recent');
}
document.getElementById('btn-recent-clients').addEventListener('click', openRecent);
const refreshBtn = document.getElementById('btn-refresh-online');
refreshBtn.title = t('refreshTitle'); refreshBtn.setAttribute('aria-label', t('refreshTitle'));
refreshBtn.addEventListener('click', async () => {
  if (refreshBtn.classList.contains('spin')) return;
  refreshBtn.classList.add('spin');
  try {
    const st = await window.api.getSettings();
    const jobs = [window.api.onlineSyncNow()];
    if (window.api.syncNow) jobs.push(window.api.syncNow());
    if (st.feature_pos === '1' && window.api.posSyncNow) jobs.push(window.api.posSyncNow());
    await Promise.allSettled(jobs);
  } finally {
    refreshBtn.classList.remove('spin');
    refreshClients(); refreshDashboard(); refreshRecentCount();
  }
});
window.api.onRemoteDataChanged && window.api.onRemoteDataChanged(() => refreshRecentCount());
setInterval(refreshRecentCount, 60000); setTimeout(refreshRecentCount, 1200);

// ---------- возможности: склад и чеки из кассы — включаются в настройках ----------
let features = { inventory: false, pos: false, network: true, staff: true, weather: true };
async function loadFeatures() {
  const s = await window.api.getSettings();
  // 2.18: у тех, кто уже работал, всё остаётся видимым; у новых — то, что выбрали в «Что вам нужно?».
  features.network = s.feature_network !== '0'; features.staff = s.feature_staff !== '0'; features.weather = s.feature_weather !== '0'; features.weatherRaw = s.feature_weather || '';
  // Если не выбрано явно: у кого уже есть товары / включена касса — включено, у новых — выключено (проще начать).
  let inv = s.feature_inventory, pos = s.feature_pos;
  if (inv !== '1' && inv !== '0' || pos !== '1' && pos !== '0') {
    let sum = {}; try { sum = await window.api.invSummary(); } catch (e) { /* нет данных */ }
    if (inv !== '1' && inv !== '0') inv = (sum.products > 0 || sum.receipts30 > 0) ? '1' : '0';
    if (pos !== '1' && pos !== '0') pos = s.pos_enabled === '1' ? '1' : '0';
    await window.api.saveSettings({ ...s, feature_inventory: inv, feature_pos: pos });
  }
  features.inventory = inv === '1'; features.pos = pos === '1';
  applyFeatures();
}
function applyFeatures() {
  const nav = document.querySelector('.nav-btn[data-view="inventory"]'); if (nav) nav.style.display = features.inventory || features.pos ? '' : 'none';
  // 2.27: «Подключение кассы» видно в «Настройках» всегда — включить приём чеков можно прямо в окне
  const rt = document.querySelector('#inv-tabs .inv-tab[data-tab="receipts"]'); if (rt) rt.style.display = features.pos ? '' : 'none';
  ['products', 'moves'].forEach(k => { const b = document.querySelector(`#inv-tabs .inv-tab[data-tab="${k}"]`); if (b) b.style.display = features.inventory ? '' : 'none'; });
  if (!features.inventory && features.pos && typeof invTab !== 'undefined') invTab = 'receipts';
  const fi = document.getElementById('feat-inventory'), fp = document.getElementById('feat-pos');
  if (fi) fi.checked = features.inventory; if (fp) fp.checked = features.pos;
  ['network', 'staff', 'weather'].forEach(k => { const el = document.getElementById('feat-' + k); if (el) el.checked = features[k]; });
  const sync = !!(syncSt && syncSt.enabled);
  const ts = document.getElementById('tile-sync'); if (ts) ts.style.display = features.network || sync ? '' : 'none';
  const tt = document.querySelector('.settings-tile[data-modal="settings-modal-team"]'); if (tt) tt.style.display = features.staff ? '' : 'none';
  const tw = document.querySelector('.settings-tile[data-modal="settings-modal-weather"]'); if (tw) tw.style.display = features.weather ? '' : 'none';
  document.body.classList.toggle('no-feat-staff', !features.staff);
  document.body.classList.toggle('no-feat-weather', !features.weather);
  if (typeof renderSettingsCats === 'function') renderSettingsCats();
  if (currentView === 'inventory' && !features.inventory && !features.pos) document.querySelector('.nav-btn[data-view="dashboard"]').click();
}
async function setFeature(key, on) {
  const s = await window.api.getSettings();
  const patch = key === 'pos' ? { feature_pos: on ? '1' : '0', ...(on ? {} : { pos_enabled: '0' }) } : { ['feature_' + key]: on ? '1' : '0' };
  await window.api.saveSettings({ ...s, ...patch });
  features[key] = on; if (key === 'weather') features.weatherRaw = on ? '1' : '0'; applyFeatures(); refreshDashboard();
}
document.getElementById('feat-inventory').addEventListener('change', (e) => setFeature('inventory', e.target.checked));
document.getElementById('feat-pos').addEventListener('change', (e) => setFeature('pos', e.target.checked));
['network', 'staff', 'weather'].forEach(k => document.getElementById('feat-' + k).addEventListener('change', (e) => setFeature(k, e.target.checked)));
loadFeatures();

// ---------- саморегистрация: Wi-Fi или интернет ----------
async function loadSelfregMode(retried) {
  const mi = await window.api.selfregModeInfo();
  // Android: «по Wi-Fi» там нет (нет сервера для телефонов). Ключ ввели уже после запуска — переключаем сами;
  // без ключа честно говорим, что нужна подписка, а не «Сейчас: через Wi-Fi».
  if (mi.mode === 'wifi' && document.documentElement.classList.contains('platform-android')) {
    let res = null;
    if (mi.hasLicense && !retried) { res = await window.api.selfregSetMode('online'); if (res && res.ok) return loadSelfregMode(true); }
    document.querySelectorAll('input[name="selfreg-mode"]').forEach(r => { r.checked = false; });
    document.getElementById('selfreg-mode-status').textContent = !mi.hasLicense ? t('srNeedLicense')
      : res && res.error === 'license_inactive' ? t('errLicenseInactive') : errText((res && res.error) || 'failed');
    return;
  }
  document.querySelectorAll('input[name="selfreg-mode"]').forEach(r => { r.checked = r.value === mi.mode; });
  document.getElementById('selfreg-mode-status').textContent = mi.mode === 'online' ? t('srOnlineOn')(mi.joinUrl || '') : t('srWifiOn');
}
document.querySelectorAll('input[name="selfreg-mode"]').forEach(r => r.addEventListener('change', async () => {
  const st = document.getElementById('selfreg-mode-status'); st.textContent = '…';
  const res = await window.api.selfregSetMode(r.value);
  if (!res || !res.ok) { st.textContent = res && res.error === 'need_license' ? t('srNeedLicense') : res && res.error === 'license_inactive' ? t('errLicenseInactive') : errText((res && res.error) || 'failed'); }
  await loadSelfregMode(); loadSelfregQrCodes();
}));
document.querySelectorAll('[data-modal="settings-modal-selfreg"]').forEach(b => b.addEventListener('click', () => setTimeout(loadSelfregMode, 60)));

// ===================== Pro: общая база точек =====================
let syncSt = null;
function syncAgo(iso) {
  if (!iso) return t('syncNever');
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? t('syncJustNow') : m < 60 ? t('syncMinAgo')(m) : new Date(iso).toLocaleString(getLang() === 'en' ? 'en-GB' : getLang(), { dateStyle: 'short', timeStyle: 'short' });
}
const syncErrText = (code) => { const k = 'syncErr_' + code; const v = t(k); return v && v !== k ? v : t('syncErr_other'); };
function renderSyncChip() {
  const el = document.getElementById('sync-chip'); const s = syncSt;
  if (!s || !s.enabled) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.className = 'sync-chip ' + (s.lastError ? 'err' : s.pending ? 'wait' : 'ok');
  el.textContent = s.busy ? '☁️ ' + t('syncBusy') : s.lastError ? '⚠️ ' + t('syncChipErr') : s.pending ? '⏳ ' + t('syncChipPending')(s.pending) : '☁️ ' + t('syncChipOk')(syncAgo(s.lastOk));
  el.title = s.lastError ? syncErrText(s.lastError) : '';
}
const syncBodyEl = () => document.getElementById('net-sync') || document.getElementById('lx-sync-body');
const syncShown = () => document.getElementById('lx-sync').style.display === 'flex' || (document.getElementById('lx-net').style.display === 'flex' && !!document.getElementById('net-sync'));
async function refreshSync() { try { syncSt = await window.api.syncStatus(); } catch (e) { return; } renderSyncChip(); if (syncShown()) renderSyncModal(); }
window.api.onSyncStatus((e, st) => { syncSt = st; renderSyncChip(); if (syncShown()) renderSyncModal(); });
setInterval(refreshSync, 30000); setTimeout(refreshSync, 1500);
document.getElementById('sync-chip').addEventListener('click', () => { openNetModal(); });
document.getElementById('tile-sync').addEventListener('click', () => openNetModal());
async function openSyncModal() { openNetModal(); }
function renderSyncModal() {
  const s = syncSt || {}; const body = syncBodyEl(); if (!body) return;
  const how = `<ul class="sync-how">${['syncHow1', 'syncHow2', 'syncHow3'].map(k => `<li>${escapeHtml(t(k))}</li>`).join('')}</ul>`;
  if (s.tier === 'free' && !s.enabled) {
    body.innerHTML = `<p>${escapeHtml(t('syncIntro'))}</p>${how}<div class="lx-actions" style="justify-content:flex-start"><button type="button" id="sync-pro">${escapeHtml(t('netNeedSub'))}</button></div>`;
    document.getElementById('sync-pro').addEventListener('click', () => { lxClose('lx-sync'); lxClose('lx-net'); showProRequired('sync'); });
    return;
  }
  if (!s.connected) {
    body.innerHTML = `<p>${escapeHtml(t('syncIntro'))}</p>${how}<div id="sync-err" class="lx-err"></div><div class="lx-actions" style="justify-content:flex-start"><button type="button" id="sync-connect">${escapeHtml(t('syncConnect'))}</button></div>`;
    document.getElementById('sync-connect').addEventListener('click', async (ev) => {
      ev.target.disabled = true; ev.target.textContent = t('syncBusy');
      const r = await connectSharedBase();
      if (r && !r.ok && !r.cancel) { const el = document.getElementById('sync-err'); if (el) el.textContent = syncErrText((r && r.error) || 'other'); }
      if (document.getElementById('lx-net').style.display === 'flex') renderNet(false); else refreshSync();
    });
    return;
  }
  const line = (k, v, cls) => `<div class="sync-line ${cls || ''}"><span>${escapeHtml(k)}</span><b>${escapeHtml(String(v))}</b></div>`;
  body.innerHTML = `<div class="sync-lines">${line(t('syncThis'), s.deviceName || '—')}${line(t('syncLast'), syncAgo(s.lastOk))}${line(t('syncPending'), s.pending, s.pending ? 'wait' : '')}${s.lastError ? line(t('syncProblem'), syncErrText(s.lastError), 'err') : ''}</div>
    <p class="hint">${escapeHtml(t('syncAuto'))}</p>
    <div class="lx-actions" style="justify-content:flex-start"><button type="button" id="sync-now" ${s.busy ? 'disabled' : ''}>${escapeHtml(s.busy ? t('syncBusy') : t('syncNow'))}</button><button type="button" class="btn-secondary" id="sync-devs">${escapeHtml(t('syncDevices'))}</button><button type="button" class="btn-secondary" id="sync-off">${escapeHtml(t('syncDisconnect'))}</button></div>
    <div id="sync-dev-list" class="lx-list"></div>`;
  document.getElementById('sync-now').addEventListener('click', async () => { await window.api.syncNow(); refreshSync(); refreshClients(); refreshDashboard(); });
  document.getElementById('sync-off').addEventListener('click', async () => { if (await uiConfirm(t('syncDisconnectConfirm'))) { await window.api.syncDisconnect(); refreshSync(); } });
  document.getElementById('sync-devs').addEventListener('click', async () => {
    const r = await window.api.syncDevices(); const el = document.getElementById('sync-dev-list');
    if (!r || !r.ok) { el.innerHTML = `<div class="lx-err">${escapeHtml(syncErrText((r && r.error) || 'other'))}</div>`; return; }
    el.innerHTML = r.devices.filter(d => !d.revoked).map(d => `<div class="lx-row"><div><b>${escapeHtml(d.name || '—')}${d.me ? ' · ' + escapeHtml(t('syncThisMark')) : ''}</b><small>${escapeHtml(t('syncSeen')(syncAgo(d.lastSeen)))}</small></div>${d.me ? '' : `<button type="button" class="btn-secondary sync-rv" data-id="${escapeHtml(d.id)}">${escapeHtml(t('syncRevoke'))}</button>`}</div>`).join('');
    el.querySelectorAll('.sync-rv').forEach(b => b.addEventListener('click', async () => { if (await uiConfirm(t('syncRevokeConfirm'), { danger: true })) { await window.api.syncRevoke(b.dataset.id); document.getElementById('sync-devs').click(); } }));
  });
}

// ===================== 2.17: сеть точек =====================
// Выбор из нескольких вариантов (крупные кнопки, как при выборе канала отправки).
function chooseDialog({ title, text, options, icon }) {
  return new Promise((resolve) => {
    let m = document.getElementById('lx-choose');
    if (!m) { m = document.createElement('div'); m.id = 'lx-choose'; m.className = 'lx-modal'; m.style.display = 'none'; document.body.appendChild(m); }
    m.innerHTML = `<div class="lx-box ch-dialog"><div class="lx-head"><b>${icon ? icon + ' ' : ''}${escapeHtml(title || '')}</b><button type="button" class="lx-close" id="choose-x">✕</button></div>
      ${text ? `<p class="choose-text">${escapeHtml(text)}</p>` : ''}<div class="ch-list">${options.map(o => `<button type="button" class="ch-opt${o.main ? ' ch-main' : ''}" data-k="${escapeHtml(o.k)}"><span class="ch-ic">${o.icon || ''}</span><span class="ch-t">${escapeHtml(o.label)}${o.desc ? `<small>${escapeHtml(o.desc)}</small>` : ''}</span></button>`).join('')}</div></div>`;
    const done = (v) => { m.style.display = 'none'; resolve(v); };
    m.querySelectorAll('.ch-opt').forEach(b => b.addEventListener('click', () => done(b.dataset.k)));
    document.getElementById('choose-x').addEventListener('click', () => done(null));
    m.style.display = 'flex';
  });
}
// Подключить общую базу: если и у организации, и здесь уже есть клиенты — спрашиваем, как поступить.
async function connectSharedBase() {
  const info = await window.api.pointsInfo();
  const r = await window.api.syncConnect(info.deviceName);
  if (r && r.needChoice) {
    const k = await chooseDialog({ icon: '☁️', title: t('netChoiceTitle'), text: t('netChoiceText'), options: [
      { k: 'merge', icon: '🔗', label: t('netChoiceMerge'), desc: t('netChoiceMergeD'), main: true },
      { k: 'replace', icon: '⬇️', label: t('netChoiceReplace'), desc: t('netChoiceReplaceD') },
      { k: 'cancel', icon: '✕', label: t('netChoiceCancel'), desc: t('netChoiceCancelD') }] });
    let r2;
    if (k === 'merge') r2 = await window.api.syncMergeLocal();
    else if (k === 'replace') r2 = await window.api.syncReplaceLocal();
    else { await window.api.syncDisconnect(); refreshSync(); return { cancel: true }; }
    refreshSync(); refreshClients(); refreshDashboard();
    if (r2 && r2.ok) { uiAlert(k === 'merge' ? t('netMerged')(r2.adopted || 0) : t('syncDownloaded')); return { ok: true }; }
    return r2 || { error: 'other' };
  }
  refreshSync();
  if (r && r.ok) { refreshClients(); refreshDashboard(); uiAlert(r.mode === 'uploaded' ? t('syncUploaded') : t('syncDownloaded')); }
  return r;
}

let netInfo = null, netRemote = null;
async function openNetModal() { lxOpen('lx-net'); await renderNet(true); }
document.getElementById('btn-team-open-net').addEventListener('click', () => { closeSettingsModals(); openNetModal(); });
function agoText(iso) {
  if (!iso) return '—';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? t('syncJustNow') : m < 60 ? t('syncMinAgo')(m) : m < 1440 ? t('netHoursAgo')(Math.round(m / 60)) : new Date(iso).toLocaleDateString(getLang() === 'en' ? 'en-GB' : getLang());
}
// Все известные точки: с сервера (их сводки) + точки этой базы.
function mergedPoints(info, remote) {
  const out = new Map();
  ((remote && remote.points) || []).forEach(p => out.set(p.point.toLowerCase(), { name: p.point, remote: p }));
  (info.locations || []).forEach(l => { const k = l.name.toLowerCase(); const o = out.get(k) || { name: l.name }; o.local = l; out.set(k, o); });
  return [...out.values()];
}
async function renderNet(fetchRemote) {
  const body = document.getElementById('lx-net-body');
  netInfo = await window.api.pointsInfo();
  syncSt = await window.api.syncStatus().catch(() => syncSt);
  const i = netInfo;
  if (!i.licensed) {
    body.innerHTML = `<div class="net-intro"><div class="net-big">🏪</div><p>${escapeHtml(t('netIntro'))}</p><ul class="sync-how">${['netWhy1', 'netWhy2', 'netWhy3'].map(k => `<li>${escapeHtml(t(k))}</li>`).join('')}</ul></div>
      <div class="lx-actions"><button type="button" id="net-sub">${escapeHtml(t('netNeedSub'))}</button></div>`;
    document.getElementById('net-sub').addEventListener('click', () => { lxClose('lx-net'); showProRequired('sync'); });
    return;
  }
  if (fetchRemote) { body.innerHTML = `<p class="hint">…</p>`; netRemote = await window.api.pointsRemote().catch(() => null); }
  const rem = netRemote && netRemote.ok ? netRemote : (netRemote && netRemote.cached) || null;
  const pts = mergedPoints(i, rem);
  const limit = (rem && rem.limit) || i.limit;
  const meName = i.me ? i.me.name : '';
  const sec = (ic, title, inner, extra = '') => `<section class="net-sec ${extra}"><div class="net-sec-h"><span>${ic}</span><b>${escapeHtml(title)}</b></div>${inner}</section>`;
  const meCard = `<div class="net-me"><div class="net-me-row"><div><small>${escapeHtml(t('netThisPoint'))}</small><b>${escapeHtml(meName || t('netNoPoint'))}</b></div><button type="button" class="btn-secondary" id="net-point-change">${escapeHtml(meName ? t('netChange') : t('netChoose'))}</button></div>
    <div class="net-me-row"><div><small>${escapeHtml(t('netDeviceName'))}</small><b>${escapeHtml(i.deviceName)}</b></div><button type="button" class="btn-secondary" id="net-dev-rename">${escapeHtml(t('netRename'))}</button></div></div>`;
  const cur = (v) => moneyFmt(v || 0);
  const rows = pts.map(p => {
    const k = p.remote && p.remote.stats && p.remote.stats.kpi;
    const isMe = meName && p.name.toLowerCase() === meName.toLowerCase();
    const badge = isMe ? `<span class="net-badge me">${escapeHtml(t('netBadgeMe'))}</span>` : '';
    const base = p.remote ? `<span class="net-badge">${escapeHtml(p.remote.shared ? t('netBadgeShared') : t('netBadgeOwn'))}</span>` : `<span class="net-badge dim">${escapeHtml(t('netBadgeLocal'))}</span>`;
    const nums = k ? `<span class="net-nums"><b>${k.scansMonth || 0}</b> ${escapeHtml(t('netVisitsMonth'))} · <b>${cur(k.revenueMonth)}</b> · ${escapeHtml(t('netClientsN')(k.clients || 0))}</span>` : `<span class="net-nums dim">${escapeHtml(t('netNoStats'))}</span>`;
    const devs = p.remote ? `<small>${escapeHtml(t('netDevicesN')(p.remote.devices.length))} · ${escapeHtml(t('netUpdated'))} ${escapeHtml(agoText(p.remote.updated))}</small>` : '';
    return `<div class="net-pt${isMe ? ' is-me' : ''}"><div class="net-pt-main"><div class="net-pt-name">📍 ${escapeHtml(p.name)} ${badge}${base}</div>${nums}${devs}</div></div>`;
  }).join('') || `<p class="hint">${escapeHtml(t('netNoPoints'))}</p>`;
  const used = pts.length;
  const remErr = netRemote && !netRemote.ok ? `<p class="hint net-warn">${escapeHtml(netRemote.error === 'network' ? t('netOffline') : netRemote.error === 'not_ready' ? t('netServerNotReady') : t('netRemoteErr'))}</p>` : '';
  const pointsSec = `<div class="net-limit"><span>${escapeHtml(t('netLimit')(used, limit))}</span><i><b style="width:${Math.min(100, Math.round(used / Math.max(1, limit) * 100))}%"></b></i></div>${remErr}<div class="net-pts">${rows}</div>
    <p class="hint">${escapeHtml(t('netAddHow'))}</p>${used >= limit ? `<p class="hint net-warn">${escapeHtml(t('netLimitReached'))}</p>` : ''}`;
  const statsSec = `<label class="segment-check"><input type="checkbox" id="net-all-default" ${i.allDefault ? 'checked' : ''} ${i.shared ? '' : 'disabled'}> <span>${escapeHtml(t('netAllDefault'))}</span></label><p class="hint">${escapeHtml(i.shared ? t('netAllDefaultHint') : t('netAllDefaultOff'))}</p>`;
  body.innerHTML = sec('📍', t('netSecMe'), meCard)
    + sec('☁️', t('netSecBase'), `<div id="net-sync"></div>`)
    + sec('🏪', t('netSecPoints'), pointsSec)
    + sec('📊', t('netSecStats'), statsSec)
    + sec('🤖', t('netSecBot'), `<div id="net-bot"><p class="hint">…</p></div>`);
  renderSyncModal();
  document.getElementById('net-point-change').addEventListener('click', () => pickPointDialog(pts, meName));
  document.getElementById('net-dev-rename').addEventListener('click', async () => {
    const v = await uiPrompt(t('netDeviceNameAsk'), i.deviceName);
    if (v === null || v === false || v === undefined) return;
    await window.api.pointsSetDeviceName(String(v).trim()); renderNet(false);
  });
  const ad = document.getElementById('net-all-default');
  if (ad) ad.addEventListener('change', async () => { await window.api.pointsSetAllDefault(ad.checked); refreshDashboard(); });
  renderNetBot();
}
async function pickPointDialog(pts, meName) {
  const known = pts.map(p => p.name).filter(n => n.toLowerCase() !== String(meName || '').toLowerCase());
  const opts = known.map(n => ({ k: 'p:' + n, icon: '📍', label: n, desc: t('netPickExisting') }));
  opts.push({ k: 'new', icon: '➕', label: t('netPickNew'), desc: t('netPickNewD'), main: !known.length });
  const k = await chooseDialog({ icon: '📍', title: t('netPickTitle'), text: t('netPickText'), options: opts });
  if (!k) return;
  let name = k.startsWith('p:') ? k.slice(2) : null;
  if (k === 'new') { const v = await uiPrompt(t('netPickNewAsk'), ''); if (!v) return; name = String(v).trim(); }
  if (!name) return;
  const r = await window.api.pointsSetMine(name);
  if (r && r.error === 'points_limit') { uiAlert(t('netLimitErr')(r.limit)); return; }
  renderNet(false); refreshDashboard();
}
async function renderNetBot() {
  const el = document.getElementById('net-bot'); if (!el) return;
  const i = netInfo || await window.api.pointsInfo();
  const bi = await window.api.pointsBotInfo().catch(() => null);
  if (!document.getElementById('net-bot')) return;
  let h = '';
  if (i.bot.has) h += `<p>${escapeHtml(i.bot.sharedFrom ? t('netBotFrom')('@' + i.bot.username, i.bot.sharedFrom) : t('netBotOwn')('@' + i.bot.username))}</p>`;
  else h += `<p class="hint">${escapeHtml(t('netBotNone'))}</p>`;
  const btns = [];
  if (bi && bi.ok && bi.available && !bi.same) btns.push(`<button type="button" id="net-bot-pull">${escapeHtml(t('netBotPull')('@' + bi.username, bi.owner || '—'))}</button>`);
  if (i.bot.has && !i.bot.sharedFrom && i.shared && bi && bi.ok && !bi.available) btns.push(`<button type="button" class="btn-secondary" id="net-bot-share">${escapeHtml(t('netBotShare'))}</button>`);
  if (btns.length) h += `<div class="lx-actions" style="justify-content:flex-start;flex-wrap:wrap">${btns.join('')}</div>`;
  if (i.bot.has && (i.bot.sharedFrom || (bi && bi.available && bi.same))) h += `<label class="segment-check"><input type="checkbox" id="net-bot-poll" ${i.bot.poll ? 'checked' : ''}> <span>${escapeHtml(t('netBotPoll'))}</span></label><p class="hint">${escapeHtml(t('netBotPollHint'))}</p>`;
  if (!i.shared) h += `<p class="hint">${escapeHtml(t('netBotNeedShared'))}</p>`;
  if (bi && !bi.ok && bi.error !== 'no_key') h += `<p class="hint net-warn">${escapeHtml(bi.error === 'network' ? t('netOffline') : bi.error === 'not_ready' ? t('netServerNotReady') : t('netRemoteErr'))}</p>`;
  el.innerHTML = h;
  const pull = document.getElementById('net-bot-pull');
  if (pull) pull.addEventListener('click', async () => {
    if (i.bot.has && !await uiConfirm(t('netBotReplaceAsk')('@' + i.bot.username))) return;
    pull.disabled = true;
    const r = await window.api.pointsBotPull();
    if (r && r.ok) { uiAlert(t('netBotPulled')('@' + r.username)); renderNet(false); refreshClients(); }
    else { pull.disabled = false; uiAlert(r && r.error === 'bot_invalid' ? t('netBotInvalid') : t('netRemoteErr')); }
  });
  const share = document.getElementById('net-bot-share');
  if (share) share.addEventListener('click', async () => { const r = await window.api.pointsBotShare(); uiAlert(r && r.ok ? t('netBotShared') : t('netRemoteErr')); renderNetBot(); });
  const poll = document.getElementById('net-bot-poll');
  if (poll) poll.addEventListener('change', async () => { netInfo = await window.api.pointsBotPoll(poll.checked); });
}

// ---------- мастер «Ключ уже работает на другом устройстве» ----------
let jw = null;
async function maybeOfferJoin(force) {
  let i; try { i = await window.api.pointsInfo(); } catch (e) { return; }
  if (!i.licensed) return;
  const need = !i.joinAsked && ((i.others > 0 && !i.connected) || (!i.me && (i.others > 0 || i.connected)));
  if (need || force) openJoin(i);
}
function openJoin(i) {
  jw = { step: i.connected ? 'point' : 'merge', info: i, merge: i.connected ? true : null, point: i.me ? i.me.name : '', bot: null, remote: null, botInfo: null, err: '' };
  lxOpen('lx-join'); renderJoin();
  window.api.pointsRemote().then(r => { if (!jw) return; jw.remote = r && r.ok ? r : null; if (jw.step === 'point') renderJoin(); }).catch(() => {});
  window.api.pointsBotInfo().then(b => { if (jw) jw.botInfo = b && b.ok ? b : null; }).catch(() => {});
}
document.getElementById('join-close').addEventListener('click', async () => { lxClose('lx-join'); await window.api.pointsMarkAsked(); jw = null; });
function joinSteps() { return ['merge', 'point'].concat(jw.merge && jw.botInfo && jw.botInfo.available && !jw.botInfo.same ? ['bot'] : []).concat(['done']); }
function renderJoin() {
  const body = document.getElementById('lx-join-body');
  const steps = joinSteps(); const idx = Math.max(0, steps.indexOf(jw.step));
  document.getElementById('join-bar').style.width = Math.round((idx + 1) / steps.length * 100) + '%';
  const tile = (k, ic, title, desc, on) => `<button type="button" class="ws-tile ${on ? 'active' : ''}" data-k="${k}"><span class="ws-ic">${ic}</span><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></button>`;
  const nav = (back, next, nextLabel) => `<div class="lx-actions ws-nav">${back ? `<button type="button" class="btn-secondary" id="jw-back">${escapeHtml(t('wsBack'))}</button>` : ''}<button type="button" id="jw-next" ${next ? '' : 'disabled'}>${escapeHtml(nextLabel || t('wsNext'))}</button></div>`;
  if (jw.step === 'merge') {
    document.getElementById('join-title').textContent = t('joinTitle');
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('joinQMerge')(jw.info.others))}</p><div class="ws-tiles join-tiles">${tile('yes', '🔗', t('joinMergeYes'), t('joinMergeYesD'), jw.merge === true)}${tile('no', '🗂️', t('joinMergeNo'), t('joinMergeNoD'), jw.merge === false)}</div><p class="hint">${escapeHtml(t('joinMergeHint'))}</p>${nav(false, jw.merge !== null)}`;
    body.querySelectorAll('.ws-tile').forEach(b => b.addEventListener('click', () => { jw.merge = b.dataset.k === 'yes'; renderJoin(); }));
  } else if (jw.step === 'point') {
    document.getElementById('join-title').textContent = t('joinTitlePoint');
    const names = ((jw.remote && jw.remote.points) || []).map(p => p.point);
    (jw.info.locations || []).forEach(l => { if (!names.some(n => n.toLowerCase() === l.name.toLowerCase())) names.push(l.name); });
    const isNew = jw.point && !names.some(n => n.toLowerCase() === jw.point.toLowerCase());
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('joinQPoint'))}</p><p class="hint">${escapeHtml(jw.merge ? t('joinPointHintShared') : t('joinPointHintOwn'))}</p>
      <div class="join-points">${names.map(n => `<button type="button" class="join-pt ${jw.point.toLowerCase() === n.toLowerCase() ? 'active' : ''}" data-n="${escapeHtml(n)}">📍 ${escapeHtml(n)}<small>${escapeHtml(t('joinSamePoint'))}</small></button>`).join('')}</div>
      <label class="ws-field">${escapeHtml(t('joinNewPoint'))}<input type="text" id="jw-new" maxlength="60" placeholder="${escapeHtml(t('joinNewPointPh'))}" value="${isNew ? escapeHtml(jw.point) : ''}"></label>
      <div class="lx-err" id="jw-err">${escapeHtml(jw.err || '')}</div>${nav(!jw.info.connected, !!jw.point)}`;
    body.querySelectorAll('.join-pt').forEach(b => b.addEventListener('click', () => { jw.point = b.dataset.n; jw.err = ''; renderJoin(); }));
    const inp = document.getElementById('jw-new');
    inp.addEventListener('input', () => { jw.point = inp.value.trim(); body.querySelectorAll('.join-pt').forEach(x => x.classList.remove('active')); document.getElementById('jw-next').disabled = !jw.point; });
  } else if (jw.step === 'bot') {
    document.getElementById('join-title').textContent = t('joinTitleBot');
    const b = jw.botInfo;
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('joinQBot')('@' + b.username, b.owner || '—'))}</p><div class="ws-tiles join-tiles">${tile('yes', '🤝', t('joinBotYes'), t('joinBotYesD'), jw.bot === true)}${tile('no', '🤖', t('joinBotNo'), t('joinBotNoD'), jw.bot === false)}</div>${nav(true, jw.bot !== null, t('joinFinish'))}`;
    body.querySelectorAll('.ws-tile').forEach(x => x.addEventListener('click', () => { jw.bot = x.dataset.k === 'yes'; renderJoin(); }));
  } else if (jw.step === 'busy') {
    body.innerHTML = `<div class="ws-done"><div class="ws-big">⏳</div><p class="ws-q">${escapeHtml(t('joinBusy'))}</p></div>`;
  } else {
    document.getElementById('join-title').textContent = t('joinDoneTitle');
    body.innerHTML = `<div class="ws-done"><div class="ws-big">🎉</div><ul class="ws-next">${(jw.summary || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div><div class="lx-actions"><button type="button" class="btn-secondary" id="jw-net">${escapeHtml(t('joinOpenNet'))}</button><button type="button" id="jw-ok">${escapeHtml(t('wsFinish'))}</button></div>`;
    document.getElementById('jw-ok').addEventListener('click', () => { lxClose('lx-join'); jw = null; });
    document.getElementById('jw-net').addEventListener('click', () => { lxClose('lx-join'); jw = null; openNetModal(); });
    return;
  }
  const back = document.getElementById('jw-back');
  if (back) back.addEventListener('click', () => { const st = joinSteps(); jw.step = st[Math.max(0, st.indexOf(jw.step) - 1)]; renderJoin(); });
  const next = document.getElementById('jw-next');
  if (next) next.addEventListener('click', async () => {
    const st = joinSteps(); const nx = st[st.indexOf(jw.step) + 1];
    if (jw.step === 'point') {
      const r = await window.api.pointsSetMine(jw.point);
      if (r && r.error === 'points_limit') { jw.err = t('netLimitErr')(r.limit); renderJoin(); return; }
      if (r && r.error) { jw.err = t('netRemoteErr'); renderJoin(); return; }
    }
    if (nx === 'done') { await joinFinish(); return; }
    jw.step = nx; renderJoin();
  });
}
async function joinFinish() {
  jw.step = 'busy'; renderJoin();
  const sum = [t('joinSumPoint')(jw.point)];
  if (jw.merge && !jw.info.connected) {
    const r = await connectSharedBase();
    if (r && r.ok) sum.push(t('joinSumShared'));
    else if (r && r.cancel) sum.push(t('joinSumOwn'));
    else sum.push(t('joinSumSharedErr')(syncErrText((r && r.error) || 'other')));
  } else if (jw.merge) sum.push(t('joinSumShared'));
  else sum.push(t('joinSumOwn'));
  if (jw.bot) { const b = await window.api.pointsBotPull(); sum.push(b && b.ok ? t('netBotPulled')('@' + b.username) : t('netBotInvalid')); }
  await window.api.pointsMarkAsked();
  sum.push(t('joinSumStats'));
  jw.summary = sum; jw.step = 'done'; renderJoin();
  window.api.pointsPushNow().catch(() => {});
  refreshClients(); refreshDashboard(); refreshSync();
}
setTimeout(() => maybeOfferJoin(false), 6000);

// ---------- Главная: переключатель точек ----------
let pbSel = '';               // 'r:all' / 'r:<имя>' — показываем сводку с сервера (база другой точки отдельная)
let pbRemote = null, pbRemoteAt = 0, pbBusy = false;
async function refreshPointBar() {
  const bar = document.getElementById('point-bar'); if (!bar) return;
  let i; try { i = await window.api.pointsInfo(); } catch (e) { return; }
  if (i.licensed && (i.others > 0 || i.connected) && Date.now() - pbRemoteAt > 5 * 60000 && !pbBusy) {
    pbBusy = true;
    window.api.pointsRemote().then(r => { pbRemote = r && r.ok ? r : (r && r.cached) || pbRemote; pbRemoteAt = Date.now(); pbBusy = false; refreshPointBar(); }).catch(() => { pbBusy = false; });
  }
  const meId = i.me ? i.me.id : null, meName = i.me ? i.me.name : '';
  const chips = [];
  const remotePts = ((pbRemote && pbRemote.points) || []).filter(p => !meName || p.point.toLowerCase() !== meName.toLowerCase());
  const localNames = new Set((i.locations || []).map(l => l.name.toLowerCase()));
  if (i.shared) {
    chips.push({ sel: 'point', label: '📍 ' + (meName || t('pbThis')) });
    chips.push({ sel: 'all', label: '🏪 ' + t('pbAll') });
    (i.locations || []).filter(l => l.id !== meId).forEach(l => chips.push({ sel: String(l.id), label: l.name }));
    remotePts.filter(p => !localNames.has(p.point.toLowerCase())).forEach(p => chips.push({ sel: 'r:' + p.point, label: p.point, remote: true }));
  } else {
    if ((i.locations || []).length > 1) {
      chips.push({ sel: 'all', label: '🏠 ' + t('pbThisBase') });
      (i.locations || []).forEach(l => chips.push({ sel: String(l.id), label: (l.id === meId ? '📍 ' : '') + l.name }));
    } else chips.push({ sel: '', label: '📍 ' + (meName || t('pbThis')) });
    if (remotePts.length) {
      chips.push({ sel: 'r:all', label: '🏪 ' + t('pbAll'), remote: true });
      remotePts.forEach(p => chips.push({ sel: 'r:' + p.point, label: p.point, remote: true }));
    }
  }
  if (chips.length < 2 || (!features.network && !i.shared && !(i.others > 0))) { bar.style.display = 'none'; if (pbSel) { pbSel = ''; showRemotePanel(false); } return; }
  let active = pbSel;
  if (!active) active = i.view || (i.shared ? (i.allDefault ? 'all' : 'point') : ((i.locations || []).length > 1 ? 'all' : ''));
  if (i.shared && active === 'point' && !meId) active = 'all';
  bar.innerHTML = `<span class="pb-label">${escapeHtml(t('pbLabel'))}</span><div class="pb-chips">${chips.map(c => `<button type="button" class="pb-chip${c.sel === active ? ' active' : ''}${c.remote ? ' remote' : ''}" data-sel="${escapeHtml(c.sel)}">${escapeHtml(c.label)}</button>`).join('')}</div><button type="button" class="pb-net" id="pb-net" title="${escapeHtml(t('netTitle'))}">⚙️</button>`;
  bar.style.display = '';
  bar.querySelectorAll('.pb-chip').forEach(b => b.addEventListener('click', async () => {
    const sel = b.dataset.sel;
    if (sel.startsWith('r:')) { pbSel = sel; refreshPointBar(); showRemotePanel(true); return; }
    pbSel = ''; showRemotePanel(false);
    await window.api.pointsSetView(sel);
    refreshDashboard();
  }));
  document.getElementById('pb-net').addEventListener('click', () => openNetModal());
  if (pbSel) showRemotePanel(true);
}
function showRemotePanel(on) {
  const panel = document.getElementById('point-remote'), grid = document.getElementById('dashboard-grid'), hs = document.getElementById('home-start');
  if (!on) { panel.style.display = 'none'; grid.style.display = ''; if (hs) hs.classList.remove('pb-hidden'); return; }
  const all = pbSel === 'r:all';
  const name = all ? t('pbAll') : pbSel.slice(2);
  const p = all ? null : ((pbRemote && pbRemote.points) || []).find(x => x.point === name);
  const st = all ? (pbRemote && pbRemote.total) : (p && p.stats);
  grid.style.display = 'none'; if (hs) hs.classList.add('pb-hidden');
  panel.style.display = '';
  if (!st) { panel.innerHTML = `<div class="pr-empty">${escapeHtml(t('pbNoData'))}</div>`; return; }
  const k = st.kpi || {};
  const tile = (v, l, ic) => `<div class="pr-tile"><span class="pr-ic">${ic}</span><b>${escapeHtml(String(v))}</b><small>${escapeHtml(l)}</small></div>`;
  const days = (st.days || []).slice(-14); const dmax = Math.max(1, ...days.map(d => d.n || 0));
  const months = (st.months || []).slice(-6); const mmax = Math.max(1, ...months.map(m => m.r || 0));
  const rows = all ? ((pbRemote && pbRemote.points) || []).map(x => { const q = (x.stats && x.stats.kpi) || {}; return `<tr><td>📍 ${escapeHtml(x.point)}<small>${escapeHtml(x.shared ? t('netBadgeShared') : t('netBadgeOwn'))} · ${escapeHtml(agoText(x.updated))}</small></td><td>${q.scansToday || 0}</td><td>${q.scansMonth || 0}</td><td>${moneyFmt(q.revenueMonth || 0)}</td><td>${q.clients || 0}</td></tr>`; }).join('') : '';
  panel.innerHTML = `<div class="pr-head"><div><b>${all ? '🏪' : '📍'} ${escapeHtml(name)}</b><small>${escapeHtml(all ? t('pbRemoteAllHint') : t('pbRemoteHint')(agoText(p && p.updated)))}</small></div><button type="button" class="btn-secondary" id="pr-back">${escapeHtml(t('pbBack'))}</button></div>
    <div class="pr-tiles">${tile(k.clients || 0, t('pbClients'), '👥')}${tile(k.scansToday || 0, t('pbToday'), '☕')}${tile(k.scansMonth || 0, t('pbMonth'), '📅')}${tile(k.newMonth || 0, t('pbNew'), '✨')}${tile(moneyFmt(k.revenueMonth || 0), t('pbRevenue'), '💶')}${tile(moneyFmt(k.avgCheck || 0), t('pbAvg'), '🧾')}${tile(k.rewardsMonth || 0, t('pbRewards'), '🎁')}${tile(k.active30 || 0, t('pbActive'), '🔥')}</div>
    <div class="pr-two"><div class="pr-box"><h3>${escapeHtml(t('pbDays'))}</h3><div class="pr-cols">${days.map(d => `<div title="${escapeHtml(d.d)}: ${d.n || 0}"><i style="height:${Math.round((d.n || 0) / dmax * 100)}%"></i><span>${escapeHtml(String(d.d).slice(8))}</span></div>`).join('')}</div></div>
    <div class="pr-box"><h3>${escapeHtml(t('pbMonths'))}</h3>${months.map(m => `<div class="pr-bar"><span>${escapeHtml(m.m)}</span><i><b style="width:${Math.round((m.r || 0) / mmax * 100)}%"></b></i><em>${moneyFmt(m.r || 0)}</em></div>`).join('') || '—'}</div></div>
    ${all ? `<div class="pr-box"><h3>${escapeHtml(t('pbCompare'))}</h3><div class="pr-tablewrap"><table class="pr-table"><tr><th>${escapeHtml(t('pbPoint'))}</th><th>${escapeHtml(t('pbToday'))}</th><th>${escapeHtml(t('pbMonth'))}</th><th>${escapeHtml(t('pbRevenue'))}</th><th>${escapeHtml(t('pbClients'))}</th></tr>${rows}</table></div></div>` : ''}
    ${!all && (st.top || []).length ? `<div class="pr-box"><h3>${escapeHtml(t('pbTop'))}</h3>${st.top.map((c, n) => `<div class="pr-row"><span>${n + 1}. ${escapeHtml(c.n)}</span><b>${c.v}</b></div>`).join('')}</div>` : ''}`;
  document.getElementById('pr-back').addEventListener('click', () => { pbSel = ''; showRemotePanel(false); refreshPointBar(); });
}

// ===================== «Первые шаги за 5 минут» =====================
// Продолжает знакомство (язык, вид бизнеса, название, цвета): карта → правило → импорт → QR → первый клиент и скан.
const WS_STEPS = ['brand', 'card', 'rule', 'import', 'qr', 'first', 'done'];
// ---------- 2.18: готовые программы лояльности по виду бизнеса ----------
const PROGRAM_GROUP = { coffee: 'food', bakery: 'food', sushi: 'food', pizza: 'food', barber: 'service', nails: 'service', spa: 'service', tattoo: 'service', fitness: 'service', petgroom: 'service', photo: 'service', grocery: 'retail', clothing: 'retail', travel: 'retail', other: 'retail' };
// Суммы в валюте заведения: 50 € ≈ 1250 Kč ≈ 2000 ₴ — круглые числа, а не курс до цента.
const CUR_SCALE = { EUR: 1, USD: 1, GBP: 1, CHF: 1, CZK: 25, PLN: 4, HUF: 400, UAH: 40, RUB: 100, RON: 5, BGN: 2, SEK: 10, NOK: 10, DKK: 7.5 };
function roundNice(v) { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); return Math.max(1, Math.round(v / p) * p); }
function programPresets(nicheId) {
  const g = PROGRAM_GROUP[nicheId] || 'retail';
  const k = CUR_SCALE[currentSpendCurrency] || 1;
  const money = (v) => moneyFmt(roundNice(v * k));
  const rewardFood = t('tplRewardFood_' + nicheId) !== 'tplRewardFood_' + nicheId ? t('tplRewardFood_' + nicheId) : t('tplRewardGift');
  const stamp = (n, reward) => ({ ic: '☕', type: 'stamp', stampTarget: n, stampTitle: reward, title: t('tplStampT'), desc: t('tplStampD')(n, reward) });
  const spend = (amt, pts, bonusVal) => ({ ic: '⭐', type: 'spend', spendTarget: roundNice(amt * k), spendPoints: pts, spendTitle: t('tplBonusVal')(money(bonusVal)), title: t('tplSpendT'), desc: t('tplSpendD')(money(amt), pts, money(bonusVal)) });
  const disc = (p) => ({ ic: '%', type: 'discount', discount: p, title: t('tplDiscT'), desc: t('tplDiscD')(p) });
  if (g === 'food') return [stamp(nicheId === 'pizza' || nicheId === 'sushi' ? 8 : 9, rewardFood), spend(50, 1, 5), disc(5)];
  if (g === 'service') return [stamp(6, t('tplRewardService')), disc(10), spend(100, 1, 10)];
  return [spend(50, 1, 5), disc(5), stamp(10, t('tplRewardGift'))];
}
function applyProgramPreset(p) {
  ws.type = p.type;
  if (p.type === 'stamp') { ws.stampTarget = p.stampTarget; ws.stampTitle = p.stampTitle; }
  else if (p.type === 'discount') ws.discount = p.discount;
  else { ws.spendTarget = p.spendTarget; ws.spendPoints = p.spendPoints; ws.spendTitle = p.spendTitle; }
}
let ws = null;
async function openSetupWizard() {
  const s = await window.api.getSettings();
  const type = ['discount', 'spend'].includes(s.selfreg_card_type) ? s.selfreg_card_type : 'stamp';
  ws = { step: 0, type, stampTarget: Number(s.selfreg_stamp_target) || 10, stampTitle: s.selfreg_stamp_title || '', discount: Number(s.selfreg_discount_percent) || 5,
    spendTarget: Number(s.selfreg_spend_target) || 500, spendTitle: s.selfreg_spend_title || '', spendPoints: Number(s.selfreg_spend_points) || 1, client: null, scanned: null };
  renderSetup(); lxOpen('lx-setup');
}
async function closeSetup(finished, opts = {}) {
  lxClose('lx-setup');
  const s = await window.api.getSettings();
  await window.api.saveSettings({ ...s, setup_wizard_done: '1' });
  refreshDashboard();
  // Экскурсию не навязываем: коротко предлагаем, «Не сейчас» — больше не спрашиваем
  // (её всегда можно открыть в «Руководстве»).
  if (s.tour_seen !== '1' && !opts.noTour) {
    const yes = await uiDialog({ text: t('tourOffer'), okText: t('tourYes'), cancelText: t('tourLater'), icon: '🎉' });
    if (yes) showTour();
    else { const st = await window.api.getSettings(); await window.api.saveSettings({ ...st, tour_seen: '1' }); }
  }
}
document.getElementById('ws-close').addEventListener('click', () => closeSetup(false));
document.getElementById('tile-setup-wizard').addEventListener('click', () => openSetupWizard());
function wsNav(back, nextLabel, opts = {}) {
  return `<div class="lx-actions ws-nav">${back ? `<button type="button" class="btn-secondary" id="ws-back">${escapeHtml(t('wsBack'))}</button>` : ''}${opts.skip ? `<button type="button" class="btn-secondary" id="ws-skip">${escapeHtml(t('wsSkip'))}</button>` : ''}<button type="button" id="ws-next" ${opts.disabled ? 'disabled' : ''}>${escapeHtml(nextLabel || t('wsNext'))}</button></div>`;
}
async function saveWsRule() {
  const s = await window.api.getSettings();
  await window.api.saveSettings({ ...s, selfreg_card_type: ws.type, selfreg_stamp_target: String(ws.stampTarget), selfreg_stamp_title: ws.stampTitle,
    selfreg_discount_percent: String(ws.discount), selfreg_spend_target: String(ws.spendTarget), selfreg_spend_title: ws.spendTitle, selfreg_spend_points: String(ws.spendPoints || 1) });
}
function wsGo(d) { ws.step = Math.max(0, Math.min(WS_STEPS.length - 1, ws.step + d)); renderSetup(); }
// Живое превью карты клиента в мастере: цвет темы, логотип, название и правило награды.
function wsCardPreview(rewardFallback) {
  const niche = NichesModule.getNiche(currentNicheId) || {};
  const mark = currentBrandLogo ? `<img src="${currentBrandLogo}" alt="">` : escapeHtml(niche.emoji || '💛');
  let mid = '', foot = '';
  if (ws.type === 'discount') { mid = `<div class="wsc-big">−${Math.max(1, Math.min(90, Number(ws.discount) || 5))}%</div>`; foot = t('wsCard_discount'); }
  else if (ws.type === 'spend') {
    const target = Math.max(1, Number(ws.spendTarget) || 500), have = Math.round(target * 0.35);
    mid = `<div class="wsc-bar"><i style="width:35%"></i></div><div class="wsc-sum">${escapeHtml(fmtMoney(have))} / ${escapeHtml(fmtMoney(target))} ${escapeHtml(currencySymbol())}</div>`;
    foot = ws.spendTitle || rewardFallback || t('wsCard_spend');
  } else {
    const n = Math.max(2, Math.min(50, Number(ws.stampTarget) || 10)), shown = Math.min(n, 12);
    mid = `<div class="wsc-stamps">${Array.from({ length: shown }, (_, i) => `<i class="${i < 3 ? 'on' : ''}${i === shown - 1 ? ' gift' : ''}">${i < 3 ? '✓' : i === shown - 1 ? '🎁' : ''}</i>`).join('')}${n > shown ? `<em>+${n - shown}</em>` : ''}</div><div class="wsc-sum">3 / ${n}</div>`;
    foot = ws.stampTitle || rewardFallback || t('wsCard_stamp');
  }
  return `<div class="ws-cardpv" aria-hidden="true"><div class="wsc-top"><span class="wsc-mark">${mark}</span><b>${escapeHtml(currentBrandName || 'Loya')}</b><small>${escapeHtml(t('mailPvCardLabel'))}</small></div>
    ${mid}<div class="wsc-foot">🎁 ${escapeHtml(foot)}</div></div>`;
}
async function renderSetup() {
  const step = WS_STEPS[ws.step];
  document.getElementById('ws-title').textContent = t('wsTitle') + ' · ' + t('wsStepOf')(ws.step + 1, WS_STEPS.length);
  document.getElementById('ws-bar').style.width = Math.round((ws.step + 1) / WS_STEPS.length * 100) + '%';
  const body = document.getElementById('ws-body');
  const niche = NichesModule.getNiche(currentNicheId) || {};
  const lg = getLang();
  if (step === 'brand') {
    // 2.26: логотип и цвет — сразу видно, как будет выглядеть карта клиента.
    const st = await window.api.getSettings();
    const cur = st.theme_name || 'gold';
    const sw = ['glossy', 'gold', 'coffee', 'mint', 'ocean', 'berry', 'graphite', 'auto'].map(id => {
      const p = themePresetByName(id) || THEME_PRESETS.gold;
      const bg = id === 'auto' ? `linear-gradient(135deg, ${THEME_PRESETS.coffee.primary} 50%, ${THEME_PRESETS.gold.primary} 50%)` : `radial-gradient(circle at 35% 30%, ${p.primary} 0 46%, ${p.sidebar} 47%)`;
      const label = t(id === 'auto' ? 'themeAuto' : THEME_LABEL_KEYS[id]);
      return `<button type="button" class="ws-swatch${cur === id ? ' on' : ''}" data-th="${id}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" style="background:${bg}"></button>`;
    }).join('');
    const logo = currentBrandLogo ? `<img src="${currentBrandLogo}" alt="">` : `<span>${escapeHtml(niche.emoji || '💛')}</span>`;
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('wsQBrand'))}</p>
      <div class="ws-brand"><div class="ws-brand-form">
        <div class="ws-field-t">${escapeHtml(t('wsLogo'))}</div>
        <div class="ws-logo-row"><div class="ws-logo-pv">${logo}</div><div><button type="button" class="btn-secondary" id="ws-logo">${escapeHtml(t(currentBrandLogo ? 'brandLogoChange' : 'brandLogoUpload'))}</button><p class="hint">${escapeHtml(t('wsLogoHint'))}</p></div></div>
        <div class="ws-field-t">${escapeHtml(t('wsColor'))}</div><div class="ws-swatches">${sw}</div>
        <p class="hint" id="ws-th-name">${escapeHtml(t(cur === 'auto' ? 'themeAuto' : (THEME_LABEL_KEYS[cur] || 'themeCustom')))}</p>
      </div>${wsCardPreview()}</div>${wsNav(false)}`;
    document.getElementById('ws-logo').addEventListener('click', () => document.getElementById('brand-logo-file').click());
    body.querySelectorAll('.ws-swatch').forEach(b => b.addEventListener('click', async () => {
      const preset = themePresetByName(b.dataset.th); if (!preset) return;
      applyTheme(preset); fillCustomThemeInputs(preset); highlightThemeSwatch(b.dataset.th);
      const s2 = await window.api.getSettings();
      await window.api.saveSettings({ ...s2, ...themeSettingsPayload(b.dataset.th, preset) });
      renderSetup();
    }));
  } else if (step === 'card') {
    const tile = (k, ic) => `<button type="button" class="ws-tile ${ws.type === k ? 'active' : ''}" data-k="${k}"><span class="ws-ic">${ic}</span><b>${escapeHtml(t('wsCard_' + k))}</b><small>${escapeHtml(t('wsCardD_' + k))}</small></button>`;
    // 2.18: готовые программы под вид бизнеса — одно нажатие, дальше можно поправить цифры.
    const presets = programPresets(currentNicheId);
    const tpl = presets.map((p, i) => `<button type="button" class="ws-tpl ${i === 0 ? 'best' : ''}" data-i="${i}">${i === 0 ? `<span class="ws-tpl-best">${escapeHtml(t('tplBest'))}</span>` : ''}<span class="ws-tpl-ic">${p.ic}</span><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.desc)}</small></button>`).join('');
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('wsTplTitle')(niche.emoji || ''))}</p><div class="ws-tpls">${tpl}</div><p class="ws-or">${escapeHtml(t('wsTplOwn'))}</p><div class="ws-tiles ws-tiles-sm">${tile('stamp', '☕')}${tile('discount', '%')}${tile('spend', '💶')}</div>${wsNav(true)}`;
    body.querySelectorAll('.ws-tile').forEach(b => b.addEventListener('click', () => { ws.type = b.dataset.k; renderSetup(); }));
    body.querySelectorAll('.ws-tpl').forEach(b => b.addEventListener('click', () => { applyProgramPreset(presets[Number(b.dataset.i)]); wsGo(1); }));
  } else if (step === 'rule') {
    const reward = (niche.invitePhrase && niche.invitePhrase[lg]) || '';
    let fields = '';
    if (ws.type === 'stamp') fields = `<label class="ws-field">${escapeHtml(t('wsStampTarget'))}<input type="number" id="ws-st" min="2" max="50" value="${ws.stampTarget}"></label>
      <label class="ws-field">${escapeHtml(t('wsRewardText'))}<input type="text" id="ws-sttl" maxlength="60" value="${escapeHtml(ws.stampTitle)}" placeholder="${escapeHtml(t('wsRewardPh')(reward))}"></label>`;
    else if (ws.type === 'discount') fields = `<label class="ws-field">${escapeHtml(t('wsDiscount'))}<input type="number" id="ws-dp" min="1" max="90" value="${ws.discount}"></label>`;
    else fields = `<label class="ws-field">${escapeHtml(t('wsSpendTarget'))}<input type="number" id="ws-sp" min="1" value="${ws.spendTarget}"></label>
      <label class="ws-field">${escapeHtml(t('lblSpendPoints'))}<input type="number" id="ws-spp" min="1" max="1000" value="${ws.spendPoints || 1}"></label>
      <label class="ws-field">${escapeHtml(t('wsRewardText'))}<input type="text" id="ws-spt" maxlength="60" value="${escapeHtml(ws.spendTitle)}" placeholder="${escapeHtml(t('wsRewardPh')(reward))}"></label>`;
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('wsQRule'))}</p><div class="ws-brand"><div class="ws-brand-form"><div class="ws-fields">${fields}</div><div class="ws-preview" id="ws-prev"></div></div><div id="ws-card-slot">${wsCardPreview()}</div></div><div id="ws-err" class="lx-err"></div>${wsNav(true)}`;
    const phPlain = () => String(t('wsRewardPh')(reward)).replace(/^(Например|Наприклад|Napríklad|E\.g\.)[:,]?\s*/i, '');
    const prev = () => { document.getElementById('ws-card-slot').innerHTML = wsCardPreview(phPlain()); document.getElementById('ws-prev').textContent = ws.type === 'stamp' ? t('wsPrevStamp')(ws.stampTarget, ws.stampTitle || phPlain()) : ws.type === 'discount' ? t('wsPrevDiscount')(ws.discount) : t('wsPrevSpend')(ws.spendTarget + ' ' + currencySymbol(), ws.spendTitle || phPlain()); };
    const bind = (id, k, num) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { ws[k] = num ? Number(el.value) : el.value.trim(); prev(); }); };
    bind('ws-st', 'stampTarget', true); bind('ws-sttl', 'stampTitle'); bind('ws-dp', 'discount', true); bind('ws-sp', 'spendTarget', true); bind('ws-spp', 'spendPoints', true); bind('ws-spt', 'spendTitle');
    prev();
  } else if (step === 'import') {
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('wsQImport'))}</p><p class="hint">${escapeHtml(t('wsImportHint'))}</p><div class="lx-actions" style="justify-content:flex-start"><button type="button" class="btn-secondary" id="ws-imp">📥 ${escapeHtml(t('btnImportClients'))}</button></div>${wsNav(true, t('wsNext'), { skip: true })}`;
    document.getElementById('ws-imp').addEventListener('click', () => openImportWizard());
  } else if (step === 'qr') {
    body.innerHTML = `<p class="ws-q">${escapeHtml(t('wsQQr'))}</p><div class="ws-qr"><img id="ws-qr-img" alt="QR"><div><p>${escapeHtml(t('wsQrHint'))}</p><p class="hint" id="ws-qr-url"></p><p class="hint">${escapeHtml(t('wsQrPoster'))}</p></div></div>${wsNav(true)}`;
    try { const info = await window.api.registerGetInfo(); const url = `${info.url}?lang=${getLang()}`; document.getElementById('ws-qr-img').src = await window.api.qrDataUrl(url, { width: 220 }); document.getElementById('ws-qr-url').textContent = info.url; } catch (e) { /* сервер ещё запускается */ }
  } else if (step === 'first') {
    if (!ws.client) {
      body.innerHTML = `<p class="ws-q">${escapeHtml(t('wsQFirst'))}</p><div class="ws-fields"><label class="ws-field">${escapeHtml(t('importF_name'))}<input type="text" id="ws-cn" maxlength="60" placeholder="${escapeHtml(t('wsFirstPh'))}"></label><label class="ws-field">${escapeHtml(t('importF_phone'))}<input type="tel" id="ws-cp" maxlength="30"></label></div><div id="ws-err" class="lx-err"></div>
        <div class="lx-actions"><button type="button" class="btn-secondary" id="ws-back">${escapeHtml(t('wsBack'))}</button><button type="button" class="btn-secondary" id="ws-skip">${escapeHtml(t('wsSkip'))}</button><button type="button" id="ws-create">${escapeHtml(t('wsCreateCard'))}</button></div>`;
      document.getElementById('ws-create').addEventListener('click', async () => {
        const name = document.getElementById('ws-cn').value.trim(); const phone = document.getElementById('ws-cp').value.trim();
        if (!name) { document.getElementById('ws-err').textContent = t('importErr_no_name_column'); return; }
        const id = await window.api.addClient({ name, phone, preferredLanguage: getLang() });
        if (id && id.error === 'free_limit') { showFreeLimit('clients'); return; }
        const payload = ws.type === 'discount' ? { clientId: id, type: 'discount', discountPercent: ws.discount } : ws.type === 'spend' ? { clientId: id, type: 'spend', spendTarget: ws.spendTarget, spendBonusText: ws.spendTitle, spendBonusPoints: ws.spendPoints || 1 } : { clientId: id, type: 'stamp', stampTarget: ws.stampTarget, title: ws.stampTitle };
        const card = await window.api.createCard(payload);
        if (card && card.error === 'free_limit') { showFreeLimit('cards'); return; }
        ws.client = { id, name, card }; renderSetup(); refreshClients();
      });
    } else {
      const qr = await window.api.qrDataUrl(ws.client.card.code, { width: 200 });
      const res = ws.scanned;
      body.innerHTML = `<p class="ws-q">${escapeHtml(t('wsQScan')(ws.client.name))}</p><div class="ws-qr"><img src="${qr}" alt="QR"><div><p class="hint">${escapeHtml(ws.client.card.code)}</p>
        ${res ? `<div class="ws-ok">✅ ${escapeHtml(res)}</div>` : `<button type="button" id="ws-scan">📷 ${escapeHtml(t('wsDoScan'))}</button>`}</div></div>${wsNav(true, t('wsNext'), { disabled: !res })}`;
      const sb = document.getElementById('ws-scan');
      if (sb) sb.addEventListener('click', async () => {
        const r2 = await window.api.scanCode(ws.client.card.code);
        ws.scanned = r2 && r2.error ? t('wsScanErr') : r2.type === 'stamp' ? t('wsScanStamp')(r2.card ? r2.card.stamp_count : 1, ws.stampTarget) : r2.type === 'discount' ? t('wsScanDiscount')(ws.discount) : t('wsScanSpend');
        renderSetup(); refreshDashboard();
      });
    }
  } else {
    body.innerHTML = `<div class="ws-done"><div class="ws-big">🎉</div><p class="ws-q">${escapeHtml(t('wsDoneTitle'))}</p><ul class="ws-next">${['wsNext1', 'wsNext2', 'wsNext3'].map(k => `<li>${escapeHtml(t(k))}</li>`).join('')}</ul></div><div class="lx-actions"><button type="button" class="btn-secondary" id="ws-poster">${escapeHtml(t('wsOpenPoster'))}</button><button type="button" id="ws-finish">${escapeHtml(t('wsFinish'))}</button></div>`;
    document.getElementById('ws-finish').addEventListener('click', () => closeSetup(true));
    document.getElementById('ws-poster').addEventListener('click', async () => {
      await closeSetup(true, { noTour: true });
      document.querySelector('.nav-btn[data-view="settings"]').click();
      const tile = document.querySelector('.settings-tile[data-modal="settings-modal-poster"]');
      if (tile) tile.click();
    });
  }
  const back = document.getElementById('ws-back'); if (back) back.addEventListener('click', () => wsGo(-1));
  const skip = document.getElementById('ws-skip'); if (skip) skip.addEventListener('click', () => wsGo(1));
  const next = document.getElementById('ws-next');
  if (next) next.addEventListener('click', async () => {
    if (step === 'rule') {
      const bad = ws.type === 'stamp' ? !(ws.stampTarget >= 2 && ws.stampTarget <= 50) : ws.type === 'discount' ? !(ws.discount >= 1 && ws.discount <= 90) : !(ws.spendTarget > 0);
      if (bad) { document.getElementById('ws-err').textContent = t('wsRuleErr'); return; }
      await saveWsRule();
    }
    wsGo(1);
  });
}

// ===================== Этап 2: согласия, резервные копии, импорт =====================
const fmtDT = (v) => { if (!v) return ''; const d = new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z'); return isNaN(d) ? String(v) : d.toLocaleString(getLang() === 'en' ? 'en-GB' : getLang(), { dateStyle: 'short', timeStyle: 'short' }); };
function consentInfo(c) {
  if (c.do_not_contact) return t('consentInfoDnc');
  if (c.consent_email || c.consent_telegram) return t('consentInfoGiven')(t('consentSrc_' + (c.consent_source || 'manual')), fmtDT(c.consent_at));
  if (c.unsubscribed_at) return t('consentInfoUnsub')(fmtDT(c.unsubscribed_at));
  return t('consentInfoNone');
}
function lxOpen(id) { document.getElementById(id).style.display = 'flex'; }
function lxClose(id) { const m = id && document.getElementById(id); if (m) m.style.display = 'none'; }
document.querySelectorAll('.lx-close').forEach(b => b.addEventListener('click', () => lxClose(b.dataset.close)));
document.querySelectorAll('.lx-modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) lxClose(m.id); }));
// Esc закрывает верхнее открытое окно — как у окон настроек и диалогов.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || document.querySelector('.ui-dialog-overlay')) return;
  const open = Array.from(document.querySelectorAll('.lx-modal')).filter(m => m.style.display === 'flex');
  if (!open.length) return;
  const top = open[open.length - 1];
  if (top.id === 'lx-setup') return; // мастер закрывается своей кнопкой (сохраняет прогресс)
  lxClose(top.id);
});

// ---------- согласия: сводка над рассылкой и список отписавшихся ----------
async function renderConsentSummary() {
  const box = document.getElementById('consent-summary'); if (!box || !window.api.consentStats) return;
  const s = await window.api.consentStats();
  box.innerHTML = `<span>📬 ${escapeHtml(t('consentSummary')(s.email, s.telegram, s.none))}</span>` +
    (s.unsubscribed || s.excluded ? `<button type="button" id="btn-optout-list" class="chip">${escapeHtml(t('consentOptoutBtn')(s.unsubscribed + s.excluded))}</button>` : '');
  const b = document.getElementById('btn-optout-list'); if (b) b.addEventListener('click', openOptOut);
}
async function openOptOut() {
  const list = await window.api.consentOptedOut();
  const el = document.getElementById('lx-optout-list');
  el.innerHTML = list.length ? list.map(c => `<div class="lx-row"><div><b>${escapeHtml(c.name)}</b><small>${escapeHtml([c.email, c.phone].filter(Boolean).join(' · '))}</small><small>${escapeHtml(c.do_not_contact ? t('consentInfoDnc') : t('consentInfoUnsub')(fmtDT(c.unsubscribed_at)))}</small></div>${c.do_not_contact ? `<button type="button" class="btn-secondary lx-undnc" data-id="${c.id}">${escapeHtml(t('consentLiftDnc'))}</button>` : ''}</div>`).join('') : `<div class="hint">${escapeHtml(t('consentOptoutEmpty'))}</div>`;
  el.querySelectorAll('.lx-undnc').forEach(b => b.addEventListener('click', async () => { await window.api.consentSetDnc(Number(b.dataset.id), false); openOptOut(); renderConsentSummary(); }));
  lxOpen('lx-optout');
}
document.querySelectorAll('.nav-btn[data-view="campaigns"]').forEach(b => b.addEventListener('click', () => setTimeout(renderConsentSummary, 50)));

// ---------- резервные копии ----------
async function renderBackupStatus() {
  const el = document.getElementById('backup-status'); if (!el || !window.api.backupStatus) return;
  const s = await window.api.backupStatus();
  el.innerHTML = (s.lastOk ? `✅ ${escapeHtml(t('backupLast')(fmtDT(s.lastOk), s.count))}` : `⚠️ ${escapeHtml(t('backupNone'))}`) + (s.lastError ? `<br>❌ ${escapeHtml(t('backupFailed'))}: ${escapeHtml(s.lastError)}` : '');
}
document.querySelectorAll('[data-modal="settings-modal-data"]').forEach(b => b.addEventListener('click', () => setTimeout(renderBackupStatus, 50)));
document.getElementById('btn-backup-now').addEventListener('click', () => setTimeout(renderBackupStatus, 400));
const reasonName = (r) => { const k = 'backupReason_' + r; const v = t(k); return v && v !== k ? v : t('backupReason_other'); };
async function openRestore() {
  const files = await window.api.backupList();
  const el = document.getElementById('lx-restore-list');
  el.innerHTML = files.length ? files.map(f => `<div class="lx-row"><div><b>${escapeHtml(fmtDT(f.time))}</b><small>${escapeHtml(reasonName(f.reason))} · ${Math.max(1, Math.round(f.size / 1024))} KB</small></div><button type="button" class="btn-secondary lx-pick" data-name="${escapeHtml(f.name)}">${escapeHtml(t('restoreThis'))}</button></div>`).join('') : `<div class="hint">${escapeHtml(t('backupNone'))}</div>`;
  el.querySelectorAll('.lx-pick').forEach(b => b.addEventListener('click', () => inspectAndRestore({ name: b.dataset.name })));
  lxOpen('lx-restore');
}
async function inspectAndRestore(src) {
  const info = await window.api.backupInspect(src);
  if (info.canceled) return;
  const badText = (code) => { const k = 'restoreBad_' + code; const v = t(k); return v && v !== k ? v : t('restoreBad_not_db'); };
  if (!info.ok) { uiAlert(badText(info.error)); return; }
  const msg = t('restoreConfirm')(info.label, info.brand || '—', info.clients, info.cards, info.scans, info.lastActivity ? fmtDT(info.lastActivity) : '—');
  if (!(await uiConfirm(msg, { danger: true }))) return;
  const r = await window.api.backupRestore();
  if (!r || !r.ok) { uiAlert(badText((r && r.error) || 'not_db')); return; }
  lxClose('lx-restore'); uiAlert(t('restoreDone'));
}
document.getElementById('btn-backup-restore').addEventListener('click', openRestore);
document.getElementById('lx-restore-file').addEventListener('click', () => inspectAndRestore(null));
document.getElementById('btn-backup-export').addEventListener('click', async () => {
  const r = await window.api.backupExportDb(); if (r.ok) uiAlert(t('backupExported')(r.filePath)); else if (r.error) uiAlert(t('backupFailed'));
});
document.getElementById('btn-export-operations').addEventListener('click', async () => {
  const H = { date: t('opH_date'), client: t('opH_client'), phone: t('opH_phone'), card: t('opH_card'), type: t('opH_type'), result: t('opH_result'), amount: t('opH_amount'), location: t('opH_location'),
    type_stamp: t('opT_stamp'), type_discount: t('opT_discount'), type_spend: t('opT_spend'), type_gift: t('chipGift'), res_stamp: t('opR_stamp'), res_reward: t('opR_reward'), res_discount: t('opR_discount'), res_spend: t('opR_spend'), res_gift: t('opR_gift') };
  const r = await window.api.exportOperations(H, getLang()); if (r.ok) uiAlert(t('backupExported')(r.filePath));
});

// ---------- импорт клиентов: предпросмотр → сопоставление → проверка ----------
const IMPORT_FIELDS = ['name', 'phone', 'email', 'birthday', 'notes', 'language', 'consent_email', 'consent_telegram', 'consent_all', 'id'];
let importState = null;
const tOr = (k, fb) => { const v = t(k); return v && v !== k ? v : fb; };
async function openImportWizard() {
  const r = await window.api.importOpen();
  if (r.canceled) return;
  if (!r.ok) { uiAlert(tOr('importErr_' + r.error, t('importErr_read_failed'))); return; }
  importState = { ...r, dupMode: 'skip' };
  renderImport(); lxOpen('lx-import');
}
function renderImport() {
  const s = importState, body = document.getElementById('lx-import-body');
  const colOf = {}; Object.entries(s.mapping).forEach(([f, i]) => { colOf[i] = f; });
  const sel = (i) => `<select class="lx-map" data-col="${i}"><option value="">${escapeHtml(t('importSkipCol'))}</option>${IMPORT_FIELDS.map(f => `<option value="${f}" ${colOf[i] === f ? 'selected' : ''}>${escapeHtml(t('importF_' + f))}</option>`).join('')}</select>`;
  body.innerHTML = `<p class="hint">${escapeHtml(t('importIntro')(s.file, s.total))}</p>
    <div class="lx-table-wrap"><table class="lx-table"><thead><tr>${s.headers.map((h, i) => `<th><div class="lx-h">${escapeHtml(h)}</div>${sel(i)}</th>`).join('')}</tr></thead>
    <tbody>${s.sample.map(r => `<tr>${s.headers.map((h, i) => `<td>${escapeHtml(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="lx-opts"><div class="lx-opt-title">${escapeHtml(t('importDupTitle'))}</div>
      <label class="segment-check"><input type="radio" name="lx-dup" value="skip" ${s.dupMode === 'skip' ? 'checked' : ''}> <span>${escapeHtml(t('importDupSkip'))}</span></label>
      <label class="segment-check"><input type="radio" name="lx-dup" value="fill" ${s.dupMode === 'fill' ? 'checked' : ''}> <span>${escapeHtml(t('importDupFill'))}</span></label>
      <div class="hint">${escapeHtml(t('importConsentNote'))}</div></div>
    <div id="lx-import-err" class="lx-err"></div>
    <div class="lx-actions"><button type="button" class="btn-secondary" id="lx-import-cancel">${escapeHtml(t('dlgCancel'))}</button><button type="button" id="lx-import-go">${escapeHtml(t('importGo')(s.total))}</button></div>`;
  body.querySelectorAll('.lx-map').forEach(m => m.addEventListener('change', () => {
    const col = Number(m.dataset.col), f = m.value;
    Object.keys(s.mapping).forEach(k => { if (s.mapping[k] === col || (f && k === f)) delete s.mapping[k]; });
    if (f) s.mapping[f] = col;
    renderImport();
  }));
  body.querySelectorAll('input[name=lx-dup]').forEach(r => r.addEventListener('change', () => { s.dupMode = r.value; }));
  document.getElementById('lx-import-cancel').addEventListener('click', () => lxClose('lx-import'));
  document.getElementById('lx-import-go').addEventListener('click', async () => {
    if (s.mapping.name === undefined) { document.getElementById('lx-import-err').textContent = t('importErr_no_name_column'); return; }
    const r = await window.api.importCommit(s.token, s.mapping, { dupMode: s.dupMode });
    if (!r || !r.ok) { document.getElementById('lx-import-err').textContent = tOr('importErr_' + ((r && r.error) || 'read_failed'), t('importErr_read_failed')); return; }
    renderImportReport(r); refreshClients(); refreshDashboard();
  });
}
function renderImportReport(r) {
  const body = document.getElementById('lx-import-body');
  body.innerHTML = `<div class="lx-report"><div class="lx-stat ok"><b>${r.imported}</b><span>${escapeHtml(t('importRepNew'))}</span></div><div class="lx-stat"><b>${r.updated}</b><span>${escapeHtml(t('importRepUpd'))}</span></div><div class="lx-stat warn"><b>${r.skipped}</b><span>${escapeHtml(t('importRepSkip'))}</span></div><div class="lx-stat warn"><b>${r.warnings}</b><span>${escapeHtml(t('importRepWarn'))}</span></div></div>
    ${r.limited ? `<div class="lx-err">${escapeHtml(t('freeLimit_import')((licenseMode && licenseMode.limits) || { clients: 10 }))}</div>` : ''}
    ${r.issues.length ? `<div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>${escapeHtml(t('importRow'))}</th><th>${escapeHtml(t('importF_name'))}</th><th>${escapeHtml(t('importProblem'))}</th></tr></thead><tbody>${r.issues.map(i => `<tr><td>${i.row}</td><td>${escapeHtml(i.name || '—')}</td><td>${escapeHtml(t('importIssue_' + i.kind))}${i.field ? ': ' + escapeHtml(i.field) : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="lx-actions"><button type="button" id="lx-import-done">${escapeHtml(t('importDone'))}</button></div>`;
  document.getElementById('lx-import-done').addEventListener('click', () => lxClose('lx-import'));
}

// ---------- пробный режим: баннер «Подписаться» и окна предела ----------
let licenseMode = null;
function openSubscriptionSettings() {
  const nav = document.querySelector('.nav-btn[data-view="settings"]'); if (nav) nav.click();
  setTimeout(() => { const tile = document.querySelector('.settings-tile[data-modal="settings-modal-subscription"]'); if (tile) tile.click(); }, 60);
}
function licStatusText(m) {
  const k = 'licStatus_' + (m.status || '');
  const v = t(k);
  return v && v !== k ? v : t('licStatus_other');
}
function renderFreeBanner() {
  const bar = document.getElementById('free-banner'); if (!bar) return;
  const m = licenseMode;
  const showTrial = m && m.mode === 'full' && m.trial;
  if (!m || (m.mode !== 'free' && !showTrial)) { bar.style.display = 'none'; document.body.classList.remove('has-free-banner'); return; }
  const date = m.trialUntil ? new Date(m.trialUntil).toLocaleDateString(getLang() === 'en' ? 'en-GB' : getLang()) : '';
  const text = showTrial ? t('trialBanner')(m.daysLeft, date)
    : m.reason === 'inactive' ? t('freeBannerInactive')(licStatusText(m))
    : m.reason === 'trial_ended' ? t('trialEndedBanner')
    : m.reason === 'offline' ? t('trialOfflineBanner')
    : m.reason === 'clock' ? t('licClockBanner')
    : m.reason === 'device_limit' ? t('licDeviceLimitBanner')
    : m.reason === 'unverified' ? t('freeBannerUnverified')
    : t('freeBannerNoKey')(m.usage, m.limits);
  document.getElementById('fb-text').textContent = text;
  const trialBtn = document.getElementById('fb-trial');
  trialBtn.style.display = m.reason === 'no_key' ? '' : 'none';
  trialBtn.textContent = t('trialStart');
  const sub = document.getElementById('fb-subscribe');
  sub.style.display = m.canBuy ? '' : 'none';
  sub.textContent = m.reason === 'inactive' ? t('freeRenew') : t('freeSubscribe');
  sub.classList.toggle('fb-primary', m.reason !== 'no_key');
  const keyBtn = document.getElementById('fb-key');
  keyBtn.style.display = showTrial ? 'none' : '';
  keyBtn.textContent = t('freeHaveKey');
  bar.dataset.reason = showTrial ? 'trial' : m.reason;
  bar.style.display = 'flex'; document.body.classList.add('has-free-banner');
  document.documentElement.style.setProperty('--free-banner-h', bar.offsetHeight + 'px');
}
// Высота полосы меняется при повороте экрана и изменении окна — отступы под ней должны следовать.
window.addEventListener('resize', () => {
  const bar = document.getElementById('free-banner');
  if (bar && bar.style.display !== 'none') document.documentElement.style.setProperty('--free-banner-h', bar.offsetHeight + 'px');
});
document.getElementById('fb-subscribe').addEventListener('click', () => window.api.openSubscribe());
document.getElementById('fb-trial').addEventListener('click', () => startTrialFlow());
// 14 дней пробного периода: только email, без карты. Сервер выдаёт пробный ключ, программа сразу его применяет.
async function startTrialFlow() {
  const email = await uiPrompt(t('trialPrompt'), '', { type: 'email', inputmode: 'email' });
  if (email === null || email === undefined) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) { uiAlert(t('errEmailInvalid')); return; }
  const r = await window.api.startTrial(String(email).trim());
  if (r && r.ok) {
    licenseMode = await window.api.licenseMode(); renderFreeBanner();
    uiAlert(t('trialStarted')(new Date(r.trialUntil).toLocaleDateString(getLang() === 'en' ? 'en-GB' : getLang())));
    return;
  }
  const err = (r && r.error) || 'failed';
  uiAlert(err === 'trial_used' ? t('trialUsed') : err === 'email' ? t('errEmailInvalid') : err === 'too_many' ? t('errTooMany') : err === 'network' ? t('errNetwork') : err === 'has_key' ? t('trialHasKey') : errText(err));
}
// Функция тарифа Pro (несколько точек): объясняем и даём перейти на сайт с уже выбранным Pro.
async function showProRequired(feature) {
  const m = licenseMode || await window.api.licenseMode();
  const options = [];
  // 2.17: сеть точек и общая база есть и в Starter — нужна просто подписка.
  const anySub = ['sync', 'locations'].includes(feature || 'locations');
  if (m.canBuy) options.push({ key: 'pro', label: anySub ? t('subPickPlan') : t('proUpgrade') });
  if (m.reason === 'no_key') options.push({ key: 'trial', label: t('trialStart') });
  const choice = await uiChoice((anySub ? t('subRequiredTitle') : t('proRequiredTitle')) + '\n\n' + t('proRequired_' + (feature || 'locations')), options);
  if (choice === 'pro') window.api.openSubscribe(anySub ? 'starter' : 'pro');
  else if (choice === 'trial') startTrialFlow();
}
document.getElementById('fb-key').addEventListener('click', openSubscriptionSettings);
// Окно «упёрлись в предел»: вместо мёртвой кнопки — понятная причина и рабочая ссылка на оплату.
async function showFreeLimit(kind) {
  const m = licenseMode || await window.api.licenseMode();
  const lim = m.limits || { clients: 10, cards: 15, products: 10 };
  const body = kind === 'mail' ? t('freeLimit_mail') : (typeof t('freeLimit_' + kind) === 'function' ? t('freeLimit_' + kind)(lim) : t('freeLimit_clients')(lim));
  const options = [];
  if (m.reason === 'no_key') options.push({ key: 'trial', label: t('trialStart') });
  if (m.canBuy) options.push({ key: 'subscribe', label: t(m.reason === 'inactive' ? 'freeRenew' : 'freeSubscribe') });
  options.push({ key: 'key', label: t('freeHaveKey') });
  const choice = await uiChoice(t('freeLimitTitle') + '\n\n' + body, options);
  if (choice === 'subscribe') window.api.openSubscribe();
  else if (choice === 'trial') startTrialFlow();
  else if (choice === 'key') openSubscriptionSettings();
}

// ---------- удалённая блокировка ----------
function applyLicenseStatus(blocked, message) {
  const overlay = document.getElementById('license-lock-overlay');
  if (blocked) {
    document.getElementById('license-lock-message').textContent = message || t('licenseLockDefaultMessage');
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

window.api.onLicenseStatus((e, { blocked, message }) => applyLicenseStatus(blocked, message));

// ---------- обновление по воздуху ----------
window.api.onUpdateStatus((e, data) => {
  const { status, version, percent } = data;
  const banner = document.getElementById('update-banner');
  const textEl = document.getElementById('update-banner-text');
  const installBtn = document.getElementById('btn-update-install');
  const statusLine = document.getElementById('update-status-line');
  // Маленькая шкала загрузки прямо в уведомлении — не нужно открывать настройки.
  const prog = document.getElementById('update-banner-progress');
  if (version) banner.dataset.version = version;
  // 2.18: скачивание идёт тихо, без полосы на экране (ход виден в «Настройки → Обновления»).
  if (status === 'available' || status === 'downloading') {
    if (status === 'downloading') {
      const pct = Math.max(0, Math.min(100, Number(percent) || 0));
      document.getElementById('update-banner-fill').style.width = pct + '%';
      document.getElementById('update-banner-pct').textContent = pct + '%';
    }
  } else if (status === 'downloaded') {
    prog.style.display = 'none';
    delete banner.dataset.dismissed;
    textEl.innerHTML = `<b class="ub-t">${escapeHtml(t('updReadyTitle')(version))}</b><span class="ub-s">${escapeHtml(t('updReadySub'))}</span>`;
    installBtn.style.display = 'inline-block';
    banner.style.display = 'flex';
    statusLine.textContent = t('updateReadyShort');
    statusLine.style.display = 'block';
  }
  renderUpdatesModalStatus(data);
});

document.getElementById('btn-update-install').addEventListener('click', () => {
  window.api.installUpdateNow();
});
document.getElementById('btn-update-dismiss').addEventListener('click', () => {
  const banner = document.getElementById('update-banner');
  banner.style.display = 'none';
  // Скрыли во время загрузки — не показываем снова до готовности обновления.
  banner.dataset.dismissed = '1';
});

// ---------- настройки: Обновления ----------
let lastUpdateStatus = null;

async function loadUpdatesSettings() {
  const version = await window.api.getCurrentVersion();
  document.getElementById('updates-current-version').textContent = version || '—';
  // Версия из Microsoft Store обновляется через Store — кнопка проверки не нужна.
  const isStore = await window.api.isStoreBuild();
  document.getElementById('btn-updates-check').style.display = isStore ? 'none' : '';
  if (isStore) {
    document.getElementById('updates-status-text').textContent = t('updatesViaStore');
    document.getElementById('updates-status-box').style.display = 'block';
    return;
  }
  if (lastUpdateStatus) renderUpdatesModalStatus(lastUpdateStatus);
}

function renderUpdatesModalStatus(data) {
  lastUpdateStatus = data;
  const box = document.getElementById('updates-status-box');
  const textEl = document.getElementById('updates-status-text');
  const track = document.getElementById('updates-progress-track');
  const fill = document.getElementById('updates-progress-fill');
  const installBtn = document.getElementById('btn-updates-install');
  if (!box) return; // модалка ещё не вставлена в DOM на самой первой загрузке

  box.style.display = 'block';
  track.style.display = 'none';
  installBtn.style.display = 'none';

  switch (data.status) {
    case 'checking':
      textEl.textContent = t('updatesChecking');
      break;
    case 'available':
      textEl.textContent = t('updateAvailableText')(data.version);
      break;
    case 'not-available':
      textEl.textContent = t('updatesUpToDate');
      break;
    case 'downloading':
      textEl.textContent = t('updatesDownloading')(data.percent || 0);
      track.style.display = 'block';
      fill.style.width = (data.percent || 0) + '%';
      break;
    case 'downloaded':
      textEl.textContent = t('updateReadyText')(data.version);
      installBtn.style.display = 'block';
      break;
    case 'error':
      textEl.textContent = t('updatesCheckError') + (data.message ? ` (${data.message})` : '');
      break;
    default:
      box.style.display = 'none';
  }
}

document.getElementById('btn-updates-check').addEventListener('click', async () => {
  renderUpdatesModalStatus({ status: 'checking' });
  const res = await window.api.checkUpdatesNow();
  if (!res.ok && res.reason === 'store') {
    renderUpdatesModalStatus({ status: 'store' });
    document.getElementById('updates-status-text').textContent = t('updatesViaStore');
    document.getElementById('updates-status-box').style.display = 'block';
    return;
  }
  if (!res.ok && res.reason === 'dev_mode') {
    renderUpdatesModalStatus({ status: 'dev-mode' });
    document.getElementById('updates-status-text').textContent = t('updatesDevMode');
    document.getElementById('updates-status-box').style.display = 'block';
  }
  // Остальные исходы (доступно/нет/ошибка) придут сами через onUpdateStatus —
  // autoUpdater внутри main.js генерирует те же события независимо от того,
  // кто именно инициировал проверку.
});

document.getElementById('btn-updates-install').addEventListener('click', () => {
  window.api.installUpdateNow();
});

document.getElementById('btn-license-recheck').addEventListener('click', async () => {
  const btn = document.getElementById('btn-license-recheck');
  const statusEl = document.getElementById('license-recheck-status');
  btn.disabled = true;
  statusEl.textContent = t('licenseChecking');
  const res = await window.api.licenseRecheck();
  btn.disabled = false;
  if (res.ok && !res.blocked) {
    // экран блокировки сейчас исчезнет сам (пришло событие license-status) — сообщение не нужно
    statusEl.textContent = '';
    return;
  }
  if (res.ok && res.blocked) {
    statusEl.textContent = t('licenseStillBlocked');
  } else if (res.reason === 'network') {
    statusEl.textContent = t('licenseCheckNoInternet');
  } else {
    statusEl.textContent = t('licenseCheckFailed');
  }
});

// ---------- настройки: бренд и вид бизнеса (то же самое, что при первом запуске, но доступно и потом) ----------
// ---------- настройки: Telegram ----------
// ---------- настройки: история рассылок ----------
const SEND_CHANNEL_ICON = { email: '✉️', telegram: '✈️' };
async function loadSendHistory() {
  const listEl = document.getElementById('send-history-list');
  listEl.innerHTML = `<p class="hint">${t('loading')}</p>`;
  const rows = await window.api.getSendHistory(100);
  if (!rows || rows.length === 0) {
    listEl.innerHTML = `<p class="hint">${t('sendHistoryEmpty')}</p>`;
    return;
  }
  listEl.innerHTML = rows.map(r => `
    <div class="send-history-row send-history-status-${r.status}">
      <span class="send-history-channel">${SEND_CHANNEL_ICON[r.channel] || r.channel}</span>
      <span class="send-history-client">${escapeHtml(r.client_name || t('sendHistoryUnknownClient'))}</span>
      <span class="send-history-subject">${escapeHtml(r.subject || '')}</span>
      <span class="send-history-badge">${r.status === 'sent' ? t('sendHistoryStatusSent') : t('sendHistoryStatusError')}</span>
      <span class="send-history-when hint">${formatDateTime(r.created_at)}</span>
    </div>
  `).join('');
}

// ---------- настройки: поддержка ----------
document.getElementById('support-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('support-type').value;
  const typeLabels = { problem: t('supportTypeProblem'), suggestion: t('supportTypeSuggestion'), question: t('supportTypeQuestion'), other: t('supportTypeOther') };
  const priority = document.getElementById('support-priority').value;
  const priorityLabels = { low: t('supportPriorityLow'), normal: t('supportPriorityNormal'), high: t('supportPriorityHigh') };
  const { url } = await window.api.supportBuildMailto({
    type: typeLabels[type] || type,
    subject: document.getElementById('support-subject').value.trim(),
    description: document.getElementById('support-description').value.trim(),
    priority: priorityLabels[priority] || priority
  });
  window.api.openExternal(url);
});

async function loadTelegramSettings() {
  const s = await window.api.getSettings();
  const connected = !!s.telegram_bot_token;
  document.getElementById('telegram-disconnected-box').style.display = connected ? 'none' : 'block';
  document.getElementById('telegram-connected-box').style.display = connected ? 'block' : 'none';
  if (connected) {
    document.getElementById('telegram-bot-name').textContent = '@' + (s.telegram_bot_username || '');
  } else {
    document.getElementById('telegram-token-input').value = '';
    document.getElementById('telegram-status').textContent = '';
  }
}

document.getElementById('btn-telegram-connect').addEventListener('click', async () => {
  const btn = document.getElementById('btn-telegram-connect');
  const statusEl = document.getElementById('telegram-status');
  const token = document.getElementById('telegram-token-input').value.trim();
  if (!token) return;
  btn.disabled = true;
  statusEl.textContent = t('telegramConnecting');
  const res = await window.api.telegramTestConnection(token);
  btn.disabled = false;
  if (res.ok) {
    statusEl.textContent = '';
    loadTelegramSettings();
  } else {
    statusEl.textContent = t('telegramConnectError') + (res.error || '');
  }
});

document.getElementById('btn-telegram-disconnect').addEventListener('click', async () => {
  if (!await uiConfirm(t('confirmTelegramDisconnect'), { danger: true })) return;
  await window.api.telegramDisconnect();
  loadTelegramSettings();
});

// ---------- настройки: Google Wallet ----------
async function loadGwalletSettings() {
  const s = await window.api.getSettings();
  const connected = !!(s.google_wallet_issuer_id && s.google_wallet_service_account_json);
  // Облачный режим (через подписку Loya) — основной; свой аккаунт Google нужен редко.
  document.getElementById('gwallet-cloud-box').style.display = connected ? 'none' : 'flex';
  document.getElementById('gwallet-cloud-text').textContent = s.license_key ? t('gwalletCloudText') : t('gwalletCloudNoKey');
  document.getElementById('gwallet-cloud-box').classList.toggle('gwallet-cloud-warn', !s.license_key);
  document.getElementById('gwallet-disconnected-box').style.display = connected ? 'none' : 'block';
  document.getElementById('gwallet-connected-box').style.display = connected ? 'block' : 'none';
  if (connected) {
    try {
      const acc = JSON.parse(s.google_wallet_service_account_json);
      document.getElementById('gwallet-account-email').textContent = acc.client_email || s.google_wallet_issuer_id;
    } catch (err) {
      document.getElementById('gwallet-account-email').textContent = s.google_wallet_issuer_id;
    }
  } else {
    document.getElementById('gwallet-issuer-input').value = '';
    document.getElementById('gwallet-key-input').value = '';
    document.getElementById('gwallet-status').textContent = '';
  }
}

document.getElementById('btn-gwallet-connect').addEventListener('click', async () => {
  const btn = document.getElementById('btn-gwallet-connect');
  const statusEl = document.getElementById('gwallet-status');
  const issuerId = document.getElementById('gwallet-issuer-input').value.trim();
  const serviceAccountJson = document.getElementById('gwallet-key-input').value.trim();
  if (!issuerId || !serviceAccountJson) return;
  btn.disabled = true;
  statusEl.textContent = t('gwalletConnecting');
  const res = await window.api.googleWalletTestConnection({ issuerId, serviceAccountJson });
  btn.disabled = false;
  if (res.ok) {
    statusEl.textContent = '';
    loadGwalletSettings();
  } else {
    statusEl.textContent = t('gwalletConnectError') + (res.error || '');
  }
});

document.getElementById('btn-gwallet-disconnect').addEventListener('click', async () => {
  if (!await uiConfirm(t('confirmGwalletDisconnect'), { danger: true })) return;
  const current = await window.api.getSettings();
  await window.api.saveSettings({ ...current, google_wallet_issuer_id: '', google_wallet_service_account_json: '' });
  loadGwalletSettings();
});

// ---------- настройки: Подписка ----------
async function loadSubscriptionSettings() {
  const info = await window.api.licenseGetInfo();
  document.getElementById('sub-key-input').value = info.licenseKey || '';
  const statusEl = document.getElementById('sub-status');
  const infoBox = document.getElementById('sub-info-box');
  if (!info.apiConfigured) {
    statusEl.textContent = t('subApiNotConfigured');
    infoBox.style.display = 'none';
    return;
  }
  statusEl.textContent = '';
  if (!info.licenseKey) {
    infoBox.style.display = 'none';
    return;
  }
  // 2.22: «подписка активна» уже написано в плашке тарифа — здесь показываем только проблему или подробности
  infoBox.style.display = (info.blocked || info.message) ? 'block' : 'none';
  document.getElementById('sub-status-icon').textContent = info.blocked ? '⛔' : '✅';
  document.getElementById('sub-status-text').textContent = info.blocked ? t('subStatusBlocked') : t('subStatusActive');
  document.getElementById('sub-status-detail').textContent = info.message || '';
}

document.getElementById('btn-sub-save').addEventListener('click', async () => {
  const key = document.getElementById('sub-key-input').value.trim();
  if (!key) return;
  const statusEl = document.getElementById('sub-status');
  statusEl.textContent = t('subChecking');
  const res = await window.api.licenseSaveKey(key);
  if (!res.ok) {
    statusEl.textContent = res.reason === 'network' ? t('subCheckNetworkError') : t('subApiNotConfigured');
    return;
  }
  statusEl.textContent = '';
  loadSubscriptionSettings();
  // 2.17: этот ключ уже работает на другом устройстве — спрашиваем про общую базу и точку.
  if (!res.blocked && res.org && Number(res.org.others) > 0) { closeSettingsModals(); maybeOfferJoin(false); }
});

async function loadBrandSettings() {
  const settings = await window.api.getSettings();
  document.getElementById('brand-name-input').value = settings.brand_name || 'Loya';
  renderSettingsNicheGrid(settings.business_niche || 'coffee');
  renderBrandLogoBox();
  fillCountrySelect(document.getElementById('brand-country'), businessCountry(settings));
  fillCurrencySelect(document.getElementById('brand-currency'), settings.spend_currency || 'EUR');
}
document.getElementById('brand-currency').addEventListener('change', async (e) => {
  const st = await window.api.getSettings();
  await window.api.saveSettings({ ...st, spend_currency: e.target.value, region_confirmed: '1' });
  currentSpendCurrency = e.target.value;
  syncCurrencySelects();
  refreshDashboard(); refreshClients();
  const statusEl = document.getElementById('brand-settings-status');
  statusEl.textContent = t('settingsSaved'); setTimeout(() => statusEl.textContent = '', 2000);
});
function syncCurrencySelects() { document.querySelectorAll('select.currency-select').forEach(sel => { if (sel.closest('.region-box')) return; fillCurrencySelect(sel, currentSpendCurrency); }); }
document.getElementById('brand-country').addEventListener('change', async (e) => {
  const st = await window.api.getSettings();
  const next = { ...st, business_country: e.target.value, region_confirmed: '1' };
  // Валюта следует за страной, если её не меняли (была валютой прежней страны).
  if ((st.spend_currency || 'EUR') === COUNTRY_CURRENCY[businessCountry(st)]) { next.spend_currency = COUNTRY_CURRENCY[e.target.value]; currentSpendCurrency = next.spend_currency; fillCurrencySelect(document.getElementById('brand-currency'), next.spend_currency); syncCurrencySelects(); }
  await window.api.saveSettings(next);
  applyCountryUi(next);
  refreshDashboard();
  const statusEl = document.getElementById('brand-settings-status');
  statusEl.textContent = t('settingsSaved'); setTimeout(() => statusEl.textContent = '', 2000);
});
function renderSrLogo() {
  const pv = document.getElementById('sr-logo-pv'); if (!pv) return;
  pv.innerHTML = currentBrandLogo ? `<img src="${currentBrandLogo}" alt="">` : `<span>${NichesModule.getNiche(currentNicheId).emoji}</span>`;
  pv.classList.toggle('has-img', !!currentBrandLogo);
  document.getElementById('btn-sr-logo').textContent = t(currentBrandLogo ? 'brandLogoChange' : 'brandLogoUpload');
  document.getElementById('btn-sr-logo-rm').style.display = currentBrandLogo ? '' : 'none';
}
document.getElementById('btn-sr-logo').addEventListener('click', () => document.getElementById('brand-logo-file').click());
document.getElementById('btn-sr-logo-rm').addEventListener('click', async () => { await window.api.brandLogoSave(null); await loadBrandLogo(); renderBrandLogoBox(); });
// 2.25: фон страниц для гостей
let pageBgUrl = null;
async function renderSrBg() {
  const pv = document.getElementById('sr-bg-pv'); if (!pv) return;
  try { pageBgUrl = await window.api.pageBgGet(); } catch (e) { pageBgUrl = null; }
  const st = await window.api.getSettings();
  const dim = Number(st.reg_page_bg_dim) >= 0 && st.reg_page_bg_dim !== undefined && st.reg_page_bg_dim !== '' ? Number(st.reg_page_bg_dim) : 45;
  pv.style.backgroundImage = pageBgUrl ? `linear-gradient(rgba(8,9,13,${dim / 100}),rgba(8,9,13,${dim / 100})),url("${pageBgUrl}")` : '';
  pv.classList.toggle('has-img', !!pageBgUrl);
  pv.innerHTML = pageBgUrl ? '' : '<span>🖼️</span>';
  document.getElementById('btn-sr-bg-rm').style.display = pageBgUrl ? '' : 'none';
  document.getElementById('sr-dim-row').style.display = pageBgUrl ? '' : 'none';
  document.getElementById('sr-bg-dim').value = dim; document.getElementById('sr-bg-dim-v').textContent = dim + '%';
}
document.getElementById('btn-sr-bg').addEventListener('click', () => document.getElementById('sr-bg-file').click());
document.getElementById('sr-bg-file').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    const img = await loadImageFromFile(file);
    const cv = await ImgEd.open({ img, W: 1280, H: 860, title: t('srBgTitle'), mode: 'cover', bg: '#111111' });
    if (!cv) return;
    const url = canvasToLimitedUrl(cv, 'image/jpeg', 440 * 1024, [1, 0.8, 0.64]);
    const r = url ? await window.api.pageBgSave(url) : { error: 'bad_image' };
    if (!r || !r.ok) { uiAlert(t('brandLogoBad')); return; }
    renderSrBg();
  } catch (err) { uiAlert(t('brandLogoBad')); }
});
document.getElementById('btn-sr-bg-rm').addEventListener('click', async () => { await window.api.pageBgSave(null); renderSrBg(); });
document.getElementById('sr-bg-dim').addEventListener('input', (e) => { document.getElementById('sr-bg-dim-v').textContent = e.target.value + '%'; const pv = document.getElementById('sr-bg-pv'); const d = Number(e.target.value) / 100; if (pageBgUrl) pv.style.backgroundImage = `linear-gradient(rgba(8,9,13,${d}),rgba(8,9,13,${d})),url("${pageBgUrl}")`; });
document.getElementById('sr-bg-dim').addEventListener('change', async (e) => { await window.api.saveSettings({ reg_page_bg_dim: String(e.target.value) }); });
function renderBrandLogoBox() {
  const pv = document.getElementById('brand-logo-preview'); if (!pv) return;
  pv.innerHTML = currentBrandLogo ? `<img src="${currentBrandLogo}" alt="">` : `<span>${NichesModule.getNiche(currentNicheId).emoji}</span>`;
  document.getElementById('btn-brand-logo-remove').style.display = currentBrandLogo ? '' : 'none';
  document.getElementById('btn-brand-logo-edit').style.display = currentBrandLogo ? '' : 'none';
  document.getElementById('btn-brand-logo-upload').textContent = t(currentBrandLogo ? 'brandLogoChange' : 'brandLogoUpload');
}
// Логотип: вписываем в квадрат 512×512 с прозрачным фоном (PNG), не обрезая.
function makeBrandLogo(img) {
  for (const size of [512, 384, 256]) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const k = Math.min(size / img.width, size / img.height);
    const w = img.width * k, h = img.height * k;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    const url = cv.toDataURL('image/png');
    if (url.length * 0.75 <= 650 * 1024) return url;
  }
  return null;
}
document.getElementById('btn-brand-logo-upload').addEventListener('click', () => document.getElementById('brand-logo-file').click());
async function editBrandLogo(img) {
  const statusEl = document.getElementById('brand-settings-status');
  const cv = await ImgEd.open({ img, W: 512, H: 512, title: t('ieLogoTitle'), mode: 'contain', bg: 'transparent', bgChoices: true });
  if (!cv) return;
  const url = canvasToLimitedUrl(cv, 'image/png', 650 * 1024, [1, 0.75, 0.5]);
  const r = url ? await window.api.brandLogoSave(url) : { error: 'bad_image' };
  if (!r || !r.ok) { statusEl.textContent = t('brandLogoBad'); return; }
  await loadBrandLogo(); renderBrandLogoBox();
  statusEl.textContent = t('settingsSaved'); setTimeout(() => statusEl.textContent = '', 2000);
  // Логотип загружали из мастера «Первые шаги» — показываем его там сразу.
  if (typeof ws !== 'undefined' && ws && WS_STEPS[ws.step] === 'brand' && document.getElementById('lx-setup').style.display !== 'none') renderSetup();
}
document.getElementById('brand-logo-file').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0]; e.target.value = '';
  if (!file) return;
  try { const img = await loadImageFromFile(file); imgOriginals.brand = img; await editBrandLogo(img); }
  catch (err) { document.getElementById('brand-settings-status').textContent = t('brandLogoBad'); }
});
document.getElementById('btn-brand-logo-edit').addEventListener('click', async () => {
  const img = imgOriginals.brand || (currentBrandLogo && await loadImageFromUrl(currentBrandLogo).catch(() => null));
  if (img) editBrandLogo(img);
});
document.getElementById('btn-brand-logo-remove').addEventListener('click', async () => {
  await window.api.brandLogoSave(null);
  await loadBrandLogo(); renderBrandLogoBox();
});

function renderSettingsNicheGrid(activeId) {
  const grid = document.getElementById('settings-niche-grid');
  grid.innerHTML = Object.keys(NichesModule.NICHES).map(id => {
    const niche = NichesModule.getNiche(id);
    return `
      <button type="button" class="onboarding-niche-card ${id === activeId ? 'active' : ''}" data-niche="${id}">
        <span class="onboarding-niche-emoji">${niche.emoji}</span>
        <span>${niche.name[getLang()] || niche.name.ru}</span>
      </button>`;
  }).join('');
  grid.querySelectorAll('.onboarding-niche-card').forEach(btn => {
    btn.addEventListener('click', async () => {
      const current = await window.api.getSettings();
      await window.api.saveSettings({ ...current, business_niche: btn.dataset.niche });
      currentNicheId = btn.dataset.niche;
      // Картинки карточек у каждой ниши свои — сбрасываем кэш, чтобы не отдать старые.
      invalidateCardTemplatesCache();
      applyBrand();
      renderSettingsNicheGrid(btn.dataset.niche);
      const statusEl = document.getElementById('brand-settings-status');
      statusEl.textContent = t('settingsSaved');
      setTimeout(() => statusEl.textContent = '', 2000);
    });
  });
}

document.getElementById('btn-save-brand-name').addEventListener('click', async () => {
  const brandName = document.getElementById('brand-name-input').value.trim();
  const statusEl = document.getElementById('brand-settings-status');
  if (!brandName) { statusEl.textContent = t('brandNameRequired'); return; }
  const current = await window.api.getSettings();
  await window.api.saveSettings({ ...current, brand_name: brandName });
  currentBrandName = brandName;
  applyBrand();
  statusEl.textContent = t('settingsSaved');
  setTimeout(() => statusEl.textContent = '', 2000);
});


let onboardingSelectedNiche = null;
let onboardingSelectedTheme = 'gold';

// Первый запуск: 1) язык → 2) чем занимаетесь → 3) название → 4) оформление.
// Язык идёт первым, чтобы все следующие шаги уже были на нужном языке.
const ONBOARDING_STEPS = ['lang', 'region', 'niche', 'brand', 'needs', 'theme'];
const onboardingRegion = { country: 'OTHER', currency: 'EUR' };
function showOnboardingStep(step) {
  ONBOARDING_STEPS.forEach(id => {
    document.getElementById(`onboarding-step-${id}`).style.display = id === step ? 'block' : 'none';
  });
  const idx = ONBOARDING_STEPS.indexOf(step);
  document.querySelectorAll('#onboarding-steps .onboarding-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
    dot.classList.toggle('done', i < idx);
  });
  document.getElementById('onboarding-steps').title = t('onboardStep')(idx + 1, ONBOARDING_STEPS.length);
  const box = document.querySelector('#onboarding-overlay .onboarding-box');
  if (box) box.scrollTop = 0;
}

document.querySelectorAll('.onboarding-lang-card').forEach(btn => {
  btn.addEventListener('click', async () => {
    const lang = btn.dataset.lang;
    setLang(lang);
    langSelect.value = lang;
    applyTranslations();
    const s = await window.api.getSettings();
    await window.api.saveSettings({ ...s, app_language: lang });
    if (!onboardingRegion.picked) {
      onboardingRegion.country = s.business_country || defaultCountryForLang(lang);
      onboardingRegion.currency = s.region_confirmed === '1' && s.spend_currency ? s.spend_currency : COUNTRY_CURRENCY[onboardingRegion.country];
    }
    renderRegionPicker(document.getElementById('onboarding-region-box'), onboardingRegion);
    showOnboardingStep('region');
  });
});
document.getElementById('onboarding-back-region').addEventListener('click', () => showOnboardingStep('lang'));
document.getElementById('onboarding-region-next').addEventListener('click', async () => {
  onboardingRegion.picked = true;
  const s = await window.api.getSettings();
  const next = { ...s, business_country: onboardingRegion.country, spend_currency: onboardingRegion.currency, region_confirmed: '1' };
  await window.api.saveSettings(next);
  currentSpendCurrency = onboardingRegion.currency;
  applyCountryUi(next);
  renderOnboardingNicheGrid();
  showOnboardingStep('niche');
});

function renderOnboardingNicheGrid() {
  const grid = document.getElementById('onboarding-niche-grid');
  grid.innerHTML = Object.keys(NichesModule.NICHES).map(id => {
    const niche = NichesModule.getNiche(id);
    return `
      <button type="button" class="onboarding-niche-card ${id === onboardingSelectedNiche ? 'active' : ''}" data-niche="${id}">
        <span class="onboarding-niche-emoji">${niche.emoji}</span>
        <span>${niche.name[getLang()] || niche.name.ru}</span>
      </button>`;
  }).join('');
  grid.querySelectorAll('.onboarding-niche-card').forEach(btn => {
    btn.addEventListener('click', () => {
      onboardingSelectedNiche = btn.dataset.niche;
      const niche = NichesModule.getNiche(onboardingSelectedNiche);
      document.getElementById('onboarding-brand-emoji').textContent = niche.emoji;
      showOnboardingStep('brand');
      document.getElementById('onboarding-brand-input').focus();
    });
  });
}

// Превью темы в карточке: полоска сайдбара, фон экрана и акцентная кнопка.
const ONBOARDING_THEMES = ['glossy', 'gold', 'coffee', 'mint', 'ocean', 'berry', 'graphite'];
const THEME_LABEL_KEYS = { glossy: 'themeGlossy', gold: 'themeGold', coffee: 'themeCoffee', mint: 'themeMint', ocean: 'themeOcean', berry: 'themeBerry', graphite: 'themeGraphite' };
function renderOnboardingThemeGrid() {
  const grid = document.getElementById('onboarding-theme-grid');
  grid.innerHTML = ONBOARDING_THEMES.map(id => {
    const p = THEME_PRESETS[id];
    const surface = p.surface || (p.dark ? '#171b26' : '#ffffff');
    return `
      <button type="button" class="onboarding-theme-card ${id === onboardingSelectedTheme ? 'active' : ''}" data-theme="${id}">
        <span class="otc-preview" style="background:${p.screen}">
          <span class="otc-sidebar" style="background:${p.sidebar}"><i style="background:${p.primary}"></i><i></i><i></i></span>
          <span class="otc-main">
            <span class="otc-card" style="background:${surface}"><b style="background:${p.text}"></b><b style="background:${p.text};opacity:.35"></b></span>
            <span class="otc-card" style="background:${surface}"><b style="background:${p.chartVisits}"></b><b style="background:${p.text};opacity:.35"></b></span>
            <span class="otc-btn" style="background:${p.primary}"></span>
          </span>
        </span>
        <span class="otc-name">${t(THEME_LABEL_KEYS[id])}</span>
        <span class="otc-tag">${p.dark ? t('themeDarkTag') : t('themeLightTag')}</span>
      </button>`;
  }).join('');
  grid.querySelectorAll('.onboarding-theme-card').forEach(btn => {
    btn.addEventListener('click', () => {
      onboardingSelectedTheme = btn.dataset.theme;
      applyTheme(THEME_PRESETS[onboardingSelectedTheme]);
      grid.querySelectorAll('.onboarding-theme-card').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
}

document.getElementById('onboarding-back-lang').addEventListener('click', () => showOnboardingStep('region'));
document.getElementById('onboarding-back').addEventListener('click', () => showOnboardingStep('niche'));
document.getElementById('onboarding-back-theme').addEventListener('click', () => showOnboardingStep('needs'));

document.getElementById('onboarding-brand-next').addEventListener('click', () => {
  const brandInput = document.getElementById('onboarding-brand-input');
  if (!brandInput.value.trim()) { brandInput.focus(); return; }
  renderNeedsList();
  showOnboardingStep('needs');
});
// ---------- 2.18: «Что вам нужно?» — лишнее прячем сразу ----------
const NEEDS = [
  { k: 'cards', ic: '🎟️', fixed: true }, { k: 'messages', ic: '✉️', fixed: true },
  { k: 'network', ic: '🏪' }, { k: 'staff', ic: '👥' }, { k: 'weather', ic: '🌦' }, { k: 'inventory', ic: '📦' }, { k: 'pos', ic: '🧾' }
];
let needsPicked = null;
function renderNeedsList() {
  if (!needsPicked) needsPicked = { network: false, staff: false, weather: !!(NichesModule.getNiche(onboardingSelectedNiche || 'other') || {}).showWeatherWidget, inventory: false, pos: false };
  const box = document.getElementById('needs-list');
  box.innerHTML = NEEDS.map(n => `<label class="need-item ${n.fixed ? 'fixed' : ''}"><input type="checkbox" data-k="${n.k}" ${n.fixed || needsPicked[n.k] ? 'checked' : ''} ${n.fixed ? 'disabled' : ''}><span class="need-ic">${n.ic}</span><span class="need-t"><b>${escapeHtml(t('need_' + n.k))}</b><small>${escapeHtml(t('need_' + n.k + 'D'))}</small></span></label>`).join('');
  box.querySelectorAll('input[data-k]').forEach(i => i.addEventListener('change', () => { if (!i.disabled) needsPicked[i.dataset.k] = i.checked; }));
}
document.getElementById('onboarding-back-needs').addEventListener('click', () => showOnboardingStep('brand'));
document.getElementById('onboarding-needs-next').addEventListener('click', () => { renderOnboardingThemeGrid(); showOnboardingStep('theme'); });
document.getElementById('onboarding-brand-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('onboarding-brand-next').click();
});

document.getElementById('onboarding-finish').addEventListener('click', async () => {
  const brandName = document.getElementById('onboarding-brand-input').value.trim();
  if (!brandName) { showOnboardingStep('brand'); return; }
  const preset = THEME_PRESETS[onboardingSelectedTheme] || THEME_PRESETS.gold;
  const current = await window.api.getSettings();
  await window.api.saveSettings({
    ...current,
    ...themeSettingsPayload(onboardingSelectedTheme, preset),
    business_niche: onboardingSelectedNiche || 'other',
    brand_name: brandName,
    app_language: getLang(),
    onboarding_completed: '1',
    ...(needsPicked ? { feature_network: needsPicked.network ? '1' : '0', feature_staff: needsPicked.staff ? '1' : '0', feature_weather: needsPicked.weather ? '1' : '0',
      feature_inventory: needsPicked.inventory ? '1' : '0', feature_pos: needsPicked.pos ? '1' : '0' } : {})
  });
  loadFeatures();
  applyTheme(preset);
  fillCustomThemeInputs(preset);
  highlightThemeSwatch(onboardingSelectedTheme);
  currentBrandName = brandName;
  currentNicheId = onboardingSelectedNiche || 'other';
  applyBrand();
  document.getElementById('onboarding-overlay').style.display = 'none';
  refreshDashboard();
  // Дальше — «Первые шаги»: карта, правило награды, импорт, QR и первый скан. Презентация — после них.
  openSetupWizard();
});

async function initOnboarding() {
  const settings = await window.api.getSettings();
  currentBrandName = settings.brand_name || 'Loya';
  currentNicheId = settings.business_niche || 'coffee';
  currentSpendCurrency = settings.spend_currency || 'EUR';
  syncCurrencySelects();
  applyBrand();
  if (settings.onboarding_completed === '1' && settings.region_confirmed !== '1') setTimeout(openRegionCheck, 1200);
  if (settings.onboarding_completed !== '1') {
    onboardingSelectedTheme = THEME_PRESETS[settings.theme_name] ? settings.theme_name : 'gold';
    // Отмечаем текущий язык (по умолчанию русский), но шаг всё равно показываем —
    // пользователь должен выбрать язык явно.
    document.querySelectorAll('.onboarding-lang-card').forEach(b => b.classList.toggle('active', b.dataset.lang === getLang()));
    showOnboardingStep('lang');
    document.getElementById('onboarding-overlay').style.display = 'flex';
  }
}

// ---------- Dashboard Builder: перетаскивание, изменение ширины, скрытие виджетов ----------
// Сетка на 12 колонок (см. .dashboard-grid в style.css). Ширина виджета — не произвольная,
// а одно из 4 допустимых значений (4/6/8/12 из 12 колонок) — так виджеты всегда аккуратно
// стыкуются и никогда не накладываются и не вылезают за пределы сетки. Порядок виджетов
// меняется перетаскиванием (реальный drag & drop, HTML5 Drag and Drop API) — сетка сама
// расставляет их по строкам в новом порядке (grid-auto-flow), поэтому свободные "дыры"
// и наложения тоже невозможны в принципе, а не только за счёт проверки.
const DASHBOARD_WIDGET_TITLES = {
  clientOfMonth: 'clientOfMonthLabel',
  statClients: 'statClients', statCards: 'statCards', statScans: 'statScans', statRewards: 'statRewards',
  weather: 'dashWidgetWeather', overdue: 'overdueHeading',
  birthdays: 'birthdaysHeading', recentActivity: 'recentActivityHeading', nameday: 'dashWidgetNameday',
  analyticsActive: 'statActiveClients', analyticsNew: 'statNewClientsMonth', analyticsReturning: 'statReturningClients',
  analyticsAvgVisits: 'statAvgVisits', analyticsDiscounts: 'statDiscountsUsed', clientActivityDonut: 'clientActivityHeading',
  inactive: 'dashWidgetInactive', topClients: 'topClientsHeading', topCards: 'topCardsHeading', topSpenders: 'topSpendersHeading',
  chartVisits: 'chartVisits', chartNewClients: 'chartNewClients', chartCardUsage: 'chartCardUsage', chartRewards: 'chartRewards',
  statRevenue: 'statRevenueMonth', statAvgCheck: 'statAvgCheck', chartRevenue: 'chartRevenue',
  loyaltyFunnel: 'funnelHeading', visitHeatmap: 'heatmapHeading', teamReport: 'teamReportHeading', attention: 'attnHeading', weekCompare: 'wkHeading'
};
// Главная — компактно: наверху только самое нужное каждый день, остальное — в разделах,
// которые сворачиваются и раскрываются по щелчку (состояние запоминается).
const DASHBOARD_DEFAULT_LAYOUT = [
  { id: 'statClients', width: 3, hidden: false },
  { id: 'statCards', width: 3, hidden: false },
  { id: 'statScans', width: 3, hidden: false },
  { id: 'statRewards', width: 3, hidden: false },
  { id: 'weekCompare', width: 12, hidden: false },
  { id: 'attention', width: 12, hidden: false },
  { id: 'birthdays', width: 6, hidden: false },
  { id: 'recentActivity', width: 6, hidden: false },
  { id: 'header-more', type: 'header', text: null, width: 12, hidden: false },
  { id: 'clientOfMonth', width: 12, hidden: false },
  { id: 'weather', width: 12, hidden: false },
  { id: 'overdue', width: 12, hidden: false },
  { id: 'nameday', width: 12, hidden: false },
  { id: 'inactive', width: 12, hidden: false },
  { id: 'header-analytics', type: 'header', text: null, width: 12, hidden: false },
  { id: 'analyticsActive', width: 4, hidden: false },
  { id: 'analyticsNew', width: 4, hidden: false },
  { id: 'analyticsReturning', width: 4, hidden: false },
  { id: 'analyticsAvgVisits', width: 4, hidden: false },
  { id: 'analyticsDiscounts', width: 4, hidden: false },
  { id: 'clientActivityDonut', width: 4, hidden: false },
  { id: 'statRevenue', width: 6, hidden: false },
  { id: 'statAvgCheck', width: 6, hidden: false },
  { id: 'loyaltyFunnel', width: 6, hidden: false },
  { id: 'topClients', width: 6, hidden: false },
  { id: 'topCards', width: 6, hidden: false },
  { id: 'topSpenders', width: 6, hidden: false },
  { id: 'teamReport', width: 12, hidden: false },
  { id: 'header-charts', type: 'header', text: null, width: 12, hidden: false },
  { id: 'chartVisits', width: 6, hidden: false },
  { id: 'chartNewClients', width: 6, hidden: false },
  { id: 'chartCardUsage', width: 6, hidden: false },
  { id: 'chartRewards', width: 6, hidden: false },
  { id: 'chartRevenue', width: 12, hidden: false },
  { id: 'visitHeatmap', width: 12, hidden: false }
];
// Виджеты, которые в 2.9 переехали в свёрнутый раздел «Напоминания и погода».
const DASH_MORE_IDS = ['clientOfMonth', 'weather', 'overdue', 'nameday', 'inactive'];
const DASH_WIDTH_OPTIONS = [2, 3, 4, 6, 8, 9, 12];
// text: null означает "используем перевод по умолчанию" (t(DASHBOARD_HEADER_DEFAULT_TEXT[id]));
// как только пользователь переименует заголовок, здесь появится его собственный текст,
// и он уже не будет меняться при смене языка приложения — это осознанный компромисс.
const DASHBOARD_HEADER_DEFAULT_TEXT = { 'header-more': 'moreHeadingDefault', 'header-analytics': 'analyticsHeadingDefault', 'header-charts': 'chartsHeadingDefault' };

function getDashboardGrid() { return document.getElementById('dashboard-grid'); }

// Единая точка, где ширина виджета применяется и в data-атрибут (для сохранения),
// и напрямую в стиль grid-column — так работает для ЛЮБОГО числа колонок от 1 до 12,
// а не только для заранее заданных в CSS вариантов (4/6/8/12).
// Сетка на самом деле 24 колонки, а ширина хранится в «двенадцатых» с шагом 0.5 —
// старые сохранённые раскладки (4/6/12…) работают как раньше, а тянуть мышкой можно
// намного плавнее (шаг ~4% ширины).
function applyWidgetWidth(el, width) {
  const clamped = Math.max(1.5, Math.min(12, Math.round(width * 2) / 2));
  el.dataset.width = String(clamped);
  el.style.gridColumn = `span ${Math.round(clamped * 2)}`;
  return clamped;
}

// Высота виджета: null — автоматически по содержимому, число — фиксированная в px.
function applyWidgetHeight(el, height) {
  if (!height) {
    delete el.dataset.height;
    el.style.height = '';
    el.classList.remove('dash-fixed-height');
    return null;
  }
  const h = Math.max(60, Math.round(height));
  el.dataset.height = String(h);
  el.style.height = h + 'px';
  el.classList.add('dash-fixed-height');
  return h;
}

// Виджет-заголовок (например "Аналитика") — в отличие от обычных виджетов, его нет
// заранее в статическом HTML: его может быть несколько, с любым текстом, поэтому
// создаётся в DOM по требованию, при первом же applyDashboardLayout с таким id.
function createHeaderWidgetEl(id, text) {
  const el = document.createElement('div');
  el.className = 'dash-widget dash-header-widget';
  el.dataset.widget = id;
  el.dataset.type = 'header';
  el.dataset.headerText = text;
  const span = document.createElement('span');
  span.className = 'dash-header-text';
  span.textContent = text;
  el.appendChild(span);
  const tog = document.createElement('button');
  tog.type = 'button';
  tog.className = 'dash-sec-toggle';
  tog.addEventListener('click', (e) => { e.stopPropagation(); toggleDashSection(id); });
  el.appendChild(tog);
  return el;
}

// ---------- Разделы главной: сворачиваются и раскрываются ----------
// Раздел — это всё, что стоит после заголовка до следующего заголовка. По умолчанию
// второстепенные разделы свёрнуты, чтобы главная помещалась на экран без прокрутки.
const DASH_COLLAPSED_DEFAULT = { 'header-more': false, 'header-analytics': false, 'header-charts': false };   // v2.15: по умолчанию всё развёрнуто
let dashCollapsed = { ...DASH_COLLAPSED_DEFAULT };
async function loadDashCollapsed() {
  try {
    const s = await window.api.getSettings();
    if (s.dashboard_collapsed) dashCollapsed = { ...DASH_COLLAPSED_DEFAULT, ...JSON.parse(s.dashboard_collapsed) };
  } catch (e) { dashCollapsed = { ...DASH_COLLAPSED_DEFAULT }; }
  applyDashSections();
}
function applyDashSections() {
  const grid = getDashboardGrid();
  if (!grid) return;
  let cur = null;
  const counts = new Map();
  grid.querySelectorAll(':scope > .dash-widget').forEach(el => {
    if (el.dataset.type === 'header') { cur = el; counts.set(el, 0); return; }
    const collapsed = !!(cur && dashCollapsed[cur.dataset.widget]);
    el.classList.toggle('sec-collapsed', collapsed);
    // считаем только то, что реально показывается (не скрыто вручную и не выключено возможностями)
    if (cur && el.dataset.hidden !== '1' && el.style.display !== 'none') counts.set(cur, counts.get(cur) + 1);
  });
  counts.forEach((n, h) => {
    const collapsed = !!dashCollapsed[h.dataset.widget];
    h.classList.toggle('sec-is-collapsed', collapsed);
    const tog = h.querySelector('.dash-sec-toggle');
    if (!tog) return;
    tog.textContent = collapsed ? t('dashSecShow')(n) : t('dashSecHide');
    tog.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    tog.style.display = n ? '' : 'none';
  });
}
async function toggleDashSection(id) {
  dashCollapsed[id] = !dashCollapsed[id];
  applyDashSections();
  try {
    const s = await window.api.getSettings();
    await window.api.saveSettings({ ...s, dashboard_collapsed: JSON.stringify(dashCollapsed) });
  } catch (e) { /* не сохранилось — останется до перезапуска */ }
}

function applyDashboardLayout(layout) {
  const grid = getDashboardGrid();
  const widgets = {};
  grid.querySelectorAll(':scope > .dash-widget').forEach(el => { widgets[el.dataset.widget] = el; });
  layout.forEach(item => {
    let el = widgets[item.id];
    if (!el && item.type === 'header') {
      const text = item.text || t(DASHBOARD_HEADER_DEFAULT_TEXT[item.id] || 'dashNewHeaderDefault');
      el = createHeaderWidgetEl(item.id, text);
      // Заголовок по умолчанию (не переименованный) переводится при смене языка.
      if (!item.text && DASHBOARD_HEADER_DEFAULT_TEXT[item.id]) el.dataset.defaultText = '1';
      grid.appendChild(el);
      widgets[item.id] = el;
    }
    if (!el) return;
    applyWidgetWidth(el, item.width || 12);
    applyWidgetHeight(el, item.height || null);
    el.dataset.hidden = item.hidden ? '1' : '0';
    grid.appendChild(el); // переставляем в DOM в порядке layout — grid сам расставит по строкам
  });
  applyDashSections();
}

function readDashboardLayoutFromDom() {
  const grid = getDashboardGrid();
  return Array.from(grid.querySelectorAll(':scope > .dash-widget')).map(el => {
    const item = {
      id: el.dataset.widget,
      width: Number(el.dataset.width) || 12,
      hidden: el.dataset.hidden === '1'
    };
    if (el.dataset.height) item.height = Number(el.dataset.height);
    if (el.dataset.type === 'header') {
      item.type = 'header';
      item.text = el.dataset.defaultText === '1' ? null : (el.dataset.headerText || el.querySelector('.dash-header-text').textContent);
    }
    return item;
  });
}

async function initDashboardLayout() {
  const s = await window.api.getSettings();
  let layout = DASHBOARD_DEFAULT_LAYOUT;
  if (s.dashboard_layout) {
    try {
      const saved = JSON.parse(s.dashboard_layout);
      // Сохранённый layout мог быть создан до появления нового виджета — на всякий случай
      // добавляем в конец любые виджеты по умолчанию, которых нет в сохранённом списке.
      // Раньше заголовки разделов сохранялись текстом на языке, который был в тот момент, —
      // если текст совпадает со стандартным на любом из 4 языков, считаем его стандартным.
      saved.forEach(w => {
        const key = DASHBOARD_HEADER_DEFAULT_TEXT[w.id];
        if (w.type === 'header' && key && w.text && Object.values(I18N).some(dict => dict[key] === w.text)) w.text = null;
      });
      // До 2.9 раздела «Напоминания и погода» не было: переносим туда его виджеты
      // (ширину и «скрыт» сохраняем), сам раздел ставим перед «Аналитикой».
      if (!saved.some(w => w.id === 'header-more')) {
        const moved = DASH_MORE_IDS.map(id => saved.find(w => w.id === id)).filter(Boolean);
        const rest = saved.filter(w => !DASH_MORE_IDS.includes(w.id));
        let at = rest.findIndex(w => w.id === 'header-analytics');
        if (at < 0) at = rest.length;
        rest.splice(at, 0, { id: 'header-more', type: 'header', text: null, width: 12, hidden: false }, ...moved);
        saved.length = 0; saved.push(...rest);
      }
      const savedIds = new Set(saved.map(w => w.id));
      layout = saved.slice();
      DASHBOARD_DEFAULT_LAYOUT.forEach((w, i) => {
        if (savedIds.has(w.id)) return;
        // ставим новый виджет сразу после его соседа по раскладке «по умолчанию»
        let pos = layout.length;
        for (let j = i - 1; j >= 0; j--) { const k = layout.findIndex(x => x.id === DASHBOARD_DEFAULT_LAYOUT[j].id); if (k >= 0) { pos = k + 1; break; } }
        layout.splice(pos, 0, w);
      });
    } catch (err) { layout = DASHBOARD_DEFAULT_LAYOUT; }
  }
  applyDashboardLayout(layout);
}

function buildWidgetToolbar(el) {
  if (el.querySelector(':scope > .dash-widget-toolbar')) return; // уже есть
  const toolbar = document.createElement('div');
  toolbar.className = 'dash-widget-toolbar';

  const handle = document.createElement('span');
  handle.className = 'dash-widget-drag-handle';
  handle.textContent = '⠿';
  handle.title = t('dashDragHint');
  toolbar.appendChild(handle);

  const select = document.createElement('select');
  select.className = 'dash-widget-width-select';
  DASH_WIDTH_OPTIONS.forEach(w => {
    const opt = document.createElement('option');
    opt.value = String(w);
    opt.textContent = w === 12 ? t('dashWidthFull') : `${Math.round(w / 12 * 100)}%`;
    select.appendChild(opt);
  });
  syncWidthSelect(select, el.dataset.width || '12');
  select.addEventListener('change', () => { applyWidgetWidth(el, Number(select.value)); });
  toolbar.appendChild(select);

  const autoHBtn = document.createElement('button');
  autoHBtn.type = 'button';
  autoHBtn.className = 'dash-widget-autoh-btn';
  autoHBtn.textContent = '↕';
  autoHBtn.title = t('dashAutoHeight');
  autoHBtn.addEventListener('click', () => applyWidgetHeight(el, null));
  toolbar.appendChild(autoHBtn);

  if (el.dataset.type === 'header') {
    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'dash-widget-rename-btn';
    renameBtn.textContent = '✏️';
    renameBtn.title = t('dashRenameHeader');
    renameBtn.addEventListener('click', async () => {
      const span = el.querySelector('.dash-header-text');
      const newText = await uiPrompt(t('dashRenameHeaderPrompt'), span.textContent);
      if (newText && newText.trim()) {
        span.textContent = newText.trim();
        el.dataset.headerText = newText.trim();
        delete el.dataset.defaultText;
      }
    });
    toolbar.appendChild(renameBtn);
  }

  const hideBtn = document.createElement('button');
  hideBtn.type = 'button';
  hideBtn.className = 'dash-widget-hide-btn';
  hideBtn.textContent = '✕';
  hideBtn.title = t('dashHideWidget');
  hideBtn.addEventListener('click', () => {
    el.dataset.hidden = '1';
    refreshHiddenChips();
  });
  toolbar.appendChild(hideBtn);

  el.prepend(toolbar);

}

function syncWidthSelect(select, value) {
  const v = String(Number(value));
  if (!Array.from(select.options).some(o => o.value === v)) {
    let custom = select.querySelector('option[data-custom]');
    if (!custom) { custom = document.createElement('option'); custom.dataset.custom = '1'; select.appendChild(custom); }
    custom.value = v;
    custom.textContent = `${Math.round(Number(v) / 12 * 100)}%`;
  }
  select.value = v;
}

function refreshHiddenChips() {
  const grid = getDashboardGrid();
  grid.querySelectorAll('.dash-widget-hidden-chip').forEach(c => c.remove());
  grid.querySelectorAll(':scope > .dash-widget[data-hidden="1"]').forEach(el => {
    const chip = document.createElement('div');
    chip.className = 'dash-widget-hidden-chip';
    chip.dataset.hiddenFor = el.dataset.widget;
    const label = document.createElement('span');
    const headerText = el.dataset.type === 'header' ? (el.dataset.headerText || '') : '';
    label.textContent = '🙈 ' + (headerText || t(DASHBOARD_WIDGET_TITLES[el.dataset.widget] || 'dashWidgetHidden'));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = t('dashShowWidget');
    btn.addEventListener('click', () => {
      el.dataset.hidden = '0';
      chip.remove();
    });
    chip.appendChild(label);
    chip.appendChild(btn);
    el.after(chip);
  });
}

// ---------- Редактор главной: рамка с ручками и зоны переноса ----------
// Щелчок по виджету — выделение (синяя рамка и 8 ручек). Ручки меняют размер: по горизонтали —
// ширину (шаг сетки), по вертикали — высоту. Виджет переносится за любое место: пока тянете,
// на месте, куда он встанет, видна пунктирная зона. Двойной щелчок по нижней ручке — авто-высота.
let dwSelected = null;
const DW_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
function dwHandles(el) {
  if (el.querySelector(':scope > .dw-h')) return;
  DW_HANDLES.forEach(dir => {
    const h = document.createElement('div');
    h.className = `dw-h dw-h-${dir}`;
    h.dataset.dir = dir;
    h.title = t('dashResizeHint2');
    h.addEventListener('pointerdown', (e) => dwStartResize(e, el, dir));
    if (dir.includes('s') || dir.includes('n')) h.addEventListener('dblclick', (e) => { e.stopPropagation(); applyWidgetHeight(el, null); });
    el.appendChild(h);
  });
}
function dwSelect(el) {
  const grid = getDashboardGrid();
  grid.querySelectorAll('.dw-selected').forEach(x => { if (x !== el) x.classList.remove('dw-selected'); });
  dwSelected = el || null;
  if (el) el.classList.add('dw-selected');
}
function dwShowSize(el, x, y) {
  let badge = document.querySelector('.dash-size-badge');
  if (!badge) { badge = document.createElement('div'); badge.className = 'dash-size-badge'; document.body.appendChild(badge); }
  const pct = Math.round(Number(el.dataset.width) / 12 * 100);
  const hTxt = el.dataset.height ? `${el.dataset.height} px` : t('dashAutoHeightShort');
  badge.textContent = `${pct}% × ${hTxt}`;
  badge.style.left = (x + 14) + 'px';
  badge.style.top = (y + 14) + 'px';
}
function dwHideSize() { const b = document.querySelector('.dash-size-badge'); if (b) b.remove(); }

function dwStartResize(e, el, dir) {
  if (e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  dwSelect(el);
  const grid = getDashboardGrid();
  const gridRect = grid.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;
  const colW = (gridRect.width - gap * 23) / 24;
  const startX = e.clientX, startY = e.clientY;
  const horiz = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0;
  const vert = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0;
  const select = el.querySelector('.dash-widget-width-select');
  el.classList.add('resizing');
  document.body.classList.add('dash-resizing');
  document.body.style.cursor = getComputedStyle(e.target).cursor;
  function onMove(ev) {
    if (horiz) {
      const widthPx = Math.max(colW, rect.width + horiz * (ev.clientX - startX));
      const span = Math.round((widthPx + gap) / (colW + gap));
      const applied = applyWidgetWidth(el, span / 2);
      if (select) syncWidthSelect(select, applied);
    }
    if (vert) applyWidgetHeight(el, rect.height + vert * (ev.clientY - startY));
    dwShowSize(el, ev.clientX, ev.clientY);
  }
  function onUp() {
    el.classList.remove('resizing');
    document.body.classList.remove('dash-resizing');
    document.body.style.cursor = '';
    dwHideSize();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  onMove(e);
}

function dwStartMove(e, el) {
  if (e.button !== 0) return;
  if (e.target.closest('.dw-h, select, button, input, a, .dash-widget-toolbar select')) return;
  const grid = getDashboardGrid();
  dwSelect(el);
  const startX = e.clientX, startY = e.clientY;
  let zone = null;
  let started = false;
  const rect = el.getBoundingClientRect();
  function begin() {
    started = true;
    zone = document.createElement('div');
    zone.className = 'dash-drop-zone';
    zone.style.gridColumn = el.style.gridColumn;
    zone.style.height = Math.min(rect.height, 220) + 'px';
    el.after(zone);
    // сам виджет «вынимаем» из сетки — на его месте остаётся только пунктирная зона
    Object.assign(el.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', margin: '0' });
    el.classList.add('dw-dragging');
    document.body.classList.add('dash-moving');
  }
  function onMove(ev) {
    if (!started) {
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return;
      begin();
    }
    el.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px)`;
    // куда встанет: ищем виджет под курсором (кроме самого перетаскиваемого)
    el.style.pointerEvents = 'none';
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    el.style.pointerEvents = '';
    const target = under && under.closest('.dashboard-grid > .dash-widget');
    if (target && target !== el) {
      const r = target.getBoundingClientRect();
      const wide = r.width > grid.getBoundingClientRect().width * 0.7;
      const before = wide ? ev.clientY < r.top + r.height / 2 : ev.clientX < r.left + r.width / 2;
      if (before) { if (target.previousElementSibling !== zone) target.before(zone); }
      else if (target.nextElementSibling !== zone) target.after(zone);
    }
  }
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (!started) return;
    el.style.transform = '';
    ['position', 'left', 'top', 'width', 'margin'].forEach(k => { el.style[k] = ''; });
    el.style.height = el.dataset.height ? el.dataset.height + 'px' : '';
    el.classList.remove('dw-dragging');
    document.body.classList.remove('dash-moving');
    zone.replaceWith(el);
    // скрытые виджеты держат «чипы» рядом с собой — пересобираем
    refreshHiddenChips();
    applyDashSections();
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function dwBind(el) {
  if (el.dataset.dwBound) return;
  el.dataset.dwBound = '1';
  el.addEventListener('pointerdown', (e) => { if (getDashboardGrid().classList.contains('edit-mode')) dwStartMove(e, el); });
}

function enableDashboardDragDrop() {
  const grid = getDashboardGrid();
  grid.querySelectorAll(':scope > .dash-widget').forEach(el => { el.draggable = false; dwHandles(el); dwBind(el); });
}

function enterDashboardEditMode() {
  const grid = getDashboardGrid();
  grid.classList.add('edit-mode');
  grid.querySelectorAll(':scope > .dash-widget').forEach(buildWidgetToolbar);
  refreshHiddenChips();
  enableDashboardDragDrop();
  dwSelect(null);
  document.getElementById('dash-edit-toolbar').style.display = 'flex';
}

async function exitDashboardEditMode(save) {
  const grid = getDashboardGrid();
  grid.classList.remove('edit-mode');
  dwSelect(null);
  grid.querySelectorAll('.dash-widget-hidden-chip').forEach(c => c.remove());
  applyDashSections();
  document.getElementById('dash-edit-toolbar').style.display = 'none';
  if (save) {
    const layout = readDashboardLayoutFromDom();
    const current = await window.api.getSettings();
    await window.api.saveSettings({ ...current, dashboard_layout: JSON.stringify(layout) });
  }
}

document.getElementById('btn-toggle-dash-edit').addEventListener('click', enterDashboardEditMode);
document.addEventListener('pointerdown', (e) => {
  const grid = getDashboardGrid();
  if (grid.classList.contains('edit-mode') && !e.target.closest('.dashboard-grid > .dash-widget, .dash-edit-toolbar, .ui-dialog-overlay')) dwSelect(null);
});
document.getElementById('btn-dash-done').addEventListener('click', () => exitDashboardEditMode(true));
document.getElementById('btn-dash-add-header').addEventListener('click', async () => {
  const text = await uiPrompt(t('dashRenameHeaderPrompt'), t('dashNewHeaderDefault'));
  if (!text || !text.trim()) return;
  const grid = getDashboardGrid();
  const id = 'header-custom-' + Date.now();
  const el = createHeaderWidgetEl(id, text.trim());
  applyWidgetWidth(el, 12);
  grid.appendChild(el);
  buildWidgetToolbar(el);
  dwHandles(el); dwBind(el);
  dwSelect(el);
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});
document.getElementById('btn-dash-reset').addEventListener('click', async () => {
  if (!await uiConfirm(t('confirmResetDashboard'), { danger: true })) return;
  applyDashboardLayout(DASHBOARD_DEFAULT_LAYOUT);
  const current = await window.api.getSettings();
  await window.api.saveSettings({ ...current, dashboard_layout: JSON.stringify(DASHBOARD_DEFAULT_LAYOUT) });
  exitDashboardEditMode(false);
});

// ---------- старт ----------
initTheme();
initDashboardLayout().then(loadDashCollapsed);
decorateThemeSwatches();
initLanguage().then(refreshDashboard);
initOnboarding();
initStaffMode();
checkWhatsNew();
window.api.getSettings().then(s => {
  soundEnabled = s.sound_enabled !== '0';
  // Применяем последний известный статус блокировки сразу при старте (до того, как
  // придёт ответ свежей сетевой проверки) — если в прошлый раз было заблокировано,
  // не показываем рабочий интерфейс даже на долю секунды.
  // Чёрный экран остался только у версий, собранных под конкретного клиента (старый механизм). У подписки
  // вместо него — пробный режим с баннером «Подписаться».
  if (s.license_blocked === '1') window.api.licenseGetInfo().then(i => { if (i.legacy) applyLicenseStatus(true, s.license_message || ''); });
});
window.api.onLicenseMode((e, info) => { licenseMode = info; renderFreeBanner(); });
window.api.licenseMode().then(info => { licenseMode = info; renderFreeBanner(); });
setInterval(() => { if (licenseMode && licenseMode.mode === 'free') window.api.licenseMode().then(info => { licenseMode = info; renderFreeBanner(); }); }, 60 * 1000);

// ===================== Карты в Wallet: свой дизайн (логотип, картинка, цвет) =====================
const WD_COLORS = ['#20252d', '#000000', '#1f2a44', '#2b1d15', '#14261f', '#4a1630', '#6b4e30', '#f5efe0', '#ffffff'];
let wd = null, wdTab = 'google';
function wdIsLight(hex) { const c = hexToRgb(hex || '#20252d'); return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255 > 0.62; }
function wdLoadFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) { reject(new Error('type')); return; }
    if (file.size > 15 * 1024 * 1024) { reject(new Error('size')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}
function dataUrlBytes(u) { return Math.floor((u.length - u.indexOf(',') - 1) * 3 / 4); }
async function wdEditImage(kind, img) {
  const cv = kind === 'logo'
    ? await ImgEd.open({ img, W: 480, H: 480, title: t('ieWdLogoTitle'), mode: 'contain', round: wdTab === 'google', bg: 'transparent', bgChoices: true })
    : await ImgEd.open({ img, W: 1032, H: 336, title: t('ieWdHeroTitle'), mode: 'cover', bg: '#181c23' });
  if (!cv) return;
  const url = kind === 'logo' ? canvasToLimitedUrl(cv, 'image/png', 340 * 1024, [1, 0.75, 0.53]) : canvasToLimitedUrl(cv, 'image/jpeg', 580 * 1024);
  if (!url) { document.getElementById('wd-status').textContent = t('wdImgErr'); return; }
  wd[kind] = url; wd.changed[kind] = true;
  document.getElementById('wd-status').textContent = '';
  renderWdPreview();
  if (kind === 'hero') wdMatchHeroColor(true);
}
// Логотип: вписываем в квадрат (не обрезаем), прозрачный фон сохраняется.
function wdMakeLogo(img) {
  for (const size of [480, 360, 256]) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const k = Math.min(size / img.width, size / img.height);
    const w = img.width * k, h = img.height * k;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    const url = cv.toDataURL('image/png');
    if (dataUrlBytes(url) <= 340 * 1024) return url;
  }
  return null;
}
// Картинка: заполняем полосу 1032×336 (лишнее по краям обрезается).
function wdMakeHero(img) {
  const W = 1032, H = 336;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const k = Math.max(W / img.width, H / img.height);
  const w = img.width * k, h = img.height * k;
  ctx.fillStyle = '#181c23'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  for (const q of [0.86, 0.76, 0.64, 0.52]) { const url = cv.toDataURL('image/jpeg', q); if (dataUrlBytes(url) <= 580 * 1024) return url; }
  return null;
}
function wdHeroHtml(st) {
  const S = st || wd;
  const accent = S.brandColor || '#d4af37';
  const target = Math.max(2, Math.min(12, S.sampleTarget || 8)), filled = S.sampleFilled != null ? S.sampleFilled : Math.round(target * 0.62);
  const stamps = Array.from({ length: target }, (_, i) => `<i class="${i < filled ? 'on' : ''}${i === target - 1 ? ' gift' : ''}" style="${i < filled ? `background:${accent}` : i === target - 1 ? `border-color:${accent};color:${accent}` : ''}">${i < filled ? '✓' : i === target - 1 ? '🎁' : ''}</i>`).join('');
  const overlay = `<div class="wd-hero-over"><b>${escapeHtml(S.brandName)}</b><div class="wd-stamps">${stamps}</div></div>`;
  if (S.hero) return `<div class="wd-hero" style="background-image:url('${S.hero}')">${S.heroStamps ? `<div class="wd-hero-shade"></div>${overlay}` : ''}</div>`;
  return `<div class="wd-hero wd-hero-default">${overlay}</div>`;
}
function wdLogoHtml(cls, st) {
  const S = st || wd;
  // 2.27: свой логотип для Wallet не выбран — показываем логотип заведения (его же отправим на карту гостя)
  const lg = S.logo || currentBrandLogo;
  return lg ? `<span class="${cls}" style="background-image:url('${lg}')"></span>` : `<span class="${cls} wd-logo-loya">L</span>`;
}
// 2.25: карта рисуется по тому же модулю, что и настоящая карта на сервере (src/card-model.js = api/_cardModel.js):
// те же строки, тот же баннер со штампами/скидкой/уровнем. Поэтому превью — один в один с картой гостя.
let wdCardSettings = {};
function walletShowsTier(st) { return st.wallet_show_tier === '1' || (st.wallet_show_tier !== '0' && st.tier_perks_on === '1'); }
function sampleCardFrom(st) {
  const ct = st.selfreg_card_type || 'stamp';
  const c = { code: 'LC-PREVIEW', client_name: t('wdSampleName'), title: '', lang: getLang() };
  if (ct === 'discount') Object.assign(c, { type: 'discount', discount_percent: Number(st.selfreg_discount_percent) || 5, title: st.selfreg_discount_title || '' });
  else if (ct === 'spend') { const tg = Number(st.selfreg_spend_target) || 500; Object.assign(c, { type: 'spend', spend_target: tg, spend_accumulated: Math.round(tg * 0.4), bonus_balance: 0, spend_bonus_points: Number(st.selfreg_spend_points) || 1, title: st.selfreg_spend_title || '' }); }
  else { const tg = Math.max(2, Math.min(30, Number(st.selfreg_stamp_target) || 10)); Object.assign(c, { type: 'stamp', stamp_target: tg, stamp_count: Math.min(3, tg - 1), title: st.selfreg_stamp_title || '', discount_percent: ct === 'combo' ? (Number(st.selfreg_discount_percent) || 5) : 0 }); }
  if (walletShowsTier(st)) c.tier = 'silver';
  if (st.wallet_show_next === '1') { c.tier_next = 'gold'; c.tier_next_left = 12; }
  return c;
}
function heroImgSrc(S, card) {
  const brand = { name: S.brandName || 'Loya', color: S.brandColor || '#d4af37', currency: currentSpendCurrency || 'EUR', ...(S.look || {}), logoImage: S.logo || currentBrandLogo || '' };
  let svg = LoyaCard.buildHeroSvg({ card, brand, niche: S.niche || currentNicheId || 'other', lang: card.lang || getLang(), bgImage: S.hero || null, showProgress: S.heroStamps !== false });
  svg = svg.replace(/font-family="Carlito"/g, 'font-family="Carlito, Calibri, \'Segoe UI\', Arial, sans-serif"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function heroImgHtml(S, card) {
  if (!window.LoyaCard) return '';
  if (S === wd) wd._pvCard = card;
  return `<img class="wd-hero-img" alt="" draggable="false" src="${heroImgSrc(S, card)}">`;
}
function wdPassHtml(S, tab, card) {
  card = card || sampleCardFrom(wdCardSettings);
  // настраивают штампы — показываем штамп-карту, даже если для новых гостей выбрана другая
  if (S.forceStamp && card.type !== 'stamp') Object.assign(card, { type: 'stamp', stamp_target: 8, stamp_count: 5, discount_percent: 0 });
  const bg = S.bgColor || '#20252d';
  const light = wdIsLight(bg);
  const fg = light ? '#141414' : '#ffffff', sub = light ? 'rgba(20,20,20,.62)' : 'rgba(255,255,255,.66)';
  const qr = `<div class="wd-qr"><div class="wd-qr-in"></div></div>`;
  const M = window.LoyaCard ? LoyaCard.passModel(card, { name: S.brandName || 'Loya', currency: currentSpendCurrency || 'EUR', ...(S.look || {}) }, card.lang || getLang()) : null;
  if (!M) return '';
  const mod = (m) => `<span class="wd-mod"><small style="color:${sub}">${escapeHtml(m.header)}</small><b>${escapeHtml(m.body)}</b></span>`;
  if (tab !== 'apple') {
    const front = M.modules.filter(m => m.id !== 'rule').slice(0, 4);
    return `<div class="wd-pass wd-google" style="background:${bg};color:${fg}">
      <div class="wd-g-top">${wdLogoHtml('wd-logo wd-logo-circle', S)}<span>${escapeHtml(M.cardTitle)}</span></div>
      <div class="wd-g-sub" style="color:${sub}">${escapeHtml(M.subheader)}</div>
      <div class="wd-g-name">${escapeHtml(M.header)}</div>
      <div class="wd-mods">${front.map(mod).join('')}</div>
      ${qr}
      <div class="wd-hero-box">${heroImgHtml(S, card)}</div>
    </div>`;
  }
  const lab = light ? '#464646' : (S.brandColor || '#d4af37');
  const amod = (m) => `<span class="wd-mod"><small style="color:${lab}">${escapeHtml(m.header)}</small><b>${escapeHtml(m.body)}</b></span>`;
  const heads = M.modules.filter(m => ['progress', 'discount', 'bonus'].includes(m.id)).slice(0, 2);
  const sec = [{ header: t('wdClientLabel'), body: M.header }].concat(M.tier ? [{ header: TEXT_TIER_LABEL(), body: M.tier }] : [], [{ header: M.typeName, body: card.title || '—' }]);
  return `<div class="wd-pass wd-apple" style="background:${bg};color:${fg}">
      <div class="wd-a-top">${wdLogoHtml('wd-logo wd-logo-sq', S)}<span class="wd-a-name">${escapeHtml(M.cardTitle)}</span>
        <span class="wd-a-heads">${heads.map(amod).join('')}</span></div>
      <div class="wd-hero-box">${heroImgHtml(S, card)}</div>
      <div class="wd-a-fields">${sec.map(amod).join('')}</div>
      ${M.next ? `<div class="wd-a-fields">${amod(M.next)}</div>` : ''}
      ${qr}
    </div>`;
}
function TEXT_TIER_LABEL() { try { return LoyaCard.TEXT[getLang()].hTier; } catch (e) { return 'Tier'; } }
// ---------- 2.27: вид карты — значок штампа, подарок, цвет штампов, подпись, раскладка, праздники ----------
const WD_REWARD_IDS = ['gift', 'coffee', 'takeaway', 'tea', 'wine', 'bottle', 'cocktail', 'beer', 'cupcake', 'icecream', 'donut', 'bakery', 'pizza', 'burger', 'sushi', 'star', 'crown', 'heart', 'diamond', 'scissors', 'polish', 'bone'];
const WD_STAMP_COLORS = ['#ffffff', '#f6d77a', '#ff8a3d', '#d24b2f', '#ff4f86', '#9b6bff', '#4fc3f7', '#2f8f5b', '#1b1813'];
const WD_SEASON_IC = { none: '—', auto: '📅', xmas: '🎄', newyear: '🎆', winter: '❄️', valentine: '💘', march8: '🌷', easter: '🥚', spring: '🌸', summer: '☀️', autumn: '🍂', halloween: '🎃' };
const WD_NICHE_ICON = { coffee: 'coffee', bakery: 'bakery', barber: 'scissors', nails: 'polish', spa: 'flower', sushi: 'sushi', pizza: 'pizza', grocery: 'star', travel: 'star', tattoo: 'star', fitness: 'dumbbell', petgroom: 'paw', photo: 'star', clothing: 'shirt', other: 'star' };
const WD_ICON_NAMES = {
  ru: { check: 'Галочка', coffee: 'Чашка кофе', takeaway: 'Стаканчик', tea: 'Чай', wine: 'Бокал вина', bottle: 'Бутылка вина', cocktail: 'Коктейль', beer: 'Пиво', paw: 'Лапка', bone: 'Косточка', cat: 'Котик', fish: 'Рыбка', heart: 'Сердце', star: 'Звезда', smile: 'Улыбка', flower: 'Цветок', leaf: 'Листик', scissors: 'Ножницы', polish: 'Лак для ногтей', lipstick: 'Помада', drop: 'Капля', dumbbell: 'Гантель', pizza: 'Пицца', burger: 'Бургер', bakery: 'Хлеб', donut: 'Пончик', icecream: 'Мороженое', cupcake: 'Капкейк', sushi: 'Ролл', music: 'Нота', book: 'Книга', tooth: 'Зуб', car: 'Машина', shirt: 'Футболка', gamepad: 'Геймпад', gift: 'Подарок', crown: 'Корона', diamond: 'Бриллиант', snowflake: 'Снежинка', ornament: 'Ёлочный шар', pumpkin: 'Тыква', egg: 'Пасхальное яйцо' },
  uk: { check: 'Галочка', coffee: 'Чашка кави', takeaway: 'Стаканчик', tea: 'Чай', wine: 'Келих вина', bottle: 'Пляшка вина', cocktail: 'Коктейль', beer: 'Пиво', paw: 'Лапка', bone: 'Кісточка', cat: 'Котик', fish: 'Рибка', heart: 'Серце', star: 'Зірка', smile: 'Усмішка', flower: 'Квітка', leaf: 'Листочок', scissors: 'Ножиці', polish: 'Лак для нігтів', lipstick: 'Помада', drop: 'Крапля', dumbbell: 'Гантеля', pizza: 'Піца', burger: 'Бургер', bakery: 'Хліб', donut: 'Пончик', icecream: 'Морозиво', cupcake: 'Капкейк', sushi: 'Рол', music: 'Нота', book: 'Книга', tooth: 'Зуб', car: 'Автівка', shirt: 'Футболка', gamepad: 'Геймпад', gift: 'Подарунок', crown: 'Корона', diamond: 'Діамант', snowflake: 'Сніжинка', ornament: 'Ялинкова кулька', pumpkin: 'Гарбуз', egg: 'Писанка' },
  sk: { check: 'Fajka', coffee: 'Šálka kávy', takeaway: 'Pohárik', tea: 'Čaj', wine: 'Pohár vína', bottle: 'Fľaša vína', cocktail: 'Koktail', beer: 'Pivo', paw: 'Labka', bone: 'Kostička', cat: 'Mačka', fish: 'Rybka', heart: 'Srdce', star: 'Hviezda', smile: 'Úsmev', flower: 'Kvet', leaf: 'Lístok', scissors: 'Nožnice', polish: 'Lak na nechty', lipstick: 'Rúž', drop: 'Kvapka', dumbbell: 'Činka', pizza: 'Pizza', burger: 'Burger', bakery: 'Chlieb', donut: 'Šiška', icecream: 'Zmrzlina', cupcake: 'Muffin', sushi: 'Sushi', music: 'Nota', book: 'Kniha', tooth: 'Zub', car: 'Auto', shirt: 'Tričko', gamepad: 'Gamepad', gift: 'Darček', crown: 'Koruna', diamond: 'Diamant', snowflake: 'Vločka', ornament: 'Vianočná guľa', pumpkin: 'Tekvica', egg: 'Kraslica' },
  en: { check: 'Tick', coffee: 'Coffee cup', takeaway: 'Takeaway cup', tea: 'Tea', wine: 'Wine glass', bottle: 'Wine bottle', cocktail: 'Cocktail', beer: 'Beer', paw: 'Paw', bone: 'Bone', cat: 'Cat', fish: 'Fish', heart: 'Heart', star: 'Star', smile: 'Smile', flower: 'Flower', leaf: 'Leaf', scissors: 'Scissors', polish: 'Nail polish', lipstick: 'Lipstick', drop: 'Drop', dumbbell: 'Dumbbell', pizza: 'Pizza', burger: 'Burger', bakery: 'Bread', donut: 'Donut', icecream: 'Ice cream', cupcake: 'Cupcake', sushi: 'Sushi roll', music: 'Music note', book: 'Book', tooth: 'Tooth', car: 'Car', shirt: 'T-shirt', gamepad: 'Gamepad', gift: 'Gift', crown: 'Crown', diamond: 'Diamond', snowflake: 'Snowflake', ornament: 'Bauble', pumpkin: 'Pumpkin', egg: 'Easter egg' }
};
function wdIconName(id) { return (WD_ICON_NAMES[getLang()] || WD_ICON_NAMES.ru)[id] || id; }
function wdIconSvg(id) { return `<svg viewBox="0 0 40 40" aria-hidden="true">${LoyaCard.glyph(id, 20, 20, 31, 'currentColor', 'KNOCK').replace(/(fill|stroke)="KNOCK"/g, 'style="$1:var(--wd-knock)"')}</svg>`; }
function wdLook() { return (wd && wd.look) || {}; }
function wdSetLook(patch, stampy) {
  wd.look = { ...wdLook(), ...patch };
  Object.keys(wd.look).forEach(k => { if (!wd.look[k]) delete wd.look[k]; });
  if (stampy) wd.forceStamp = true;
  wd.changed.look = true;
  renderWdLook(); renderWdPreview();
}
function renderWdLook() {
  if (!wd || !window.LoyaCard) return;
  const L = wdLook();
  const ico = (id, cur, kind) => `<button type="button" class="wd-ico${cur === id ? ' active' : ''}" data-${kind}="${id}" role="radio" aria-checked="${cur === id}" title="${escapeHtml(wdIconName(id))}" aria-label="${escapeHtml(wdIconName(id))}">${wdIconSvg(id)}</button>`;
  const si = document.getElementById('wd-stamp-icons');
  si.innerHTML = LoyaCard.STAMP_IDS.map(id => ico(id, L.stamp || 'check', 'stamp')).join('');
  si.querySelectorAll('[data-stamp]').forEach(b => b.addEventListener('click', () => wdSetLook({ stamp: b.dataset.stamp === 'check' ? '' : b.dataset.stamp }, true)));
  const ri = document.getElementById('wd-reward-icons');
  ri.innerHTML = WD_REWARD_IDS.map(id => ico(id, L.reward || 'gift', 'reward')).join('');
  ri.querySelectorAll('[data-reward]').forEach(b => b.addEventListener('click', () => wdSetLook({ reward: b.dataset.reward === 'gift' ? '' : b.dataset.reward }, true)));
  const sc = document.getElementById('wd-stamp-colors');
  sc.innerHTML = `<button type="button" class="wd-color wd-color-auto${!L.stampColor ? ' active' : ''}" data-sc="" title="${escapeHtml(t('wdStampColorAuto'))}" style="--c:${escapeHtml(wd.brandColor || '#d4af37')}">A</button>` +
    WD_STAMP_COLORS.map(c => `<button type="button" class="wd-color${L.stampColor === c ? ' active' : ''}" data-sc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('') +
    `<label class="wd-color wd-color-custom${L.stampColor && !WD_STAMP_COLORS.includes(L.stampColor) ? ' active' : ''}" title="${escapeHtml(t('wdCustomColor'))}"><input type="color" id="wd-stamp-custom" value="${L.stampColor || '#ffffff'}" aria-label="${escapeHtml(t('wdCustomColor'))}">🎨</label>`;
  sc.querySelectorAll('[data-sc]').forEach(b => b.addEventListener('click', () => wdSetLook({ stampColor: b.dataset.sc }, true)));
  document.getElementById('wd-stamp-custom').addEventListener('change', (e) => wdSetLook({ stampColor: e.target.value }, true));
  const lab = document.getElementById('wd-stamp-label'); if (document.activeElement !== lab) lab.value = L.label || '';
  document.querySelectorAll('#wd-layouts .wd-layout-opt').forEach(b => b.classList.toggle('active', (L.layout || 'classic') === b.dataset.ly));
  const now = LoyaCard.seasonFor(new Date());
  const ss = document.getElementById('wd-seasons');
  ss.innerHTML = LoyaCard.SEASONS.map(id => `<button type="button" class="wd-season${(L.season || 'none') === id ? ' active' : ''}" data-se="${id}" role="radio" aria-checked="${(L.season || 'none') === id}"><span class="wd-se-ic">${WD_SEASON_IC[id]}</span><span class="wd-se-t">${escapeHtml(t('wdSeason_' + id))}${id === 'auto' ? `<small>${escapeHtml(t('wdSeasonNow')(t('wdSeason_' + now)))}</small>` : ''}</span></button>`).join('');
  ss.querySelectorAll('[data-se]').forEach(b => b.addEventListener('click', () => wdSetLook({ season: b.dataset.se === 'none' ? '' : b.dataset.se })));
  renderWdLogoTools();
}
document.getElementById('wd-stamp-label').addEventListener('input', (e) => { wd.look = { ...wdLook(), label: e.target.value.slice(0, 18) }; if (!wd.look.label.trim()) delete wd.look.label; wd.changed.look = true; wd.forceStamp = true; renderWdPreview(); });
document.querySelectorAll('#wd-layouts .wd-layout-opt').forEach(b => b.addEventListener('click', () => wdSetLook({ layout: b.dataset.ly === 'classic' ? '' : b.dataset.ly }, true)));
document.getElementById('wd-niche-icon').addEventListener('click', () => wdSetLook({ stamp: WD_NICHE_ICON[currentNicheId] || 'star' }, true));

// 2.28: готовые стили карты (общий список с веб-админкой — src/card-model.js)
function renderWdStyles() {
  const box = document.getElementById('wd-styles'); if (!box || !wd || !window.LoyaCard) return;
  const lang = getLang(), card = { type: 'stamp', stamp_count: 5, stamp_target: 8, lang };
  box.innerHTML = LoyaCard.PRESETS.map(p => {
    const pl = LoyaCard.presetLook(p.id, lang, {});
    const S = { ...wd, look: pl.look, logo: null };
    return `<button type="button" class="wd-style" data-ps="${p.id}"><span class="wd-style-pass" style="background:${p.bg}"><img alt="" src="${heroImgSrc({ ...S, brandName: wd.brandName }, card)}"></span><b>${escapeHtml(p.name[lang] || p.name.en)}</b></button>`;
  }).join('');
  box.querySelectorAll('[data-ps]').forEach(b => b.addEventListener('click', () => {
    const pl = LoyaCard.presetLook(b.dataset.ps, getLang(), wdLook());
    wd.bgColor = pl.bg; wd.look = pl.look; wd.forceStamp = true; wd.changed.look = true;
    box.querySelectorAll('.wd-style').forEach(x => x.classList.toggle('active', x === b));
    renderWdLook(); renderWdPreview();
    document.getElementById('wd-status').textContent = t('wdPresetApplied');
  }));
}
// 2.27: расположение штампов (для любого оформления) и логотип на картинке карты
const WD_ARRS = ['row', 'arc', 'wave', 'steps', 'garland', 'grid'];
function wdArrPic(id) {
  const pts = { row: [[6, 20], [16, 20], [26, 20], [36, 20], [46, 20]], arc: [[6, 25], [16, 17], [26, 14], [36, 17], [46, 25]], wave: [[6, 20], [16, 13], [26, 20], [36, 27], [46, 20]],
    steps: [[6, 28], [16, 24], [26, 20], [36, 16], [46, 12]], garland: [[8, 22], [18, 26], [28, 27], [38, 24], [46, 18]], grid: [[10, 14], [20, 14], [30, 14], [10, 27], [20, 27], [30, 27]] }[id];
  const rope = id === 'garland' ? '<path d="M2 12 Q 26 26 50 8" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".6"/>' + pts.map(([x, y]) => `<path d="M${x} ${y - 6}v3" stroke="currentColor" stroke-width="1" opacity=".6"/>`).join('') : '';
  return `<svg viewBox="0 0 52 40" aria-hidden="true">${rope}${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="currentColor"/>`).join('')}</svg>`;
}
function wdArrNow() { const L = wdLook(); return L.arrange || (L.season === 'xmas' || (L.season === 'auto' && LoyaCard.seasonFor(new Date()) === 'xmas') ? 'garland' : 'row'); }
function renderWdLogoTools() {
  const L = wdLook(), lm = L.logoMode || 'name';
  document.querySelectorAll('#wd-logo-mode [data-lm]').forEach(b => { b.classList.toggle('active', b.dataset.lm === lm); b.setAttribute('aria-checked', String(b.dataset.lm === lm)); });
  document.getElementById('wd-logo-tools').hidden = lm === 'name';
  document.getElementById('wd-logo-gnote').hidden = lm !== 'logo';
  const sz = L.logoSize || 72, rt = L.logoRot || 0;
  document.getElementById('wd-logo-size').value = sz; document.getElementById('wd-logo-size-v').textContent = sz;
  document.getElementById('wd-logo-rot').value = rt; document.getElementById('wd-logo-rot-v').textContent = rt + '°';
  document.getElementById('wd-logo-flip').classList.toggle('active', !!L.logoFlip);
  const ar = wdArrNow();
  const box = document.getElementById('wd-arrs');
  box.innerHTML = WD_ARRS.map(id => `<button type="button" class="wd-arr${ar === id ? ' active' : ''}" data-ar="${id}" role="radio" aria-checked="${ar === id}">${wdArrPic(id)}<span>${escapeHtml(t('wdArr_' + id))}</span></button>`).join('');
  box.querySelectorAll('[data-ar]').forEach(b => b.addEventListener('click', () => wdSetLook({ arrange: b.dataset.ar }, true)));
}
// Логотип двигается по картинке без перерисовки всей карты — меняем только сам рисунок баннера.
function wdHeroRefresh() {
  const img = document.querySelector('#wd-phone .wd-hero-img'); if (!img || !wd || !wd._pvCard) { renderWdPreview(); return; }
  img.src = heroImgSrc(wd, wd._pvCard);
}
document.querySelectorAll('#wd-logo-mode [data-lm]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.lm !== 'name' && !(wd.logo || currentBrandLogo)) { document.getElementById('wd-status').textContent = t('wdLogoNeedFile'); document.getElementById('wd-logo-pick').focus(); return; }
  wdSetLook({ logoMode: b.dataset.lm === 'name' ? '' : b.dataset.lm });
}));
document.getElementById('wd-logo-size').addEventListener('input', (e) => { wd.look = { ...wdLook(), logoSize: Number(e.target.value) }; wd.changed.look = true; document.getElementById('wd-logo-size-v').textContent = e.target.value; wdHeroRefresh(); });
document.getElementById('wd-logo-rot').addEventListener('input', (e) => { wd.look = { ...wdLook(), logoRot: Number(e.target.value) }; wd.changed.look = true; document.getElementById('wd-logo-rot-v').textContent = e.target.value + '°'; wdHeroRefresh(); });
document.getElementById('wd-logo-flip').addEventListener('click', () => wdSetLook({ logoFlip: wdLook().logoFlip ? '' : 1 }));
document.getElementById('wd-logo-reset').addEventListener('click', () => wdSetLook({ logoSize: '', logoRot: '', logoX: '', logoY: '', logoFlip: '' }));
(function wdLogoDrag() {
  const phone = document.getElementById('wd-phone');
  let drag = null;
  const pos = (e, box) => { const r = box.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1032), Math.round((e.clientY - r.top) / r.height * 336)]; };
  phone.addEventListener('pointerdown', (e) => {
    const box = e.target.closest('.wd-hero-box'); if (!box || !wd || !wdLook().logoMode) return;
    drag = { box, id: e.pointerId }; box.setPointerCapture(e.pointerId); e.preventDefault();
    const [x, y] = pos(e, box); wd.look = { ...wdLook(), logoX: x, logoY: y }; wd.changed.look = true; wdHeroRefresh();
  });
  phone.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const [x, y] = pos(e, drag.box); wd.look = { ...wdLook(), logoX: Math.max(0, Math.min(1032, x)), logoY: Math.max(0, Math.min(336, y)) }; wdHeroRefresh();
  });
  const end = () => { drag = null; };
  phone.addEventListener('pointerup', end); phone.addEventListener('pointercancel', end);
  phone.addEventListener('wheel', (e) => {
    if (!e.target.closest('.wd-hero-box') || !wd || !wdLook().logoMode) return;
    e.preventDefault();
    const sz = Math.max(24, Math.min(260, (wdLook().logoSize || 72) + (e.deltaY < 0 ? 6 : -6)));
    wd.look = { ...wdLook(), logoSize: sz }; wd.changed.look = true; renderWdLogoTools(); wdHeroRefresh();
  }, { passive: false });
})();


function renderWdPreview() {
  document.getElementById('wd-phone').innerHTML = wdPassHtml(wd, wdTab);
  const lt = document.getElementById('wd-logo-thumb'), ht = document.getElementById('wd-hero-thumb');
  lt.style.backgroundImage = wd.logo ? `url('${wd.logo}')` : ''; lt.classList.toggle('empty', !wd.logo);
  ht.style.backgroundImage = wd.hero ? `url('${wd.hero}')` : ''; ht.classList.toggle('empty', !wd.hero);
  document.getElementById('wd-logo-remove').disabled = !wd.logo;
  document.getElementById('wd-hero-remove').disabled = !wd.hero;
  document.getElementById('wd-logo-edit').disabled = !wd.logo;
  document.getElementById('wd-hero-edit').disabled = !wd.hero;
  document.getElementById('wd-match').disabled = !wd.hero;
  document.querySelectorAll('#wd-hero-presets .wd-preset').forEach(b => b.classList.toggle('active', !!wd.hero && wd.hero === wdPresetCache[b.dataset.p]));
  document.getElementById('wd-hero-stamps').checked = wd.heroStamps;
  document.querySelectorAll('#wd-colors .wd-color').forEach(b => b.classList.toggle('active', (b.dataset.color || '') === (wd.bgColor || '#20252d')));
  document.getElementById('wd-custom-color').value = wd.bgColor || '#20252d';
}
// 2.22: цвет карты под картинку — самый «весомый» насыщенный тон картинки, приглушённый, чтобы текст читался.
function wdPickColorFromImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const N = 48, cv = document.createElement('canvas'); cv.width = N; cv.height = Math.max(8, Math.round(N * img.height / img.width));
        const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const buckets = new Map();
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
          const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
          const w = 1 + sat * 1.5;
          const x = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          x.n += w; x.r += r * w; x.g += g * w; x.b += b * w; buckets.set(key, x);
        }
        let best = null; buckets.forEach(x => { if (!best || x.n > best.n) best = x; });
        if (!best) { resolve(''); return; }
        let r = best.r / best.n, g = best.g / best.n, b = best.b / best.n;
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        // средние тона хуже всего читаются — уводим к тёмному (чаще) или к светлому краю
        const k = lum > 0.72 ? 0 : lum > 0.5 ? -0.25 : lum > 0.28 ? -0.45 : -0.15;
        const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v)));
        resolve('#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''));
      } catch (e) { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}
async function wdMatchHeroColor(announce) {
  if (!wd || !wd.hero) return;
  const c = await wdPickColorFromImage(wd.hero);
  if (!c) return;
  wd.bgColor = c; renderWdPreview();
  if (announce) document.getElementById('wd-status').textContent = t('wdMatched');
}
document.getElementById('wd-match').addEventListener('click', () => wdMatchHeroColor(true));
async function loadWalletDesign() {
  try { wdCardSettings = await window.api.getSettings(); } catch (e) { wdCardSettings = {}; }
  document.getElementById('wd-show-tier').checked = walletShowsTier(wdCardSettings);
  document.getElementById('wd-show-next').checked = wdCardSettings.wallet_show_next === '1';
  const st = await window.api.walletDesignGet();
  wd = { ...st, bgColor: st.bgColor || '', look: { ...(st.look || {}) }, changed: {} };
  renderWdLook(); renderWdStyles();
  const box = document.getElementById('wd-colors');
  box.innerHTML = WD_COLORS.map(c => `<button type="button" class="wd-color" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('') +
    `<label class="wd-color wd-color-custom" title="${escapeHtml(t('wdCustomColor'))}"><input type="color" id="wd-custom-color" aria-label="${escapeHtml(t('wdCustomColor'))}">🎨</label>`;
  box.querySelectorAll('.wd-color[data-color]').forEach(b => b.addEventListener('click', () => { wd.bgColor = b.dataset.color === '#20252d' ? '' : b.dataset.color; renderWdPreview(); }));
  document.getElementById('wd-custom-color').addEventListener('input', (e) => { wd.bgColor = e.target.value; renderWdPreview(); });
  document.getElementById('wd-status').textContent = st.synced ? '' : (st.hasLicense ? t('wdSavedLater') : t('wdSavedNoLicense'));
  renderWdPreview();
}
SETTINGS_LOADERS['settings-modal-walletdesign'] = loadWalletDesign;
['logo', 'hero'].forEach(kind => {
  document.getElementById(`wd-${kind}-pick`).addEventListener('click', () => document.getElementById(`wd-${kind}-file`).click());
  document.getElementById(`wd-${kind}-file`).addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !wd) return;
    try {
      const img = await wdLoadFile(file);
      imgOriginals['wd-' + kind] = img;
      await wdEditImage(kind, img);
    } catch (err) { document.getElementById('wd-status').textContent = t('wdImgErr'); }
  });
  document.getElementById(`wd-${kind}-edit`).addEventListener('click', async () => {
    if (!wd || !wd[kind]) return;
    const img = imgOriginals['wd-' + kind] || await loadImageFromUrl(wd[kind]).catch(() => null);
    if (img) wdEditImage(kind, img);
  });
  document.getElementById(`wd-${kind}-remove`).addEventListener('click', () => { if (!wd) return; wd[kind] = null; wd.changed[kind] = true; renderWdPreview(); });
});
['wd-show-tier', 'wd-show-next'].forEach(id => document.getElementById(id).addEventListener('change', async () => {
  const patch = { wallet_show_tier: document.getElementById('wd-show-tier').checked ? '1' : '0', wallet_show_next: document.getElementById('wd-show-next').checked ? '1' : '0' };
  await window.api.saveSettings(patch);
  Object.assign(wdCardSettings, patch); renderWdPreview(); renderVenuePanel().catch(() => {});
  try { await window.api.walletRefreshAll(); } catch (e) { /* позже */ }
  document.getElementById('wd-status').textContent = t('wdShowSaved');
}));
document.getElementById('wd-hero-stamps').addEventListener('change', (e) => { if (!wd) return; wd.heroStamps = e.target.checked; renderWdPreview(); });
document.querySelectorAll('.wd-tab').forEach(b => b.addEventListener('click', () => {
  wdTab = b.dataset.wdTab;
  document.querySelectorAll('.wd-tab').forEach(x => x.classList.toggle('active', x === b));
  if (wd) renderWdPreview();
}));
// 2.30: дизайн из конструктора на сайте — код «LOYA-DESIGN:…» (вид карты, цвет, логотип и фото)
function wdParseSiteCode(text) {
  const m = /LOYA-DESIGN:([A-Za-z0-9_-]+)/.exec(String(text || ''));
  if (!m) return null;
  try {
    const b = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const o = JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4)))));
    if (!o || o.v !== 1 || typeof o.look !== 'object') return null;
    const img = (u, max) => typeof u === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < max * 1024 * 1.37 ? u : null;
    return { name: String(o.name || '').slice(0, 32), bg: /^#[0-9a-f]{6}$/i.test(o.bg || '') ? o.bg : '', color: /^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color.toLowerCase() : '',
      look: LoyaCard.cleanLook(o.look), logo: img(o.logo, 340), hero: img(o.hero, 590) };
  } catch (e) { return null; }
}
document.getElementById('wd-fromsite').addEventListener('click', async () => {
  if (!wd || !window.LoyaCard) return;
  let text = '';
  try { text = await navigator.clipboard.readText(); } catch (e) { text = ''; }
  let d = wdParseSiteCode(text);
  if (d) { if (!await uiConfirm(t('wdFromSiteUse').replace('{name}', d.name || 'Loya'))) return; }
  else {
    const v = await uiPrompt(t('wdFromSiteAsk'), '');
    if (v == null || !String(v).trim()) return;
    d = wdParseSiteCode(v);
    if (!d) { uiAlert(t('wdFromSiteBad')); return; }
  }
  wd.bgColor = d.bg === '#20252d' ? '' : d.bg;
  wd.look = { ...d.look };
  if (d.logo) { wd.logo = d.logo; wd.changed.logo = true; delete imgOriginals['wd-logo']; }
  if (d.hero) { wd.hero = d.hero; wd.heroStamps = true; wd.changed.hero = true; delete imgOriginals['wd-hero']; document.getElementById('wd-hero-stamps').checked = true; }
  wd.forceStamp = true; wd.changed.look = true;
  document.querySelectorAll('#wd-styles .wd-style').forEach(x => x.classList.remove('active'));
  renderWdLook(); renderWdPreview();
  const own = String(wd.brandColor || '').toLowerCase();
  const far = (x, y) => { const h = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); if (!/^#[0-9a-f]{6}$/i.test(x) || !/^#[0-9a-f]{6}$/i.test(y)) return false; const p = h(x), q = h(y); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 48; };
  document.getElementById('wd-status').textContent = t('wdFromSiteOk') + (d.color && far(d.color, own) ? ' ' + t('wdFromSiteColor').replace('{c}', d.color.toUpperCase()) : '');
});
document.getElementById('wd-save').addEventListener('click', async () => {
  if (!wd) return;
  const status = document.getElementById('wd-status');
  const btn = document.getElementById('wd-save');
  const payload = { bgColor: wd.bgColor || '', heroStamps: wd.heroStamps, look: wdLook() };
  for (const kind of ['logo', 'hero']) if (wd.changed[kind]) payload[kind] = wd[kind] || null;
  // своего логотипа для Wallet нет — на карту гостя идёт логотип заведения
  if (!wd.logo && currentBrandLogo) { try { const u = wdMakeLogo(await loadImageFromUrl(currentBrandLogo)); if (u) payload.logo = u; } catch (e) { /* без логотипа */ } }
  btn.disabled = true; status.textContent = t('wdSaving');
  try {
    const r = await window.api.walletDesignSave(payload);
    if (!r || !r.ok) status.textContent = r && r.error === 'no_access' ? t('noAccessAction') : t('wdImgErr');
    else {
      wd.changed = {};
      renderVenuePanel(true).catch(() => {});
      status.textContent = r.uploaded ? t('wdSaved') : r.error === 'need_license' ? t('wdSavedNoLicense') : r.error === 'license_inactive' ? t('errLicenseInactive') : t('wdSavedLater');
    }
  } finally { btn.disabled = false; }
});


// ===================== «Первые шаги» на Главной =====================
// Для нового заведения: 5 понятных шагов с кнопками, каждый отмечается сам по реальным данным.
// Когда всё сделано — карточка исчезает. Кассиру не показываем.
async function markSetting(key) {
  try { const st = await window.api.getSettings(); if (st[key] !== '1') await window.api.saveSettings({ ...st, [key]: '1' }); } catch (e) { /* не критично */ }
}
function openSettingsTile(modalId) {
  document.querySelector('.nav-btn[data-view="settings"]').click();
  const tile = document.querySelector(`.settings-tile[data-modal="${modalId}"]`);
  if (tile) tile.click();
}
async function renderHomeStart() {
  const box = document.getElementById('home-start');
  if (!box) return;
  const st = await window.api.getSettings();
  if (currentRole === 'cashier' || st.home_start_state === 'hidden' || st.onboarding_completed !== '1') { box.style.display = 'none'; return; }
  let stats = {};
  try { stats = await window.api.getStats(); } catch (e) { /* пусто */ }
  const items = [
    { k: 'card', ok: (stats.totalCards || 0) > 0, ic: '💳', act: () => document.querySelector('.nav-btn[data-view="newcard"]').click() },
    { k: 'scan', ok: (stats.totalScans || 0) > 0, ic: '📷', act: () => document.querySelector('.nav-btn[data-view="scan"]').click() },
    { k: 'poster', ok: st.poster_opened === '1', ic: '🖨', act: () => openSettingsTile('settings-modal-poster') },
    // На Android телефон-сканер не нужен — сканирует сам планшет.
    ...(document.documentElement.classList.contains('platform-android') ? [] : [{ k: 'phone', ok: st.phone_connected === '1', ic: '📱', act: () => openSettingsTile('settings-modal-pairing'), optional: true }]),
    { k: 'plan', ok: !!st.license_key, ic: '⭐', act: () => { const b = document.getElementById('fb-trial'); if (b && b.offsetParent) b.click(); else openSettingsTile('settings-modal-subscription'); } }
  ];
  const done = items.filter(i => i.ok).length;
  if (done === items.length) { box.style.display = 'none'; markSetting('home_start_done'); return; }
  box.style.display = '';
  box.innerHTML = `<div class="hs-head"><div><b>${escapeHtml(t('hsTitle'))}</b><span>${escapeHtml(t('hsSub')(done, items.length))}</span></div>
      <button type="button" class="hs-hide" id="hs-hide">${escapeHtml(t('setupHide'))}</button></div>
    <div class="hs-bar"><i style="width:${Math.round(done / items.length * 100)}%"></i></div>
    <div class="hs-list">${items.map((i, n) => `<div class="hs-item ${i.ok ? 'ok' : ''}">
      <span class="hs-ic">${i.ok ? '✓' : i.ic}</span>
      <span class="hs-txt"><b>${escapeHtml(t('hs_' + i.k))}${i.optional ? ` <em>${escapeHtml(t('hsOptional'))}</em>` : ''}</b><small>${escapeHtml(t('hsD_' + i.k))}</small></span>
      ${i.ok ? `<span class="hs-done">${escapeHtml(t('setupDone'))}</span>` : `<button type="button" data-hs="${n}">${escapeHtml(t('hsGo_' + i.k))}</button>`}
    </div>`).join('')}</div>`;
  box.querySelectorAll('[data-hs]').forEach(b => b.addEventListener('click', () => items[Number(b.dataset.hs)].act()));
  document.getElementById('hs-hide').addEventListener('click', async () => {
    await window.api.saveSettings({ ...(await window.api.getSettings()), home_start_state: 'hidden' });
    renderHomeStart();
  });
}

// «Помощь» в меню: руководство с поиском открывается с любого экрана (и у кассира тоже).
document.getElementById('btn-nav-help').addEventListener('click', () => {
  const m = document.getElementById('settings-modal-manual');
  if (m.parentElement !== document.body) document.body.appendChild(m); // окно живёт в разделе «Настройки» — выносим, чтобы открывалось везде
  renderManual();
  document.getElementById('settings-modal-manual').style.display = 'flex';
  setTimeout(() => { const q = document.getElementById('manual-search'); if (q) q.focus(); }, 50);
});

// Деньги вводят по-разному: «12,50», «12.5», «1 250,00». Поле type="number" молча выбрасывало запятую
// (12,5 превращалось в 125) — поэтому денежные поля текстовые и разбираются здесь.
function parseMoneyInput(raw) {
  let v = String(raw == null ? '' : raw).replace(/[\s\u00a0€$₴₽]/g, '');
  if (!v) return NaN;
  if (v.includes(',') && v.includes('.')) v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  else v = v.replace(',', '.');
  if (!/^-?\d+(\.\d{0,4})?$/.test(v) && !/^-?\.\d+$/.test(v)) return NaN;
  return Math.round(Number(v) * 100) / 100;
}
function flashBadInput(input) {
  input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake', 'input-bad');
  setTimeout(() => input.classList.remove('input-bad'), 1600);
  input.focus();
}

// jsQR теперь лежит внутри программы (src/vendor/jsQR.js) — камера работает и без интернета.
async function ensureJsQr() { return typeof jsQR !== 'undefined'; }

// 2.26 (Android): быстрые действия со значка программы на рабочем столе.
window.__loyaShortcut = (action) => {
  const go = (v) => { const b = document.querySelector(`.nav-btn[data-view="${v}"]`); if (b) b.click(); };
  if (action === 'scan') { go('scan'); setTimeout(() => { const b = document.querySelector('.scan-big-btn'); if (b && b.offsetParent) b.click(); }, 350); }
  else if (action === 'client') {
    go('clients');
    setTimeout(() => { const box = document.querySelector('#view-clients .add-client-box'); if (!box) return; box.open = true; box.scrollIntoView({ block: 'start' }); const i = box.querySelector('input'); if (i) i.focus(); }, 350);
  } else if (action === 'card') go('newcard');
};

// 2.26: телефон и планшет — потянуть список вниз, чтобы обновить раздел (как в обычных приложениях).
(function pullToRefresh() {
  const content = document.querySelector('.content'); if (!content) return;
  const ind = document.createElement('div'); ind.className = 'ptr'; ind.setAttribute('aria-hidden', 'true'); ind.innerHTML = '<i>↻</i>'; document.body.appendChild(ind);
  let y0 = null, dy = 0, busy = false;
  const touchUi = () => matchMedia('(pointer: coarse)').matches && matchMedia('(max-width: 1100px)').matches;
  content.addEventListener('touchstart', (e) => {
    if (busy || !touchUi() || content.scrollTop > 0 || e.touches.length !== 1 || e.target.closest('input, textarea, select, .dashboard-grid.edit-mode, #scan-video')) { y0 = null; return; }
    y0 = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  content.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    if (content.scrollTop > 0) { y0 = null; dy = 0; ind.className = 'ptr'; return; }
    const k = Math.min(1, dy / 90);
    ind.style.setProperty('--ptr-y', Math.round(Math.min(dy, 120) * 0.6) + 'px'); ind.style.setProperty('--ptr-k', k.toFixed(2));
    ind.className = 'ptr show' + (k >= 1 ? ' ready' : '');
  }, { passive: true });
  content.addEventListener('touchend', async () => {
    if (y0 === null) return; y0 = null;
    if (dy < 90) { ind.className = 'ptr'; return; }
    busy = true; ind.className = 'ptr show ready spin';
    try { if (navigator.vibrate) navigator.vibrate(15); await Promise.resolve(refreshActiveView()); } catch (e) { /* обновится позже */ }
    setTimeout(() => { ind.className = 'ptr'; busy = false; }, 450);
  });
})();

// ---------- Телефон и планшет: нижнее меню «Ещё» и подсказки у иконок ----------
// На узком экране (телефон) меню слева превращается в нижнюю панель: Главная, Клиенты, Скан, Новая карта и «Ещё».
// «Ещё» открывает всё остальное (рассылки, товары, маркетинг, настройки, помощь, язык, сотрудник).
function setNavOpen(open) {
  document.body.classList.toggle('nav-open', !!open);
  const b = document.getElementById('btn-nav-more'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
}
document.getElementById('btn-nav-more').addEventListener('click', () => setNavOpen(!document.body.classList.contains('nav-open')));
document.getElementById('nav-backdrop').addEventListener('click', () => setNavOpen(false));
document.querySelectorAll('.sidebar .nav-btn, #btn-nav-help').forEach(b => b.addEventListener('click', () => setNavOpen(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setNavOpen(false); });
// На планшете меню — узкая полоса с иконками: подписи — во всплывающих подсказках.
function syncNavTitles() {
  document.querySelectorAll('.sidebar .nav-btn, .sidebar .nav-help, .sidebar .nav-more').forEach(b => {
    const label = b.querySelector('span:not(.nav-icon)'); if (label) b.title = label.textContent.trim();
  });
}
syncNavTitles();


// ---------- v2.16: страна и валюта для тех, кто начал до 2.16 (один раз) ----------
const regionCheckState = { country: 'OTHER', currency: 'EUR' };
async function openRegionCheck() {
  const s = await window.api.getSettings();
  if (s.region_confirmed === '1') return;
  if (currentRole !== 'owner') { setTimeout(openRegionCheck, 30000); return; }
  if (['staff-login-overlay', 'onboarding-overlay', 'whats-new-overlay', 'tour-overlay'].some(id => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== 'none'; }) || document.querySelector('.lx-modal[style*="flex"]')) { setTimeout(openRegionCheck, 4000); return; }
  regionCheckState.country = s.business_country || defaultCountryForLang(s.app_language);
  const had = s.spend_currency && s.spend_currency !== 'RUB' && s.spend_currency !== 'EUR' ? s.spend_currency : '';
  regionCheckState.currency = had || COUNTRY_CURRENCY[regionCheckState.country];
  regionCheckState.currencyTouched = !!had;
  renderRegionPicker(document.getElementById('lx-region-box'), regionCheckState);
  lxOpen('lx-region');
}
async function saveRegionCheck() {
  const s = await window.api.getSettings();
  const next = { ...s, business_country: regionCheckState.country, spend_currency: regionCheckState.currency, region_confirmed: '1' };
  await window.api.saveSettings(next);
  currentSpendCurrency = regionCheckState.currency;
  applyCountryUi(next); syncCurrencySelects();
  lxClose('lx-region');
  refreshDashboard(); refreshClients();
}
document.getElementById('lx-region-save').addEventListener('click', saveRegionCheck);
// Закрыли крестиком — тоже считаем подтверждённым, чтобы не надоедать.
document.querySelector('#lx-region .lx-close').addEventListener('click', async () => { const s = await window.api.getSettings(); await window.api.saveSettings({ ...s, region_confirmed: '1' }); });

// ---------- v2.16: выпадающие списки в стиле программы ----------
// Сам <select> остаётся (его значение, события и стили поля не меняются) — подменяется только
// раскрывающийся список: вместо системного окна Windows открывается свой, в цветах темы.
const LxSelect = (() => {
  let pop = null, cur = null, kb = -1, typed = '', typedAt = 0;
  const usable = (s) => s && s.tagName === 'SELECT' && !s.multiple && !(s.size > 1) && !s.disabled && !s.classList.contains('no-lx') && !document.body.classList.contains('platform-android');
  const opts = () => pop ? Array.from(pop.querySelectorAll('.lx-opt:not(.disabled)')).filter(b => b.style.display !== 'none') : [];
  function close(focusBack) {
    if (!pop) return;
    pop.remove(); pop = null;
    const s = cur; cur = null;
    if (s) { s.classList.remove('lx-open'); if (focusBack) try { s.focus({ preventScroll: true }); } catch (e) { /* нет */ } }
  }
  function mark(i) {
    const list = opts(); if (!list.length) return;
    kb = (i + list.length) % list.length;
    list.forEach((b, k) => b.classList.toggle('kb', k === kb));
    list[kb].scrollIntoView({ block: 'nearest' });
  }
  function choose(i) {
    const s = cur; if (!s) return;
    const changed = s.selectedIndex !== i;
    s.selectedIndex = i;
    close(true);
    if (changed) { s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  function place(s) {
    const r = s.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
    const w = Math.min(Math.max(r.width, 300), vw - 16);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
    const below = vh - r.bottom - 10, above = r.top - 10;
    const need = Math.min(pop.scrollHeight, 340);
    const down = below >= need || below >= above;
    const max = Math.max(120, Math.min(340, down ? below : above));
    pop.style.maxHeight = max + 'px';
    pop.style.top = (down ? r.bottom + 6 : Math.max(8, r.top - 6 - Math.min(need, max))) + 'px';
    pop.classList.toggle('up', !down);
  }
  function open(s) {
    close();
    cur = s; s.classList.add('lx-open');
    pop = document.createElement('div');
    pop.className = 'lx-pop'; pop.setAttribute('role', 'listbox');
    const all = Array.from(s.options);
    let html = all.length > 12 ? `<input type="text" class="lx-search" placeholder="${escapeHtml(t('lxSearchPh'))}" autocomplete="off">` : '';
    html += '<div class="lx-opts">';
    let group = null;
    all.forEach((o, i) => {
      const g = o.parentElement && o.parentElement.tagName === 'OPTGROUP' ? o.parentElement : null;
      if (g !== group) { group = g; if (g) html += `<div class="lx-group">${escapeHtml(g.label)}</div>`; }
      if (o.hidden) return;
      const flag = o.dataset.flag && COUNTRY_FLAGS[o.dataset.flag] ? `<span class="region-flag">${COUNTRY_FLAGS[o.dataset.flag]}</span>` : '';
      const sel = i === s.selectedIndex;
      html += `<button type="button" class="lx-opt${sel ? ' sel' : ''}${o.disabled ? ' disabled' : ''}" data-i="${i}" role="option" aria-selected="${sel}">${flag}<span class="lx-t">${escapeHtml(o.textContent.trim())}</span>${sel ? '<span class="lx-ck">✓</span>' : ''}</button>`;
    });
    pop.innerHTML = html + '</div>';
    document.body.appendChild(pop);
    place(s);
    const list = opts(); kb = list.findIndex(b => b.classList.contains('sel'));
    if (kb >= 0) { list[kb].classList.add('kb'); list[kb].scrollIntoView({ block: 'center' }); }
    pop.addEventListener('mousedown', (e) => { if (!e.target.closest('.lx-search')) e.preventDefault(); });
    pop.addEventListener('click', (e) => { const b = e.target.closest('.lx-opt'); if (b && !b.classList.contains('disabled')) choose(Number(b.dataset.i)); });
    pop.addEventListener('mousemove', (e) => { const b = e.target.closest('.lx-opt'); if (!b) return; const i = opts().indexOf(b); if (i >= 0 && i !== kb) { opts().forEach((x, k) => x.classList.toggle('kb', k === i)); kb = i; } });
    const search = pop.querySelector('.lx-search');
    if (search) {
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        pop.querySelectorAll('.lx-opt').forEach(b => { b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none'; });
        pop.querySelectorAll('.lx-group').forEach(g => { g.style.display = q ? 'none' : ''; });
        mark(0);
      });
      search.addEventListener('keydown', onKey);
      setTimeout(() => search.focus(), 0);
    }
  }
  function onKey(e) {
    if (!pop) return false;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return true; }
    if (e.key === 'Tab') { close(false); return false; }
    if (e.key === 'ArrowDown') { e.preventDefault(); mark(kb + 1); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); mark(kb - 1); return true; }
    if (e.key === 'Home') { e.preventDefault(); mark(0); return true; }
    if (e.key === 'End') { e.preventDefault(); mark(opts().length - 1); return true; }
    if (e.key === 'Enter' || (e.key === ' ' && !e.target.classList.contains('lx-search'))) {
      e.preventDefault(); const b = opts()[kb]; if (b) choose(Number(b.dataset.i)); return true;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.target.classList.contains('lx-search')) {
      const now = Date.now(); typed = (now - typedAt < 700 ? typed : '') + e.key.toLowerCase(); typedAt = now;
      const i = opts().findIndex(b => b.textContent.trim().toLowerCase().startsWith(typed));
      if (i >= 0) mark(i);
      e.preventDefault(); return true;
    }
    return false;
  }
  document.addEventListener('mousedown', (e) => {
    const s = e.target.closest && e.target.closest('select');
    if (s && e.button === 0 && usable(s)) {
      e.preventDefault();
      if (cur === s) { close(true); return; }
      try { s.focus({ preventScroll: true }); } catch (err) { /* нет */ }
      open(s);
      return;
    }
    if (pop && !(e.target.closest && e.target.closest('.lx-pop'))) close(false);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (pop && (e.target === cur || e.target.closest('.lx-pop'))) { if (onKey(e)) return; }
    const s = e.target;
    if (!pop && usable(s) && (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')))) { e.preventDefault(); open(s); }
  }, true);
  window.addEventListener('resize', () => close(false));
  window.addEventListener('blur', () => close(false));
  document.addEventListener('scroll', (e) => { if (pop && !(e.target.closest && e.target.closest('.lx-pop'))) close(false); }, true);
  return { close, open };
})();

// ---------- v2.16: редактор картинок (логотип, Wallet, фон афиши) ----------
// Двигать мышкой/пальцем, колесо и ползунок — масштаб, поворот, отражение, «вписать»/«заполнить»,
// фон (для логотипов) и яркость. Возвращает canvas нужного размера или null (отмена).
const ImgEd = (() => {
  let st = null, resolver = null;
  const cv = document.getElementById('ie-canvas');
  const ctx = cv.getContext('2d');
  const PAD = 34;
  function rotDims() { const r = st.rot % 180 !== 0; return { w: r ? st.img.height : st.img.width, h: r ? st.img.width : st.img.height }; }
  function fitScale(mode) { const d = rotDims(); return mode === 'cover' ? Math.max(st.W / d.w, st.H / d.h) : Math.min(st.W / d.w, st.H / d.h); }
  function zRange() { const a = fitScale('contain'), b = fitScale('cover'); return { min: Math.min(a, b) * 0.3, max: Math.max(a, b) * 4 }; }
  function syncZoom() { const z = zRange(); document.getElementById('ie-zoom').value = String(Math.round(Math.log(st.s / z.min) / Math.log(z.max / z.min) * 1000)); }
  function setScale(ns, ax, ay) {
    const z = zRange(); ns = Math.max(z.min, Math.min(z.max, ns));
    if (ax != null) { st.cx = ax - (ax - st.cx) * ns / st.s; st.cy = ay - (ay - st.cy) * ns / st.s; }
    st.s = ns; draw(); syncZoom();
  }
  function paint(c, W, H, k) {
    // k — во сколько раз холст больше выходного размера.
    c.save();
    if (st.bg && st.bg !== 'transparent') { c.fillStyle = st.bg; c.fillRect(0, 0, W * k, H * k); }
    c.translate(st.cx * k, st.cy * k); c.rotate(st.rot * Math.PI / 180); c.scale((st.flip ? -1 : 1) * st.s * k, st.s * k);
    c.filter = st.bright !== 100 ? `brightness(${st.bright}%)` : 'none';
    c.imageSmoothingQuality = 'high';
    c.drawImage(st.img, -st.img.width / 2, -st.img.height / 2);
    c.restore();
  }
  function layout() {
    const stage = document.getElementById('ie-stage');
    const maxW = Math.max(240, Math.min(stage.clientWidth || 640, 720) - PAD * 2);
    const maxH = Math.max(180, Math.min(window.innerHeight * 0.48, 420) - PAD * 2);
    st.k = Math.min(maxW / st.W, maxH / st.H);
    const fw = Math.round(st.W * st.k), fh = Math.round(st.H * st.k);
    const dpr = window.devicePixelRatio || 1;
    cv.style.width = (fw + PAD * 2) + 'px'; cv.style.height = (fh + PAD * 2) + 'px';
    cv.width = Math.round((fw + PAD * 2) * dpr); cv.height = Math.round((fh + PAD * 2) * dpr);
    st.dpr = dpr; st.fw = fw; st.fh = fh;
  }
  function draw() {
    if (!st) return;
    const dpr = st.dpr, fw = st.fw, fh = st.fh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, fw + PAD * 2, fh + PAD * 2);
    // шахматка — прозрачные места
    const sz = 10;
    for (let y = 0; y < fh + PAD * 2; y += sz) for (let x = 0; x < fw + PAD * 2; x += sz) { ctx.fillStyle = ((x + y) / sz) % 2 ? '#d9d9d9' : '#f4f4f4'; ctx.fillRect(x, y, sz, sz); }
    ctx.save(); ctx.translate(PAD, PAD); paint(ctx, st.W, st.H, st.k); ctx.restore();
    // затемнение вне кадра
    ctx.fillStyle = 'rgba(10,10,12,.62)';
    ctx.beginPath(); ctx.rect(0, 0, fw + PAD * 2, fh + PAD * 2);
    if (st.round) { ctx.moveTo(PAD + fw, PAD + fh / 2); ctx.arc(PAD + fw / 2, PAD + fh / 2, Math.min(fw, fh) / 2, 0, Math.PI * 2, true); }
    else ctx.rect(PAD + fw, PAD, -fw, fh);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
    if (st.round) { ctx.beginPath(); ctx.arc(PAD + fw / 2, PAD + fh / 2, Math.min(fw, fh) / 2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; }
    ctx.strokeRect(PAD + .5, PAD + .5, fw - 1, fh - 1); ctx.setLineDash([]);
    if (st.guide) { ctx.strokeStyle = 'rgba(255,214,102,.85)'; ctx.setLineDash([5, 4]); ctx.beginPath(); if (st.guide.v) { ctx.moveTo(PAD + fw / 2, PAD); ctx.lineTo(PAD + fw / 2, PAD + fh); } if (st.guide.h) { ctx.moveTo(PAD, PAD + fh / 2); ctx.lineTo(PAD + fw, PAD + fh / 2); } ctx.stroke(); ctx.setLineDash([]); }
  }
  function apply(mode) { st.s = fitScale(mode); st.cx = st.W / 2; st.cy = st.H / 2; draw(); syncZoom(); }
  function renderBg() {
    const row = document.getElementById('ie-bg-row');
    row.style.display = st.bgChoices ? '' : 'none';
    if (!st.bgChoices) return;
    const chips = [['transparent', t('ieBgNone')], ['#ffffff', ''], ['#000000', ''], [getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#d4af37', '']];
    document.getElementById('ie-bg-chips').innerHTML = chips.map(([c, l]) => `<button type="button" class="ie-chip${st.bg === c ? ' active' : ''}${c === 'transparent' ? ' ie-chip-none' : ''}" data-c="${c}" style="${c !== 'transparent' ? `background:${c}` : ''}" title="${escapeHtml(l || c)}">${c === 'transparent' ? escapeHtml(l) : ''}</button>`).join('') +
      `<label class="ie-chip ie-chip-custom" title="${escapeHtml(t('wdCustomColor'))}"><input type="color" id="ie-bg-custom" value="${/^#[0-9a-f]{6}$/i.test(st.bg) ? st.bg : '#ffffff'}">🎨</label>`;
    document.querySelectorAll('#ie-bg-chips .ie-chip[data-c]').forEach(b => b.addEventListener('click', () => { st.bg = b.dataset.c; renderBg(); draw(); }));
    document.getElementById('ie-bg-custom').addEventListener('input', (e) => { st.bg = e.target.value; draw(); document.querySelectorAll('#ie-bg-chips .ie-chip').forEach(x => x.classList.remove('active')); });
  }
  function finish(ok) {
    if (!st) return;
    let out = null;
    if (ok) { out = document.createElement('canvas'); out.width = st.W; out.height = st.H; paint(out.getContext('2d'), st.W, st.H, 1); }
    st = null; lxClose('lx-imged');
    const r = resolver; resolver = null; if (r) r(out);
  }
  // pointer: перетаскивание, щипок двумя пальцами
  const ptrs = new Map(); let pinch = null;
  function toOut(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - PAD) / st.k, y: (e.clientY - r.top - PAD) / st.k }; }
  cv.addEventListener('pointerdown', (e) => { if (!st) return; cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, toOut(e)); cv.classList.add('drag'); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: st.s }; } });
  cv.addEventListener('pointermove', (e) => {
    if (!st || !ptrs.has(e.pointerId)) return;
    const p = toOut(e), prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, p);
    if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); setScale(pinch.s * d / Math.max(1, pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
    st.cx += p.x - prev.x; st.cy += p.y - prev.y;
    // прилипание к центру кадра
    const snap = 6 / st.k; st.guide = { v: Math.abs(st.cx - st.W / 2) < snap, h: Math.abs(st.cy - st.H / 2) < snap };
    if (st.guide.v) st.cx = st.W / 2; if (st.guide.h) st.cy = st.H / 2;
    draw();
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { cv.classList.remove('drag'); if (st) { st.guide = null; draw(); } } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { if (!st) return; e.preventDefault(); const p = toOut(e); setScale(st.s * Math.exp(-e.deltaY * 0.0015), p.x, p.y); }, { passive: false });
  cv.addEventListener('keydown', (e) => {
    if (!st) return; const step = (e.shiftKey ? 10 : 2) / st.k;
    const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { e.preventDefault(); st.cx += m[0]; st.cy += m[1]; draw(); }
    if (e.key === '+' || e.key === '=') setScale(st.s * 1.08, st.W / 2, st.H / 2);
    if (e.key === '-') setScale(st.s / 1.08, st.W / 2, st.H / 2);
  });
  document.getElementById('ie-zoom').addEventListener('input', (e) => { if (!st) return; const z = zRange(); setScale(z.min * Math.pow(z.max / z.min, Number(e.target.value) / 1000), st.W / 2, st.H / 2); });
  document.getElementById('ie-rotl').addEventListener('click', () => { if (!st) return; st.rot = (st.rot + 270) % 360; draw(); syncZoom(); });
  document.getElementById('ie-rotr').addEventListener('click', () => { if (!st) return; st.rot = (st.rot + 90) % 360; draw(); syncZoom(); });
  document.getElementById('ie-flip').addEventListener('click', () => { if (!st) return; st.flip = !st.flip; draw(); });
  document.getElementById('ie-fit').addEventListener('click', () => st && apply('contain'));
  document.getElementById('ie-fill').addEventListener('click', () => st && apply('cover'));
  document.getElementById('ie-center').addEventListener('click', () => { if (!st) return; st.cx = st.W / 2; st.cy = st.H / 2; draw(); });
  document.getElementById('ie-bright').addEventListener('input', (e) => { if (!st) return; st.bright = Number(e.target.value); draw(); });
  document.getElementById('ie-ok').addEventListener('click', () => finish(true));
  document.getElementById('ie-cancel').addEventListener('click', () => finish(false));
  document.getElementById('ie-x').addEventListener('click', () => finish(false));
  document.getElementById('lx-imged').addEventListener('click', (e) => { if (e.target.id === 'lx-imged') finish(false); });
  // Esc обрабатывается общим обработчиком lx-модалок (закрывает окно) — подхватываем как отмену.
  new MutationObserver(() => { if (st && document.getElementById('lx-imged').style.display === 'none') finish(false); }).observe(document.getElementById('lx-imged'), { attributes: true, attributeFilter: ['style'] });
  window.addEventListener('resize', () => { if (st) { layout(); draw(); } });
  /** opts: { img, W, H, title, mode: 'contain'|'cover', round, bg: 'transparent'|'#hex', bgChoices } */
  function open(opts) {
    if (resolver) finish(false);
    return new Promise((res) => {
      resolver = res;
      st = { img: opts.img, W: opts.W, H: opts.H, rot: 0, flip: false, bright: 100, round: !!opts.round, bg: opts.bg || 'transparent', bgChoices: !!opts.bgChoices, cx: opts.W / 2, cy: opts.H / 2, s: 1 };
      document.getElementById('ie-title').textContent = opts.title || t('ieTitle');
      document.getElementById('ie-bright').value = '100';
      lxOpen('lx-imged');
      renderBg(); layout();
      st.s = fitScale(opts.mode || 'contain'); draw(); syncZoom();
      setTimeout(() => { try { cv.focus({ preventScroll: true }); } catch (e) { /* нет */ } }, 30);
    });
  }
  return { open };
})();
// Готовый canvas → dataURL не больше maxBytes (уменьшает размер, если нужно).
function canvasToLimitedUrl(src, type, maxBytes, scales = [1, 0.8, 0.64, 0.5]) {
  for (const k of scales) {
    let c = src;
    if (k !== 1) { c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height); }
    const qs = type === 'image/png' ? [undefined] : [0.88, 0.78, 0.66, 0.54];
    for (const q of qs) { const u = c.toDataURL(type, q); if (dataUrlBytes(u) <= maxBytes) return u; }
  }
  return null;
}
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('type')); return; }
    if (file.size > 25 * 1024 * 1024) { reject(new Error('size')); return; }
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('decode')); img.src = r.result; };
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });
}
function loadImageFromUrl(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
// Исходники за эту сессию: «Настроить» открывает оригинал, а не уже обрезанную версию.
const imgOriginals = {};

// ---------- v2.16: готовые картинки для полосы на карте Wallet ----------
const WD_PRESETS = ['gold', 'night', 'coffee', 'niche', 'confetti', 'marble'];
const wdPresetCache = {};
function wdRng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
function drawWdPreset(id, W = 1032, H = 336) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); const R = wdRng(id.length * 7919 + 17);
  const accent = (wd && wd.brandColor) || '#d4af37';
  if (id === 'gold') {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b0a08'); g.addColorStop(1, '#1d170c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = -H + i * 52; const lg = c.createLinearGradient(x, 0, x + H, H); lg.addColorStop(0, 'rgba(226,181,74,0)'); lg.addColorStop(.5, `rgba(240,200,100,${0.08 + R() * 0.22})`); lg.addColorStop(1, 'rgba(226,181,74,0)'); c.strokeStyle = lg; c.lineWidth = 1 + R() * 3; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + H, H); c.stroke(); }
    const rg = c.createRadialGradient(W * .78, H * .3, 10, W * .78, H * .3, W * .5); rg.addColorStop(0, 'rgba(255,220,130,.35)'); rg.addColorStop(1, 'rgba(255,220,130,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
  } else if (id === 'night') {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d1b3e'); g.addColorStop(1, '#3a1d5c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, r = 8 + R() * 60; const rg = c.createRadialGradient(x, y, 0, x, y, r); const col = R() > .5 ? '255,190,120' : '140,180,255'; rg.addColorStop(0, `rgba(${col},${0.12 + R() * 0.3})`); rg.addColorStop(1, `rgba(${col},0)`); c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  } else if (id === 'coffee') {
    const g = c.createRadialGradient(W * .7, H * .4, 20, W * .6, H * .5, W * .8); g.addColorStop(0, '#8a5a35'); g.addColorStop(.55, '#4a2d1a'); g.addColorStop(1, '#22140b'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 38; i++) { const x = R() * W, y = R() * H, r = 10 + R() * 14, a = R() * Math.PI; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = `rgba(${40 + R() * 30},${22 + R() * 12},${10},.85)`; c.beginPath(); c.ellipse(0, 0, r, r * .68, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-r * .8, 0); c.quadraticCurveTo(0, r * .25, r * .8, 0); c.stroke(); c.restore(); }
  } else if (id === 'niche') {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, accent); g.addColorStop(1, shadeHex(accent, -0.55)); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const em = NichesModule.getNiche(currentNicheId).emoji;
    c.globalAlpha = .22; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 13; x++) { c.save(); c.translate(x * 86 + (y % 2) * 43 + 20, y * 90 + 40); c.rotate((R() - .5) * .6); c.font = `${38 + R() * 16}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; c.fillText(em, 0, 0); c.restore(); }
    c.globalAlpha = 1;
  } else if (id === 'confetti') {
    c.fillStyle = '#fff7e8'; c.fillRect(0, 0, W, H);
    const cols = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', accent];
    for (let i = 0; i < 140; i++) { c.save(); c.translate(R() * W, R() * H); c.rotate(R() * Math.PI); c.fillStyle = cols[i % cols.length]; c.globalAlpha = .55 + R() * .45; if (R() > .5) c.fillRect(-7, -3, 14, 6); else { c.beginPath(); c.arc(0, 0, 3 + R() * 4, 0, Math.PI * 2); c.fill(); } c.restore(); }
  } else {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f3f1ee'); g.addColorStop(1, '#d9d4cc'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) { c.strokeStyle = `rgba(${90 + R() * 60},${90 + R() * 50},${90 + R() * 40},${0.08 + R() * 0.2})`; c.lineWidth = .8 + R() * 2.5; c.beginPath(); let x = R() * W, y = 0; c.moveTo(x, y); for (let k = 0; k < 6; k++) { const nx = x + (R() - .3) * 260, ny = y + H / 5; c.bezierCurveTo(x + (R() - .5) * 160, y + 20, nx - (R() - .5) * 160, ny - 20, nx, ny); x = nx; y = ny; } c.stroke(); }
    c.strokeStyle = 'rgba(200,160,70,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, H * .7); c.bezierCurveTo(W * .3, H * .5, W * .6, H * .95, W, H * .6); c.stroke();
  }
  return cv.toDataURL('image/jpeg', 0.86);
}
function shadeHex(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return '#222222';
  const n = parseInt(m[1], 16); const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function renderWdPresets() {
  const box = document.getElementById('wd-hero-presets'); if (!box) return;
  box.innerHTML = `<span class="wd-presets-label">${escapeHtml(t('wdPresetsLabel'))}</span>` + WD_PRESETS.map(id => {
    if (!wdPresetCache[id]) wdPresetCache[id] = drawWdPreset(id);
    return `<button type="button" class="wd-preset" data-p="${id}" style="background-image:url('${wdPresetCache[id]}')" aria-label="${id}"></button>`;
  }).join('');
  box.querySelectorAll('.wd-preset').forEach(b => b.addEventListener('click', () => {
    if (!wd) return; wd.hero = wdPresetCache[b.dataset.p]; wd.changed.hero = true; imgOriginals['wd-hero'] = null;
    renderWdPreview(); wdMatchHeroColor(true);
  }));
}
{
  const prevLoader = SETTINGS_LOADERS['settings-modal-walletdesign'];
  SETTINGS_LOADERS['settings-modal-walletdesign'] = async (...a) => { WD_PRESETS.forEach(id => { if (id === 'niche') delete wdPresetCache[id]; }); await prevLoader(...a); renderWdPresets(); renderWdPreview(); };
}


// ---------- v2.16: настройки по разделам (меню слева вместо длинной ленты) ----------
const SET_CAT_ICON = { all: '🗂️', start: '🚀', clients: '🙋', cards: '💳', marketing: '✉️', team: '👥', network: '🏪', features: '🧩', look: '🎨', system: '⚙️' };
let settingsCat = (() => { try { return localStorage.getItem('loya_settings_cat') || ''; } catch (e) { return ''; } })();
function settingsGroups() { return Array.from(document.querySelectorAll('#settings-tiles .settings-group')); }
function groupTileCount(g) { return Array.from(g.querySelectorAll('.settings-tile, .feature-toggle')).filter(x => getComputedStyle(x).display !== 'none').length; }
function renderSettingsCats() {
  const nav = document.getElementById('settings-cats'); if (!nav) return;
  // считаем плитки, когда все группы видимы (скрытая группа даёт display:none у плиток)
  settingsGroups().forEach(g => g.classList.remove('cat-hidden'));
  const groups = settingsGroups().map(g => ({ g, n: groupTileCount(g) })).filter(x => x.n > 0);
  const items = [{ cat: 'all', label: t('setCatAll'), n: groups.reduce((a, x) => a + x.n, 0) }]
    .concat(groups.map(x => ({ cat: x.g.dataset.cat, label: x.g.querySelector('.settings-group-title').textContent.trim(), n: x.n })));
  if (!items.some(i => i.cat === settingsCat)) settingsCat = 'start';
  // На телефоне — список разделов с кратким содержанием (какие настройки внутри).
  const peek = (cat) => { const g = settingsGroups().find(x => x.dataset.cat === cat); return g ? Array.from(g.querySelectorAll('.settings-tile, .feature-toggle')).filter(x => getComputedStyle(x).display !== 'none').map(x => (x.querySelector('.settings-tile-title') || x.querySelector('b') || x).textContent.replace(/^[^\p{L}]+/u, '').trim()).slice(0, 4).join(' · ') : ''; };
  nav.innerHTML = items.map(i => `<button type="button" class="set-cat" data-cat="${i.cat}"><span class="set-cat-ic">${(window.LoyaIcons && LoyaIcons.icon(LoyaIcons.CAT[i.cat])) || SET_CAT_ICON[i.cat] || '•'}</span><span class="set-cat-t">${escapeHtml(i.label)}<small class="set-cat-peek">${escapeHtml(i.cat === 'all' ? t('setCatAllPeek') : peek(i.cat))}</small></span><span class="set-cat-n">${i.n}</span><span class="set-cat-go">›</span></button>`).join('');
  nav.querySelectorAll('.set-cat').forEach(b => b.addEventListener('click', () => {
    settingsCat = b.dataset.cat; setMobileOpen = true;
    try { localStorage.setItem('loya_settings_cat', settingsCat); } catch (e) { /* нет */ }
    const inp = document.getElementById('settings-search');
    if (inp.value) { inp.value = ''; runSettingsSearch(); } else applySettingsCat();
    const main = document.querySelector('#view-settings .settings-main'); if (main) main.scrollIntoView({ block: 'nearest' });
  }));
  applySettingsCat();
}
// 2.17: на телефоне настройки открываются как меню: сначала список разделов, потом выбранный раздел (← назад).
let setMobileOpen = false;
const setIsMobile = () => window.matchMedia('(max-width: 760px)').matches || (document.body.classList.contains('platform-android') && window.matchMedia('(max-width: 1100px)').matches);
function applySettingsMobile() {
  const view = document.getElementById('view-settings'); if (!view) return;
  const mob = setIsMobile();
  const searching = view.classList.contains('settings-searching');
  view.classList.toggle('set-m', mob);
  view.classList.toggle('set-m-open', mob && (setMobileOpen || searching));
  let back = document.getElementById('set-m-back');
  const main = view.querySelector('.settings-main');
  if (!back && main) { back = document.createElement('button'); back.type = 'button'; back.id = 'set-m-back'; back.className = 'set-m-back'; main.prepend(back); back.addEventListener('click', () => { setMobileOpen = false; const inp = document.getElementById('settings-search'); if (inp.value) { inp.value = ''; runSettingsSearch(); } applySettingsMobile(); window.scrollTo({ top: 0 }); const sc = view.closest('.main-content') || document.scrollingElement; if (sc) sc.scrollTop = 0; }); }
  if (back) { const g = settingsGroups().find(x => x.dataset.cat === settingsCat); back.innerHTML = `<span>‹</span> ${escapeHtml(t('setAllSections'))}${!searching && g ? ` <b>· ${escapeHtml(g.querySelector('.settings-group-title').textContent.trim())}</b>` : ''}`; }
}
window.addEventListener('resize', () => applySettingsMobile());
function applySettingsCat() {
  const view = document.getElementById('view-settings'); if (!view) return;
  const searching = view.classList.contains('settings-searching');
  applySettingsMobile();
  const one = !searching && settingsCat !== 'all';
  settingsGroups().forEach(g => g.classList.toggle('cat-hidden', one && g.dataset.cat !== settingsCat));
  view.classList.toggle('set-cat-one', one);
  view.classList.toggle('set-cat-nostart', searching || !(settingsCat === 'start' || settingsCat === 'all'));
  document.querySelectorAll('#settings-cats .set-cat').forEach(b => b.classList.toggle('active', !searching && b.dataset.cat === settingsCat));
}

// ---------- v2.16: картинки к сообщениям (поздравления, напоминания, рассылки) ----------
// Стандартные картинки рисуются здесь (в цветах и с названием заведения) и сохраняются в папку
// программы — автоматические рассылки берут их оттуда. Любую можно заменить своей.
const MSG_KIND_LIST = ['birthday', 'winback', 'near', 'welcome', 'nameday', 'congrats', 'reminder', 'campaign'];
const MSG_ART = {
  birthday: { e: ['🎂', '🎈', '🎁'], a: '#ff6fa8', b: '#7c4dff' },
  winback: { e: ['💛', 'NICHE', '👋'], a: '#ffb547', b: '#ff7a59' },
  near: { e: ['🎁', '⭐', '✨'], a: '#3ddc97', b: '#d4af37' },
  welcome: { e: ['👋', 'NICHE', '🎉'], a: '#4fc3f7', b: '#7c4dff' },
  nameday: { e: ['💐', '🎉', '🌷'], a: '#ff8fb1', b: '#ffcf5c' },
  congrats: { e: ['🏆', '⭐', '🎉'], a: '#ffd54a', b: '#ff9f43' },
  reminder: { e: ['⏳', '🎁', '⭐'], a: '#5ad1ff', b: '#d4af37' },
  campaign: { e: ['✨', 'NICHE', '💛'], a: '#d4af37', b: '#ff7a59' }
};
// 2.25: цвета сцен к готовым сообщениям
const SCENE_ART = { weekend: { a: '#ff7a59', b: '#ffcf5c' }, miss: { a: '#ff6fa8', b: '#ffb547' }, new: { a: '#4fc3f7', b: '#7c4dff' }, happy: { a: '#3ddc97', b: '#5ad1ff' },
  friend: { a: '#ff9f43', b: '#ffd54a' }, thanks: { a: '#ff6fa8', b: '#ffd54a' }, photo: { a: '#7c4dff', b: '#4fc3f7' }, freefriend: { a: '#3ddc97', b: '#ffcf5c' },
  luckycheck: { a: '#ff7a59', b: '#ffd54a' }, surprise: { a: '#ff6fa8', b: '#7c4dff' }, review: { a: '#3ddc97', b: '#ffd54a' }, early: { a: '#ff9f43', b: '#ffcf5c' },
  // 2.27: сегменты «Маркетинга» и рассылка со своим текстом
  cake: { a: '#ff6fa8', b: '#7c4dff' }, crown: { a: '#ffd54a', b: '#ff9f43' }, target: { a: '#ff7a59', b: '#3ddc97' }, sprout: { a: '#3ddc97', b: '#ffd54a' },
  hourglass: { a: '#ffb547', b: '#ff6fa8' }, stamps: { a: '#3ddc97', b: '#ffd54a' }, letter: { a: '#ff6fa8', b: '#ffd54a' } };
const SEG_SCENES = { active: 'stamps', inactive: 'miss', birthday: 'cake', vip: 'crown', near: 'target', newbie: 'sprout', risk: 'hourglass', fans: 'review' };
const CP_TPL_SCENES = ['weekend', 'miss', 'new', 'happy', 'friend', 'thanks'];
const SURPRISE_SCENES = ['happy', 'friend', 'photo', 'freefriend', 'luckycheck', 'surprise', 'review', 'early'];
const TW_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';
const twCache = {};
function twCode(str) { const s = str.indexOf('‍') < 0 ? str.replace(/️/g, '') : str; return Array.from(s).map(c => c.codePointAt(0).toString(16)).join('-'); }
// Картинка эмодзи Twemoji (как в самой программе); без интернета — null, тогда рисуем шрифтом.
function twImage(em) {
  if (!(em in twCache)) {
    twCache[em] = new Promise(res => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      const done = (v) => { clearTimeout(tm); res(v); };
      const tm = setTimeout(() => done(null), 2500);
      img.onload = () => done(img); img.onerror = () => done(null);
      img.src = TW_BASE + twCode(em) + '.svg';
    });
  }
  return twCache[em];
}
async function drawEmoji(ctx, em, x, y, size, rot = 0) {
  const img = await twImage(em);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size);
  else { ctx.font = `${Math.round(size * 0.86)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(em, 0, size * 0.04); }
  ctx.restore();
}
function brandPrimaryColor() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : '#d4af37';
}
function seededRnd(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// Рисует картинку 1200×630 (размер превью соцсетей и писем). title — заголовок; sub — подпись.
async function drawMsgImage(kind, lang, opts = {}) {
  const W = 1200, H = 630;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const art = (opts.season && SEASON_COL[opts.season]) ? { ...MSG_ART.campaign, ...SEASON_COL[opts.season] } : (opts.scene && SCENE_ART[opts.scene]) ? { ...MSG_ART.campaign, ...SCENE_ART[opts.scene] } : (MSG_ART[kind] || MSG_ART.campaign);
  const prim = opts.color || brandPrimaryColor();
  const nicheEm = (() => { try { return NichesModule.getNiche(currentNicheId).emoji || '⭐'; } catch (e) { return '⭐'; } })();
  const emojis = (opts.emojis || art.e).map(x => x === 'NICHE' ? nicheEm : x);
  // фон: глубокий тон цвета заведения + мягкие пятна цвета темы сообщения
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, pzShade(prim, -0.86)); bg.addColorStop(1, pzShade(prim, -0.7));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, c, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, pzRgba(c, a)); g.addColorStop(1, pzRgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  glow(300, 330, 420, art.a, 0.42); glow(1080, 80, 380, art.b, 0.32); glow(900, 640, 360, prim, 0.3);
  // конфетти
  const rnd = seededRnd(kind + (opts.seed || ''));
  const conf = [art.a, art.b, prim, '#ffffff'];
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W, y = rnd() * H, s = 5 + rnd() * 12;
    if (x > 560 && x < 1160 && y > 150 && y < 470) continue;   // не под текстом
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI); ctx.globalAlpha = 0.35 + rnd() * 0.45; ctx.fillStyle = conf[i % conf.length];
    if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-s / 2, -s / 5, s, s / 2.5);
    ctx.restore();
  }
  // круг-подложка под эмодзи
  const cx = 300, cy = 318;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 196, 0, Math.PI * 2);
  const disc = ctx.createLinearGradient(cx - 196, cy - 196, cx + 196, cy + 196);
  disc.addColorStop(0, 'rgba(255,255,255,0.16)'); disc.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = disc; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = pzRgba(art.a, 0.55); ctx.stroke(); ctx.restore();
  let seasonDone = false;
  if (opts.season && window.LoyaCard) {
    // 2.28: праздничная сцена (те же значки, что и на картах)
    try { const im = await loadImageFromUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(seasonSceneSvg(opts.season))); ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 193, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(im, cx - 175, cy - 175, 350, 350); ctx.restore(); seasonDone = true; } catch (e) { /* дальше — обычная картинка */ }
  }
  if (seasonDone) { /* готово */ } else if (opts.scene && window.LoyaScenes) {
    // 2.25: нарисованная сцена вместо эмодзи (своя для каждого готового сообщения)
    const lum = (() => { const n = parseInt(prim.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; })();
    LoyaScenes.drawScene(ctx, opts.scene, cx, cy, 196, { a: art.a, b: art.b, prim, onPrim: lum > 0.55 ? '#1b1813' : '#ffffff', ink: '#1b1813' }, lang);
  } else {
    await drawEmoji(ctx, emojis[0], cx, cy + 6, 230);
    if (emojis[1]) await drawEmoji(ctx, emojis[1], cx + 168, cy - 150, 104, 0.22);
    if (emojis[2]) await drawEmoji(ctx, emojis[2], cx - 172, cy + 152, 92, -0.25);
  }
  // текст
  const title = opts.title != null ? opts.title : tl(lang, 'mh_' + kind);
  const sub = opts.sub != null ? opts.sub : currentBrandName;
  const X = 580, maxW = 560;
  let fs = 74; ctx.font = `800 ${fs}px "Segoe UI","Inter",Arial,sans-serif`;
  let lines = pzLines(ctx, title, maxW);
  while ((lines.length > 3 || lines.some(l => ctx.measureText(l).width > maxW)) && fs > 40) { fs -= 4; ctx.font = `800 ${fs}px "Segoe UI","Inter",Arial,sans-serif`; lines = pzLines(ctx, title, maxW); }
  const lh = fs * 1.12, blockH = lines.length * lh + 70;
  let y = (H - blockH) / 2 + fs * 0.9;
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18;
  lines.forEach(l => { ctx.fillText(l, X, y); y += lh; });
  ctx.shadowBlur = 0;
  ctx.fillStyle = pzRgba(art.a, 0.95); ctx.fillRect(X, y - fs * 0.45, 70, 6);
  ctx.font = `600 34px "Segoe UI","Inter",Arial,sans-serif`; ctx.fillStyle = pzShade(prim, 0.35);
  const subLine = pzLines(ctx, sub, maxW)[0] || '';
  ctx.fillText(subLine, X, y + 40);
  // логотип заведения
  if (currentBrandLogo) {
    try {
      const logo = await loadImageFromUrl(currentBrandLogo);
      const s = 92, lx = W - s - 40, ly = H - s - 36;
      ctx.save(); ctx.beginPath(); ctx.arc(lx + s / 2, ly + s / 2, s / 2 + 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
      ctx.beginPath(); ctx.arc(lx + s / 2, ly + s / 2, s / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logo, lx, ly, s, s); ctx.restore();
    } catch (e) { /* без логотипа */ }
  }
  return cv;
}
function msgImgSignature() { return [currentBrandName, currentNicheId, brandPrimaryColor(), currentBrandLogo ? currentBrandLogo.length : 0, 'v1'].join('|'); }
let msgImgSyncing = null;
// Сохраняет стандартные картинки для отправки (4 языка — каждому клиенту на его языке).
// Перерисовывает, только если поменялись название, цвет или логотип.
function syncMsgImages(force) {
  if (msgImgSyncing) return msgImgSyncing;
  if (!window.api.msgImgSync) return Promise.resolve();
  const sig = msgImgSignature();
  try { if (!force && localStorage.getItem('loya_msgimg_sig') === sig) return Promise.resolve(); } catch (e) { /* нет */ }
  msgImgSyncing = (async () => {
    try {
      for (const lang of ['ru', 'uk', 'sk', 'en']) {
        const list = [];
        for (const kind of MSG_KIND_LIST) {
          const cv = await drawMsgImage(kind, lang);
          const dataUrl = canvasToLimitedUrl(cv, 'image/jpeg', 880 * 1024, [1, 0.8]);
          if (dataUrl) list.push({ kind, lang, dataUrl });
        }
        await window.api.msgImgSync(list);
      }
      try { localStorage.setItem('loya_msgimg_sig', sig); } catch (e) { /* нет */ }
    } catch (e) { /* в следующий раз */ }
    msgImgSyncing = null;
  })();
  return msgImgSyncing;
}
setTimeout(() => syncMsgImages(false), 6000);
// Картинка для отправки прямо сейчас: своя (если загружена) или стандартная. 'none' — без картинки.
async function msgImageFor(kind, lang) {
  const s = await window.api.getSettings();
  if (s.msg_images === '0') return 'none';
  const own = window.api.msgImgCustom ? await window.api.msgImgCustom(kind) : null;
  if (own) return own;
  return canvasToLimitedUrl(await drawMsgImage(kind, lang || getLang()), 'image/jpeg', 880 * 1024, [1, 0.8]) || undefined;
}

// ---------- v2.16: куда отправить — почта, Telegram или везде ----------
function channelDialog(r) {
  return new Promise(resolve => {
    const both = Math.max(r.email, r.telegram) + (r.bothExtra || 0);
    const opts = [
      { k: 'both', ic: '✉️ + ✈️', label: t('chBoth'), n: r.unique != null ? r.unique : both, ok: r.mailReady && r.telegramReady && r.email > 0 && r.telegram > 0 },
      { k: 'email', ic: '✉️', label: t('chEmail'), n: r.email, ok: r.mailReady && r.email > 0, why: !r.mailReady ? t('chMailOff') : '' },
      { k: 'telegram', ic: '✈️', label: t('chTelegram'), n: r.telegram, ok: r.telegramReady && r.telegram > 0, why: !r.telegramReady ? t('chTgOff') : '' }
    ];
    const overlay = document.createElement('div');
    overlay.className = 'ui-dialog-overlay';
    overlay.innerHTML = `<div class="ui-dialog ch-dialog" role="dialog" aria-modal="true">
      <div class="ui-dialog-icon">📨</div><div class="ui-dialog-text"></div>
      <div class="ch-list">${opts.map(o => `<button type="button" class="ch-opt" data-k="${o.k}"${o.ok ? '' : ' disabled'}><span class="ch-ic">${o.ic}</span><span class="ch-t">${escapeHtml(o.label)}<small>${escapeHtml(o.ok ? t('chPeople')(o.n) : (o.why || t('chPeople')(0)))}</small></span></button>`).join('')}</div>
      ${r.none ? `<p class="ch-none">${escapeHtml(t('chNoneSome')(r.none))}</p>` : ''}
      <label class="ch-always"><input type="checkbox" id="ch-always"> <span>${escapeHtml(t('chAlways'))}</span></label>
      <div class="ui-dialog-actions"><button type="button" class="ui-dialog-cancel">${t('dlgCancel')}</button></div></div>`;
    overlay.querySelector('.ui-dialog-text').textContent = r.title || t('chTitle');
    document.body.appendChild(overlay);
    const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); } }
    document.addEventListener('keydown', onKey, true);
    overlay.querySelectorAll('.ch-opt').forEach(b => b.addEventListener('click', async () => {
      if (overlay.querySelector('#ch-always').checked) { const s = await window.api.getSettings(); await window.api.saveSettings({ ...s, send_mode: 'all' }); }
      close(b.dataset.k === 'both' ? ['email', 'telegram'] : [b.dataset.k]);
    }));
    overlay.querySelector('.ui-dialog-cancel').addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    const first = overlay.querySelector('.ch-opt:not([disabled])'); if (first) first.focus();
  });
}
/** Спрашивает, куда отправить. reach — готовые счётчики (для одного клиента), иначе считает main. */
async function pickChannels({ kind, clientIds, marketing = true, reach, title } = {}) {
  const r = reach || await window.api.msgReach({ kind, clientIds, marketing });
  if (r.free && !reach) { showFreeLimit('mail'); return null; }   // рассылки — по подписке
  if (r.sendMode === undefined) { const s = await window.api.getSettings(); r.sendMode = s.send_mode || 'ask'; }
  const avail = [r.mailReady && r.email > 0 && 'email', r.telegramReady && r.telegram > 0 && 'telegram'].filter(Boolean);
  if (!avail.length) {
    if (!r.total) return { none: true };
    await uiAlert(!r.mailReady && !r.telegramReady ? t('chNothingSetUp') : t('chNoReach'));
    return null;
  }
  if (r.sendMode === 'all' || avail.length === 1) return avail;
  return channelDialog({ ...r, unique: r.unique != null ? r.unique : Math.max(0, (r.total || 0) - (r.none || 0)), title });
}
function sendResultText(res) {
  const parts = [];
  if (res.sent || res.failed) parts.push(`✉️ ${res.sent || 0}${res.failed ? ` (${t('chFailed')}: ${res.failed})` : ''}`);
  if (res.telegramSent || res.telegramFailed) parts.push(`✈️ ${res.telegramSent || 0}${res.telegramFailed ? ` (${t('chFailed')}: ${res.telegramFailed})` : ''}`);
  return parts.length ? t('chSentTo') + ' ' + parts.join(' · ') : '';
}

// ---------- v2.16: Настройки → «Отправка клиентам» ----------
async function loadSendingSettings() {
  const s = await window.api.getSettings();
  syncSendModeSeg(s.send_mode === 'all' ? 'all' : 'ask');
  const auto = ['email', 'telegram'].includes(s.auto_channels) ? s.auto_channels : 'both';
  document.querySelectorAll('#send-auto-ch button').forEach(b => b.classList.toggle('active', b.dataset.v === auto));
  document.getElementById('msg-images-on').checked = s.msg_images !== '0';
  document.getElementById('msgimg-grid').classList.toggle('off', s.msg_images === '0');
  renderMsgImgGrid();
}
async function saveSendingSetting(patch) {
  const s = await window.api.getSettings();
  await window.api.saveSettings({ ...s, ...patch });
  const el = document.getElementById('send-status');
  el.textContent = t('settingsSaved'); clearTimeout(el._t); el._t = setTimeout(() => { el.textContent = ''; }, 1600);
}
function syncSendModeSeg(v) {
  document.querySelectorAll('#send-mode-seg button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  document.getElementById('send-mode-hint').textContent = t(v === 'all' ? 'sendModeAllD' : 'sendModeAskD');
}
document.querySelectorAll('#send-mode-seg button').forEach(b => b.addEventListener('click', () => { syncSendModeSeg(b.dataset.v); saveSendingSetting({ send_mode: b.dataset.v }); }));
document.querySelectorAll('#send-auto-ch button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#send-auto-ch button').forEach(x => x.classList.toggle('active', x === b));
  saveSendingSetting({ auto_channels: b.dataset.v });
}));
document.getElementById('msg-images-on').addEventListener('change', (e) => {
  document.getElementById('msgimg-grid').classList.toggle('off', !e.target.checked);
  saveSendingSetting({ msg_images: e.target.checked ? '1' : '0' });
});
let msgImgEditKind = null;
async function renderMsgImgGrid() {
  const grid = document.getElementById('msgimg-grid');
  const own = window.api.msgImgCustomList ? await window.api.msgImgCustomList() : [];
  grid.innerHTML = MSG_KIND_LIST.map(k => `<div class="msgimg-item${own.includes(k) ? ' own' : ''}" data-k="${k}">
      <div class="msgimg-thumb"><canvas width="240" height="126"></canvas>${own.includes(k) ? `<span class="msgimg-badge">${escapeHtml(t('msgImgOwn'))}</span>` : ''}</div>
      <div class="msgimg-row"><span class="msgimg-name">${escapeHtml(t('mi_' + k))}</span>
        ${own.includes(k) ? `<button type="button" class="msgimg-reset" title="${escapeHtml(t('msgImgReset'))}">↺</button>` : ''}<button type="button" class="msgimg-up" title="${escapeHtml(t('msgImgUpTip'))}">${escapeHtml(t('msgImgReplace'))}</button></div>
    </div>`).join('');
  for (const item of grid.querySelectorAll('.msgimg-item')) {
    const k = item.dataset.k;
    const c = item.querySelector('canvas'), x = c.getContext('2d');
    let src = null;
    if (own.includes(k)) { try { src = await loadImageFromUrl(await window.api.msgImgCustom(k)); } catch (e) { src = null; } }
    if (!src) src = await drawMsgImage(k, getLang());
    x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    item.querySelector('.msgimg-thumb').addEventListener('click', () => previewMsgImage(k));
    item.querySelector('.msgimg-up').addEventListener('click', () => { msgImgEditKind = k; document.getElementById('msgimg-file').click(); });
    const rs = item.querySelector('.msgimg-reset');
    if (rs) rs.addEventListener('click', async () => { await window.api.msgImgCustom(k, null); renderMsgImgGrid(); });
  }
}
async function previewMsgImage(k) {
  const own = await window.api.msgImgCustom(k);
  const url = own || (await drawMsgImage(k, getLang())).toDataURL('image/jpeg', 0.9);
  const ov = document.createElement('div');
  ov.className = 'ui-dialog-overlay msgimg-preview';
  ov.innerHTML = `<div class="msgimg-big"><img src="${url}" alt=""><button type="button" class="msgimg-close">×</button></div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.addEventListener('mousedown', (e) => { if (e.target === ov || e.target.classList.contains('msgimg-close')) close(); });
  document.addEventListener('keydown', function onK(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onK, true); } }, true);
}
document.getElementById('msgimg-file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file || !msgImgEditKind) return;
  let img; try { img = await loadImageFromFile(file); } catch (err) { uiAlert(t('brandLogoBad')); return; }
  const cv = await ImgEd.open({ img, W: 1200, H: 630, title: t('ieMsgTitle'), mode: 'cover', bg: '#111111' });
  if (!cv) return;
  const url = canvasToLimitedUrl(cv, 'image/jpeg', 1100 * 1024);
  const r = url ? await window.api.msgImgCustom(msgImgEditKind, url) : { error: 'bad_image' };
  if (!r || !r.ok) { uiAlert(t('brandLogoBad')); return; }
  renderMsgImgGrid();
});
SETTINGS_LOADERS['settings-modal-sending'] = () => loadSendingSettings();

// ---------- 2.18: телефон — касса на главном экране, крупные кнопки ----------
// «Телефон» — приложение Android на небольшом экране (планшет остаётся как ПК). Узкое окно на ПК получает только
// крупные элементы, без смены стартового экрана.
const isPhoneDevice = () => (document.documentElement.classList.contains('platform-android') || document.body.classList.contains('platform-android')) && Math.min(screen.width, screen.height) < 600;
function applyPhoneUi() {
  const on = isPhoneDevice() || window.matchMedia('(max-width: 760px) and (pointer: coarse)').matches;
  document.body.classList.toggle('phone-ui', on);
  // На телефоне USB-сканера нет — поле для кода вручную, без подсказки про курсор (и без автофокуса: не выскакивает клавиатура).
  const inp = document.getElementById('scan-manual-input');
  const wh = document.getElementById('scan-waiting-hint');
  if (wh) { wh.dataset.i18n = on ? 'scanWaitingHintPhone' : 'scanWaitingHint'; wh.textContent = t(wh.dataset.i18n); }
  if (inp) { inp.dataset.i18nPlaceholder = on ? 'phScanPhone' : 'phScanInput'; inp.placeholder = t(inp.dataset.i18nPlaceholder); if (on) inp.removeAttribute('autofocus'); }
}
applyPhoneUi();
window.addEventListener('resize', applyPhoneUi);
document.addEventListener('DOMContentLoaded', applyPhoneUi);
document.getElementById('btn-scan-big').addEventListener('click', () => { const b = document.getElementById('btn-start-camera'); if (b) b.click(); });
// Камера включена — большую кнопку прячем (есть «Остановить камеру»), выключена — показываем снова.
new MutationObserver(() => { document.body.classList.toggle('cam-on', document.getElementById('scan-video').style.display === 'block'); })
  .observe(document.getElementById('scan-video'), { attributes: true, attributeFilter: ['style'] });
async function applyStartView() {
  const s = await window.api.getSettings();
  const sel = document.getElementById('start-view-select'); if (sel) sel.value = s.start_view || '';
  if (s.onboarding_completed !== '1') return;
  const want = s.start_view || (isPhoneDevice() ? 'scan' : 'dashboard');
  if (want !== 'scan' || currentView !== 'dashboard') return;
  const b = document.querySelector('.nav-btn[data-view="scan"]');
  if (b && getComputedStyle(b).display !== 'none' && (currentRole === 'owner' || roleViewAllowed('scan'))) b.click();
}
setTimeout(() => applyStartView().catch(() => {}), 300);
document.getElementById('start-view-select').addEventListener('change', async (e) => {
  await window.api.saveSettings({ start_view: e.target.value });
  showUndoToastLike(t('settingsSaved'));
});

// ---------- 2.18: уведомления ----------
let notices = [];
const NT_ICON = { tg: '✈️', reg: '🆕', bday: '🎂', offline: '📡', book: '📅', review: '⭐', ref: '🤝' };
function ntWhen(iso) {
  const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return t('ntJustNow');
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString(localeCode(), { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(localeCode(), { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(localeCode(), { hour: '2-digit', minute: '2-digit' });
}
function paintNoticeBadge() {
  const n = notices.filter(x => !x.read).length;
  const b = document.getElementById('notice-badge');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
  document.getElementById('notice-bell').classList.toggle('has-new', !!n);
}
async function loadNotices() {
  try { notices = await window.api.noticesList(); } catch (e) { notices = []; }
  paintNoticeBadge();
  if (!document.getElementById('notice-panel').hidden) renderNoticePanel();
}
function noticeGo(n) {
  closeNoticePanel();
  const d = n.data || {};
  if (n.kind === 'tg' && d.clientId) { openClientProfile(d.clientId); return; }
  if (n.kind === 'reg') {
    const nav = document.querySelector('.nav-btn[data-view="clients"]'); if (nav) nav.click();
    setTimeout(() => { const inp = document.getElementById('client-search'); if (inp && d.name) { inp.value = d.name; inp.dispatchEvent(new Event('input', { bubbles: true })); } }, 80);
    return;
  }
  if (n.kind === 'bday') {
    const nav = document.querySelector('.nav-btn[data-view="dashboard"]'); if (nav) nav.click();
    setTimeout(() => { const el = document.getElementById('birthdays-list'); const w = el && (el.closest('.dash-widget') || el); if (w) { w.scrollIntoView({ behavior: 'smooth', block: 'center' }); w.classList.add('nt-flash'); setTimeout(() => w.classList.remove('nt-flash'), 1800); } }, 120);
    return;
  }
  if (n.kind === 'offline') openNetModal();
  if (window.growNoticeGo) window.growNoticeGo(n);   // 2.20: записи, отзывы, «приведи друга»
}
async function renderNoticePanel() {
  const list = document.getElementById('np-list');
  list.innerHTML = notices.length ? notices.map(n => `<button type="button" class="np-item ${n.read ? '' : 'np-new'}" data-id="${escapeHtml(n.id)}"><span class="np-ic">${NT_ICON[n.kind] || '🔔'}</span><span class="np-txt">${escapeHtml(n.text)}<small>${escapeHtml(ntWhen(n.at))}</small></span></button>`).join('')
    : `<div class="np-empty">🔕 ${escapeHtml(t('ntEmpty'))}</div>`;
  list.querySelectorAll('.np-item').forEach(b => b.addEventListener('click', () => { const n = notices.find(x => x.id === b.dataset.id); if (n) noticeGo(n); }));
  document.getElementById('np-readall').style.visibility = notices.some(x => !x.read) ? '' : 'hidden';
  const s = await window.api.getSettings();
  document.getElementById('np-system').checked = s.notify_system !== '0';
  document.getElementById('np-kinds').innerHTML = ['reg', 'tg', 'bday', 'offline', 'book', 'review', 'ref'].map(k => `<label class="np-chk"><input type="checkbox" data-k="${k}" ${s['notify_' + k] === '0' ? '' : 'checked'}> <span>${NT_ICON[k]} ${escapeHtml(t('ntKind_' + k))}</span></label>`).join('');
  document.querySelectorAll('#np-kinds input').forEach(c => c.addEventListener('change', () => window.api.saveSettings({ ['notify_' + c.dataset.k]: c.checked ? '1' : '0' })));
}
function openNoticePanel() {
  const p = document.getElementById('notice-panel');
  p.hidden = false; renderNoticePanel(); placeNoticeBell();
  // Открыли список — непрочитанные считаем увиденными (подсветка в списке остаётся до закрытия).
  if (notices.some(x => !x.read)) window.api.noticesRead().then(() => { notices.forEach(x => { x.seen = true; }); const b = document.getElementById('notice-badge'); b.hidden = true; document.getElementById('notice-bell').classList.remove('has-new'); }).catch(() => {});
}
function closeNoticePanel() {
  const p = document.getElementById('notice-panel'); if (p.hidden) return;
  p.hidden = true; notices.forEach(x => { if (x.seen) x.read = true; }); paintNoticeBadge();
}
document.getElementById('notice-bell').addEventListener('click', (e) => { e.stopPropagation(); if (document.getElementById('notice-panel').hidden) openNoticePanel(); else closeNoticePanel(); });
document.addEventListener('mousedown', (e) => { const p = document.getElementById('notice-panel'); if (!p.hidden && !p.contains(e.target) && e.target.id !== 'notice-bell' && !e.target.closest('#notice-bell')) closeNoticePanel(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNoticePanel(); });
document.getElementById('np-readall').addEventListener('click', async () => { await window.api.noticesRead(); notices.forEach(x => { x.read = true; }); paintNoticeBadge(); renderNoticePanel(); });
document.getElementById('np-clear').addEventListener('click', async () => { await window.api.noticesClear(); notices = []; paintNoticeBadge(); renderNoticePanel(); });
document.getElementById('np-system').addEventListener('change', (e) => window.api.saveSettings({ notify_system: e.target.checked ? '1' : '0' }));
if (window.api.onNotice) window.api.onNotice((n) => {
  loadNotices();
  // Короткая плашка внизу — чтобы заметить, не открывая колокольчик.
  if (n && n.data) { const txt = n.text || ''; window.api.noticesList().then(l => { const x = l.find(y => y.id === n.id); if (x) showUndoToastLike(`${NT_ICON[x.kind] || '🔔'} ${x.text}`); }).catch(() => {}); void txt; }
});
if (window.api.onNoticeOpen) window.api.onNoticeOpen(async (id) => { await loadNotices(); const n = notices.find(x => x.id === id); if (n) noticeGo(n); });
window.__loyaNoticeOpen = async (id) => { await loadNotices(); const n = notices.find(x => x.id === id); if (n) noticeGo(n); };
loadNotices();
// Колокольчик не закрывает полосы сверху (пробная версия, обновление): стоит под ними, при прокрутке поднимается к краю.
// Телефон и планшет: колокольчик живёт в «липкой» верхней панели раздела (название бизнеса слева),
// поэтому при прокрутке не закрывает содержимое. На широком экране — как раньше, в углу окна.
function syncTopbarBrand() {
  const bar = document.getElementById('m-topbar'); if (!bar) return;
  const mark = document.getElementById('app-logo-mark'), name = document.getElementById('app-logo-name');
  bar.querySelector('.mtb-mark').innerHTML = mark ? mark.innerHTML : '';
  bar.querySelector('.mtb-name').textContent = name ? name.textContent : '';
}
function placeBellInTopbar() {
  const bell = document.getElementById('notice-bell'), content = document.querySelector('.content'); if (!bell || !content) return;
  let bar = document.getElementById('m-topbar');
  if (window.matchMedia('(max-width: 1100px)').matches) {
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'm-topbar'; bar.className = 'm-topbar';
      bar.innerHTML = '<span class="mtb-brand"><span class="mtb-mark"></span><span class="mtb-name"></span></span><span class="mtb-tools"></span>';
      content.prepend(bar);
    }
    const tools = bar.querySelector('.mtb-tools'); const wfb = document.getElementById('win-full-btn');
    if (wfb && wfb.parentNode !== tools) tools.appendChild(wfb);
    if (bell.parentNode !== tools) tools.appendChild(bell);
    document.body.classList.add('has-topbar');
    syncTopbarBrand();
  } else if (bar) {
    const panel = document.getElementById('notice-panel'); const wfb = document.getElementById('win-full-btn');
    document.body.insertBefore(bell, panel); if (wfb) document.body.insertBefore(wfb, bell);
    bar.remove(); document.body.classList.remove('has-topbar');
  }
}
function placeNoticeBell() {
  placeBellInTopbar();
  const bell = document.getElementById('notice-bell'); if (!bell) return;
  if (document.body.classList.contains('has-topbar')) {
    bell.style.top = '';
    const panel = document.getElementById('notice-panel'), r = bell.getBoundingClientRect();
    if (panel) panel.style.top = Math.max(8, r.bottom + 8) + 'px';
    return;
  }
  let top = 0;
  ['free-banner', 'update-banner'].forEach(id => { const el = document.getElementById(id); if (el && el.offsetParent !== null) { const r = el.getBoundingClientRect(); if (r.height && r.top < 4) top = Math.max(top, r.bottom); } });
  const base = window.matchMedia('(max-width: 760px)').matches ? 10 : 12;
  const y = Math.max(base, top + 10);
  bell.style.top = y + 'px';
  const panel = document.getElementById('notice-panel'); if (panel) panel.style.top = (y + 48) + 'px';
}
window.addEventListener('scroll', placeNoticeBell, true);
window.addEventListener('resize', placeNoticeBell);
{ const mo = new MutationObserver(() => requestAnimationFrame(placeNoticeBell)); ['free-banner', 'update-banner'].forEach(id => { const el = document.getElementById(id); if (el) mo.observe(el, { attributes: true, childList: true, subtree: true }); }); }
placeNoticeBell();


// ====================== 2.19: уровни, сгорание бонусов, Wallet рядом, отчёт, облако ======================
async function loadTiersSettings() {
  const s = await window.api.getSettings();
  const cfg = await window.api.tiersConfig();
  document.getElementById('tier-on').checked = s.tier_perks_on === '1';
  document.getElementById('tier-silver-at').value = cfg.silver;
  document.getElementById('tier-gold-at').value = cfg.gold;
  document.getElementById('tier-silver-mult').value = String(Math.max(1, Math.min(3, Number(s.tier_silver_mult) || 1)));
  document.getElementById('tier-gold-mult').value = String(Math.max(1, Math.min(3, Number(s.tier_gold_mult) || 2)));
  document.getElementById('tier-silver-disc').value = s.tier_silver_disc != null && s.tier_silver_disc !== '' ? s.tier_silver_disc : 0;
  document.getElementById('tier-gold-disc').value = s.tier_gold_disc != null && s.tier_gold_disc !== '' ? s.tier_gold_disc : 5;
  document.getElementById('expiry-months').value = ['3', '6', '12'].includes(String(s.bonus_expiry_months)) ? String(s.bonus_expiry_months) : '0';
  document.getElementById('expiry-stamps').checked = s.bonus_expiry_stamps === '1';
  document.getElementById('expiry-remind').checked = s.auto_expiry_enabled !== '0';
  syncTiersUi();
  const ov = await window.api.expiryOverview();
  document.getElementById('expiry-overview').textContent = ov.months ? t('expiryOverview')(ov.soon, ov.last30 ? ov.last30.n : 0) : '';
}
function syncTiersUi() {
  const on = document.getElementById('tier-on').checked;
  document.querySelectorAll('#settings-modal-tiers .tier-grid input, #settings-modal-tiers .tier-grid select').forEach(el => {
    if (!/-at$/.test(el.id)) el.disabled = !on;
  });
  const sa = Number(document.getElementById('tier-silver-at').value) || 50, ga = Number(document.getElementById('tier-gold-at').value) || 100;
  const perk = (m, d) => [m > 1 ? t('tierPerkMult')(m) : '', d > 0 ? t('tierPerkDisc')(d) : ''].filter(Boolean).join(' · ') || t('tierPerkNone');
  document.getElementById('tier-preview').innerHTML = `<div class="tp-row"><b>🥉 Basic</b><span>${escapeHtml(t('tierRange2Basic')(sa - 1))}</span></div>
    <div class="tp-row"><b>🥈 Silver</b><span>${escapeHtml(t('tierRange2Silver')(sa, ga - 1))} · ${escapeHtml(on ? perk(Number(document.getElementById('tier-silver-mult').value), Number(document.getElementById('tier-silver-disc').value)) : t('tierPerkNone'))}</span></div>
    <div class="tp-row"><b>🥇 Gold</b><span>${escapeHtml(t('tierRange2Gold')(ga))} · ${escapeHtml(on ? perk(Number(document.getElementById('tier-gold-mult').value), Number(document.getElementById('tier-gold-disc').value)) : t('tierPerkNone'))}</span></div>`;
  document.getElementById('expiry-stamps').disabled = document.getElementById('expiry-months').value === '0';
  document.getElementById('expiry-remind').disabled = document.getElementById('expiry-months').value === '0';
}
document.querySelectorAll('#settings-modal-tiers input, #settings-modal-tiers select').forEach(el => el.addEventListener('input', syncTiersUi));
document.querySelectorAll('#settings-modal-tiers input, #settings-modal-tiers select').forEach(el => el.addEventListener('change', syncTiersUi));
document.getElementById('btn-tiers-save').addEventListener('click', async () => {
  const st = document.getElementById('tiers-status');
  const sa = Math.round(Number(document.getElementById('tier-silver-at').value)), ga = Math.round(Number(document.getElementById('tier-gold-at').value));
  if (!(sa >= 2) || !(ga > sa)) { st.textContent = t('tierBadRange'); flashBadInput(document.getElementById(!(sa >= 2) ? 'tier-silver-at' : 'tier-gold-at')); return; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));
  await window.api.saveSettings({
    tier_perks_on: document.getElementById('tier-on').checked ? '1' : '0', tier_silver_at: String(sa), tier_gold_at: String(ga),
    tier_silver_mult: document.getElementById('tier-silver-mult').value, tier_gold_mult: document.getElementById('tier-gold-mult').value,
    tier_silver_disc: String(clamp(document.getElementById('tier-silver-disc').value, 0, 50)), tier_gold_disc: String(clamp(document.getElementById('tier-gold-disc').value, 0, 50)),
    bonus_expiry_months: document.getElementById('expiry-months').value, bonus_expiry_stamps: document.getElementById('expiry-stamps').checked ? '1' : '0',
    auto_expiry_enabled: document.getElementById('expiry-remind').checked ? '1' : '0'
  });
  await loadTierCfg();
  st.textContent = t('settingsSaved');
  refreshClients(); loadTiersSettings();
});
SETTINGS_LOADERS['settings-modal-tiers'] = loadTiersSettings;

// Координаты: «48.3774, 17.5872», ссылка Google Maps с @48.37,17.58 или …!3d48.37!4d17.58.
function parseCoords(v) {
  const s = String(v || '').trim();
  let m = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) || s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || s.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
// 2.24: «Wallet рядом» — до 10 адресов, превью экрана блокировки, сразу обновляем уже выданные карты.
let geoState = { points: [], tab: 'ios' };
function geoPointsFrom(s) {
  let pts = []; try { pts = JSON.parse(s.geo_points || '[]'); } catch (e) { pts = []; }
  if (!Array.isArray(pts)) pts = [];
  pts = pts.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))).map(p => ({ lat: Number(p.lat), lng: Number(p.lng), name: String(p.name || '').slice(0, 60) }));
  if (!pts.length && s.geo_lat && s.geo_lng && Number.isFinite(Number(s.geo_lat))) pts = [{ lat: Number(s.geo_lat), lng: Number(s.geo_lng), name: String(s.geo_place || '').slice(0, 60) }];
  return pts.slice(0, 10);
}
function renderGeoList() {
  const box = document.getElementById('geo-list');
  box.innerHTML = geoState.points.length ? geoState.points.map((p, i) => `<div class="geo-place"><span class="geo-pin">📍</span><span class="geo-place-t"><b>${escapeHtml(p.name || t('geoPlaceN')(i + 1))}</b><small>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</small></span>
      <a class="geo-map" href="#" data-i="${i}" title="Google Maps">↗</a><button type="button" class="geo-del" data-i="${i}" aria-label="✕">✕</button></div>`).join('')
    : `<p class="hint geo-empty">${escapeHtml(t('geoNoPlaces'))}</p>`;
  box.querySelectorAll('.geo-del').forEach(b => b.addEventListener('click', () => { geoState.points.splice(Number(b.dataset.i), 1); renderGeoList(); renderGeoCheck(); }));
  box.querySelectorAll('.geo-map').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); const p = geoState.points[Number(a.dataset.i)]; window.api.openExternal && window.api.openExternal(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`); }));
  document.getElementById('geo-count').textContent = `${geoState.points.length} / 10`;
  document.getElementById('btn-geo-add').disabled = geoState.points.length >= 10;
}
function geoAddPoint(p) {
  if (geoState.points.length >= 10) return false;
  if (geoState.points.some(x => Math.abs(x.lat - p.lat) < 1e-5 && Math.abs(x.lng - p.lng) < 1e-5)) return false;
  geoState.points.push({ lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6, name: String(p.name || '').slice(0, 60) });
  renderGeoList(); renderGeoCheck(); return true;
}
function geoSampleText() {
  const custom = document.getElementById('geo-text').value.trim();
  if (custom) return custom;
  return t('geoSampleAuto');
}
function renderGeoPreview() {
  const ph = document.getElementById('geo-phone'); if (!ph) return;
  const brand = currentBrandName || 'Loya';
  const logo = currentBrandLogo ? `<img src="${currentBrandLogo}" alt="">` : `<span>${NichesModule.getNiche(currentNicheId).emoji}</span>`;
  const now = new Date(); const time = now.toLocaleTimeString(localeCode(), { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString(localeCode(), { weekday: 'long', day: 'numeric', month: 'long' });
  const on = document.getElementById('geo-on').checked && geoState.points.length;
  if (geoState.tab === 'ios') {
    ph.className = 'geo-phone ios';
    ph.innerHTML = `<div class="gp-time">${escapeHtml(time)}</div><div class="gp-date">${escapeHtml(date)}</div>
      ${on ? `<div class="gp-note ios"><div class="gp-ic">${logo}</div><div class="gp-body"><div class="gp-row"><b>${escapeHtml(brand)}</b><small>${escapeHtml(t('geoNow'))}</small></div><div class="gp-text">${escapeHtml(geoSampleText())}</div></div></div>` : `<div class="gp-off">${escapeHtml(t('geoPrevOff'))}</div>`}`;
    document.getElementById('geo-prev-hint').textContent = t('geoPrevIos');
  } else {
    ph.className = 'geo-phone android';
    ph.innerHTML = `<div class="gp-time">${escapeHtml(time)}</div><div class="gp-date">${escapeHtml(date)}</div>
      ${on ? `<div class="gp-note android"><div class="gp-app"><span class="gp-gw">G</span>Google Wallet · ${escapeHtml(t('geoNow'))}</div><div class="gp-row"><div><b>${escapeHtml(brand)}</b><div class="gp-text">${escapeHtml(t('geoAndroidText'))}</div></div><div class="gp-ic">${logo}</div></div></div>` : `<div class="gp-off">${escapeHtml(t('geoPrevOff'))}</div>`}`;
    document.getElementById('geo-prev-hint').textContent = t('geoPrevAndroid');
  }
}
async function renderGeoCheck() {
  const box = document.getElementById('geo-check'); if (!box) return;
  renderGeoPreview();
  let info = {}; try { info = await window.api.geoInfo(); } catch (e) { info = {}; }
  const row = (ok, text) => `<div class="geo-ck ${ok ? 'ok' : 'warn'}"><span>${ok ? '✓' : '!'}</span>${escapeHtml(text)}</div>`;
  box.innerHTML = `<div class="geo-ck-h">${escapeHtml(t('geoCheckTitle'))}</div>` +
    row(geoState.points.length > 0, geoState.points.length ? t('geoCkPlaces')(geoState.points.length) : t('geoCkNoPlaces')) +
    row(!!info.license, info.license ? t('geoCkLicense') : t('geoCkNoLicense')) +
    row((info.walletCards || 0) > 0, t('geoCkCards')(info.walletCards || 0)) +
    (info.lastApply ? row(true, t('geoCkApplied')(info.lastApply)) : '');
}
async function loadGeoSettings() {
  const s = await window.api.getSettings();
  document.getElementById('geo-on').checked = s.geo_on === '1';
  geoState.points = geoPointsFrom(s);
  document.getElementById('geo-coords').value = '';
  document.getElementById('geo-text').value = s.geo_text || '';
  document.getElementById('geo-results').innerHTML = '';
  document.getElementById('geo-status').textContent = '';
  const tpls = [t('geoTpl1'), t('geoTpl2'), t('geoTpl3')];
  const tb = document.getElementById('geo-tpls');
  tb.innerHTML = `<button type="button" class="geo-tpl" data-v="">${escapeHtml(t('geoTplAuto'))}</button>` + tpls.map(x => `<button type="button" class="geo-tpl" data-v="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('');
  tb.querySelectorAll('.geo-tpl').forEach(b => b.addEventListener('click', () => { document.getElementById('geo-text').value = b.dataset.v; renderGeoPreview(); }));
  renderGeoList(); renderGeoCheck();
}
document.getElementById('geo-text').addEventListener('input', renderGeoPreview);
document.getElementById('geo-on').addEventListener('change', renderGeoPreview);
document.querySelectorAll('#geo-tabs button').forEach(b => b.addEventListener('click', () => {
  geoState.tab = b.dataset.k; document.querySelectorAll('#geo-tabs button').forEach(x => x.classList.toggle('active', x === b)); renderGeoPreview();
}));
document.getElementById('btn-geo-search').addEventListener('click', async () => {
  const q = document.getElementById('geo-q').value.trim(); const box = document.getElementById('geo-results');
  if (q.length < 3) { flashBadInput(document.getElementById('geo-q')); return; }
  box.innerHTML = `<p class="hint">…</p>`;
  const r = await window.api.geoSearch(q);
  if (!r || !r.ok) { box.innerHTML = `<p class="hint">${escapeHtml(t('geoNoNet'))}</p>`; return; }
  if (!r.items.length) { box.innerHTML = `<p class="hint">${escapeHtml(t('geoNothing'))}</p>`; return; }
  box.innerHTML = r.items.map((x, i) => `<button type="button" class="geo-item" data-i="${i}">📍 ${escapeHtml(x.name)}</button>`).join('');
  box.querySelectorAll('.geo-item').forEach(b => b.addEventListener('click', () => {
    const x = r.items[Number(b.dataset.i)];
    const short = String(x.name).split(',').slice(0, 2).join(',').trim();
    geoAddPoint({ lat: x.lat, lng: x.lng, name: short });
    box.innerHTML = ''; document.getElementById('geo-q').value = '';
  }));
});
document.getElementById('btn-geo-add').addEventListener('click', () => {
  const inp = document.getElementById('geo-coords');
  const c = parseCoords(inp.value);
  if (!c) { flashBadInput(inp); return; }
  if (geoAddPoint({ ...c, name: '' })) inp.value = '';
});
document.getElementById('btn-geo-save').addEventListener('click', async () => {
  const on = document.getElementById('geo-on').checked;
  const st = document.getElementById('geo-status');
  if (on && !geoState.points.length) { flashBadInput(document.getElementById('geo-q')); st.textContent = t('geoNeedCoords'); return; }
  const first = geoState.points[0];
  const patch = { geo_on: on ? '1' : '0', geo_text: document.getElementById('geo-text').value.trim().slice(0, 120), geo_points: JSON.stringify(geoState.points) };
  if (first) { patch.geo_lat = String(first.lat); patch.geo_lng = String(first.lng); patch.geo_place = first.name || ''; }
  await window.api.saveSettings(patch);
  st.textContent = '…';
  let r = {}; try { r = await window.api.geoApply(); } catch (e) { r = {}; }
  st.textContent = r && r.started ? t('geoApplying')(r.cards || 0) : r && r.error === 'need_license' ? t('geoSavedNoLicense') : t('geoSaved');
  renderGeoCheck();
});
SETTINGS_LOADERS['settings-modal-geo'] = loadGeoSettings;

async function loadReportSettings() {
  const s = await window.api.getSettings();
  document.getElementById('report-on').checked = s.report_monthly === '1';
  document.getElementById('report-email').value = s.report_email || s.reply_to_email || '';
  const last = document.getElementById('report-last');
  last.textContent = s.report_last ? t('reportLastSent')(s.report_last) : '';
  if (s.report_last_error) last.textContent += (last.textContent ? ' · ' : '') + '⚠️ ' + errText(s.report_last_error);
  document.getElementById('report-status').textContent = '';
}
const reportEmailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
document.getElementById('btn-report-save').addEventListener('click', async () => {
  const on = document.getElementById('report-on').checked, em = document.getElementById('report-email').value.trim();
  if ((on || em) && !reportEmailOk(em)) { flashBadInput(document.getElementById('report-email')); return; }
  await window.api.saveSettings({ report_monthly: on ? '1' : '0', report_email: em });
  document.getElementById('report-status').textContent = t('settingsSaved');
});
document.getElementById('btn-report-preview').addEventListener('click', async () => {
  const d = new Date();   // пример — итоги текущего месяца (в первый день работы прошлый месяц пустой)
  const r = await window.api.reportPreview(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  const ov = document.createElement('div');
  ov.className = 'ui-dialog-overlay report-preview';
  ov.innerHTML = `<div class="rp-box"><button type="button" class="rp-close">×</button><iframe sandbox="" title="report"></iframe></div>`;
  document.body.appendChild(ov);
  ov.querySelector('iframe').srcdoc = `<!doctype html><meta charset="utf-8"><body style="margin:16px;background:#f4f1ea">${r.html}</body>`;
  const close = () => ov.remove();
  ov.addEventListener('mousedown', (e) => { if (e.target === ov || e.target.classList.contains('rp-close')) close(); });
});
document.getElementById('btn-report-test').addEventListener('click', async (e) => {
  const em = document.getElementById('report-email').value.trim(); const st = document.getElementById('report-status');
  if (!reportEmailOk(em)) { flashBadInput(document.getElementById('report-email')); return; }
  e.currentTarget.disabled = true; st.textContent = t('mailSending');
  const r = await window.api.reportSendNow(em);
  e.currentTarget.disabled = false;
  if (r && r.ok) st.textContent = t('reportSent')(r.to); else setErrStatus(st, (r && r.error) || 'send_failed');
});
SETTINGS_LOADERS['settings-modal-report'] = loadReportSettings;

// ---------- облачная копия ----------
async function renderCloudStatus() {
  const el = document.getElementById('cloud-status'); if (!el) return;
  const s = await window.api.cloudStatus();
  document.getElementById('cloud-on').checked = s.on;
  const can = s.hasKey && s.licensed;
  document.getElementById('btn-cloud-now').disabled = !can || s.busy;
  if (!s.hasKey) { el.innerHTML = `ℹ️ ${escapeHtml(t('cloudNeedKey'))}`; return; }
  if (!s.licensed) { el.innerHTML = `ℹ️ ${escapeHtml(t('cloudNeedSub'))}`; return; }
  el.innerHTML = (s.lastOk ? `✅ ${escapeHtml(t('cloudLast')(fmtDT(s.lastOk), Math.max(1, Math.round(s.size / 1024))))}` : `⏳ ${escapeHtml(t('cloudNotYet'))}`) +
    (s.lastError ? `<br>⚠️ ${escapeHtml(t('cloudErr'))}: ${escapeHtml(errText(s.lastError))}` : '');
}
document.querySelectorAll('[data-modal="settings-modal-data"]').forEach(b => b.addEventListener('click', () => setTimeout(renderCloudStatus, 60)));
document.getElementById('cloud-on').addEventListener('change', async (e) => { await window.api.cloudSetOn(e.target.checked); renderCloudStatus(); });
document.getElementById('btn-cloud-now').addEventListener('click', async (e) => {
  const btn = e.currentTarget; btn.disabled = true;
  document.getElementById('cloud-status').innerHTML = `⏳ ${escapeHtml(t('cloudSending'))}`;
  const r = await window.api.cloudBackupNow();
  await renderCloudStatus();
  if (r && r.error) setErrStatus(document.getElementById('cloud-status'), r.error, '⚠️ ');
});
document.getElementById('btn-cloud-restore').addEventListener('click', async () => {
  const el = document.getElementById('lx-restore-list');
  el.innerHTML = `<div class="hint">…</div>`;
  lxOpen('lx-restore');
  const r = await window.api.cloudList();
  if (!r || !r.ok) { el.innerHTML = `<div class="hint">⚠️ ${escapeHtml(r && r.error === 'need_license' ? t('cloudNeedKey') : errText((r && r.error) || 'network'))}</div>`; return; }
  el.innerHTML = r.items.length ? `<div class="lx-sub">☁️ ${escapeHtml(t('cloudTitle').replace(/^☁️\s*/, ''))}</div>` + r.items.map(x => `<div class="lx-row"><div><b>${escapeHtml(fmtDT(x.at))}</b><small>${escapeHtml([x.point, x.device, x.mine ? t('cloudThisDevice') : ''].filter(Boolean).join(' · '))} · ${t('cloudClients')(x.clients)} · ${Math.max(1, Math.round(x.size / 1024))} KB</small></div><button type="button" class="btn-secondary lx-cloud" data-id="${escapeHtml(x.id)}">${escapeHtml(t('restoreThis'))}</button></div>`).join('')
    : `<div class="hint">${escapeHtml(t('cloudEmpty'))}</div>`;
  el.querySelectorAll('.lx-cloud').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true; b.textContent = '…';
    const info = await window.api.cloudFetch(b.dataset.id);
    b.disabled = false; b.textContent = t('restoreThis');
    if (!info || !info.ok) { uiAlert(info && info.error === 'bad_key' ? t('cloudBadKey') : t('restoreBad_not_db')); return; }
    const msg = t('restoreConfirm')(t('cloudFrom'), info.brand || '—', info.clients, info.cards, info.scans, info.lastActivity ? fmtDT(info.lastActivity) : '—');
    if (!(await uiConfirm(msg, { danger: true }))) return;
    const rr = await window.api.backupRestore();
    if (!rr || !rr.ok) { uiAlert(t('restoreBad_not_db')); return; }
    lxClose('lx-restore'); uiAlert(t('restoreDone'));
  }));
});


// ---------- 2.22: во весь экран (F11) и размер интерфейса ----------
const UI_ZOOM_STEPS = [0.8, 0.9, 1, 1.1, 1.2];
let winSt = { full: false, max: false, zoom: 0.9 };
const winToolsOk = () => !!(window.api && window.api.winState) && !document.documentElement.classList.contains('platform-android') && !document.body.classList.contains('platform-android');
const WIN_SVG_FULL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/></svg>';
const WIN_SVG_EXIT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4"/></svg>';
function renderWinTools() {
  const box = document.getElementById('ui-size-box');
  if (!winToolsOk()) { if (box) box.style.display = 'none'; const b = document.getElementById('win-full-btn'); if (b) b.remove(); return; }
  document.body.classList.add('has-win-tools');
  let fb = document.getElementById('win-full-btn');
  if (!fb) {
    fb = document.createElement('button'); fb.type = 'button'; fb.id = 'win-full-btn'; fb.className = 'win-full-btn';
    const bell = document.getElementById('notice-bell'); bell.parentNode.insertBefore(fb, bell);
    fb.addEventListener('click', () => { window.api.winToggleFull().then(applyWinState).catch(() => {}); });
  }
  fb.innerHTML = winSt.full ? WIN_SVG_EXIT : WIN_SVG_FULL;
  fb.title = t(winSt.full ? 'uiFullBtnOff' : 'uiFullBtnOn'); fb.setAttribute('aria-label', fb.title);
  fb.classList.toggle('on', !!winSt.full);
  if (!box) return;
  const seg = document.getElementById('ui-size-seg');
  seg.innerHTML = `<span class="ui-size-end">${escapeHtml(t('uiSizeS'))}</span>` + UI_ZOOM_STEPS.map(z => `<button type="button" class="ui-size-step${Math.abs(z - winSt.zoom) < 0.01 ? ' active' : ''}" data-z="${z}" title="${Math.round(z * 100)}%">${z === 0.9 ? escapeHtml(t('uiSizeN')) : Math.round(z * 100) + '%'}</button>`).join('') + `<span class="ui-size-end">${escapeHtml(t('uiSizeL'))}</span>`;
  seg.querySelectorAll('.ui-size-step').forEach(b => b.addEventListener('click', () => { window.api.winSetZoom(Number(b.dataset.z)).then(applyWinState).catch(() => {}); }));
  const full = document.getElementById('ui-full-btn');
  full.textContent = t(winSt.full ? 'uiFullOff' : 'uiFullOn');
  full.onclick = () => { window.api.winToggleFull().then(applyWinState).catch(() => {}); };
}
function applyWinState(st) { if (st && typeof st === 'object') winSt = { ...winSt, ...st }; renderWinTools(); }
if (winToolsOk()) {
  window.api.winState().then(applyWinState).catch(() => {});
  if (window.api.onWinState) window.api.onWinState(applyWinState);
} else renderWinTools();

// ---------- 2.23: настройки пришли из админки Loya (поддержка настроила клиента) ----------
if (window.api.onRemoteConfig) window.api.onRemoteConfig(async (d) => {
  const keys = (d && d.keys) || [];
  try {
    const st = await window.api.getSettings();
    if (keys.includes('app_language') && st.app_language && st.app_language !== getLang()) {
      const sel = document.getElementById('app-lang-select');
      if (sel) { sel.value = st.app_language; sel.dispatchEvent(new Event('change')); }
    }
    await initTheme();
    await initOnboarding();
    await loadBrandLogo();
    try { await loadFeatures(); } catch (e) { /* не критично */ }
    refreshActiveView();
    showUndoToastLike(t('remoteCfgApplied'));
  } catch (e) { /* не критично */ }
});

// ===================== v2.23: «Ваше заведение» в Настройки → Начало работы =====================
// Самое нужное на одном экране: название (сохраняется само), вид бизнеса, правило карты для новых
// гостей (± штампы / % скидки) и живое превью карты, как её увидит гость в Wallet.
let venueSaveTimer = null;
function venueSaved() {
  const el = document.getElementById('venue-saved'); if (!el) return;
  el.textContent = t('venueSaved'); el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1600);
}
function venueRule(st) {
  const type = ['discount', 'spend', 'combo'].includes(st.selfreg_card_type) ? st.selfreg_card_type : 'stamp';
  if (type === 'combo') return { type, val: Math.max(2, Math.min(30, Number(st.selfreg_stamp_target) || 10)), key: 'selfreg_stamp_target', min: 2, max: 30, pct: Math.max(1, Math.min(90, Number(st.selfreg_discount_percent) || 5)) };
  if (type === 'discount') return { type, val: Math.max(1, Math.min(90, Number(st.selfreg_discount_percent) || 5)), key: 'selfreg_discount_percent', min: 1, max: 90 };
  if (type === 'spend') return { type, val: Math.max(1, Number(st.selfreg_spend_target) || 500), key: 'selfreg_spend_target', min: 10, max: 100000, step: 50 };
  return { type, val: Math.max(2, Math.min(30, Number(st.selfreg_stamp_target) || 10)), key: 'selfreg_stamp_target', min: 2, max: 30 };
}
let venueWd = null;
async function renderVenuePanel(reloadDesign) {
  const box = document.getElementById('venue-panel'); if (!box) return;
  if (currentRole === 'cashier') { box.style.display = 'none'; return; }
  box.style.display = '';
  const st = await window.api.getSettings();
  if (reloadDesign || !venueWd) { try { venueWd = await window.api.walletDesignGet(); } catch (e) { venueWd = {}; } }
  const niche = NichesModule.getNiche(st.business_niche || currentNicheId);
  const lang = getLang();
  const nameInp = document.getElementById('venue-name');
  if (document.activeElement !== nameInp) nameInp.value = st.brand_name || currentBrandName || '';
  nameInp.placeholder = 'Loya';
  const logo = document.getElementById('venue-logo');
  logo.innerHTML = currentBrandLogo ? `<img src="${currentBrandLogo}" alt="">` : `<span>${niche.emoji}</span><small>${escapeHtml(t('venueLogoAdd'))}</small>`;
  logo.classList.toggle('has-img', !!currentBrandLogo);
  document.getElementById('venue-niche').innerHTML = `${niche.emoji} ${escapeHtml((niche.name && (niche.name[lang] || niche.name.en)) || '')} <span class="venue-chip-edit">✎</span>`;
  let country = ''; try { country = countryName(businessCountry(st)); } catch (e) { /* нет */ }
  document.getElementById('venue-region').textContent = `📍 ${[country, st.spend_currency || 'EUR'].filter(Boolean).join(' · ')}`;
  const r = venueRule(st);
  document.getElementById('venue-val').textContent = r.type === 'discount' ? `${r.val}%` : r.type === 'spend' ? `${r.val} ${currencySymbol()}` : String(r.val);
  document.getElementById('venue-rule-desc').textContent = r.type === 'discount' ? t('venueRuleDisc')(r.val) : r.type === 'spend' ? t('venueRuleSpend')(`${r.val} ${currencySymbol()}`) : r.type === 'combo' ? t('venueRuleCombo')(r.pct, r.val) : t('venueRuleStamp')(r.val);
  box.dataset.rule = r.type;
  // подписка — одной строкой
  const m = licenseMode || {};
  const sub = document.getElementById('venue-sub');
  sub.innerHTML = m.mode === 'full' && !m.trial ? `<span class="vs-dot ok"></span>${escapeHtml(t('venueSubActive'))}`
    : m.mode === 'full' && m.trial ? `<span class="vs-dot warn"></span>${escapeHtml(t('venueSubTrial')(m.daysLeft || 0))}`
    : `<span class="vs-dot off"></span>${escapeHtml(t('venueSubFree'))}`;
  sub.dataset.owner = '1';
  venueLast = { st, r, niche };
  renderVenueCard(st, r, niche);
}
let venueLast = null;
let venueTab = 'google';
function renderVenueCard(st, r, niche) {
  const card = document.getElementById('venue-card'); if (!card) return;
  const w = venueWd || {};
  const name = document.getElementById('venue-name').value.trim() || st.brand_name || w.brandName || 'Loya';
  const S = { ...w, brandName: name };
  const sample = sampleCardFrom(st);
  card.innerHTML = `<div class="venue-tabs">${['google', 'apple'].map(k => `<button type="button" class="venue-tab ${venueTab === k ? 'active' : ''}" data-k="${k}">${k === 'google' ? 'Google Wallet' : 'Apple Wallet'}</button>`).join('')}</div>
    <div class="wd-phone venue-phone">${wdPassHtml(S, venueTab, sample)}</div>`;
  card.querySelectorAll('.venue-tab').forEach(b => b.addEventListener('click', () => { venueTab = b.dataset.k; renderVenueCard(st, r, niche); }));
}
document.getElementById('venue-name').addEventListener('input', () => {
  if (venueLast) renderVenueCard(venueLast.st, venueLast.r, venueLast.niche);
  clearTimeout(venueSaveTimer);
  venueSaveTimer = setTimeout(async () => {
    const v = document.getElementById('venue-name').value.trim(); if (!v) return;
    const cur = await window.api.getSettings();
    if (cur.brand_name === v) return;
    await window.api.saveSettings({ ...cur, brand_name: v });
    currentBrandName = v; applyBrand(); venueSaved();
    renderVenuePanel();
  }, 700);
});
async function venueStep(dir) {
  const cur = await window.api.getSettings();
  const r = venueRule(cur);
  const step = r.step || 1;
  const nv = Math.max(r.min, Math.min(r.max, r.val + dir * step));
  if (nv === r.val) return;
  const patch = { [r.key]: String(nv) };
  if (!cur.selfreg_card_type) patch.selfreg_card_type = r.type;
  await window.api.saveSettings({ ...cur, ...patch });
  venueSaved(); renderVenuePanel();
}
document.getElementById('venue-minus').addEventListener('click', () => venueStep(-1));
document.getElementById('venue-plus').addEventListener('click', () => venueStep(1));
document.getElementById('venue-rule-desc').closest('.venue-rule').querySelector('.venue-rule-text').addEventListener('click', () => openSettingsTile('settings-modal-selfreg'));
['venue-logo', 'venue-niche', 'venue-more'].forEach(id => document.getElementById(id).addEventListener('click', () => openSettingsTile('settings-modal-brand')));
document.getElementById('venue-design').addEventListener('click', () => openSettingsTile('settings-modal-walletdesign'));
document.querySelectorAll('#venue-quick [data-q]').forEach(b => b.addEventListener('click', () => openSettingsTile(b.dataset.q)));
document.querySelectorAll('[data-ic]').forEach(el => { if (window.LoyaIcons) el.innerHTML = LoyaIcons.icon(el.dataset.ic); });
// Обновляем панель при входе в Настройки и после закрытия любого окна настроек (могли что-то поменять).
document.querySelector('.nav-btn[data-view="settings"]').addEventListener('click', () => renderVenuePanel(true).catch(() => {}));
document.addEventListener('click', (e) => {
  if (e.target.closest('.settings-modal-close') || e.target.classList.contains('settings-modal-overlay')) setTimeout(() => renderVenuePanel(true).catch(() => {}), 120);
});
