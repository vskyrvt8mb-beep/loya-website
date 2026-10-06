// Loya website: языки, анимации, тур по программе, калькулятор, оформление подписки.
(function () {
  const T = window.SITE_I18N;
  const LANGS = ['ru', 'uk', 'sk', 'en'];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  // Главные страницы по языкам: / (en), /ru/, /uk/, /sk/ — язык задан адресом (для поисковиков).
  const pageLang = document.body.dataset.pageLang;
  const pageSub = document.body.dataset.pageSub ? document.body.dataset.pageSub + '/' : '';   // страница ниши: cafe/ и т.п.
  const pagePath = (l) => (l === 'en' ? '/' : '/' + l + '/') + pageSub;
  function browserLang() {
    const nav = (navigator.languages || [navigator.language || 'en']).map(l => String(l).slice(0, 2).toLowerCase());
    for (const l of nav) { if (l === 'cs') return 'sk'; if (LANGS.includes(l)) return l; }
    return 'en';
  }
  function detectLang() {
    const url = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(url)) { store.set('loya_lang', url); return url; }
    const saved = store.get('loya_lang');
    if (LANGS.includes(saved)) return saved;
    return browserLang();
  }
  let lang;
  if (pageLang) {
    lang = pageLang;
    // Англоязычные страницы (/, /cafe/ …): посетителя с другим языком (выбор или язык браузера) один раз
    // переводим на его версию. Поисковый бот приходит с английским языком, поэтому остаётся на месте.
    if (pageLang === 'en' && location.pathname === pagePath('en')) {
      const want = detectLang();
      if (want !== 'en') { location.replace(pagePath(want) + location.hash); return; }
    } else if (new URLSearchParams(location.search).get('lang') === pageLang) {
      store.set('loya_lang', pageLang);
    }
  }
  if (!lang) lang = detectLang();
  const t = (k) => (T[lang] && T[lang][k] !== undefined) ? T[lang][k] : (T.en[k] || k);
  window.loyaT = t;
  window.loyaLang = () => lang;

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    if (document.body.dataset.page === 'privacy') document.title = `Loya — ${t('footPrivacy')}`;
    if (document.body.dataset.page === 'terms') document.title = `Loya — ${t('footTerms')}`;
    if (document.body.dataset.page === 'pricing') document.title = `Loya — ${t('pTitle')} · €9.99`;
    if (document.body.dataset.page === 'success') document.title = `Loya — ${t('sTitle').replace(/\s*🎉/, '')}`;
    if (document.body.dataset.page === 'home') {
      document.title = t('metaTitle');
      const md = document.querySelector('meta[name="description"]'); if (md) md.content = t('metaDesc');
    }
    document.querySelectorAll('.lang-select').forEach(s => { s.value = lang; });
    updateTour(); updateCalc();
  }
  document.querySelectorAll('.lang-select').forEach(sel => sel.addEventListener('change', () => {
    const next = sel.value;
    store.set('loya_lang', next);
    if (pageLang) { location.href = pagePath(next) + location.hash; return; }
    lang = next; apply();
  }));

  // ссылки на языковые версии в подвале запоминают выбор, чтобы корень "/" не вернул обратно
  document.querySelectorAll('.foot-langs a[hreflang]').forEach(a => a.addEventListener('click', () => store.set('loya_lang', a.getAttribute('hreflang'))));

  // шапка и мобильное меню
  const nav = document.querySelector('.nav');
  const sticky = document.querySelector('.sticky-cta');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
    if (sticky) {
      // кнопка внизу не нужна, когда на экране цены или блок скачивания (она ведёт туда же)
      const inView = (id) => { const el = document.getElementById(id); if (!el) return false; const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; };
      sticky.classList.toggle('show', window.scrollY > 600 && !inView('pricing') && !inView('download'));
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = document.querySelector('.nav-burger');
  const links = document.querySelector('.nav-links');
  if (burger && links) {
    const setOpen = (open) => { links.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); if (nav) nav.classList.toggle('menu-open', open); };
    burger.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); burger.focus(); } });
  }

  // появление блоков при прокрутке; в сетках карточки выезжают по очереди
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) document.documentElement.classList.add('motion');
  document.querySelectorAll('.cards3, .cards4, .features, .steps, .plans, .dl-grid, .photo-grid, .stats-grid, .faq').forEach(grid => {
    grid.querySelectorAll(':scope > .reveal').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 90 + Math.floor(i / 3) * 40 + 'ms'; });
  });
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  // однократные эффекты при появлении: номера шагов, счётчики цифр
  const once = (sel, fn, threshold = 0.4) => {
    const els = document.querySelectorAll(sel);
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(fn); return; }
    const ob = new IntersectionObserver((entries) => entries.forEach(e => { if (e.isIntersecting) { fn(e.target); ob.unobserve(e.target); } }), { threshold });
    els.forEach(el => ob.observe(el));
  };
  once('.steps', el => el.classList.add('line-in'), 0.3);
  once('[data-count]', el => {
    const to = Number(el.dataset.count) || 0;
    if (reduceMotion || to === 0) { el.textContent = String(to); return; }
    const t0 = performance.now(), dur = 1200;
    const tick = (now) => { const k = Math.min(1, (now - t0) / dur); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
    el.textContent = '0'; requestAnimationFrame(tick);
  }, 0.6);

  // подсветка карточек под курсором
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.card, .step, .dl-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // полоса прокрутки страницы
  const bar = document.createElement('div');
  bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  let barTick = false;
  const setBar = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; barTick = false; };
  window.addEventListener('scroll', () => { if (!barTick) { barTick = true; requestAnimationFrame(setBar); } }, { passive: true });
  setBar();

  // тур по программе — настоящие скриншоты на выбранном языке
  let tourTab = 'dashboard';
  const TOUR = { dashboard: 'capDash', scan: 'capScan', marketing: 'capMkt', clients: 'capClients', analytics: 'capAnalytics' };
  function updateTour() {
    const img = document.getElementById('tour-img');
    if (!img) return;
    img.style.opacity = '0.25';
    const src = `/img/${tourTab}_${lang}.webp`;
    const pre = new Image();
    pre.onload = () => { img.src = src; img.style.opacity = '1'; };
    pre.src = src;
    img.alt = t(TOUR[tourTab]);
    document.getElementById('tour-cap').textContent = t(TOUR[tourTab]);
    document.querySelectorAll('.tour-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tourTab));
    const hero = document.getElementById('hero-shot');
    if (hero) hero.src = `/img/dashboard_${lang}.webp`;
  }
  let tourAuto = !reduceMotion, tourTimer = null;
  const tourTabs = [...document.querySelectorAll('.tour-tab')];
  const stopTour = () => { tourAuto = false; clearInterval(tourTimer); tourTabs.forEach(b => b.classList.remove('auto')); };
  tourTabs.forEach(b => b.addEventListener('click', () => { stopTour(); tourTab = b.dataset.tab; updateTour(); }));
  const markAuto = () => tourTabs.forEach(b => { b.classList.remove('auto'); if (tourAuto && b.dataset.tab === tourTab) { void b.offsetWidth; b.classList.add('auto'); } });
  const tourEl = document.getElementById('tour');
  if (tourEl && tourTabs.length && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => entries.forEach(e => {
      clearInterval(tourTimer);
      if (e.isIntersecting && tourAuto) {
        markAuto();
        tourTimer = setInterval(() => {
          const i = tourTabs.findIndex(b => b.dataset.tab === tourTab);
          tourTab = tourTabs[(i + 1) % tourTabs.length].dataset.tab; updateTour(); markAuto();
        }, 6000);
      } else tourTabs.forEach(b => b.classList.remove('auto'));
    }), { threshold: 0.5 }).observe(tourEl);
  }

  // калькулятор: выручка в выбранной валюте по реальному курсу (/api/fx, кэш 12 ч).
  // Средний чек хранится в евро, поэтому при смене валюты сумма пересчитывается, а не просто меняется значок.
  const PRICE_EUR = 9.99;
  const FX_FALLBACK = { EUR: 1, USD: 1.08, GBP: 0.85, CZK: 25.0, PLN: 4.3, UAH: 45.0 };
  const CURRENCIES = Object.keys(FX_FALLBACK);
  let fx = { rates: FX_FALLBACK, date: null };
  let checkEur = 9;
  const savedCur = store.get('loya_currency');
  let currency = CURRENCIES.includes(savedCur) ? savedCur : (lang === 'uk' ? 'UAH' : 'EUR');
  const locale = () => (lang === 'en' ? 'en-IE' : lang === 'sk' ? 'sk-SK' : lang === 'uk' ? 'uk-UA' : 'ru-RU');
  const rate = () => fx.rates[currency] || FX_FALLBACK[currency] || 1;
  function fmtMoney(v) {
    try { return new Intl.NumberFormat(locale(), { style: 'currency', currency, maximumFractionDigits: 0 }).format(Math.round(v)); }
    catch (e) { return Math.round(v) + ' ' + currency; }
  }
  function niceStep(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  // Диапазон ползунка «Средний чек»: от 3 до 80 евро в пересчёте на выбранную валюту, с «круглым» шагом.
  function setupCheckSlider() {
    const el = document.getElementById('calc-check');
    if (!el) return;
    const r = rate(), step = niceStep(80 * r / 100);
    const min = Math.max(step, Math.round(3 * r / step) * step), max = Math.round(80 * r / step) * step;
    el.min = min; el.max = max; el.step = step;
    el.value = Math.min(max, Math.max(min, Math.round(checkEur * r / step) * step));
  }
  let outVal = null, outRaf = 0;
  function animateOut(to) {
    const el = document.getElementById('calc-out');
    if (!el) return;
    const from = outVal === null ? to : outVal;
    cancelAnimationFrame(outRaf);
    if (reduceMotion || from === to) { outVal = to; el.textContent = '+' + fmtMoney(to); return; }
    const t0 = performance.now(), dur = 380;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); outVal = from + (to - from) * (1 - Math.pow(1 - k, 3)); el.textContent = '+' + fmtMoney(outVal); if (k < 1) outRaf = requestAnimationFrame(step); else outVal = to; };
    outRaf = requestAnimationFrame(step);
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  function updateCalc() {
    const v = document.getElementById('calc-visitors');
    if (!v) return;
    const visitors = Number(v.value), check = Number(document.getElementById('calc-check').value), rt = Number(document.getElementById('calc-rate').value);
    document.getElementById('calc-visitors-v').textContent = visitors.toLocaleString(locale());
    document.getElementById('calc-check-v').textContent = fmtMoney(check);
    document.getElementById('calc-rate-v').textContent = rt + '%';
    const extra = visitors * (rt / 100) * check;
    const price = PRICE_EUR * rate();
    animateOut(extra);
    const roi = Math.max(1, Math.floor(extra / price));
    let times = t('calcTimes');
    if (lang === 'ru' || lang === 'uk') {
      const pr = new Intl.PluralRules(lang).select(roi);
      if (pr === 'few' && T[lang].calcTimesFew) times = T[lang].calcTimesFew;
      if (pr === 'one' && T[lang].calcTimesOne) times = T[lang].calcTimesOne;
    }
    document.getElementById('calc-roi').textContent = `${t('calcRoi')} ${roi}${times.startsWith('-') ? '' : ' '}${times}`;
    const fxEl = document.getElementById('calc-fx');
    if (fxEl) {
      let line = `${t('calcPriceIn')} ${new Intl.NumberFormat(locale(), { style: 'currency', currency, maximumFractionDigits: rate() < 5 ? 2 : 0 }).format(price)} ${t('calcPerMonth')}`;
      if (currency !== 'EUR') line += ' · ' + (fx.date ? `${t('calcRateLive')} ${fx.date.toLocaleDateString(locale())}` : t('calcRateApprox')) + `: 1 € = ${rate().toLocaleString(locale(), { maximumFractionDigits: 2 })} ${currency}`;
      fxEl.textContent = line;
    }
    const sel = document.getElementById('calc-currency');
    if (sel && sel.value !== currency) sel.value = currency;
  }
  const checkEl = document.getElementById('calc-check');
  if (checkEl) checkEl.addEventListener('input', () => { checkEur = Number(checkEl.value) / rate(); });
  const curSel = document.getElementById('calc-currency');
  if (curSel) {
    curSel.value = currency;
    curSel.addEventListener('change', () => { currency = curSel.value; store.set('loya_currency', currency); setupCheckSlider(); updateCalc(); });
    setupCheckSlider();
    let cached = null;
    try { cached = JSON.parse(store.get('loya_fx') || 'null'); } catch (e) {}
    const useRates = (d) => {
      const r = {};
      CURRENCIES.forEach(c => { r[c] = c === 'EUR' ? 1 : Number(d.rates && d.rates[c]) || FX_FALLBACK[c]; });
      fx = { rates: r, date: d.time ? new Date(d.time * 1000) : null };
      setupCheckSlider(); updateCalc();
    };
    if (cached && cached.saved && Date.now() - cached.saved < 12 * 3600e3) useRates(cached);
    else fetch('/api/fx').then(r => r.json()).then(d => {
      if (d && d.rates) {
        const keep = { rates: d.rates, time: d.time, saved: Date.now() };
        store.set('loya_fx', JSON.stringify(keep));
        useRates(keep);
      }
    }).catch(() => {});
  }
  ['calc-visitors', 'calc-check', 'calc-rate'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', updateCalc); });

  // выбор тарифа: кнопки на карточках и ?plan=pro в ссылке (её открывает программа)
  const pickTier = (tier, scroll) => {
    document.querySelectorAll('.plans-checkout input[name=tier]').forEach(r => { r.checked = r.value === tier; });
    const f = document.querySelector('.plans-checkout');
    if (f && scroll) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); const em = f.querySelector('input[type=email]'); if (em) setTimeout(() => em.focus(), 400); }
  };
  document.querySelectorAll('.pick-tier').forEach(b => b.addEventListener('click', () => pickTier(b.dataset.tier, true)));
  const planParam = new URLSearchParams(location.search).get('plan');
  if (planParam === 'pro' || planParam === 'starter') pickTier(planParam, false);

  // оформление подписки (Stripe Checkout через /api/create-checkout-session)
  document.querySelectorAll('form.checkout').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type=email]');
      const btn = form.querySelector('button');
      const err = form.querySelector('.checkout-err');
      const email = input.value.trim();
      err.style.display = 'none';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = t('errEmail'); err.style.display = 'block'; input.focus(); return; }
      btn.disabled = true;
      const label = btn.querySelector('span');
      label.textContent = t('loading');
      try {
        const tierEl = form.querySelector('input[name=tier]:checked');
        const tier = tierEl ? tierEl.value : 'starter';
        const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, lang, tier }) });
        const data = await res.json().catch(() => ({}));
        if (data.url) { location.href = data.url; return; }
        if (res.status === 429) { err.textContent = t('errTooMany'); err.style.display = 'block'; btn.disabled = false; label.textContent = t('priceCta'); return; }
        throw new Error(data.error || 'error');
      } catch (ex) {
        err.textContent = t('errGeneric'); err.style.display = 'block';
        btn.disabled = false; label.textContent = t('priceCta');
      }
    });
  });

  // «Потеряли ключ?» — письмо с ключом на адрес, указанный при оплате
  const lk = document.getElementById('lostkey-form');
  if (lk) lk.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('lostkey-msg'); const input = lk.querySelector('input'); const btn = lk.querySelector('button');
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = t('errEmail'); input.focus(); return; }
    btn.disabled = true; msg.textContent = '…';
    try {
      const r = await fetch('/api/resend-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, lang }) });
      msg.textContent = r.ok ? t('lostKeySent') : t('lostKeyErr');
    } catch (ex) { msg.textContent = t('lostKeyErr'); }
    btn.disabled = false;
  });

  // «Скачать установщик» — /download сам ведёт на последний .exe (api/_x_download.js)
  document.querySelectorAll('[data-download]').forEach(a => { a.href = '/download'; });

  // «Отправить ссылку на почту» — письмо самому себе со ссылкой на страницу скачивания
  const dlMail = document.getElementById('dl-mail');
  if (dlMail) dlMail.href = 'mailto:?subject=' + encodeURIComponent(t('dlMailSubject')) + '&body=' + encodeURIComponent(location.origin + location.pathname + '#download');

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  apply();
})();
