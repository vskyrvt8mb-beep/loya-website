// Loya website: языки, анимации, тур по программе, калькулятор, оформление подписки.
(function () {
  const T = window.SITE_I18N;
  const LANGS = ['ru', 'uk', 'sk', 'en'];
  const REPO = 'vskyrvt8mb-beep/loya-website';

  function detectLang() {
    const url = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(url)) { try { localStorage.setItem('loya_lang', url); } catch (e) {} return url; }
    const saved = localStorage.getItem('loya_lang');
    if (LANGS.includes(saved)) return saved;
    const nav = (navigator.languages || [navigator.language || 'en']).map(l => String(l).slice(0, 2).toLowerCase());
    for (const l of nav) { if (l === 'cs') return 'sk'; if (LANGS.includes(l)) return l; }
    return 'en';
  }
  let lang = detectLang();
  const t = (k) => (T[lang] && T[lang][k] !== undefined) ? T[lang][k] : (T.en[k] || k);
  window.loyaT = t;
  window.loyaLang = () => lang;

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
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
    lang = sel.value; localStorage.setItem('loya_lang', lang); apply();
  }));

  // шапка и мобильное меню
  const nav = document.querySelector('.nav');
  const sticky = document.querySelector('.sticky-cta');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
    if (sticky) {
      const pricing = document.getElementById('pricing');
      const inPricing = pricing && pricing.getBoundingClientRect().top < window.innerHeight && pricing.getBoundingClientRect().bottom > 0;
      sticky.classList.toggle('show', window.scrollY > 600 && !inPricing);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = document.querySelector('.nav-burger');
  const links = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // появление блоков при прокрутке
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  // тур по программе — настоящие скриншоты на выбранном языке
  let tourTab = 'dashboard';
  const TOUR = { dashboard: 'capDash', scan: 'capScan', marketing: 'capMkt', clients: 'capClients', analytics: 'capAnalytics' };
  function updateTour() {
    const img = document.getElementById('tour-img');
    if (!img) return;
    img.style.opacity = '0.25';
    const src = `img/${tourTab}_${lang}.webp`;
    const pre = new Image();
    pre.onload = () => { img.src = src; img.style.opacity = '1'; };
    pre.src = src;
    img.alt = t(TOUR[tourTab]);
    document.getElementById('tour-cap').textContent = t(TOUR[tourTab]);
    document.querySelectorAll('.tour-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tourTab));
    const hero = document.getElementById('hero-shot');
    if (hero) hero.src = `img/dashboard_${lang}.webp`;
  }
  document.querySelectorAll('.tour-tab').forEach(b => b.addEventListener('click', () => { tourTab = b.dataset.tab; updateTour(); }));

  // калькулятор
  function fmtEur(v) {
    const n = Math.round(v);
    const s = n.toLocaleString(lang === 'en' ? 'en-US' : lang === 'sk' ? 'sk-SK' : lang === 'uk' ? 'uk-UA' : 'ru-RU');
    return lang === 'en' ? `€${s}` : `${s} €`;
  }
  function updateCalc() {
    const v = document.getElementById('calc-visitors');
    if (!v) return;
    const visitors = Number(v.value), check = Number(document.getElementById('calc-check').value), rate = Number(document.getElementById('calc-rate').value);
    document.getElementById('calc-visitors-v').textContent = visitors.toLocaleString();
    document.getElementById('calc-check-v').textContent = fmtEur(check).replace(/\.\d+/, '');
    document.getElementById('calc-rate-v').textContent = rate + '%';
    const extra = visitors * (rate / 100) * check;
    document.getElementById('calc-out').textContent = '+' + fmtEur(extra);
    const roi = Math.max(1, Math.floor(extra / 9.99));
    document.getElementById('calc-roi').textContent = `${t('calcRoi')} ${roi} ${t('calcTimes')}`;
  }
  ['calc-visitors', 'calc-check', 'calc-rate'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', updateCalc); });

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
        const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, lang }) });
        const data = await res.json();
        if (data.url) { location.href = data.url; return; }
        throw new Error(data.error || 'error');
      } catch (ex) {
        err.textContent = t('errGeneric'); err.style.display = 'block';
        btn.disabled = false; label.textContent = t('priceCta');
      }
    });
  });

  // ссылки «Скачать для Windows» — всегда на последний установщик из GitHub Releases
  const dl = document.querySelectorAll('[data-download]');
  if (dl.length) {
    const fallback = `https://github.com/${REPO}/releases/latest`;
    dl.forEach(a => { a.href = fallback; });
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`).then(r => r.json()).then(rel => {
      const asset = (rel.assets || []).find(a => /\.exe$/i.test(a.name) && !/blockmap/i.test(a.name));
      if (asset) dl.forEach(a => { a.href = asset.browser_download_url; });
    }).catch(() => {});
  }

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  apply();
})();
